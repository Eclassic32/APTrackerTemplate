<template>
  <div class="connection-form">
    <div class="connection-card">
      <h1 class="title">Archipelago Tracker</h1>
      <p class="subtitle">Connect to an Archipelago server</p>

      <form @submit.prevent="handleConnect" class="form">
        <div class="field">
          <label for="address">Server Address</label>
          <input
            id="address"
            v-model="address"
            type="text"
            placeholder="archipelago.gg:38281"
            :disabled="isConnecting"
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="slotInput">Slot Name</label>
          <input
            id="slotInput"
            v-model="slot"
            type="text"
            placeholder="Player1"
            :disabled="isConnecting"
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="game">Game <span class="optional">(optional, leave empty for TextOnly)</span></label>
          <input
            id="game"
            v-model="game"
            type="text"
            placeholder=""
            :disabled="isConnecting"
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="password">Password <span class="optional">(optional)</span></label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder=""
            :disabled="isConnecting"
            autocomplete="off"
          />
        </div>

        <button type="submit" :disabled="isConnecting || !slot.trim()">
          {{ isConnecting ? "Connecting..." : "Connect" }}
        </button>

        <p v-if="connectionError" class="error">{{ connectionError }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { connect, isConnecting, connectionError } from "@/stores/archipelago";

const address = ref(localStorage.getItem("serverAddress") || "archipelago.gg:38281");
const slot = ref(localStorage.getItem("slotName") || "");
const game = ref(localStorage.getItem("gameName") || "");
const password = ref(localStorage.getItem("password") || "");

async function handleConnect() {
  if (!slot.value.trim()) return;
  await connect(address.value, slot.value, game.value, password.value);
}
</script>

<style scoped>
.connection-form {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 24px;
}

.connection-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
}

.title {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  margin-bottom: 28px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.optional {
  font-weight: 400;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.field input {
  width: 100%;
}

.error {
  color: var(--danger);
  font-size: 0.85rem;
  text-align: center;
}
</style>
