import { reactive, ref, shallowRef } from "vue";
import {
  Client,
  itemsHandlingFlags,
  API,
  type Item,
  type MessageNode,
  type ItemMessageNode,
  type PlayerMessageNode,
  type LocationMessageNode,
  type ColorMessageNode,
  type TextualMessageNode,
  type MessageEvents,
  type DataChangeCallback,
} from "archipelago.js";

/* ================================================================
   Serialized types – plain objects safe for Vue reactivity.
   We deep-copy data out of archipelago.js classes to avoid
   issues with nested proxies / getter-only class instances.
   ================================================================ */

export interface SerializedNode {
  type: "item" | "player" | "location" | "color" | "text" | "entrance";
  text: string;
  /* item nodes */
  itemFlags?: number;
  itemName?: string;
  /* player nodes */
  playerSlot?: number;
  playerAlias?: string;
  /* location nodes */
  locationId?: number;
  /* color nodes */
  color?: string;
}

/** All specific message event types from archipelago.js MessageEvents (excluding the generic "message") */
export type MessageType =
  | "itemSent"
  | "itemCheated"
  | "itemHinted"
  | "connected"
  | "disconnected"
  | "chat"
  | "serverChat"
  | "tutorial"
  | "tagsUpdated"
  | "userCommand"
  | "adminCommand"
  | "goaled"
  | "released"
  | "collected"
  | "countdown";

/** Human-readable labels for each message type */
export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  itemSent: "Item Sent",
  itemCheated: "Item Cheated",
  itemHinted: "Item Hinted",
  connected: "Player Connected",
  disconnected: "Player Disconnected",
  chat: "Chat",
  serverChat: "Server Chat",
  tutorial: "Tutorial",
  tagsUpdated: "Tags Updated",
  userCommand: "Command Result",
  adminCommand: "Admin Command",
  goaled: "Goal",
  released: "Release",
  collected: "Collect",
  countdown: "Countdown",
};

export const ALL_MESSAGE_TYPES: MessageType[] = Object.keys(MESSAGE_TYPE_LABELS) as MessageType[];

export interface SerializedMessage {
  text: string;
  nodes: SerializedNode[];
  messageType: MessageType;
}

export interface SerializedHint {
  receivingPlayer: string;
  receivingPlayerSlot: number;
  itemName: string;
  itemFlags: number;
  findingPlayer: string;
  findingPlayerSlot: number;
  location: string;
  entrance: string;
  found: boolean;
}

export interface SerializedItem {
  name: string;
  id: number;
  flags: number;
  senderAlias: string;
  senderSlot: number;
  receiverAlias: string;
  receiverSlot: number;
  locationName: string;
  locationId: number;
}

/* ================================================================
   State
   ================================================================ */

export const isConnected = ref(false);
export const isConnecting = ref(false);
export const connectionError = ref("");
export const slotName = ref("");
export const gameName = ref("");
export const teamNumber = ref(0);
export const selfSlot = ref(0);

export const messages = reactive<SerializedMessage[]>([]);
export const hints = reactive<SerializedHint[]>([]);
export const receivedItems = reactive<SerializedItem[]>([]);
export const checkedLocations = reactive<number[]>([]);
export const missingLocations = reactive<number[]>([]);

/** All item names from the player's game data package (for hint autocomplete) */
export const allItemNames = ref<string[]>([]);
/** All items that the player hasn't found yet (missing items for hinting) */
export const hintableItemNames = ref<string[]>([]);

export const hintPoints = ref(0);
export const hintCost = ref(0);

/** The raw Client instance – use shallowRef so Vue doesn't deeply proxy it */
export const client = shallowRef<Client | null>(null);

/* ================================================================
   Serialization helpers
   ================================================================ */

function serializeNode(node: MessageNode): SerializedNode {
  const base: SerializedNode = {
    type: node.type as SerializedNode["type"],
    text: node.text,
  };

  switch (node.type) {
    case "item": {
      const n = node as ItemMessageNode;
      base.itemFlags = n.item.flags;
      base.itemName = n.item.name;
      break;
    }
    case "player": {
      const n = node as PlayerMessageNode;
      base.playerSlot = n.player.slot;
      base.playerAlias = n.player.alias;
      break;
    }
    case "location": {
      const n = node as LocationMessageNode;
      base.locationId = n.id;
      break;
    }
    case "color": {
      const n = node as ColorMessageNode;
      base.color = n.color;
      break;
    }
  }

  return base;
}

