<!--
  TextClient.vue — Message log and command input panel.

  Displays all server messages (filtered by user preferences), with a send
  bar for chat and AP commands. Supports command history via up/down arrows.
-->
<template>
  <div class="text-client">
    <div class="messages-header">Text Client</div>
    <div class="messages-scroll" ref="scrollContainer">
      <div
        v-for="(msg, i) in filteredMessages"
        :key="msg.index"
        class="message-row"
        :class="i % 2 === 0 ? 'row-even' : 'row-odd'"
      >
        <ColoredText :nodes="msg.nodes" />
      </div>
      <div v-if="filteredMessages.length === 0" class="empty">
        No messages yet.
      </div>
    </div>
    <form class="send-bar" @submit.prevent="handleSend">
      <input
        v-model="inputText"
        type="text"
        placeholder="Type a message or command (e.g. !help)..."
        :disabled="!isConnected"
        @keydown.up.prevent="historyUp"
        @keydown.down.prevent="historyDown"
      />
      <button type="submit" :disabled="!isConnected || !inputText.trim()">
        Send
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { messages, sendMessage, isConnected } from "@/stores/archipelago";
import { settings } from "@/stores/settings";
import ColoredText from "./ColoredText.vue";

const inputText = ref("");
const scrollContainer = ref<HTMLElement | null>(null);
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);

/** Messages filtered by the user's message type visibility preferences. */
const filteredMessages = computed(() => {
  return messages
    .map((msg, index) => ({ ...msg, index }))
    .filter((msg) => settings.messageFilters[msg.messageType]);
});

async function handleSend() {
  const text = inputText.value.trim();
  if (!text) return;
  commandHistory.value.unshift(text);
  if (commandHistory.value.length > 100) commandHistory.value.pop();
  historyIndex.value = -1;
  inputText.value = "";
  await sendMessage(text);
}

function historyUp() {
  if (commandHistory.value.length === 0) return;
  if (historyIndex.value < commandHistory.value.length - 1) {
    historyIndex.value++;
    inputText.value = commandHistory.value[historyIndex.value];
  }
}

function historyDown() {
  if (historyIndex.value > 0) {
    historyIndex.value--;
    inputText.value = commandHistory.value[historyIndex.value];
  } else {
    historyIndex.value = -1;
    inputText.value = "";
  }
}

// Auto-scroll on new messages
watch(
  () => filteredMessages.value.length,
  async () => {
    await nextTick();
    const el = scrollContainer.value;
    if (el) {
      // Only auto-scroll if user is near the bottom
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }
);
</script>

<style scoped>
.text-client {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.messages-header {
  padding: 8px 12px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: var(--bg-nav);
  border-bottom: 1px solid var(--border-color);
}

.messages-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.message-row {
  padding: 3px 12px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 0.85rem;
  line-height: 1.45;
}

.row-even {
  background: var(--bg-row-even);
}
.row-odd {
  background: var(--bg-row-odd);
}

.empty {
  color: var(--text-muted);
  text-align: center;
  padding: 24px;
  font-size: 0.85rem;
}

.send-bar {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-nav);
}

.send-bar input {
  flex: 1;
}

.send-bar button {
  flex-shrink: 0;
}
</style>
