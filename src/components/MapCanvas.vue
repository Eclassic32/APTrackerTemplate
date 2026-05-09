<!-- This page is meant to be modified, copied or deleted, depending on your needs -->
<template>
    <div ref="canvasWrapper" class="map-canvas-wrapper">
        <canvas
            ref="canvas"
            id="map-canvas"
            class="map-canvas"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
        ></canvas>
        <div
            v-if="hoveredCheck"
            class="check-popup"
            :style="{ left: `${popupPosition.x}px`, top: `${popupPosition.y}px` }"
        >
            <h3>{{ getLocationLabel(hoveredCheck.name) }}</h3>
            <p>Status: {{ getStateLabel(hoveredCheck.state) }}</p>
            <p v-if="settings.debug">Coords: {{ hoveredCheck.coordinate ?? 'Fallback placement' }}</p>
            <p v-if="settings.debug">State code: {{ hoveredCheck.state }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { settings } from '@/stores/settings';

const props = defineProps({
    imageSrc: { type: String, default: '/assets/bleh.jpg' },
    checks: { type: Object as () => Checks, required: true }
});

interface Checks {
    showLocations: boolean;
    locationState: {
        [key: string]: number; // -1 = out of logic, 0 = in logic, 1 = hinted, 2 = hard logic, 3 = found
    }
}

interface Marker {
    name: string;
    state: number;
    x: number;
    y: number;
    coordinate?: { x: number; y: number };
}

const locationCoordinates: { [key: string]: { x: number; y: number } } = {
    tongue: { x: 490, y: 861 },
    leftear: { x: 244, y: 410 },
    rightear: { x: 700, y: 410 },
    nose: { x: 490, y: 666 },
    head: { x: 490, y: 474 },
};

const locationColors: { [key: number]: string } = {
    '-1': settings.colors.outOfLogic, 
    '0': settings.colors.inLogic, 
    '1': settings.colors.hinted,
    '2': settings.colors.hardLogic, 
    '3': settings.colors.found
};

const canvas = ref<HTMLCanvasElement | null>(null);
const canvasWrapper = ref<HTMLDivElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const mapImage = ref<HTMLImageElement | null>(null);
const markerRects = ref<Marker[]>([]);
const hoveredCheck = ref<Marker | null>(null);
const popupPosition = ref({ x: 0, y: 0 });

const MARKER_SIZE = 14;
const MARKER_GAP = 6;
const FALLBACK_START_X = 8;
const FALLBACK_START_Y = 8;

const getLocationColor = (state: number) => {
    return locationColors[state] ?? settings.colors.inLogic;
};

const getStateLabel = (state: number) => {
    const labels: { [key: number]: string } = {
        '-1': 'Out of Logic',
        '0': 'In Logic',
        '1': 'Hinted',
        '2': 'Hard Logic',
        '3': 'Found'
    };

    return labels[state] ?? `Unknown (${state})`;
};

const getLocationLabel = (locationName: string) => {
    return locationName
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (char) => char.toUpperCase());
};

const drawLocationSquares = () => {
    if (!ctx.value || !canvas.value || !props.checks.showLocations) {
        markerRects.value = [];
        hoveredCheck.value = null;
        return;
    }

    let fallbackIndex = 0;
    const markers: Marker[] = [];

    Object.entries(props.checks.locationState).forEach(([locationName, state]) => {
        const coordinate = locationCoordinates[locationName];
        let x = 0;
        let y = 0;

        if (coordinate) {
            x = coordinate.x;
            y = coordinate.y;
        } else {
            x = FALLBACK_START_X + (MARKER_SIZE + MARKER_GAP) * fallbackIndex;
            y = FALLBACK_START_Y;
            fallbackIndex += 1;
        }

        ctx.value!.fillStyle = getLocationColor(state);
        ctx.value!.fillRect(x, y, MARKER_SIZE, MARKER_SIZE);
        ctx.value!.strokeStyle = '#000000';
        ctx.value!.lineWidth = 1;
        ctx.value!.strokeRect(x, y, MARKER_SIZE, MARKER_SIZE);

        markers.push({
            name: locationName,
            state,
            x,
            y,
            coordinate
        });
    });

    markerRects.value = markers;

    if (hoveredCheck.value) {
        hoveredCheck.value = markers.find((marker) => marker.name === hoveredCheck.value!.name) ?? null;
    }
};

const handleMouseMove = (event: MouseEvent) => {
    if (!canvas.value || !canvasWrapper.value || !props.checks.showLocations) {
        hoveredCheck.value = null;
        return;
    }

    const canvasRect = canvas.value.getBoundingClientRect();
    const wrapperRect = canvasWrapper.value.getBoundingClientRect();
    const scaleX = canvas.value.width / canvasRect.width;
    const scaleY = canvas.value.height / canvasRect.height;
    const canvasX = (event.clientX - canvasRect.left) * scaleX;
    const canvasY = (event.clientY - canvasRect.top) * scaleY;

    const marker = markerRects.value.find((item) => {
        return (
            canvasX >= item.x &&
            canvasX <= item.x + MARKER_SIZE &&
            canvasY >= item.y &&
            canvasY <= item.y + MARKER_SIZE
        );
    });

    hoveredCheck.value = marker ?? null;

    if (hoveredCheck.value) {
        popupPosition.value = {
            x: event.clientX - wrapperRect.left + 14,
            y: event.clientY - wrapperRect.top + 14
        };
    }
};

const handleMouseLeave = () => {
    hoveredCheck.value = null;
};

const drawCanvas = () => {
    if (!ctx.value || !canvas.value || !mapImage.value) {
        return;
    }

    canvas.value.width = mapImage.value.naturalWidth;
    canvas.value.height = mapImage.value.naturalHeight;
    ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height);
    ctx.value.drawImage(mapImage.value, 0, 0);
    drawLocationSquares();
};

onMounted(() => {
    if (canvas.value) {
        ctx.value = canvas.value.getContext('2d');
        const img = new Image();
        img.onload = () => {
            mapImage.value = img;
            drawCanvas();
        };
        img.src = props.imageSrc;
    }
});

watch(
    () => [props.imageSrc, props.checks.showLocations, props.checks.locationState, settings.colors],
    () => {
        drawCanvas();
    },
    { deep: true }
);
</script>

<style scoped>
    .map-canvas-wrapper {
    width: 100%;
        position: relative;
    }

    .map-canvas {
        display: block;
        width: 100%;
        height: calc(100vh - 48px);
        border: 1px solid #ccc;
    }

    .check-popup {
        position: absolute;
        z-index: 10;
        min-width: 180px;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-primary);
        color: var(--text-primary);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        pointer-events: none;
    }

    .check-popup h3 {
        margin: 0 0 6px 0;
        font-size: 14px;
    }

    .check-popup p {
        margin: 4px 0;
        font-size: 12px;
    }
</style>
