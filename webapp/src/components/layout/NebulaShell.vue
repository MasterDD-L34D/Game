<template>
  <section class="nebula-shell">
    <div class="nebula-shell__frame">
      <header class="nebula-shell__header">
        <div class="nebula-shell__status-grid" v-if="statusIndicators.length">
          <div
            v-for="indicator in statusIndicators"
            :key="indicator.id || indicator.label"
            class="nebula-shell__status"
          >
            <span class="nebula-shell__status-led" :data-tone="indicator.tone || 'neutral'"></span>
            <div>
              <p class="nebula-shell__status-label">{{ indicator.label }}</p>
              <p class="nebula-shell__status-value">{{ indicator.value }}</p>
            </div>
          </div>
        </div>
        <div class="nebula-shell__actions">
          <slot name="actions"></slot>
        </div>
      </header>

      <div class="nebula-shell__cards">
        <slot name="cards"></slot>
      </div>

      <nav v-if="tabs.length" class="nebula-shell__tabs" aria-label="Navigazione schede">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="nebula-shell__tab"
          :class="{ 'nebula-shell__tab--active': tab.id === internalTab }"
          @click="setTab(tab.id)"
        >
          <span class="nebula-shell__tab-icon" aria-hidden="true">{{ tab.icon || '◆' }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <div class="nebula-shell__content">
        <slot :active-tab="internalTab"></slot>
      </div>

      <footer class="nebula-shell__footer">
        <slot name="footer"></slot>
      </footer>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  tabs: {
    type: Array,
    default: () => [],
  },
  statusIndicators: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'tab-change']);

const firstTab = computed(() => {
  if (props.modelValue) {
    return props.modelValue;
  }
  const [first] = props.tabs || [];
  return first?.id || '';
});

const internalTab = ref(firstTab.value);

watch(
  firstTab,
  (value) => {
    if (!value) {
      return;
    }
    if (internalTab.value !== value) {
      internalTab.value = value;
    }
  },
);

watch(
  () => props.modelValue,
  (value) => {
    if (value && value !== internalTab.value) {
      internalTab.value = value;
    }
  },
);

watch(
  () => props.tabs?.length,
  () => {
    if (!props.tabs?.some((tab) => tab.id === internalTab.value)) {
      internalTab.value = firstTab.value;
    }
  },
);

function setTab(id) {
  if (internalTab.value === id) {
    return;
  }
  internalTab.value = id;
  emit('update:modelValue', id);
  emit('tab-change', id);
}
</script>

<style scoped>
.nebula-shell {
  position: relative;
  color: #e2e8f0;
}

.nebula-shell__frame {
  position: relative;
  display: grid;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 2rem;
  background: radial-gradient(circle at 10% -20%, rgba(96, 213, 255, 0.28), transparent 55%),
    radial-gradient(circle at 100% 0%, rgba(167, 139, 250, 0.28), transparent 65%),
    rgba(3, 7, 18, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.15), 0 25px 60px rgba(2, 6, 23, 0.65);
}

.nebula-shell__frame::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 2.15rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(14, 165, 233, 0.15));
  opacity: 0.35;
  pointer-events: none;
}

.nebula-shell__header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.nebula-shell__status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.85rem;
}

.nebula-shell__status {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  padding: 0.65rem 0.85rem;
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(56, 189, 248, 0.18);
}

.nebula-shell__status-led {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(125, 211, 252, 0.65);
  background: rgba(125, 211, 252, 0.95);
}

.nebula-shell__status-led[data-tone='warning'] {
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.75);
  background: rgba(251, 191, 36, 0.9);
}

.nebula-shell__status-led[data-tone='critical'] {
  box-shadow: 0 0 12px rgba(248, 113, 113, 0.75);
  background: rgba(248, 113, 113, 0.9);
}

.nebula-shell__status-led[data-tone='success'] {
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.75);
  background: rgba(74, 222, 128, 0.9);
}

.nebula-shell__status-label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.7rem;
  color: rgba(148, 163, 184, 0.75);
}

.nebula-shell__status-value {
  margin: 0.15rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.nebula-shell__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nebula-shell__cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.nebula-shell__tabs {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(59, 130, 246, 0.25);
}

.nebula-shell__tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(15, 23, 42, 0.55);
  color: inherit;
  cursor: pointer;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.75rem;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.nebula-shell__tab:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 213, 255, 0.45);
}

.nebula-shell__tab--active {
  background: linear-gradient(135deg, rgba(96, 213, 255, 0.45), rgba(167, 139, 250, 0.45));
  border-color: rgba(96, 213, 255, 0.65);
  box-shadow: 0 12px 22px rgba(14, 165, 233, 0.25);
}

.nebula-shell__tab-icon {
  font-size: 1rem;
}

.nebula-shell__content {
  position: relative;
  padding: 1rem 0 0;
  display: grid;
  gap: 1.25rem;
}

.nebula-shell__footer {
  min-height: 0.5rem;
}
</style>
