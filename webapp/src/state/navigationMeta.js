import { computed, reactive, readonly } from 'vue';

const state = reactive({
  title: 'Evo-Tactics Mission Console',
  description: '',
  demo: false,
  breadcrumbs: [],
  tokens: [],
});

export function updateNavigationMeta(payload) {
  state.title = payload?.title || 'Evo-Tactics Mission Console';
  state.description = payload?.description || '';
  state.demo = Boolean(payload?.demo);
  state.breadcrumbs = Array.isArray(payload?.breadcrumbs) ? payload.breadcrumbs : [];
  state.tokens = Array.isArray(payload?.tokens)
    ? payload.tokens.map((token) => ({
        id: token.id || token.label,
        label: token.label,
        variant: token.variant || 'info',
        icon: token.icon || '',
      }))
    : [];
}

export function useNavigationMeta() {
  return {
    navigation: readonly(state),
    title: computed(() => state.title),
    description: computed(() => state.description),
    demo: computed(() => state.demo),
    breadcrumbs: computed(() => state.breadcrumbs),
    tokens: computed(() => state.tokens),
  };
}

export function resetNavigationMeta() {
  state.title = 'Evo-Tactics Mission Console';
  state.description = '';
  state.demo = false;
  state.breadcrumbs = [];
  state.tokens = [];
}
