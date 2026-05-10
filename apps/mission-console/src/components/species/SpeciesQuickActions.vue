<template>
  <div class="species-quick-actions">
    <button type="button" class="species-quick-actions__button" @click="$emit('export')">
      Esporta scheda
    </button>
    <button type="button" class="species-quick-actions__button species-quick-actions__button--secondary" @click="$emit('save')">
      Salva nel pack
    </button>
  </div>
</template>

<script setup>
defineEmits(['export', 'save']);
</script>

<style scoped>
.species-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.species-quick-actions__button {
  background: linear-gradient(135deg, rgba(39, 121, 255, 0.35), rgba(39, 121, 255, 0.6));
  border: 1px solid rgba(39, 121, 255, 0.6);
  color: #f0f4ff;
  border-radius: 8px;
  padding: 0.6rem 1.1rem;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.species-quick-actions__button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(39, 121, 255, 0.25);
}

.species-quick-actions__button--secondary {
  background: transparent;
  border-color: rgba(240, 244, 255, 0.35);
}
</style>
