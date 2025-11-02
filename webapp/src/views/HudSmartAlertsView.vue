<template>
  <section class="hud-smart-alerts">
    <header class="hud-smart-alerts__intro">
      <h1>{{ t('views.hudSmartAlerts.title') }}</h1>
      <p>{{ t('views.hudSmartAlerts.subtitle') }}</p>
    </header>

    <SmartHudOverlay
      class="hud-smart-alerts__overlay"
      :mission-tag="missionTag"
      :mission-id="missionId"
      :state="module"
    />

    <section class="hud-smart-alerts__notes">
      <h2>{{ t('views.hudSmartAlerts.notesTitle') }}</h2>
      <ul>
        <li>
          {{
            t('views.hudSmartAlerts.notes.riskThreshold', {
              value: Math.round(thresholds.weighted * 100),
            })
          }}
        </li>
        <li>{{ t('views.hudSmartAlerts.notes.cohesionHighlight') }}</li>
        <li>{{ t('views.hudSmartAlerts.notes.filterRouting') }}</li>
      </ul>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import SmartHudOverlay from '../features/hud/components/SmartHudOverlay.vue';
import { useHudOverlayModule } from '../modules/useHudOverlayModule';

const { t } = useI18n();

const missionTag = 'delta';
const missionId = 'skydock_siege_tier3_retest';

const module = useHudOverlayModule({ missionTag, missionId, overlayId: 'smart-risk-alerts' });
const thresholds = computed(() => module.thresholds.value);
</script>

<style scoped>
.hud-smart-alerts {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-bottom: 2rem;
}

.hud-smart-alerts__intro {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 72ch;
}

.hud-smart-alerts__intro h1 {
  font-size: clamp(2.2rem, 4vw, 2.8rem);
  margin: 0;
}

.hud-smart-alerts__intro p {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: #475569;
}

.hud-smart-alerts__overlay {
  align-self: center;
}

.hud-smart-alerts__notes {
  background: rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.hud-smart-alerts__notes h2 {
  margin-top: 0;
  font-size: 1.25rem;
}

.hud-smart-alerts__notes ul {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #1f2937;
}
</style>
