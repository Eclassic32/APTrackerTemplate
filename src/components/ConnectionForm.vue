<template>
  <div class="connection-form">
    <div class="connection-section">
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

      <div class="side-container">
        <CardButton
          title="Example Button"
          description="Button description"
          link="https://example.com"
        />
        <div class="flex-h socials">
          <a v-for="link in socials" :href="link.url" target="_blank" class="social-link">{{ link.name }}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ConnectionForm.vue — Server connection screen.
 *
 * Shown before the user connects. Collects server address, slot name, and
 * optional password. The game name is set via the GAME_NAME constant in
 * `@/stores/archipelago.ts` and is not user-configurable here.
 *
 * Connection fields are persisted to localStorage for convenience.
 */
import { ref } from "vue";
import { connect, isConnecting, connectionError } from "@/stores/archipelago";
import CardButton from "@/components/CardButton.vue";

const socials = [
  { name: "GitHub", url: "https://github.com/Eclassic32/ShapezAPTracker" },
  { name: "Discord", url: "https://discord.gg/archipelago" },
  { name: "Ko-fi", url: "https://ko-fi.com/eclassic32" },
];

const address = ref(localStorage.getItem("serverAddress") || "archipelago.gg:38281");
const slot = ref(localStorage.getItem("slotName") || "");
const password = ref(localStorage.getItem("password") || "");

async function handleConnect() {
  if (!slot.value.trim()) return;
  await connect(address.value, slot.value, password.value);
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

.connection-section {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  align-items: flex-start;
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

/* Side container */
.side-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 350px;
}

.flex-h {
  display: flex;
  flex-direction: row;
  gap: 12px;
}

.social-link {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 5px 8px;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  width: 100%;
  text-align: center;
}

.social-link:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

</style>
