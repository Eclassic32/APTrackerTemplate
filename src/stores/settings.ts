/**
 * settings.ts — User Preferences Store
 *
 * Manages theme (dark/light), color customization for AP item/player/location
 * colors, and message type filters. All settings are persisted to localStorage
 * and applied as CSS custom properties on the document root.
 *
 * The settings object is Vue-reactive: any component can import it and bind
 * directly (e.g. `settings.theme`, `settings.colors.progression`).
 */
import { reactive, watch } from "vue";
import { ALL_MESSAGE_TYPES, type MessageType } from "@/stores/archipelago";

/** Color values for all AP-specific color categories. */
export interface APColors {
  progression: string;
  useful: string;
  filler: string;
  trap: string;
  player: string;
  playerSelf: string;
  location: string;
  entrance: string;
  inLogic: string;
  found: string;
  hinted: string;
  hardLogic: string;
  outOfLogic: string;
}

/** Per-message-type visibility toggles for the text client. */
export type MessageFilters = Record<MessageType, boolean>;

export type LogicFilter = {
  inLogic: boolean;
  found: boolean;
  hinted: boolean;
  outOfLogic: boolean;
  hardLogic: boolean;
}

export type LogicSort = {
  inLogic: number;
  found: number;
  hinted: number;
  outOfLogic: number;
  hardLogic: number;
}

/** Complete settings state shape. */
export interface SettingsState {
  debug: boolean; 
  theme: "dark" | "light";
  colors: APColors;
  messageFilters: MessageFilters;
}

/** Default color palette. */
const DEFAULT_COLORS: APColors = {
  progression: "#cc88ff",
  useful: "#6699ff",
  filler: "#00eeee",
  trap: "#ee4444",
  player: "#ffee00",
  playerSelf: "#eebb00",
  location: "#00ff7f",
  entrance: "#5599ff",
  inLogic: "",
  found: "#22aa22",
  hinted: "#cc88ff",
  hardLogic: "#ffaa00",
  outOfLogic: "#ee4444",
};

/** Returns a MessageFilters object with all types enabled. */
function defaultMessageFilters(): MessageFilters {
  const filters = {} as MessageFilters;
  for (const t of ALL_MESSAGE_TYPES) {
    filters[t] = true;
  }
  return filters;
}

/** Load settings from localStorage, falling back to defaults for missing keys. */
function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem("ap-tracker-settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        debug: window.location.search.includes("debug") ?? false,
        theme: parsed.theme ?? "dark",
        colors: { ...DEFAULT_COLORS, ...(parsed.colors ?? {}) },
        messageFilters: { ...defaultMessageFilters(), ...(parsed.messageFilters ?? {}) },
      };
    }
  } catch {
    /* corrupted data — use defaults */
  }
  return {
    debug: false,
    theme: "dark",
    colors: { ...DEFAULT_COLORS },
    messageFilters: defaultMessageFilters(),
  };
}

/** Reactive settings state. Import and use directly in any component. */
export const settings = reactive<SettingsState>(loadSettings());

/** Sync CSS custom properties and theme class with the current settings. */
function applySettings() {
  const root = document.documentElement;

  if (settings.theme === "light") {
    root.classList.add("theme-light");
  } else {
    root.classList.remove("theme-light");
  }

  const colorVarMap: Record<keyof APColors, string> = {
    progression: "--color-progression",
    useful: "--color-useful",
    filler: "--color-filler",
    trap: "--color-trap",
    player: "--color-player",
    playerSelf: "--color-player-self",
    location: "--color-location",
    entrance: "--color-entrance",
    inLogic: "--color-in-logic",
    found: "--color-found",
    hinted: "--color-hinted",
    hardLogic: "--color-hard-logic",
    outOfLogic: "--color-out-of-logic",
  };

  for (const [key, cssVar] of Object.entries(colorVarMap)) {
    root.style.setProperty(cssVar, settings.colors[key as keyof APColors]);
  }
}

/** Write current settings to localStorage. */
function persistSettings() {
  localStorage.setItem("ap-tracker-settings", JSON.stringify(settings));
}

/** Reset all colors to the default palette. */
export function resetColors() {
  Object.assign(settings.colors, DEFAULT_COLORS);
}

/** Reset all settings (theme, colors, filters) to defaults. */
export function resetAllSettings() {
  settings.theme = "dark";
  resetColors();
  resetMessageFilters();
}

/** Re-enable all message type filters. */
export function resetMessageFilters() {
  Object.assign(settings.messageFilters, defaultMessageFilters());
}

// Automatically apply and persist whenever any setting changes.
watch(
  () => ({ ...settings, colors: { ...settings.colors } }),
  () => {
    applySettings();
    persistSettings();
  },
  { deep: true, immediate: true },
);
