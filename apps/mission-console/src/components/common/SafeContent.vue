<template>
  <component :is="tag" v-if="sanitized" v-html="sanitized" v-bind="$attrs" />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { renderMarkdownToSafeHtml, sanitizeHtml } from '../../utils/sanitizer';

const props = defineProps<{
  source?: string | null;
  kind?: 'html' | 'markdown';
  tag?: keyof HTMLElementTagNameMap;
}>();

const tag = computed(() => props.tag ?? 'div');

const sanitized = computed(() => {
  if (!props.source) {
    return '';
  }
  return props.kind === 'markdown' ? renderMarkdownToSafeHtml(props.source) : sanitizeHtml(props.source);
});
</script>
