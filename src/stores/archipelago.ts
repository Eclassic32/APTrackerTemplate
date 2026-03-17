/**
 * archipelago.ts — Archipelago Connection Store
 *
 * Central reactive store that bridges the archipelago.js Client with Vue 3
 * reactivity. All data from the AP server (hints, items, locations, messages)
 * is serialized into plain objects and stored in reactive refs/arrays so any
 * Vue component can import and use them directly.
 *
 * ## Why serialize?
 *
 * archipelago.js class instances (Hint, Item, Player) use private fields and
 * getter-only accessors. Vue's reactive proxy cannot observe these. Getters
 * like `client.items.hints` also return new array copies on every access, so
 * they are not suitable for direct reactive binding. This store subscribes to
 * AP events, converts all data to plain objects, and writes them into Vue
 * reactive state once.
 *
 * ## Usage in components / pages
 *
 * ```ts
 * import {
 *   hints,            // reactive SerializedHint[]
 *   receivedItems,    // reactive SerializedItem[]
 *   checkedLocations, // reactive number[] (location IDs the player has checked)
 *   missingLocations, // reactive number[] (location IDs not yet checked)
 *   messages,         // reactive SerializedMessage[]
 *   isConnected,      // Ref<boolean>
 *   slotName,         // Ref<string>
 *   selfSlot,         // Ref<number>
 * } from "@/stores/archipelago";
 * ```
 *
 * All exports are reactive — use them in `computed`, `watch`, or templates
 * and they will update automatically when the server pushes new data.
 */

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
  type DataChangeCallback,
} from "archipelago.js";

/* ==========================================================================
   TEMPLATE CONFIGURATION
   ==========================================================================
   Change GAME_NAME to match your Archipelago game. This value is sent to the
   server during login and determines which data package is loaded.

   - Set to a game name string (e.g. "A Link to the Past", "Timespinner") to
     connect as a full tracker for that game.
   - Set to "" (empty string) to connect in TextOnly mode, which disables
     game-specific features but still allows chat, hints, and message display.
   ========================================================================== */

/** The game this tracker is built for. Set to "" for TextOnly mode. */
export const GAME_NAME = "";

/* ==========================================================================
   Serialized Types
   ==========================================================================
   Plain object interfaces that mirror archipelago.js class data. These are
   safe for Vue reactivity and can be passed freely between components.
   ========================================================================== */

/** A single node within a formatted AP message (item, player, location, etc.) */
export interface SerializedNode {
  type: "item" | "player" | "location" | "color" | "text" | "entrance";
  text: string;
  /** Item classification bit flags (only present when type === "item"). */
  itemFlags?: number;
  /** Resolved item name (only present when type === "item"). */
  itemName?: string;
  /** Player slot number (only present when type === "player"). */
  playerSlot?: number;
  /** Player display alias (only present when type === "player"). */
  playerAlias?: string;
  /** Location ID (only present when type === "location"). */
  locationId?: number;
  /** AP JSON color name (only present when type === "color"). */
  color?: string;
}

/**
 * Discriminated union of the 15 specific message event types from
 * archipelago.js (excludes the generic "message" catch-all).
 */
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

/** Human-readable display labels for each message type. */
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

/** All message type keys as an array, useful for iteration. */
export const ALL_MESSAGE_TYPES: MessageType[] = Object.keys(MESSAGE_TYPE_LABELS) as MessageType[];

/** A server message with its formatted node list and originating event type. */
export interface SerializedMessage {
  /** Plain text representation of the message. */
  text: string;
  /** Structured node list for color-coded rendering. */
  nodes: SerializedNode[];
  /** Which AP event produced this message (for filtering). */
  messageType: MessageType;
}

/**
 * A hint for an item in the multiworld.
 *
 * Use `itemFlags` with bitwise checks for classification:
 * - `flags & 0b001` = Progression
 * - `flags & 0b010` = Useful
 * - `flags & 0b100` = Trap
 * - `flags === 0`    = Filler / Normal
 */
