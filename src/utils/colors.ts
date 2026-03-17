/**
 * colors.ts — AP Color Utilities
 *
 * Helper functions for resolving Archipelago item classification flags and
 * AP JSON message colors into CSS values. These reference the CSS custom
 * properties defined in global.css / settings.ts so that user color
 * preferences are respected automatically.
 */
import type { ValidJSONColorType } from "archipelago.js";

/**
 * Returns the CSS custom property for an item's classification flags.
 *
 * Flag bits: 0b001 = Progression, 0b010 = Useful, 0b100 = Trap, 0 = Filler.
 */
export function itemFlagColor(flags: number): string {
  if (flags & 0b100) return "var(--color-trap)";
  if (flags & 0b001) return "var(--color-progression)";
  if (flags & 0b010) return "var(--color-useful)";
  return "var(--color-filler)";
}

/**
 * Returns a human-readable label for an item's classification flags.
 */
export function classificationLabel(flags: number): string {
  if (flags & 0b100) return "Trap";
  if (flags & 0b001) return "Progression";
  if (flags & 0b010) return "Useful";
  return "Normal";
}

/**
 * Maps an AP JSON color name to a foreground CSS color value.
 * Background color names (e.g. "red_bg") return transparent for the foreground.
 */
export function apColorToCSS(color: ValidJSONColorType): string {
  const map: Record<string, string> = {
    bold: "inherit",
    underline: "inherit",
    black: "#000000",
    red: "#ee4444",
    green: "#22cc22",
    yellow: "#ffee00",
    blue: "#6699ff",
    magenta: "#cc88ff",
    cyan: "#00eeee",
    white: "#ffffff",
    black_bg: "transparent",
    red_bg: "transparent",
    green_bg: "transparent",
    yellow_bg: "transparent",
    blue_bg: "transparent",
    purple_bg: "transparent",
    cyan_bg: "transparent",
    white_bg: "transparent",
  };
  return map[color] ?? "inherit";
}

/** Returns "700" for bold colors, otherwise "inherit". */
export function apColorFontWeight(color: ValidJSONColorType): string {
  return color === "bold" ? "700" : "inherit";
}

/** Returns "underline" for underline colors, otherwise "inherit". */
export function apColorTextDecoration(color: ValidJSONColorType): string {
  return color === "underline" ? "underline" : "inherit";
}

/** Maps AP JSON background color names to CSS background-color values. */
export function apColorBg(color: ValidJSONColorType): string {
  const bgMap: Record<string, string> = {
    black_bg: "#000000",
    red_bg: "#442222",
    green_bg: "#224422",
    yellow_bg: "#444422",
    blue_bg: "#222244",
    purple_bg: "#332244",
    cyan_bg: "#224444",
    white_bg: "#444444",
  };
  return bgMap[color] ?? "transparent";
}
