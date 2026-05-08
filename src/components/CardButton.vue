<template>
<a :href="link" target="_blank" class="card-button-link">
    <div class="card card-hover card-button-info">
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
    </div>
</a>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  description : {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  }
});
</script>

<style scoped>
.card-button-link {
  text-decoration: none;
  color: inherit;
}

.card-button-info {
  padding: 24px 32px;
}

.card-button-info h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.card-button-info p {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>