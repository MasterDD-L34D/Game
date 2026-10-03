<template>
  <span class="trait-chip" :data-variant="variant">
    <span class="trait-chip__icon" aria-hidden="true">{{ resolvedIcon }}</span>
    <span class="trait-chip__label">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'default',
  },
  icon: {
    type: String,
    default: '',
  },
});

const iconMap = {
  core: '✶',
  derived: '☲',
  optional: '☰',
  synergy: '∞',
  hazard: '⚠',
  climate: '☁',
  role: '⚙',
  validator: '◈',
  telemetry: '📡',
  default: '◆',
};

const resolvedIcon = computed(() => {
  if (props.icon) {
    return props.icon;
  }
  return iconMap[props.variant] || iconMap.default;
});
</script>

<style scoped>
.trait-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  background: rgba(148, 163, 184, 0.15);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.2);
  text-transform: uppercase;
}

.trait-chip__icon {
  font-size: 0.85rem;
  opacity: 0.85;
}

.trait-chip[data-variant='core'] {
  background: rgba(96, 213, 255, 0.22);
  border-color: rgba(96, 213, 255, 0.45);
}

.trait-chip[data-variant='derived'],
.trait-chip[data-variant='optional'] {
  background: rgba(196, 181, 253, 0.22);
  border-color: rgba(167, 139, 250, 0.42);
}

.trait-chip[data-variant='synergy'] {
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.4);
}

.trait-chip[data-variant='hazard'] {
  background: rgba(251, 191, 36, 0.22);
  border-color: rgba(245, 158, 11, 0.4);
}

.trait-chip[data-variant='climate'] {
  background: rgba(96, 165, 250, 0.22);
  border-color: rgba(37, 99, 235, 0.45);
}

.trait-chip[data-variant='role'] {
  background: rgba(74, 222, 128, 0.22);
  border-color: rgba(34, 197, 94, 0.4);
}

.trait-chip[data-variant='validator'] {
  background: rgba(234, 179, 8, 0.22);
  border-color: rgba(217, 119, 6, 0.42);
}

.trait-chip[data-variant='telemetry'] {
  background: rgba(96, 165, 250, 0.18);
  border-color: rgba(56, 189, 248, 0.35);
}
</style>
