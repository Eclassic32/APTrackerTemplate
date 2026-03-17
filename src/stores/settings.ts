import { reactive, watch } from "vue";
import { ALL_MESSAGE_TYPES, type MessageType } from "@/stores/archipelago";

export interface APColors {
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

/** Which message types are visible in the text client */
export type MessageFilters = Record<MessageType, boolean>;

export interface SettingsState {
  theme: "dark" | "light";
  colors: APColors;
  messageFilters: MessageFilters;
}

const DEFAULT_COLORS: APColors = {
  progression: "#cc88ff",
  useful: "#6699ff",
  filler: "#00eeee",
  trap: "#ee4444",
  player: "#ffee00",
  playerSelf: "#eebb00",
  location: "#00ff7f",
  entrance: "#5599ff",
  found: "#22aa22",
  hinted: "#cc88ff",
  hardLogic: "#ffaa00",
  outOfLogic: "#ee4444",
};

function defaultMessageFilters(): MessageFilters {
  const filters = {} as MessageFilters;
  for (const t of ALL_MESSAGE_TYPES) {
    filters[t] = true;
  }
  return filters;
}

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem("ap-tracker-settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme ?? "dark",
        colors: { ...DEFAULT_COLORS, ...(parsed.colors ?? {}) },
        messageFilters: { ...defaultMessageFilters(), ...(parsed.messageFilters ?? {}) },
      };
    }
  } catch {
    // ignore
  }
  return {
    theme: "dark",
    colors: { ...DEFAULT_COLORS },
    messageFilters: defaultMessageFilters(),
  };
}

export const settings = reactive<SettingsState>(loadSettings());

/** Apply CSS variables and theme class to document */
function applySettings() {
  const root = document.documentElement;

  // Theme class
  if (settings.theme === "light") {
    root.classList.add("theme-light");
  } else {
    root.classList.remove("theme-light");
  }

  // Color variables
  const colorVarMap: Record<keyof APColors, string> = {
    progression: "--color-progression",
    useful: "--color-useful",
    filler: "--color-filler",
    trap: "--color-trap",
    player: "--color-player",
    playerSelf: "--color-player-self",
    location: "--color-location",
    entrance: "--color-entrance",
    found: "--color-found",
    hinted: "--color-hinted",
    hardLogic: "--color-hard-logic",
    outOfLogic: "--color-out-of-logic",
  };

  for (const [key, cssVar] of Object.entries(colorVarMap)) {
    root.style.setProperty(cssVar, settings.colors[key as keyof APColors]);
  }
}

/** Persist settings to localStorage */
function persistSettings() {
  localStorage.setItem("ap-tracker-settings", JSON.stringify(settings));
}

/** Reset colors to defaults */
export function resetColors() {
  Object.assign(settings.colors, DEFAULT_COLORS);
}

/** Reset all settings to defaults */
export function resetAllSettings() {
  settings.theme = "dark";
  resetColors();
  resetMessageFilters();
}

/** Reset message filters to all enabled */
export function resetMessageFilters() {
  Object.assign(settings.messageFilters, defaultMessageFilters());
}

// Watch for changes and apply/persist
watch(
  () => ({ ...settings, colors: { ...settings.colors } }),
  () => {
    applySettings();
    persistSettings();
  },
  { deep: true, immediate: true }
);
