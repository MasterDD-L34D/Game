<template>
  <section v-if="hasContent" class="state-banner" role="status">
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
</script>

<style scoped>
.state-banner {
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem 1.25rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.55);
  color: rgba(226, 232, 240, 0.95);
}

.state-banner__tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.state-banner__message {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(226, 232, 240, 0.85);
}
</style>
