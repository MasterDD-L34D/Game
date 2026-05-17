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

      <nav
        v-if="normalizedTabs.length"
        class="nebula-shell__tabs"
        aria-label="Navigazione schede"
        role="tablist"
      >
        <button
          v-for="(tab, index) in normalizedTabs"
          :key="tab.id"
          type="button"
          class="nebula-shell__tab"
          :class="{ 'nebula-shell__tab--active': tab.id === internalTab }"
          role="tab"
          :id="tab.tabId"
          :aria-controls="tab.panelId"
          :aria-selected="tab.id === internalTab"
          :tabindex="tab.id === internalTab ? 0 : -1"
          @click="setTab(tab.id)"
          @keydown="onTabKeydown($event, index)"
          :ref="(el) => setTabRef(el, index)"
        >
          <span class="nebula-shell__tab-icon" aria-hidden="true">{{ tab.icon || '◆' }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <div
        v-if="activeTabMeta"
        class="nebula-shell__content"
        role="tabpanel"
        :id="activeTabMeta.panelId"
        :aria-labelledby="activeTabMeta.tabId"
        tabindex="0"
      >
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

let shellInstance = 0;

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

const instanceId = `nebula-shell-${++shellInstance}`;

const normalizedTabs = computed(() =>
  (props.tabs || []).map((tab, index) => ({
    ...tab,
    tabId: tab.tabId || `${instanceId}-tab-${index}`,
    panelId: tab.panelId || `${instanceId}-panel-${index}`,
  })),
);

const firstTab = computed(() => {
  if (props.modelValue) {
    return props.modelValue;
  }
  const [first] = normalizedTabs.value || [];
  return first?.id || '';
});

const internalTab = ref(firstTab.value);
const tabRefs = ref([]);

const activeTabMeta = computed(() =>
  normalizedTabs.value.find((tab) => tab.id === internalTab.value) || null,
);

watch(
  normalizedTabs,
  () => {
    tabRefs.value = [];
  },
  { flush: 'post' },
);

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

function setTabRef(el, index) {
  tabRefs.value[index] = el || null;
}

function focusTabByIndex(index) {
  const target = tabRefs.value[index];
  if (target?.focus) {
    target.focus();
  }
}

function onTabKeydown(event, index) {
  const key = event.key;
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) {
    return;
  }
  event.preventDefault();
  const total = normalizedTabs.value.length;
  if (!total) {
    return;
  }
  if (key === 'Home') {
    setTab(normalizedTabs.value[0].id);
    focusTabByIndex(0);
    return;
  }
  if (key === 'End') {
    const lastIndex = total - 1;
    setTab(normalizedTabs.value[lastIndex].id);
    focusTabByIndex(lastIndex);
    return;
  }
  const direction = key === 'ArrowRight' ? 1 : -1;
  const nextIndex = (index + direction + total) % total;
  setTab(normalizedTabs.value[nextIndex].id);
  focusTabByIndex(nextIndex);
}
</script>

<style scoped>
.nebula-shell {
  position: relative;
  color: var(--color-text-primary);
}

.nebula-shell__frame {
  position: relative;
  display: grid;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 2rem;
  background: radial-gradient(circle at 10% -20%, rgba(122, 196, 255, 0.18), transparent 55%),
    radial-gradient(circle at 100% 0%, rgba(158, 123, 255, 0.15), transparent 65%),
    var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  box-shadow: inset 0 0 0 1px rgba(122, 196, 255, 0.1), 0 25px 60px rgba(5, 9, 18, 0.65);
}

.nebula-shell__frame::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 2.15rem;
  background: linear-gradient(135deg, rgba(109, 170, 255, 0.25), rgba(14, 165, 233, 0.15));
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
  background: var(--color-bg-subtle);
  border: 1px solid rgba(122, 196, 255, 0.25);
}

.nebula-shell__status-led {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(122, 196, 255, 0.55);
  background: rgba(122, 196, 255, 0.95);
}

.nebula-shell__status-led[data-tone='warning'] {
  box-shadow: 0 0 12px rgba(255, 212, 101, 0.75);
  background: rgba(255, 212, 101, 0.9);
}

.nebula-shell__status-led[data-tone='critical'] {
  box-shadow: 0 0 12px rgba(255, 123, 143, 0.75);
  background: rgba(255, 123, 143, 0.9);
}

.nebula-shell__status-led[data-tone='success'] {
  box-shadow: 0 0 12px rgba(98, 245, 181, 0.75);
  background: rgba(98, 245, 181, 0.9);
}

.nebula-shell__status-label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.nebula-shell__status-value {
  margin: 0;
  font-weight: 600;
  color: var(--color-text-secondary);
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
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: rgba(20, 28, 46, 0.7);
  border-radius: 999px;
  padding: 0.35rem;
}

.nebula-shell__tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.75rem;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.nebula-shell__tab:hover,
.nebula-shell__tab:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(122, 196, 255, 0.55);
  background: rgba(122, 196, 255, 0.2);
  color: var(--color-text-primary);
}

.nebula-shell__tab--active {
  background: linear-gradient(135deg, rgba(122, 196, 255, 0.45), rgba(158, 123, 255, 0.45));
  border-color: rgba(122, 196, 255, 0.65);
  color: var(--color-text-primary);
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
  outline: none;
}

.nebula-shell__footer {
  min-height: 0.5rem;
}
</style>
