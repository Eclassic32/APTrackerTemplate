<template>
<label class="checkbox-label">
    <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    {{ label }}
</label>
</template>

<script setup lang="ts">
defineProps<{
    label: string,
    modelValue: boolean
}>()

defineEmits<{
    "update:modelValue": [value: boolean]
}>()
</script>