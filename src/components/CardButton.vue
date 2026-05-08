<template>
<a :href="link" target="_blank" class="card-button-link">
    <div class="card-button-info">
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
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px 32px;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.card-button-info:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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