<!--
  NavBar.vue — Top navigation bar shown after connecting.

  Displays tabs for each route and the connected player's slot name.
  To add a new tab, add an entry to the `tabs` array below AND register
  the route in src/router/index.ts.
-->
<template>
  <nav class="navbar">
    <div class="nav-tabs">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="nav-tab"
        active-class="nav-tab--active"
      >
        {{ tab.label }}
      </router-link>
    </div>
    <div class="nav-info">
      <span class="connected-label">
        Connected as: <strong>{{ slotName }}</strong>
      </span>
      <button class="danger disconnect-btn" @click="handleDisconnect">
        Disconnect
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { slotName, disconnect } from "@/stores/archipelago";
import { useRouter } from "vue-router";

const router = useRouter();

/** Add new page tabs here. Each entry needs a matching route in router/index.ts. */
const tabs = [
  { path: "/text-client", label: "Text Client" },
  { path: "/settings", label: "Settings" },
];

function handleDisconnect() {
  disconnect();
  router.push("/");
}
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-nav);
  border-bottom: 1px solid var(--border-color);
  padding: 0 16px;
  height: 48px;
  flex-shrink: 0;
}

.nav-tabs {
  display: flex;
  gap: 4px;
  height: 100%;
}

.nav-tab {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 100%;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.nav-tab:hover {
  color: var(--text-primary);
}

.nav-tab--active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.nav-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.connected-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.connected-label strong {
  color: var(--color-player-self);
}

.disconnect-btn {
  padding: 4px 12px;
  font-size: 0.8rem;
}
</style>
