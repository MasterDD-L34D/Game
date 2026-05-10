<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div class="app-shell__header-top">
        <h1 class="app-shell__title">{{ t('app.title') }}</h1>
        <LanguageSelector />
      </div>
      <nav class="app-shell__nav" :aria-label="t('app.nav.ariaLabel')">
        <RouterLink
          v-for="link in mainLinks"
          :key="link.name"
          :to="link.to"
          class="app-shell__nav-link"
          :class="{ 'app-shell__nav-link--active': link.active }"
          :aria-current="link.active ? 'page' : undefined"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
      <AppBreadcrumbs
        :items="breadcrumbItems"
        :description="pageDescription"
        :tokens="stateTokens"
      />
    </header>

    <main class="app-shell__main">
      <RouterView v-slot="slotProps">
        <component :is="slotProps.Component" v-bind="slotProps.route.props || {}" />
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import AppBreadcrumbs from './components/navigation/AppBreadcrumbs.vue';
import LanguageSelector from './components/navigation/LanguageSelector.vue';
import { useNavigationMeta } from './state/navigationMeta';

const route = useRoute();
const { breadcrumbs: breadcrumbItems, description: pageDescription, tokens: stateTokens } = useNavigationMeta();
const { t } = useI18n();

const mainLinks = computed(() => {
  const currentName = route.name;
  return [
    {
      name: 'console-home',
      to: { name: 'console-home' },
      label: t('app.nav.missionConsole'),
      active: currentName === 'console-home',
    },
    {
      name: 'console-flow',
      to: { name: 'console-flow' },
      label: t('app.nav.workflow'),
      active: currentName === 'console-flow',
    },
    {
      name: 'console-traits-editor',
      to: { name: 'console-traits-editor' },
      label: t('app.nav.traits'),
      active: currentName ? String(currentName).startsWith('console-traits-editor') : false,
    },
    {
      name: 'console-atlas',
      to: { name: 'console-atlas-overview' },
      label: t('app.nav.atlas'),
      active: currentName ? String(currentName).startsWith('console-atlas') : false,
    },
  ];
});
</script>

<style scoped>
.app-shell__header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 0 0, rgba(46, 67, 112, 0.35), transparent 60%),
    radial-gradient(circle at 100% 0, rgba(32, 58, 89, 0.35), transparent 55%),
    var(--color-bg-body);
  color: var(--color-text-primary);
}

.app-shell__header {
  padding: 2.5rem clamp(2rem, 4vw, 4rem) 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: linear-gradient(135deg, rgba(16, 24, 40, 0.95), rgba(12, 19, 33, 0.85));
  border-bottom: 1px solid var(--color-border-subtle);
  box-shadow: 0 2px 12px rgba(8, 12, 20, 0.45);
}

.app-shell__title {
  font-size: clamp(1.75rem, 2vw, 2.25rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin: 0;
}

.app-shell__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.app-shell__nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  font-size: 0.95rem;
  text-decoration: none;
  color: var(--color-text-secondary);
  background: rgba(38, 52, 88, 0.55);
  border: 1px solid var(--color-border-accent);
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.app-shell__nav-link:hover {
  background: rgba(92, 153, 233, 0.55);
  color: var(--color-text-primary);
  transform: translateY(-1px);
}

.app-shell__nav-link--active {
  background: linear-gradient(135deg, rgba(117, 173, 255, 0.9), rgba(154, 212, 255, 0.75));
  color: #061121;
  box-shadow: 0 4px 14px rgba(109, 169, 255, 0.35);
}

.app-shell__main {
  flex: 1;
  padding: clamp(1.5rem, 3vw, 3rem);
}
</style>
