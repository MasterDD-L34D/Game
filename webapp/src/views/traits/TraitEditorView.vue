<template>
  <section class="trait-editor-view">
    <div ref="mountRef" class="trait-editor-view__container"></div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import TraitEditor from '../../features/traits/Editor';

interface TraitEditorViewProps {
  traitId?: string;
}

const props = defineProps<TraitEditorViewProps>();
const mountRef = ref<HTMLElement | null>(null);
let root: Root | null = null;

function renderApp(traitId?: string) {
  if (!root || !mountRef.value) {
    return;
  }
  root.render(React.createElement(TraitEditor, { initialTraitId: traitId }));
}

onMounted(() => {
  if (!mountRef.value) {
    return;
  }
  root = createRoot(mountRef.value);
  renderApp(props.traitId);
});

watch(
  () => props.traitId,
  (nextTraitId) => {
    if (!root) {
      return;
    }
    renderApp(nextTraitId);
  },
);

onBeforeUnmount(() => {
  if (root) {
    root.unmount();
    root = null;
  }
});
</script>

<style scoped>
.trait-editor-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.trait-editor-view__container {
  width: 100%;
}
</style>
