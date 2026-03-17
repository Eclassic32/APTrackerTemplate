# Archipelago Tracker Template — Developer Guide

A Vite + Vue 3 + TypeScript template for building game-specific
[Archipelago](https://archipelago.gg/) multiworld tracker web clients.
Fork this repo, set your game name, and extend it with game-specific pages.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Setting Your Game Name](#setting-your-game-name)
4. [Reactive Data Model](#reactive-data-model)
5. [Accessing Data in Components](#accessing-data-in-components)
6. [Adding a New Page](#adding-a-new-page)
7. [Working with Hints](#working-with-hints)
8. [Working with Items](#working-with-items)
9. [Working with Locations](#working-with-locations)
10. [Working with Messages](#working-with-messages)
11. [Color System & CSS Custom Properties](#color-system--css-custom-properties)
12. [Settings Store](#settings-store)
13. [Serialization Layer — Why and How](#serialization-layer--why-and-how)
14. [Common Patterns & Recipes](#common-patterns--recipes)

---

## Quick Start

```bash
npm install
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Type-check + production build
npm run preview  # Preview the production build locally
```

## Project Structure

```
src/
├── main.ts                    App entry point
├── App.vue                    Root component (connection gate + router)
├── router/index.ts            Hash-based routing config
├── stores/
│   ├── archipelago.ts         AP connection store (all reactive game data)
│   └── settings.ts            User preferences (theme, colors, filters)
├── utils/
│   └── colors.ts              AP color resolution helpers
├── components/
│   ├── ConnectionForm.vue     Server login form
│   ├── NavBar.vue             Top navigation tabs + disconnect
│   ├── ColoredText.vue        Renders SerializedNode[] with AP colors
│   ├── TextClient.vue         Message log + command input
│   ├── HintsTable.vue         Sortable hints table + hint autocomplete
│   └── ColorPicker.vue        Color swatch + hex input (Settings page)
├── pages/
│   ├── Main.vue               Text Client page (default route)
│   └── SettingsPage.vue       User preferences page
└── styles/
    └── global.css             CSS custom properties, theme, base styles
```

## Setting Your Game Name

Open `src/stores/archipelago.ts` and change the `GAME_NAME` constant:

```ts
// src/stores/archipelago.ts, near the top of the file:

/** The game this tracker is built for. Set to "" for TextOnly mode. */
export const GAME_NAME = "A Link to the Past";  // <-- your game here
```

- Set to a game name string (e.g. `"Timespinner"`, `"Ocarina of Time"`) to
  connect as a full tracker for that game. The server will load the game's
  data package, enabling item/location name resolution and hint autocomplete.
- Set to `""` (empty string) for **TextOnly mode** — chat, hints, and messages
  still work, but game-specific item/location lookups are unavailable.

The connection form does **not** have a game input field; the game is always
determined by this constant.

## Reactive Data Model

All AP server data lives in `src/stores/archipelago.ts` as Vue reactive
exports. Import what you need — values update automatically when the server
pushes new data.

### State Exports

| Export               | Type                    | Description                                          |
|----------------------|-------------------------|------------------------------------------------------|
| `isConnected`        | `Ref<boolean>`          | Whether the client is connected                      |
| `isConnecting`       | `Ref<boolean>`          | Whether a connection attempt is in progress          |
| `connectionError`    | `Ref<string>`           | Error message from last failed connection, or `""`   |
| `slotName`           | `Ref<string>`           | Connected player's display alias                     |
| `gameName`           | `Ref<string>`           | Game name reported by the server                     |
| `teamNumber`         | `Ref<number>`           | Connected player's team number                       |
| `selfSlot`           | `Ref<number>`           | Connected player's slot number                       |
| `messages`           | `reactive<SerializedMessage[]>` | All server messages, chronological           |
| `hints`              | `reactive<SerializedHint[]>`    | All known hints (complete snapshot per update)|
| `receivedItems`      | `reactive<SerializedItem[]>`    | Items received, chronological (append-only)  |
| `checkedLocations`   | `reactive<number[]>`    | Location IDs the player has checked                  |
| `missingLocations`   | `reactive<number[]>`    | Location IDs the player has NOT checked              |
| `allItemNames`       | `Ref<string[]>`         | All item names from the game's data package          |
| `hintableItemNames`  | `Ref<string[]>`         | Item names available for hinting (excludes found)    |
| `hintPoints`         | `Ref<number>`           | Current hint points available                        |
| `hintCost`           | `Ref<number>`           | Cost to request a new hint                           |
| `client`             | `ShallowRef<Client \| null>` | Raw archipelago.js Client (advanced use only)   |

### Function Exports

| Export           | Signature                                              | Description                       |
|------------------|--------------------------------------------------------|-----------------------------------|
| `connect`        | `(address: string, slot: string, password: string) => Promise<void>` | Connect to a server |
| `disconnect`     | `() => void`                                           | Disconnect and reset all state    |
| `sendMessage`    | `(text: string) => Promise<void>`                      | Send a chat message or `!command` |

### Type Exports

| Type                 | Description                                              |
|----------------------|----------------------------------------------------------|
| `SerializedNode`     | A single node in a formatted AP message                  |
| `SerializedMessage`  | A server message with text, nodes, and messageType       |
| `SerializedHint`     | A hint with player names, item, location, status         |
| `SerializedItem`     | A received item with sender/receiver info                |
| `MessageType`        | Union of the 15 specific message event type strings      |
| `MESSAGE_TYPE_LABELS`| `Record<MessageType, string>` — human-readable labels    |
| `ALL_MESSAGE_TYPES`  | `MessageType[]` — all 15 types as an iterable array      |

## Accessing Data in Components

All state is importable from `@/stores/archipelago`. Because the values are
Vue reactive (`ref`, `reactive`), they work directly in `computed`, `watch`,
and templates.

```vue
<script setup lang="ts">
import { computed } from "vue";
import {
  hints,
  receivedItems,
  checkedLocations,
  missingLocations,
  selfSlot,
} from "@/stores/archipelago";

// These are all reactive — they update when the server pushes new data.

const myHints = computed(() =>
  hints.filter(h => h.receivingPlayerSlot === selfSlot.value)
);

const progressionItems = computed(() =>
  receivedItems.filter(item => item.flags & 0b001)
);

const progress = computed(() => {
  const total = checkedLocations.length + missingLocations.length;
  return total > 0
    ? `${checkedLocations.length} / ${total} (${Math.round(checkedLocations.length / total * 100)}%)`
    : "No locations loaded";
});
</script>

<template>
  <p>Progress: {{ progress }}</p>
  <p>Progression items: {{ progressionItems.length }}</p>
  <p>My hints: {{ myHints.length }}</p>
</template>
```

## Adding a New Page

Three steps:

### 1. Create the page component

Create a new `.vue` file in `src/pages/`:

```vue
<!-- src/pages/ItemTracker.vue -->
<template>
  <div class="item-tracker-page">
    <h2>Item Tracker</h2>
    <ul>
      <li v-for="item in receivedItems" :key="item.id">
        {{ item.name }} (from {{ item.senderAlias }})
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { receivedItems } from "@/stores/archipelago";
</script>

<style scoped>
.item-tracker-page {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
```

### 2. Register the route

In `src/router/index.ts`, import the page and add a route:

```ts
import ItemTracker from "@/pages/ItemTracker.vue";

const routes = [
  // ... existing routes ...
  {
    path: "/items",
    name: "Items",
    component: ItemTracker,
  },
];
```

### 3. Add a tab to the NavBar

In `src/components/NavBar.vue`, add an entry to the `tabs` array:

```ts
const tabs = [
  { path: "/text-client", label: "Text Client" },
  { path: "/items", label: "Items" },        // <-- new tab
  { path: "/settings", label: "Settings" },
];
```

## Working with Hints

Hints are stored in the `hints` reactive array as `SerializedHint` objects.
The array is replaced atomically on every server update (not incrementally
appended), so it is always a complete snapshot.

### SerializedHint Fields

| Field                  | Type     | Description                                    |
|------------------------|----------|------------------------------------------------|
| `receivingPlayer`      | `string` | Display name of the player who receives the item |
| `receivingPlayerSlot`  | `number` | Slot number of the receiving player            |
| `itemName`             | `string` | Resolved item name                             |
| `itemFlags`            | `number` | Classification bit flags (see below)           |
| `findingPlayer`        | `string` | Display name of the player whose world has it  |
| `findingPlayerSlot`    | `number` | Slot number of the finding player              |
| `location`             | `string` | Location name where the item can be found      |
| `entrance`             | `string` | Entrance name, or `"Vanilla"` if N/A          |
| `found`                | `boolean`| Whether the item has been collected             |

### Item Classification Flags

```ts
flags & 0b001  // Progression (value 1)
flags & 0b010  // Useful      (value 2)
flags & 0b100  // Trap        (value 4)
flags === 0    // Filler / Normal
```

### Examples

```ts
import { hints, selfSlot } from "@/stores/archipelago";
import { computed } from "vue";

// Hints for items I need to receive
const incomingHints = computed(() =>
  hints.filter(h => h.receivingPlayerSlot === selfSlot.value)
);

// Hints for items in my world that others need
const outgoingHints = computed(() =>
  hints.filter(h => h.findingPlayerSlot === selfSlot.value)
);

// Unfound progression hints for me
const urgentHints = computed(() =>
  hints.filter(h =>
    h.receivingPlayerSlot === selfSlot.value &&
    !h.found &&
    (h.itemFlags & 0b001)
  )
);
```

## Working with Items

Received items are stored in `receivedItems` as `SerializedItem` objects.
New items are appended chronologically; the array only grows.

### SerializedItem Fields

| Field           | Type     | Description                               |
|-----------------|----------|-------------------------------------------|
| `name`          | `string` | Resolved item name                        |
| `id`            | `number` | Numeric item ID from the data package     |
| `flags`         | `number` | Classification bit flags                  |
| `senderAlias`   | `string` | Display name of the player who sent it    |
| `senderSlot`    | `number` | Slot number of the sender                 |
| `receiverAlias` | `string` | Display name of the receiver (usually you)|
| `receiverSlot`  | `number` | Slot number of the receiver               |
| `locationName`  | `string` | Location the sender checked               |
| `locationId`    | `number` | Numeric location ID                       |

### Examples

```ts
import { receivedItems } from "@/stores/archipelago";
import { computed } from "vue";

// Count items by classification
const itemCounts = computed(() => ({
  progression: receivedItems.filter(i => i.flags & 0b001).length,
  useful:      receivedItems.filter(i => i.flags & 0b010).length,
  trap:        receivedItems.filter(i => i.flags & 0b100).length,
  filler:      receivedItems.filter(i => i.flags === 0).length,
}));

// Check if a specific item has been received
function hasItem(name: string): boolean {
  return receivedItems.some(i => i.name === name);
}

// Count how many of a specific item have been received
function itemCount(name: string): number {
  return receivedItems.filter(i => i.name === name).length;
}
```

## Working with Locations

Location data is split into two arrays of numeric location IDs:

- `checkedLocations` — IDs the player has checked
- `missingLocations` — IDs the player has NOT checked

Together they form the complete location set for the connected slot.

### Resolving Location Names

Use the raw `client` to resolve IDs to names if needed:

```ts
import { client, checkedLocations, gameName } from "@/stores/archipelago";
import { computed } from "vue";

const checkedLocationNames = computed(() => {
  const c = client.value;
  const game = gameName.value;
  if (!c || !game) return [];
  return checkedLocations.map(id =>
    c.package.lookupLocationName(game, id, true)
  );
});
```

### Progress Calculation

```ts
import { checkedLocations, missingLocations } from "@/stores/archipelago";
import { computed } from "vue";

const totalLocations = computed(() =>
  checkedLocations.length + missingLocations.length
);

const completionPercent = computed(() =>
  totalLocations.value > 0
    ? Math.round(checkedLocations.length / totalLocations.value * 100)
    : 0
);
```

## Working with Messages

Messages are stored in the `messages` reactive array. Each message has:

- `text` — plain text representation
- `nodes` — `SerializedNode[]` for color-coded rendering with `<ColoredText>`
- `messageType` — one of the 15 `MessageType` strings (for filtering)

### Rendering Messages

Use the `ColoredText` component to render messages with AP color styling:

```vue
<script setup lang="ts">
import { messages } from "@/stores/archipelago";
import ColoredText from "@/components/ColoredText.vue";
</script>

<template>
  <div v-for="(msg, i) in messages" :key="i">
    <ColoredText :nodes="msg.nodes" />
  </div>
</template>
```

### Filtering by Type

```ts
import { messages } from "@/stores/archipelago";
import { settings } from "@/stores/settings";
import { computed } from "vue";

// Messages filtered by user preferences (same as TextClient.vue)
const filteredMessages = computed(() =>
  messages.filter(msg => settings.messageFilters[msg.messageType])
);

// Only chat messages
const chatMessages = computed(() =>
  messages.filter(msg => msg.messageType === "chat")
);
```

### Message Types

All 15 types (the `MessageType` union):

| Type             | Label              | Description                           |
|------------------|--------------------|---------------------------------------|
| `itemSent`       | Item Sent          | A player sent an item to another      |
| `itemCheated`    | Item Cheated       | An item was cheated in                |
| `itemHinted`     | Item Hinted        | A hint was revealed                   |
| `connected`      | Player Connected   | A player connected to the server      |
| `disconnected`   | Player Disconnected| A player disconnected                 |
| `chat`           | Chat               | A player chat message                 |
| `serverChat`     | Server Chat        | A message from the server             |
| `tutorial`       | Tutorial           | A tutorial/help message               |
| `tagsUpdated`    | Tags Updated       | A player's tags changed               |
| `userCommand`    | Command Result     | Response to a `!command`              |
| `adminCommand`   | Admin Command      | Admin command output                  |
| `goaled`         | Goal               | A player reached their goal           |
| `released`       | Release            | A player released their remaining items |
| `collected`      | Collect            | A player collected their remaining items |
| `countdown`      | Countdown          | Server countdown message              |

## Color System & CSS Custom Properties

Colors are defined as CSS custom properties in `src/styles/global.css` and
are overridden at runtime by the settings store when the user customizes them
on the Settings page.

### AP Color Tokens

| CSS Variable            | Default     | Used For                    |
|-------------------------|-------------|-----------------------------|
| `--color-progression`   | `#cc88ff`   | Progression items (purple)  |
| `--color-useful`        | `#6699ff`   | Useful items (blue)         |
| `--color-filler`        | `#00eeee`   | Filler/normal items (cyan)  |
| `--color-trap`          | `#ee4444`   | Trap items (red)            |
| `--color-player`        | `#ffee00`   | Other players (yellow)      |
| `--color-player-self`   | `#eebb00`   | Current player (gold)       |
| `--color-location`      | `#00ff7f`   | Locations (green)           |
| `--color-entrance`      | `#5599ff`   | Entrances (blue)            |
| `--color-found`         | `#22aa22`   | Found/collected (green)     |
| `--color-hinted`        | `#cc88ff`   | Hinted status (purple)      |
| `--color-hard-logic`    | `#ffaa00`   | Hard logic (orange)         |
| `--color-out-of-logic`  | `#ee4444`   | Out of logic (red)          |

### Theme Tokens

The app supports dark (default) and light themes. Theme tokens are also CSS
custom properties:

| Token                | Description          |
|----------------------|----------------------|
| `--bg-primary`       | Page background      |
| `--bg-secondary`     | Card/panel background|
| `--bg-tertiary`      | Nested containers    |
| `--bg-input`         | Input field background|
| `--bg-row-even/odd`  | Table row striping   |
| `--bg-hover`         | Hover state          |
| `--bg-nav`           | Navigation bar       |
| `--text-primary`     | Main text            |
| `--text-secondary`   | Labels, headers      |
| `--text-muted`       | Subtle/placeholder   |
| `--border-color`     | Borders              |
| `--accent`           | Accent color (buttons, links) |

### Using Colors in Your Components

Reference the CSS variables directly in your styles:

```css
.my-item {
  color: var(--color-progression);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
```

Or use the helper functions from `src/utils/colors.ts`:

```ts
import { itemFlagColor, classificationLabel } from "@/utils/colors";

// Returns a CSS var reference: "var(--color-progression)", etc.
const color = itemFlagColor(item.flags);

// Returns a label: "Progression", "Useful", "Trap", "Normal"
const label = classificationLabel(item.flags);
```

## Settings Store

User preferences are in `src/stores/settings.ts`. The `settings` object is
Vue-reactive and auto-persists to localStorage.

```ts
import { settings, resetColors, resetAllSettings, resetMessageFilters } from "@/stores/settings";

// Read/write theme
settings.theme = "light";

// Read/write individual colors
settings.colors.progression = "#ff00ff";

// Check/toggle message filters
settings.messageFilters.chat = false;

// Reset functions
resetColors();          // Restore default color palette
resetMessageFilters();  // Re-enable all message types
resetAllSettings();     // Reset everything to defaults
```

### APColors Interface

```ts
interface APColors {
  progression: string;
  useful: string;
  filler: string;
  trap: string;
  player: string;
  playerSelf: string;
  location: string;
  entrance: string;
  found: string;
  hinted: string;
  hardLogic: string;
  outOfLogic: string;
}
```

## Serialization Layer — Why and How

archipelago.js class instances (`Hint`, `Item`, `Player`) use **private
fields** and **getter-only accessors**. Vue's `reactive()` proxy cannot
observe these — reads through the proxy silently return `undefined`.

Additionally, getters like `client.items.hints` return **new array copies**
on every access, so binding them to Vue reactivity would not trigger updates.

This template solves both problems:

1. **Event-driven updates** — The store subscribes to AP events
   (`itemsReceived`, `locationsChecked`, data storage changes, etc.) which
   fire whenever the server sends new data.

2. **Serialization** — When an event fires, the handler converts
   archipelago.js instances into **plain objects** (`SerializedHint`,
   `SerializedItem`, etc.) with only public data properties. These plain
   objects are fully compatible with Vue reactivity.

3. **Single write point** — Serialized data is written into Vue `reactive()`
   arrays/refs. Any component importing these exports gets automatic
   reactivity with zero extra work.

### Hints Specifically

Hints bypass the `ItemsManager` entirely due to race conditions in
archipelago.js v2.0.4. Instead, the store subscribes directly to the AP
data storage key `_read_hints_{team}_{slot}` via `client.storage.notify()`.
This provides a complete atomic snapshot of all hints on every update,
avoiding incremental sync bugs.

## Common Patterns & Recipes

### Check if a specific item was received

```ts
import { receivedItems } from "@/stores/archipelago";

const hasSword = computed(() =>
  receivedItems.some(i => i.name === "Progressive Sword")
);

const swordCount = computed(() =>
  receivedItems.filter(i => i.name === "Progressive Sword").length
);
```

### Build a checklist of key items

```ts
const KEY_ITEMS = ["Bow", "Hookshot", "Fire Rod", "Hammer"];

const keyItemStatus = computed(() =>
  KEY_ITEMS.map(name => ({
    name,
    received: receivedItems.some(i => i.name === name),
  }))
);
```

### Compute overall completion percentage

```ts
import { checkedLocations, missingLocations } from "@/stores/archipelago";

const completion = computed(() => {
  const total = checkedLocations.length + missingLocations.length;
  if (total === 0) return 0;
  return Math.round((checkedLocations.length / total) * 100);
});
```

### Filter hints by status

```ts
import { hints, selfSlot } from "@/stores/archipelago";

const unfoundHintsForMe = computed(() =>
  hints.filter(h =>
    h.receivingPlayerSlot === selfSlot.value && !h.found
  )
);
```

### Send a hint request programmatically

```ts
import { sendMessage } from "@/stores/archipelago";

async function requestHint(itemName: string) {
  await sendMessage(`!hint ${itemName}`);
}
```

### Access the raw Client for advanced operations

```ts
import { client } from "@/stores/archipelago";

// Look up an item name from the data package
const name = client.value?.package.lookupItemName("MyGame", 12345, true);

// Access slot data (game-specific settings the player configured)
const slotData = client.value?.room.slotData;
```

> **Note:** The `client` ShallowRef should only be used for operations not
> covered by the serialized state exports. Prefer the reactive exports for
> all normal UI data binding.
