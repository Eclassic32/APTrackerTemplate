<!--
  HintsTable.vue — Sortable hints table with autocomplete hint input.

  Displays all hints from the archipelago store in a table with sortable
  columns. Includes an autocomplete input bar at the bottom for requesting
  new hints via the !hint command.
-->
<template>
  <div class="hints-panel">
    <div class="hints-header">Hints</div>
    <div class="hints-scroll">
      <table class="hints-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="sortable-th"
              :class="col.key + '-cell'"
              @click="toggleSort(col.key)"
            >
              {{ col.label }}
              <span class="sort-indicator">
                {{ sortKey === col.key ? (sortAsc ? '\u25B2' : '\u25BC') : '' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(hint, i) in sortedHints"
            :key="hint._idx"
            :class="i % 2 === 0 ? 'row-even' : 'row-odd'"
          >
            <td class="copyBtn-cell">
              <span title="Copy" class="copy-btn" @click="copyHintText(hint)"></span>
            </td>
            <td class="receivingPlayer-cell">
              <span
                :style="{
                  color:
                    hint.receivingPlayerSlot === selfSlot
                      ? 'var(--color-player-self)'
                      : 'var(--color-player)',
                }"
              >{{ hint.receivingPlayer }}</span>
            </td>
            <td class="itemName-cell">
              <span :style="{ color: itemColor(hint.itemFlags) }">
                {{ hint.itemName }}
              </span>
            </td>
            <td class="findingPlayer-cell">
              <span
                :style="{
                  color:
                    hint.findingPlayerSlot === selfSlot
                      ? 'var(--color-player-self)'
                      : 'var(--color-player)',
                }"
              >{{ hint.findingPlayer }}</span>
            </td>
            <td class="location-cell">
              <span style="color: var(--color-location)">
                {{ hint.location }}
              </span>
            </td>
            <td class="entrance-cell">
              <span style="color: var(--color-entrance)">
                {{ hint.entrance }}
              </span>
            </td>
            <td class="itemClass-cell">
              <span :style="{ color: itemClassColor(hint) }">
                {{ itemClassText(hint) }}
              </span>
            </td>
          </tr>
          <tr v-if="hints.length === 0">
            <td colspan="7" class="empty-row">No hints yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- New Hint Input -->
    <div class="hint-input-bar">
      <div class="hint-autocomplete" ref="autocompleteContainer">
        <input
          v-model="hintQuery"
          type="text"
          placeholder="Type an item name to hint..."
          :disabled="!isConnected"
          @input="onQueryInput"
          @keydown.down.prevent="selectNext"
          @keydown.up.prevent="selectPrev"
          @keydown.enter.prevent="confirmHint"
          @keydown.escape="showSuggestions = false"
          @focus="onQueryInput"
          ref="hintInput"
        />
        <ul v-if="showSuggestions && filteredItems.length > 0" class="suggestions">
          <li
            v-for="(item, i) in filteredItems"
            :key="item"
            :class="{ selected: i === selectedIndex }"
            @mousedown.prevent="pickItem(item)"
          >
            {{ item }}
          </li>
        </ul>
      </div>
      <button
        @click="confirmHint"
        :disabled="!isConnected || !hintQuery.trim()"
      >
        Hint
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  hints,
  selfSlot,
  hintableItemNames,
  isConnected,
  sendMessage,
} from "@/stores/archipelago";
import type { SerializedHint } from "@/stores/archipelago";
import { itemFlagColor, classificationLabel } from "@/utils/colors";

/* ---- Column Sorting ---- */

type SortKey = 'copyBtn'
  | "receivingPlayer"
  | "itemName"
  | "findingPlayer"
  | "location"
  | "entrance"
  | "itemClass";

const columns: { key: SortKey; label: string }[] = [
  { key: "copyBtn", label: "" },
  { key: "receivingPlayer", label: "Receiving Player" },
  { key: "itemName", label: "Item Name" },
  { key: "findingPlayer", label: "Finding Player" },
  { key: "location", label: "Location" },
  { key: "entrance", label: "Entrance" },
  { key: "itemClass", label: "Class" },
];

const sortKey = ref<SortKey>("itemClass");
const sortAsc = ref(true);

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
}

/**
 * Sort priority for hint itemClass (ascending):
 * Found first, then by item classification importance.
 */
function itemClassSortOrder(hint: SerializedHint): number {
  if (hint.found) return 0;
  const flags = hint.itemFlags;
  if (flags & 0b001) return 1; // Progression
  if (flags & 0b010) return 2; // Useful
  if (flags & 0b100) return 4; // Trap
  return 3; // Normal/Filler
}

function getSortValue(hint: SerializedHint, key: SortKey): string | number {
  switch (key) {
    case "receivingPlayer":
      return hint.receivingPlayer.toLowerCase();
    case "itemName":
      return hint.itemName.toLowerCase();
    case "findingPlayer":
      return hint.findingPlayer.toLowerCase();
    case "location":
      return hint.location.toLowerCase();
    case "entrance":
      return hint.entrance.toLowerCase();
    case "itemClass":
    case "copyBtn":
      return itemClassSortOrder(hint);
  }
}

