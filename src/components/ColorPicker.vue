<!--
  ColorPicker.vue — Color input with swatch, hex text field, and preview dot.

  Used on the Settings page for customizing AP color categories.

  Props:
    label      — Display label for the color field.
    modelValue — Hex color string (v-model compatible).
-->
<template>
  <div class="color-picker-field">
    <label>{{ label }}</label>
    <div class="color-picker-row">
      <input
        type="color"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="color-swatch"
      />
      <input
        type="text"
        :value="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="color-text"
        maxlength="7"
      />
      <span class="color-preview" :style="{ background: modelValue }"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  modelValue: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<style scoped>
.color-picker-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-picker-field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-swatch {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  background: none;
}

.color-text {
  width: 80px;
  font-family: "Consolas", monospace;
  font-size: 0.82rem;
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
}
</style>
