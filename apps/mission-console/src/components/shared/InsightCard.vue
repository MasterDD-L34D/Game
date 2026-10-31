<template>
  <section class="insight-card" :data-tone="tone">
    <header v-if="hasHeader" class="insight-card__header">
      <div class="insight-card__title">
        <span v-if="icon" class="insight-card__icon" aria-hidden="true">{{ icon }}</span>
        <div>
          <h3 v-if="title">{{ title }}</h3>
          <p v-if="subtitle" class="insight-card__subtitle">{{ subtitle }}</p>
          <slot v-else name="subtitle" />
        </div>
      </div>
      <div class="insight-card__actions">
        <slot name="actions" />
      </div>
    </header>

    <div v-if="tabs.length" class="insight-card__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="insight-card__tab"
        :class="{ 'insight-card__tab--active': tab.id === currentTab }"
        role="tab"
        :aria-selected="tab.id === currentTab"
        @click="selectTab(tab.id)"
      >
        <span v-if="tab.icon" class="insight-card__tab-icon" aria-hidden="true">{{
          tab.icon
        }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div class="insight-card__body">
      <template v-if="tabs.length">
        <div
          v-for="tab in tabs"
          :key="`panel-${tab.id}`"
          v-show="tab.id === currentTab"
          role="tabpanel"
          class="insight-card__panel"
        >
          <slot :name="`tab-${tab.id}`" :tab="tab" />
        </div>
      </template>
      <slot v-else />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, watch, useSlots } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  tone: {
    type: String,
    default: 'neutral',
  },
  tabs: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const normalizedTabs = computed(() =>
  Array.isArray(props.tabs) ? props.tabs.filter(Boolean) : [],
);

const currentTab = computed({
  get() {
    if (!normalizedTabs.value.length) {
      return '';
    }
    const requested =
      props.modelValue && normalizedTabs.value.find((tab) => tab.id === props.modelValue);
    return (requested && requested.id) || normalizedTabs.value[0].id;
  },
  set(value) {
    if (value !== props.modelValue) {
      emit('update:modelValue', value);
    }
  },
});

const slots = useSlots();

const hasHeader = computed(() =>
  Boolean(props.title || props.subtitle || props.icon || !!slots.actions),
);

const tabs = computed(() => normalizedTabs.value);

function selectTab(id) {
  if (!tabs.value.some((tab) => tab.id === id)) {
    return;
  }
  currentTab.value = id;
}

onMounted(() => {
  if (tabs.value.length && !props.modelValue) {
    emit('update:modelValue', tabs.value[0].id);
  }
});

watch(
  () => props.tabs,
  (next) => {
    const list = Array.isArray(next) ? next : [];
    if (!list.some((tab) => tab.id === currentTab.value)) {
      const first = list[0]?.id || '';
      if (first) {
        emit('update:modelValue', first);
      }
    }
  },
);
</script>

<style scoped>
.insight-card {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 18px;
  background: rgba(7, 16, 28, 0.78);
  border: 1px solid rgba(96, 213, 255, 0.18);
  color: var(--evogene-deck-text-primary);
}

.insight-card[data-tone='critical'] {
  border-color: rgba(255, 99, 132, 0.32);
}

.insight-card[data-tone='warning'] {
  border-color: rgba(255, 200, 87, 0.28);
}

.insight-card[data-tone='success'] {
  border-color: rgba(129, 255, 199, 0.3);
}

.insight-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.insight-card__title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.insight-card__icon {
  font-size: 1.5rem;
  display: inline-flex;
}

.insight-card__title h3 {
  margin: 0;
  font-size: 1.05rem;
}

.insight-card__subtitle {
  margin: 0.2rem 0 0;
  color: var(--evogene-deck-text-secondary);
  font-size: 0.85rem;
}

.insight-card__actions {
  display: flex;
  gap: 0.5rem;
}

.insight-card__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.insight-card__tab {
  border: 1px solid rgba(96, 213, 255, 0.24);
  background: rgba(10, 24, 38, 0.9);
  color: inherit;
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.insight-card__tab:hover,
.insight-card__tab:focus-visible {
  border-color: rgba(146, 255, 230, 0.45);
}

.insight-card__tab--active {
  background: rgba(96, 213, 255, 0.18);
  border-color: rgba(146, 255, 230, 0.6);
}

.insight-card__tab-icon {
  font-size: 1.1rem;
}

.insight-card__body {
  display: grid;
  gap: 0.85rem;
}

.insight-card__panel {
  display: grid;
  gap: 0.85rem;
}
</style>
