<!--
  App.vue — Root application component.

  Shows the ConnectionForm when not connected to a server.
  Once connected, displays the NavBar and the active route page.
-->
<template>
  <ConnectionForm v-if="!isConnected" />
  <template v-else>
    <NavBar />
    <router-view />
  </template>
</template>

<script setup lang="ts">
import { isConnected } from "@/stores/archipelago";
import ConnectionForm from "@/components/ConnectionForm.vue";
import NavBar from "@/components/NavBar.vue";
</script>