interface IndexedHint extends SerializedHint {
  /** Original index in the hints array, used for stable unique keys */
  _idx: number;
}

const sortedHints = computed<IndexedHint[]>(() => {
  const arr: IndexedHint[] = hints.map((h, i) => ({ ...h, _idx: i }));
  const key = sortKey.value;
  const dir = sortAsc.value ? 1 : -1;

  arr.sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });

  return arr;
});

/* ---- Item Class Display ---- */

function itemColor(flags: number): string {
  return itemFlagColor(flags);
}

function itemClassColor(hint: SerializedHint): string {
  if (hint.found) return "var(--color-found)";
  return itemFlagColor(hint.itemFlags);
}

function itemClassText(hint: SerializedHint): string {
  if (hint.found) return "Found";
  return classificationLabel(hint.itemFlags);
}

/* ---- Hint Autocomplete ---- */

const hintQuery = ref("");
const showSuggestions = ref(false);
const selectedIndex = ref(0);
const hintInput = ref<HTMLInputElement | null>(null);
const autocompleteContainer = ref<HTMLElement | null>(null);

const filteredItems = computed(() => {
  const q = hintQuery.value.toLowerCase().trim();
  if (!q) return hintableItemNames.value.slice(0, 50);
  return hintableItemNames.value
    .filter((name) => name.toLowerCase().includes(q))
    .slice(0, 50);
});

function onQueryInput() {
  showSuggestions.value = true;
  selectedIndex.value = 0;
}

function selectNext() {
  if (selectedIndex.value < filteredItems.value.length - 1) {
    selectedIndex.value++;
  }
}

function selectPrev() {
  if (selectedIndex.value > 0) {
    selectedIndex.value--;
  }
}

function pickItem(item: string) {
  hintQuery.value = item;
  showSuggestions.value = false;
}

async function confirmHint() {
  if (showSuggestions.value && filteredItems.value.length > 0) {
    hintQuery.value = filteredItems.value[selectedIndex.value];
    showSuggestions.value = false;
    return;
  }
  const text = hintQuery.value.trim();
  if (!text) return;
  await sendMessage(`!hint ${text}`);
  hintQuery.value = "";
}

/* Close suggestions when clicking outside the autocomplete container. */
function onDocumentClick(e: MouseEvent) {
  if (
    autocompleteContainer.value &&
    !autocompleteContainer.value.contains(e.target as Node)
  ) {
    showSuggestions.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick, true);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick, true);
});

function copyHintText(hint: SerializedHint) {
  const text = `${hint.receivingPlayer}'s ${hint.itemName} at ${hint.location} in ${hint.findingPlayer}'s world`
                 + (hint.entrance && hint.entrance != 'Vanilla' ? ` (${hint.entrance})` : '');
  navigator.clipboard.writeText(text);
}
</script>

<style scoped>
.hints-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.hints-header {
  padding: 8px 12px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: var(--bg-nav);
  border-bottom: 1px solid var(--border-color);
}

.hints-scroll {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.hints-table {
  width: 100%;
  border-collapse: collapse;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 0.82rem;
}

.hints-table thead th {
  position: sticky;
  top: 0;
  background: var(--bg-nav);
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  font-size: 0.78rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.sortable-th {
  cursor: pointer;
  user-select: none;
}

.sortable-th:hover {
  color: var(--text-primary);
}

.sort-indicator {
  font-size: 0.65rem;
  margin-left: 4px;
}

.hints-table tbody td {
  padding: 4px 10px;
  white-space: nowrap;
}

.copyBtn-cell {
  padding: 0 4px !important;
  cursor: pointer;
}
.receivingPlayer-cell {
  padding-left: 4px !important;
}

.copyBtn-cell .copy-btn {
  display: inline-block;
  vertical-align: center;
  width: 16px;
  height: 16px;
  background-color: var(--text-secondary);
  -webkit-mask: url('/assets/copy-icon.svg') no-repeat center / contain;
  mask: url('/assets/copy-icon.svg') no-repeat center / contain;
}

.copyBtn-cell .copy-btn:hover {
  background-color: var(--text-primary);
}

.row-even {
  background: var(--bg-row-even);
}
.row-odd {
  background: var(--bg-row-odd);
}

.empty-row {
  color: var(--text-muted);
  text-align: center;
  padding: 24px !important;
}

/* Hint Input Bar */
.hint-input-bar {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-nav);
}

.hint-autocomplete {
  flex: 1;
  position: relative;
}

.hint-autocomplete input {
  width: 100%;
}

.suggestions {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  list-style: none;
  margin: 0 0 4px 0;
  padding: 0;
  z-index: 100;
}

.suggestions li {
  padding: 5px 10px;
  cursor: pointer;
  font-size: 0.82rem;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

.suggestions li:hover,
.suggestions li.selected {
  background: var(--bg-hover);
}
</style>
