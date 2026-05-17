<template>
  <section class="console-hub">
    <header class="console-hub__hero">
      <h1>{{ t('views.consoleHub.hero.title') }}</h1>
      <p>{{ t('views.consoleHub.hero.body') }}</p>
    </header>

    <section class="console-hub__grid" :aria-label="t('views.consoleHub.grid.ariaLabel')">
      <RouterLink class="console-hub__card" :to="{ name: 'console-flow' }">
        <h2>{{ t('views.consoleHub.grid.flow.title') }}</h2>
        <p>{{ t('views.consoleHub.grid.flow.description') }}</p>
        <span>{{ t('views.consoleHub.grid.flow.cta') }}</span>
      </RouterLink>

      <RouterLink class="console-hub__card" :to="{ name: 'console-traits-editor' }">
        <h2>{{ t('views.consoleHub.grid.traits.title') }}</h2>
        <p>{{ t('views.consoleHub.grid.traits.description') }}</p>
        <span>{{ t('views.consoleHub.grid.traits.cta') }}</span>
      </RouterLink>

      <RouterLink class="console-hub__card" :to="{ name: 'console-atlas-overview' }">
        <h2>{{ t('views.consoleHub.grid.atlas.title') }}</h2>
        <p>{{ t('views.consoleHub.grid.atlas.description') }}</p>
        <span>{{ t('views.consoleHub.grid.atlas.cta') }}</span>
      </RouterLink>

      <RouterLink class="console-hub__card" :to="{ name: 'console-atlas-telemetry' }">
        <h2>{{ t('views.consoleHub.grid.telemetry.title') }}</h2>
        <p>{{ t('views.consoleHub.grid.telemetry.description') }}</p>
        <span>{{ t('views.consoleHub.grid.telemetry.cta') }}</span>
      </RouterLink>

      <RouterLink class="console-hub__card" :to="{ name: 'console-atlas-generator' }">
        <h2>{{ t('views.consoleHub.grid.generator.title') }}</h2>
        <p>{{ t('views.consoleHub.grid.generator.description') }}</p>
        <span>{{ t('views.consoleHub.grid.generator.cta') }}</span>
      </RouterLink>
    </section>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.console-hub {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.console-hub__hero {
  padding: 2.5rem clamp(2rem, 4vw, 3.5rem);
  border-radius: 1.75rem;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(129, 140, 248, 0.25));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15);
  color: #0f172a;
}

.console-hub__hero h1 {
  font-size: clamp(2rem, 4vw, 2.6rem);
  margin-bottom: 0.75rem;
}

.console-hub__hero p {
  max-width: 48ch;
  font-size: 1.05rem;
  line-height: 1.6;
  color: rgba(15, 23, 42, 0.82);
}

.console-hub__grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.console-hub__card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.75rem;
  border-radius: 1.5rem;
  background: #fff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  color: inherit;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.console-hub__card h2 {
  font-size: 1.25rem;
  margin: 0;
  color: #111827;
}

.console-hub__card p {
  margin: 0;
  color: #475569;
  line-height: 1.5;
}

.console-hub__card span {
  margin-top: auto;
  font-weight: 600;
  color: #2563eb;
}

.console-hub__card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.12);
}
</style>