function serializeNetworkHint(c: Client, nh: API.NetworkHint): SerializedHint {
  const receiver = c.players.findPlayer(nh.receiving_player);
  const finder = c.players.findPlayer(nh.finding_player);

  const receiverAlias = receiver?.alias ?? `Player ${nh.receiving_player}`;
  const receiverSlot = receiver?.slot ?? nh.receiving_player;
  const receiverGame = receiver?.game ?? "";

  const finderAlias = finder?.alias ?? `Player ${nh.finding_player}`;
  const finderSlot = finder?.slot ?? nh.finding_player;
  const finderGame = finder?.game ?? "";

  const itemName = receiverGame
    ? c.package.lookupItemName(receiverGame, nh.item, true)
    : `Item ${nh.item}`;
  const locationName = finderGame
    ? c.package.lookupLocationName(finderGame, nh.location, true)
    : `Location ${nh.location}`;

  return {
    receivingPlayer: receiverAlias,
    receivingPlayerSlot: receiverSlot,
    itemName,
    itemFlags: nh.item_flags,
    findingPlayer: finderAlias,
    findingPlayerSlot: finderSlot,
    location: locationName,
    entrance: nh.entrance || "Vanilla",
    found: nh.found,
  };
}

function serializeItem(item: Item): SerializedItem {
  return {
    name: item.name,
    id: item.id,
    flags: item.flags,
    senderAlias: item.sender.alias,
    senderSlot: item.sender.slot,
    receiverAlias: item.receiver.alias,
    receiverSlot: item.receiver.slot,
    locationName: item.locationName,
    locationId: item.locationId,
  };
}

/** Cached raw NetworkHint data for re-serialization (e.g., on alias changes) */
let cachedNetworkHints: API.NetworkHint[] = [];

/* ================================================================
   Refresh helpers – read full state from client getters
   ================================================================ */

function refreshHintsFromNetwork(c: Client, networkHints: API.NetworkHint[]) {
  cachedNetworkHints = networkHints;
  const serialized = networkHints.map((nh) => serializeNetworkHint(c, nh));
  // Atomic replacement: single splice triggers one reactive update
  hints.splice(0, hints.length, ...serialized);
  updateHintableItems();
}

/** Push a new message from a typed event directly into the reactive store */
function pushMessage(
  messageType: MessageType,
  text: string,
  nodes: MessageNode[]
) {
  messages.push({
    text,
    nodes: nodes.map(serializeNode),
    messageType,
  });
}

function refreshReceivedItems(c: Client) {
  const rawItems = c.items.received;
  // Only add new items
  for (let i = receivedItems.length; i < rawItems.length; i++) {
    receivedItems.push(serializeItem(rawItems[i]));
  }
}

function refreshLocations(c: Client) {
  const checked = c.room.checkedLocations;
  const missing = c.room.missingLocations;
  checkedLocations.length = 0;
  checkedLocations.push(...checked);
  missingLocations.length = 0;
  missingLocations.push(...missing);
}

function refreshHintPoints(c: Client) {
  hintPoints.value = c.room.hintPoints;
  hintCost.value = c.room.hintCost;
}

function loadItemNames(c: Client) {
  const game = c.game;
  if (!game) return;
  const pkg = c.package.findPackage(game);
  if (pkg) {
    const names = Object.keys(pkg.itemTable);
    names.sort();
    allItemNames.value = names;
    updateHintableItems();
  }
}

function updateHintableItems() {
  // All items minus those already fully hinted as found
  const foundItems = new Set(
    hints.filter((h) => h.found).map((h) => h.itemName)
  );
  hintableItemNames.value = allItemNames.value.filter(
    (name) => !foundItems.has(name)
  );
}

/* ================================================================
   Connect / Disconnect
   ================================================================ */

