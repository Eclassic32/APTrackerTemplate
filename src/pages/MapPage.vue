<!-- This page is meant to be modified, copied or deleted, depending on your needs -->
<template>
    <div class="map-container">
        <MapCanvas imageSrc="/assets/bleh.jpg" />
    </div>
</template>

<script setup lang="ts">
    import MapCanvas from '@/components/MapCanvas.vue';
</script>

<style scoped>
    .map-container {
        padding: 24px;
    }
</style>