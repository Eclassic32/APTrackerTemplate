<!--
  ColoredText.vue — Renders a list of SerializedNode objects with AP color styling.

  Used to display server messages with per-node formatting (item colors,
  player highlights, location colors, etc.). Pass nodes from a SerializedMessage.

  Usage:
    <ColoredText :nodes="message.nodes" />
-->
<template>
  <span
    v-for="(node, i) in nodes"
    :key="i"
    :style="nodeStyle(node)"
    :class="nodeClass(node)"
  >{{ node.text }}</span>
</template>

<script setup lang="ts">
import type { SerializedNode } from "@/stores/archipelago";
import { selfSlot } from "@/stores/archipelago";
import { itemFlagColor, apColorToCSS, apColorBg, apColorFontWeight, apColorTextDecoration } from "@/utils/colors";
import type { ValidJSONColorType } from "archipelago.js";

defineProps<{
  nodes: SerializedNode[];
}>();

function nodeStyle(node: SerializedNode): Record<string, string> {
  switch (node.type) {
    case "item":
      return { color: itemFlagColor(node.itemFlags ?? 0) };
    case "player":
      return {
        color:
          node.playerSlot === selfSlot.value
            ? "var(--color-player-self)"
            : "var(--color-player)",
      };
    case "location":
      return { color: "var(--color-location)" };
    case "entrance":
      return { color: "var(--color-entrance)" };
    case "color": {
      const c = (node.color ?? "white") as ValidJSONColorType;
      return {
        color: apColorToCSS(c),
        backgroundColor: apColorBg(c),
        fontWeight: apColorFontWeight(c),
        textDecoration: apColorTextDecoration(c),
      };
    }
    default:
      return {};
  }
}

function nodeClass(node: SerializedNode): string {
  return `msg-node msg-node--${node.type}`;
}
</script>

<style scoped>
.msg-node {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
