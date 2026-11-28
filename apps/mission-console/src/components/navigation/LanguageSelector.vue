<template>
  <label class="language-selector">
    <span class="language-selector__label">{{ t('app.languageSelector.label') }}</span>
    <select
      class="language-selector__control"
      :value="locale"
      @change="onChange"
      :aria-label="t('app.languageSelector.label')"
    >
      <option v-for="option in options" :key="option" :value="option">
        {{ t(`app.languageSelector.options.${option}`) }}
      </option>
    </select>
  </label>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { SUPPORTED_LOCALES } from '../../locales';

const { locale, t } = useI18n();

const options = computed(() => SUPPORTED_LOCALES.map((entry) => entry.code));

function onChange(event) {
  const value = event.target?.value;
  if (value && options.value.includes(value)) {
    locale.value = value;
  }
}
</script>

<style scoped>
.language-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.language-selector__label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
}

.language-selector__control {
  background: rgba(38, 52, 88, 0.55);
  border: 1px solid var(--color-border-accent);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  color: inherit;
  cursor: pointer;
}

.language-selector__control:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(117, 173, 255, 0.35);
}
</style>
