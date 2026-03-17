<template>
  <div class="text-client-page">
    <HintsTable />
    <TextClient />
  </div>
</template>

<script setup lang="ts">
import HintsTable from "@/components/HintsTable.vue";
import TextClient from "@/components/TextClient.vue";
</script>

<style scoped>
.text-client-page {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  padding: 12px;
}

/* Stack vertically on narrow screens */
@media (max-width: 900px) {
  .text-client-page {
    flex-direction: column;
  }
}
</style>
