<template>
  <span
    class="state-token"
    :class="[`state-token--${variantClass}`, { 'state-token--compact': compact }]"
    role="status"
    aria-live="polite"
    :data-variant="variantClass"
  >
    <span v-if="icon" class="state-token__icon" aria-hidden="true">{{ icon }}</span>
    <span class="state-token__label">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'info',
  },
  icon: {
    type: String,
    default: '',
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const validVariants = ['info', 'success', 'warning', 'danger', 'neutral'];
const variantClass = computed(() =>
  validVariants.includes(props.variant) ? props.variant : 'info',
);
</script>

<style scoped>
.state-token {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid transparent;
  transition: filter 0.2s ease;
}

.state-token--compact {
  padding: 0.15rem 0.65rem;
  font-size: 0.7rem;
}

.state-token__icon {
  font-size: 0.85em;
}

.state-token--info {
  background: rgba(122, 196, 255, 0.2);
  border-color: rgba(122, 196, 255, 0.45);
  color: var(--color-text-primary);
}

.state-token--success {
  background: rgba(98, 245, 181, 0.2);
  border-color: rgba(98, 245, 181, 0.45);
  color: #e8fff5;
}

.state-token--warning {
  background: rgba(255, 212, 101, 0.2);
  border-color: rgba(255, 212, 101, 0.45);
  color: #fff3cf;
}

.state-token--danger {
  background: rgba(255, 123, 143, 0.2);
  border-color: rgba(255, 123, 143, 0.45);
  color: #ffe4ea;
}

.state-token--neutral {
  background: rgba(148, 163, 184, 0.18);
  border-color: rgba(148, 163, 184, 0.4);
  color: var(--color-text-secondary);
}
</style>
