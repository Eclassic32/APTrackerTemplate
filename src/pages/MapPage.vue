<!-- This page is meant to be modified, copied or deleted, depending on your needs -->
<template>
<div class="map-container">
    <MapCanvas imageSrc="/assets/bleh.jpg" :checks="checks" />
    <div class="sidebar">
        <h3>Sidebar</h3>
        <SettingsCheckbox v-model="checks.showLocations" label="Show Locations" />
        <div class="location-controls" v-for="(state, location) in checks.locationState" :key="location">
            <label :for="location">{{ location }}</label>
            <select :id="location" v-model="checks.locationState[location]">
                <option :value="-1">Out of Logic</option>
                <option :value="0">In Logic</option>
                <option :value="1">Hinted</option>
                <option :value="2">Hard Logic</option>
                <option :value="3">Found</option>
            </select>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import MapCanvas from '@/components/MapCanvas.vue';
import SettingsCheckbox from '@/components/SettingsCheckbox.vue';

type Checks = {
    showLocations: boolean;
    locationState: {
        [key: string]: number; // -1 = out of logic, 0 = in logic, 1 = hinted, 2 = hard logic, 3 = found
    }
}

const checks = reactive<Checks>({
    showLocations: true,
    locationState: {
        tongue: 3,
        leftear: 2,
        rightear: 1,
        nose: 0,
        head: -1,
        fridge: -1,
        tenisRacket: 0,
    }
});

// const checks: Checks = {
//     showLocations: true,
//     locationState: {
//         tongue: 3,
//         leftear: 2,
//         rightear: 1,
//         nose: 0,
//         head: -1,
//         fridge: -1,
//         tenisRacket: 0,
//     }
// };

</script>

<style scoped>
.map-container {
    display: flex;
    flex-direction: row;
}
.sidebar {
    width: 250px;
    padding: 16px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
}
.location-controls {
    margin: 8px 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}
</style>