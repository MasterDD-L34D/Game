<template>
  <section v-if="hasContent" class="app-breadcrumbs" aria-label="Contestualizzazione pagina">
    <nav v-if="items.length" class="app-breadcrumbs__nav" aria-label="Percorso applicazione">
      <ol class="app-breadcrumbs__list">
        <li v-for="item in items" :key="item.key" class="app-breadcrumbs__item" :data-current="item.current">
          <RouterLink
            v-if="!item.current"
            :to="item.to"
            class="app-breadcrumbs__link"
          >
            <span>{{ item.label }}</span>
          </RouterLink>
          <span v-else class="app-breadcrumbs__current">{{ item.label }}</span>
        </li>
      </ol>
    </nav>

    <div class="app-breadcrumbs__meta">
      <p v-if="description" class="app-breadcrumbs__description">{{ description }}</p>
      <span v-if="demo" class="app-breadcrumbs__badge">Modalità demo</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  description: {
    type: String,
    default: '',
  },
  demo: {
    type: Boolean,
    default: false,
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
const demo = computed(() => props.demo);
const hasContent = computed(() => items.value.length > 0 || Boolean(description.value) || demo.value);
</script>

<style scoped>
.app-breadcrumbs {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-radius: 1rem;
  background: rgba(17, 25, 44, 0.4);
  border: 1px solid rgba(99, 153, 255, 0.3);
  color: rgba(209, 224, 255, 0.92);
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
  color: rgba(209, 224, 255, 0.85);
  text-decoration: none;
  transition: color 0.18s ease;
}

.app-breadcrumbs__link:hover {
  color: #f8fbff;
}

.app-breadcrumbs__current {
  color: #f8fbff;
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
  color: rgba(209, 224, 255, 0.75);
}

.app-breadcrumbs__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 204, 102, 0.2);
  color: #ffdd8a;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
</style>
