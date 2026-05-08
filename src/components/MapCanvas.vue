<!-- This page is meant to be modified, copied or deleted, depending on your needs -->
<template>
  <canvas ref="canvas" id="map-canvas" class="map-canvas"></canvas>
</template>

<script setup lang="ts">
    import { ref, onMounted } from 'vue';

    const props = defineProps({
        imageSrc: { type: String, default: '/assets/bleh.jpg' },
    });

    const canvas = ref<HTMLCanvasElement | null>(null);
    const ctx = ref<CanvasRenderingContext2D | null>(null);

    onMounted(() => {
        if (canvas.value) {
            ctx.value = canvas.value.getContext('2d');
            const img = new Image();
            img.onload = () => {
                if (ctx.value) {
                    canvas.value!.width = img.naturalWidth;
                    canvas.value!.height = img.naturalHeight;
                    ctx.value.drawImage(img, 0, 0);
                }
            };
            img.src = props.imageSrc;
        }
    });
</script>

<style scoped>
    .map-canvas {
        display: block;
        width: 100%;
        height: 80vh;
        border: 1px solid #ccc;
    }
</style>