export interface SerializedHint {
  /** Display name of the player who receives this item. */
  receivingPlayer: string;
  /** Slot number of the receiving player. */
  receivingPlayerSlot: number;
  /** Resolved item name. */
  itemName: string;
  /** Item classification bit flags (progression/useful/trap/filler). */
  itemFlags: number;
  /** Display name of the player whose world contains this item. */
  findingPlayer: string;
  /** Slot number of the finding player. */
  findingPlayerSlot: number;
  /** Location name where this item can be found. */
  location: string;
  /** Entrance name for randomized entrances, or "Vanilla" if not applicable. */
  entrance: string;
  /** Whether this item has already been found/collected. */
  found: boolean;
}

/**
 * An item received by the connected player from the multiworld.
 *
 * Items appear in chronological order in the `receivedItems` array.
 */
export interface SerializedItem {
  /** Resolved item name. */
  name: string;
  /** Numeric item ID from the data package. */
  id: number;
  /** Item classification bit flags. */
  flags: number;
  /** Display name of the player who sent this item. */
  senderAlias: string;
  /** Slot number of the sending player. */
  senderSlot: number;
  /** Display name of the player who received this item (typically self). */
  receiverAlias: string;
  /** Slot number of the receiving player. */
  receiverSlot: number;
  /** Location name the sender checked to produce this item. */
  locationName: string;
  /** Numeric location ID. */
  locationId: number;
}

/* ==========================================================================
   Reactive State
   ==========================================================================
   All exports below are Vue reactive. Import them in any component or page
   and they will update automatically when the server sends new data.
   ========================================================================== */

/** Whether the client is currently connected to an AP server. */
export const isConnected = ref(false);

/** Whether a connection attempt is in progress. */
export const isConnecting = ref(false);

/** Error message from the most recent failed connection attempt, or "". */
export const connectionError = ref("");

/** Display alias of the connected player's slot. */
export const slotName = ref("");

/** Game name reported by the server for the connected slot. */
export const gameName = ref("");

/** Team number of the connected player. */
export const teamNumber = ref(0);

/** Slot number of the connected player. Compare with hint player slots to identify "self". */
export const selfSlot = ref(0);

/**
 * All server messages, in chronological order.
 *
 * Each message includes structured `nodes` for color-coded rendering and a
 * `messageType` string for filtering. Use the `settings.messageFilters` from
 * the settings store to filter by type.
 *
 * @example
 * ```vue
 * <div v-for="msg in messages" :key="i">
 *   <ColoredText :nodes="msg.nodes" />
 * </div>
 * ```
 */
export const messages = reactive<SerializedMessage[]>([]);

/**
 * All known hints for the connected player, updated in real time.
 *
 * Hints are replaced atomically on every server update (not appended
 * incrementally), so the array is always a complete snapshot.
 *
 * @example
 * ```ts
 * import { hints, selfSlot } from "@/stores/archipelago";
 * const myHints = computed(() =>
 *   hints.filter(h => h.receivingPlayerSlot === selfSlot.value)
 * );
 * ```
 */
export const hints = reactive<SerializedHint[]>([]);

/**
 * Items the connected player has received, in chronological order.
 *
 * New items are appended as they arrive; the array only grows.
 *
 * @example
 * ```ts
 * import { receivedItems } from "@/stores/archipelago";
 * const progressionItems = computed(() =>
 *   receivedItems.filter(item => item.flags & 0b001)
 * );
 * ```
 */
export const receivedItems = reactive<SerializedItem[]>([]);

/**
 * Location IDs that the connected player has already checked.
 *
 * These are numeric IDs from the AP data package. Use the client's
 * `package.lookupLocationName()` to resolve them to display names if needed.
 *
 * @example
 * ```ts
 * import { checkedLocations } from "@/stores/archipelago";
 * const totalChecked = computed(() => checkedLocations.length);
 * ```
 */
