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
