import type { ValidJSONColorType } from "archipelago.js";

/**
 * Returns the CSS variable name for a given AP item classification flag value.
 */
export function itemFlagColor(flags: number): string {
  if (flags & 0b100) return "var(--color-trap)";
  if (flags & 0b001) return "var(--color-progression)";
  if (flags & 0b010) return "var(--color-useful)";
  return "var(--color-filler)";
}

/**
 * Returns the CSS variable name for a given item classification label.
 */
export function classificationLabel(flags: number): string {
  if (flags & 0b100) return "Trap";
  if (flags & 0b001) return "Progression";
  if (flags & 0b010) return "Useful";
  return "Normal";
}

/**
 * Map AP JSON color names to CSS colors.
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

/**
 * Returns CSS font-weight for AP JSON color if it is bold.
 */
export function apColorFontWeight(color: ValidJSONColorType): string {
  return color === "bold" ? "700" : "inherit";
}

/**
 * Returns CSS text-decoration for AP JSON color if it is underline.
 */
export function apColorTextDecoration(color: ValidJSONColorType): string {
  return color === "underline" ? "underline" : "inherit";
}

/**
 * Returns CSS background-color for AP JSON bg colors.
 */
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
