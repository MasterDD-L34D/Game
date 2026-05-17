<template>
  <section v-if="hasContent" class="app-breadcrumbs" :aria-label="t('breadcrumbs.sectionLabel')">
    <nav v-if="items.length" class="app-breadcrumbs__nav" :aria-label="t('breadcrumbs.navLabel')">
      <ol class="app-breadcrumbs__list" role="list">
        <li
          v-for="item in items"
          :key="item.key"
          class="app-breadcrumbs__item"
          :data-current="item.current"
          role="listitem"
          :aria-current="item.current ? 'page' : undefined"
        >
          <RouterLink v-if="!item.current" :to="item.to" class="app-breadcrumbs__link" :aria-label="t('breadcrumbs.goTo', { label: item.label })">
            <span>{{ item.label }}</span>
          </RouterLink>
          <span v-else class="app-breadcrumbs__current" aria-current="page">{{ item.label }}</span>
        </li>
      </ol>
    </nav>

    <div class="app-breadcrumbs__meta">
      <p v-if="description" class="app-breadcrumbs__description">{{ description }}</p>
      <ul v-if="tokens.length" class="app-breadcrumbs__tokens" :aria-label="t('breadcrumbs.contextState')" role="list">
        <li v-for="token in tokens" :key="token.id">
          <StateToken :label="token.label" :variant="token.variant" :icon="token.icon" />
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

import StateToken from '../metrics/StateToken.vue';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  description: {
    type: String,
    default: '',
  },
  tokens: {
    type: Array,
    default: () => [],
  },
});

const items = computed(() =>
  props.items.map((item, index) => ({
    key: item.key ?? `${item.label}-${index}`,
    label: item.label,
    to: item.to,
    current: Boolean(item.current),
  })),
);

const description = computed(() => props.description);
const tokens = computed(() => props.tokens);
const hasContent = computed(
  () => items.value.length > 0 || Boolean(description.value) || tokens.value.length > 0,
);

const { t } = useI18n();
</script>

<style scoped>
.app-breadcrumbs {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-radius: 1rem;
  background: rgba(20, 28, 46, 0.6);
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
}

.app-breadcrumbs__nav {
  overflow: auto;
}

.app-breadcrumbs__list {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0;
  margin: 0;
  font-size: 0.9rem;
}

.app-breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.app-breadcrumbs__item::after {
  content: '/';
  opacity: 0.35;
}

.app-breadcrumbs__item[data-current='true']::after {
  display: none;
}

.app-breadcrumbs__link {
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.18s ease;
}

.app-breadcrumbs__link:hover {
  color: var(--color-text-primary);
}

.app-breadcrumbs__current {
  color: var(--color-text-primary);
  font-weight: 600;
}

.app-breadcrumbs__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.app-breadcrumbs__description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.app-breadcrumbs__tokens {
  display: inline-flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 0.5rem;
}

.app-breadcrumbs__tokens li {
  display: flex;
}
</style>
