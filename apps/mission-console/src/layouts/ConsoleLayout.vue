<template>
  <section class="console-layout">
    <RouterView v-slot="slotProps">
      <component :is="slotProps.Component" v-bind="slotProps.route.props || {}" @notify="forwardNotification" />
    </RouterView>
  </section>
</template>

<script setup>
import { RouterView } from 'vue-router';

const emit = defineEmits(['notify']);

function forwardNotification(payload) {
  emit('notify', payload);
}
</script>

<style scoped>
.console-layout {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}
</style>
