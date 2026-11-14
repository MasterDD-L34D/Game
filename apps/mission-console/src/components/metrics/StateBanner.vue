<template>
  <section v-if="hasContent" class="state-banner" role="status" aria-live="polite">
    <div class="state-banner__tokens" v-if="tokens.length">
      <StateToken
        v-for="token in tokens"
        :key="token.id"
        :label="token.label"
        :variant="token.variant"
        :icon="token.icon"
      />
    </div>
    <p v-if="message" class="state-banner__message">{{ message }}</p>
    <slot></slot>
    <p v-if="liveAnnouncement" class="visually-hidden" aria-live="polite">{{ liveAnnouncement }}</p>
  </section>
</template>

<script setup>
import { computed } from 'vue';

import StateToken from './StateToken.vue';

const props = defineProps({
  tokens: {
    type: Array,
    default: () => [],
  },
  message: {
    type: String,
    default: '',
  },
});

const tokens = computed(() => props.tokens);
const message = computed(() => props.message);
const hasContent = computed(() => tokens.value.length > 0 || Boolean(message.value));

const liveAnnouncement = computed(() => {
  const parts = [];
  if (message.value) {
    parts.push(message.value);
  }
  tokens.value.forEach((token) => {
    if (token?.label) {
      parts.push(token.label);
    }
  });
  return parts.join('. ');
});
</script>

<style scoped>
.state-banner {
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem 1.25rem;
  border-radius: 1rem;
  border: 1px solid var(--color-border-subtle);
  background: rgba(20, 28, 46, 0.7);
  color: var(--color-text-secondary);
}

.state-banner__tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.state-banner__message {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
</style>