export const checkedLocations = reactive<number[]>([]);

/**
 * Location IDs that the connected player has NOT yet checked.
 *
 * Combined with `checkedLocations`, these form the complete set of
 * locations for the connected slot.
 *
 * @example
 * ```ts
 * import { checkedLocations, missingLocations } from "@/stores/archipelago";
 * const progress = computed(() =>
 *   `${checkedLocations.length} / ${checkedLocations.length + missingLocations.length}`
 * );
 * ```
 */
export const missingLocations = reactive<number[]>([]);

/** Sorted list of all item names from the connected game's data package. */
export const allItemNames = ref<string[]>([]);

/** Item names that have not yet been hinted as found (for hint autocomplete). */
export const hintableItemNames = ref<string[]>([]);

/** Current hint points available to the player. */
export const hintPoints = ref(0);

/** Cost in hint points to request a new hint. */
export const hintCost = ref(0);

/**
 * The raw archipelago.js Client instance.
 *
 * Wrapped in `shallowRef` to prevent Vue from deeply proxying it (which
 * would break the library's private fields). Use this for advanced
 * operations not covered by the serialized state above.
 *
 * @example
 * ```ts
 * import { client } from "@/stores/archipelago";
 * // Access the data package directly:
 * const pkg = client.value?.package.findPackage("MyGame");
 * ```
 */
export const client = shallowRef<Client | null>(null);

/* ==========================================================================
   Serialization Helpers (internal)
   ==========================================================================
   These functions convert archipelago.js class instances into plain objects.
   They are called from event handlers and should not be used directly.
   ========================================================================== */

/** Convert an AP MessageNode into a plain serialized object. */
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

/**
 * Serialize a raw NetworkHint from the AP data storage into a plain object.
 *
 * Resolves player names and item/location names via the client's data package
 * and player manager, bypassing the archipelago.js Hint/Item class chain.
 */
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

/** Convert an archipelago.js Item instance into a plain serialized object. */
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

/* ==========================================================================
   State Update Helpers (internal)
   ========================================================================== */

/** Cached raw NetworkHint[] for re-serialization on alias changes. */
let cachedNetworkHints: API.NetworkHint[] = [];

/** Atomically replace the hints array from raw network data. */
function refreshHintsFromNetwork(c: Client, networkHints: API.NetworkHint[]) {
  cachedNetworkHints = networkHints;
  const serialized = networkHints.map((nh) => serializeNetworkHint(c, nh));
  hints.splice(0, hints.length, ...serialized);
  updateHintableItems();
}

/** Append a new message to the reactive messages array. */
function pushMessage(
  messageType: MessageType,
  text: string,
  nodes: MessageNode[],
) {
  messages.push({
    text,
    nodes: nodes.map(serializeNode),
    messageType,
  });
}

/** Append any newly received items (incremental — only adds items beyond current length). */
function refreshReceivedItems(c: Client) {
  const rawItems = c.items.received;
  for (let i = receivedItems.length; i < rawItems.length; i++) {
    receivedItems.push(serializeItem(rawItems[i]));
  }
}

/** Replace checked/missing location arrays with current server state. */
function refreshLocations(c: Client) {
  const checked = c.room.checkedLocations;
  const missing = c.room.missingLocations;
  checkedLocations.length = 0;
  checkedLocations.push(...checked);
  missingLocations.length = 0;
  missingLocations.push(...missing);
}

/** Update hint point counters from the server. */
function refreshHintPoints(c: Client) {
  hintPoints.value = c.room.hintPoints;
  hintCost.value = c.room.hintCost;
}

/** Load all item names from the game's data package for hint autocomplete. */
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

/** Recompute which items are available for hinting (excludes found hints). */
function updateHintableItems() {
  const foundItems = new Set(
    hints.filter((h) => h.found).map((h) => h.itemName),
  );
  hintableItemNames.value = allItemNames.value.filter(
    (name) => !foundItems.has(name),
  );
}