export async function connect(
  address: string,
  slot: string,
  game: string,
  password: string
) {
  if (client.value) {
    disconnect();
  }

  isConnecting.value = true;
  connectionError.value = "";

  const c = new Client();

  try {
    let url = address.trim();
    const tags = game.trim() ? ["Tracker"] : ["Tracker", "TextOnly"];

    // Wire up message events BEFORE login so we capture all messages
    // including those generated during the connection handshake.
    c.messages.on("itemSent", (text, _item, nodes) => {
      pushMessage("itemSent", text, nodes);
    });
    c.messages.on("itemCheated", (text, _item, nodes) => {
      pushMessage("itemCheated", text, nodes);
    });
    c.messages.on("itemHinted", (text, _item, _found, nodes) => {
      pushMessage("itemHinted", text, nodes);
    });
    c.messages.on("connected", (text, _player, _tags, nodes) => {
      pushMessage("connected", text, nodes);
    });
    c.messages.on("disconnected", (text, _player, nodes) => {
      pushMessage("disconnected", text, nodes);
    });
    c.messages.on("chat", (message, _player, nodes) => {
      pushMessage("chat", message, nodes);
    });
    c.messages.on("serverChat", (message, nodes) => {
      pushMessage("serverChat", message, nodes);
    });
    c.messages.on("tutorial", (text, nodes) => {
      pushMessage("tutorial", text, nodes);
    });
    c.messages.on("tagsUpdated", (text, _player, _tags, nodes) => {
      pushMessage("tagsUpdated", text, nodes);
    });
    c.messages.on("userCommand", (text, nodes) => {
      pushMessage("userCommand", text, nodes);
    });
    c.messages.on("adminCommand", (text, nodes) => {
      pushMessage("adminCommand", text, nodes);
    });
    c.messages.on("goaled", (text, _player, nodes) => {
      pushMessage("goaled", text, nodes);
    });
    c.messages.on("released", (text, _player, nodes) => {
      pushMessage("released", text, nodes);
    });
    c.messages.on("collected", (text, _player, nodes) => {
      pushMessage("collected", text, nodes);
    });
    c.messages.on("countdown", (text, _value, nodes) => {
      pushMessage("countdown", text, nodes);
    });

    // Wire up ALL event handlers BEFORE login so we never miss events
    // that fire during or immediately after the connection handshake
    // (e.g., hintsInitialized fires asynchronously after connected packet).

    // Items received
    c.items.on("itemsReceived", () => {
      refreshReceivedItems(c);
    });

    // Hints - use callback data directly instead of re-reading the getter,
    // because events can fire mid-iteration of the internal hints array.
    // BYPASSED: ItemsManager hint events have race conditions (hintsInitialized
    // and #receivedHint can overlap, and the index-based comparison produces
    // wrong Hint objects). Instead, we subscribe directly to the data storage
    // key and serialize from raw NetworkHint data.

    // We'll set up the direct storage subscription after login succeeds,
    // since we need team/slot to construct the key.

    // Locations
    c.room.on("locationsChecked", () => {
      refreshLocations(c);
    });

    // Hint points
    c.room.on("hintPointsUpdated", () => {
      refreshHintPoints(c);
    });

    c.room.on("hintCostUpdated", () => {
      refreshHintPoints(c);
    });

    // Player alias changes
    c.players.on("aliasUpdated", () => {
      slotName.value = c.players.self.alias;
      // Re-serialize hints with updated player aliases using cached raw data
      if (cachedNetworkHints.length > 0) {
        refreshHintsFromNetwork(c, cachedNetworkHints);
      }
    });

    // Socket disconnect
    c.socket.on("disconnected", () => {
      isConnected.value = false;
      connectionError.value = "Disconnected from server.";
    });

    await c.login(url, slot.trim(), game.trim() || undefined, {
      password: password || "",
      tags,
      items: itemsHandlingFlags.all,
      slotData: true,
    });

    // Connection successful
    client.value = c;
    isConnected.value = true;
    slotName.value = c.players.self.alias;
    gameName.value = c.game;
    teamNumber.value = c.players.self.team;
    selfSlot.value = c.players.self.slot;

    localStorage.setItem("serverAddress", address);
    localStorage.setItem("slotName", slot);
    localStorage.setItem("gameName", game);
    localStorage.setItem("password", password);

    // Load any state that may already be available after login
    refreshReceivedItems(c);
    refreshLocations(c);
    refreshHintPoints(c);
    loadItemNames(c);

    // Subscribe directly to the hints data storage key, bypassing
    // ItemsManager's buggy hint event system entirely. This gives us
    // the raw NetworkHint[] on every update, which we serialize ourselves.
    const hintKey = `_read_hints_${c.players.self.team}_${c.players.self.slot}`;
    const hintCallback: DataChangeCallback = (_key, value) => {
      const networkHints = value as API.NetworkHint[];
      if (Array.isArray(networkHints)) {
        refreshHintsFromNetwork(c, networkHints);
      }
    };
    // notify() registers the callback for future SetReply packets AND
    // fetches the current value. The .then() handles initial population.
    c.storage.notify([hintKey], hintCallback).then((data) => {
      const networkHints = (data as Record<string, unknown>)[hintKey] as API.NetworkHint[] | undefined;
      if (Array.isArray(networkHints)) {
        refreshHintsFromNetwork(c, networkHints);
      }
    });
  } catch (err: any) {
    connectionError.value = err?.message || "Failed to connect";
    client.value = null;
  } finally {
    isConnecting.value = false;
  }
}

export function disconnect() {
  const c = client.value;
  if (c) {
    try {
      c.socket.disconnect();
    } catch {
      // ignore
    }
  }
  client.value = null;
  isConnected.value = false;
  slotName.value = "";
  gameName.value = "";
  messages.length = 0;
  hints.length = 0;
  receivedItems.length = 0;
  checkedLocations.length = 0;
  missingLocations.length = 0;
  allItemNames.value = [];
  hintableItemNames.value = [];
  hintPoints.value = 0;
  hintCost.value = 0;
  cachedNetworkHints = [];
}

export async function sendMessage(text: string) {
  const c = client.value;
  if (!c || !text.trim()) return;
  await c.messages.say(text.trim());
}
