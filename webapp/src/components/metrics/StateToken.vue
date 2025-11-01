<template>
  <span
    class="state-token"
    :class="[`state-token--${variantClass}`, { 'state-token--compact': compact }]"
    role="status"
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
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(96, 165, 250, 0.4);
  color: #dbeafe;
}

.state-token--success {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(134, 239, 172, 0.45);
  color: #bbf7d0;
}

.state-token--warning {
  background: rgba(251, 191, 36, 0.2);
  border-color: rgba(253, 224, 71, 0.4);
  color: #fef08a;
}

.state-token--danger {
  background: rgba(248, 113, 113, 0.2);
  border-color: rgba(248, 113, 113, 0.45);
  color: #fecaca;
}

.state-token--neutral {
  background: rgba(148, 163, 184, 0.18);
  border-color: rgba(203, 213, 225, 0.35);
  color: #e2e8f0;
}
</style>