/* ==========================================================================
   Connect / Disconnect
   ========================================================================== */

/**
 * Connect to an Archipelago server.
 *
 * Registers all event handlers before calling `client.login()` so that
 * events fired during the connection handshake are never missed. After
 * login, subscribes directly to the server's hint data storage key for
 * real-time hint updates.
 */
export async function connect(address: string, slot: string, password: string) {
  if (client.value) {
    disconnect();
  }

  isConnecting.value = true;
  connectionError.value = "";

  const c = new Client();

  try {
    const url = address.trim();
    const game = GAME_NAME.trim() || undefined;
    const tags = game ? ["Tracker"] : ["Tracker", "TextOnly"];

    /*
     * Event handlers are registered BEFORE login() so we capture all
     * messages and state changes that occur during the handshake.
     */

    // -- Message events (one handler per AP message type) --
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

    // -- Item events --
    c.items.on("itemsReceived", () => {
      refreshReceivedItems(c);
    });

    // -- Location events --
    c.room.on("locationsChecked", () => {
      refreshLocations(c);
    });

    // -- Hint point events --
    c.room.on("hintPointsUpdated", () => {
      refreshHintPoints(c);
    });
    c.room.on("hintCostUpdated", () => {
      refreshHintPoints(c);
    });

    // -- Player alias changes (re-serialize hints with updated names) --
    c.players.on("aliasUpdated", () => {
      slotName.value = c.players.self.alias;
      if (cachedNetworkHints.length > 0) {
        refreshHintsFromNetwork(c, cachedNetworkHints);
      }
    });

    // -- Socket disconnect --
    c.socket.on("disconnected", () => {
      isConnected.value = false;
      connectionError.value = "Disconnected from server.";
    });

    // -- Perform login --
    await c.login(url, slot.trim(), game, {
      password: password || "",
      tags,
      items: itemsHandlingFlags.all,
      slotData: true,
    });

    // -- Store connection metadata --
    client.value = c;
    isConnected.value = true;
    slotName.value = c.players.self.alias;
    gameName.value = c.game;
    teamNumber.value = c.players.self.team;
    selfSlot.value = c.players.self.slot;

    // Persist connection fields for auto-fill on next visit
    localStorage.setItem("serverAddress", address);
    localStorage.setItem("slotName", slot);
    localStorage.setItem("password", password);

    // -- Load initial state --
    refreshReceivedItems(c);
    refreshLocations(c);
    refreshHintPoints(c);
    loadItemNames(c);

    // -- Subscribe to hint data storage --
    // We subscribe directly to the AP data storage key rather than using
    // the ItemsManager's hint events, which provides a complete snapshot
    // of all hints on every update and avoids incremental sync issues.
    const hintKey = `_read_hints_${c.players.self.team}_${c.players.self.slot}`;
    const hintCallback: DataChangeCallback = (_key, value) => {
      const networkHints = value as API.NetworkHint[];
      if (Array.isArray(networkHints)) {
        refreshHintsFromNetwork(c, networkHints);
      }
    };
    c.storage.notify([hintKey], hintCallback).then((data) => {
      const networkHints = (data as Record<string, unknown>)[hintKey] as
        | API.NetworkHint[]
        | undefined;
      if (Array.isArray(networkHints)) {
        refreshHintsFromNetwork(c, networkHints);
      }
    });
  } catch (err: unknown) {
    connectionError.value =
      err instanceof Error ? err.message : "Failed to connect";
    client.value = null;
  } finally {
    isConnecting.value = false;
  }
}

/** Disconnect from the server and reset all reactive state. */
export function disconnect() {
  const c = client.value;
  if (c) {
    try {
      c.socket.disconnect();
    } catch {
      /* already disconnected */
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

/** Send a chat message or command (e.g. "!hint ItemName") to the server. */
export async function sendMessage(text: string) {
  const c = client.value;
  if (!c || !text.trim()) return;
  await c.messages.say(text.trim());
}
