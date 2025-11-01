import { computed, reactive, readonly } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

export type NavigationTokenVariant = 'info' | 'warning' | 'success' | 'critical' | 'neutral';

export interface NavigationToken {
  id: string;
  label: string;
  variant: NavigationTokenVariant;
  icon: string;
}

export interface NavigationBreadcrumb {
  key: string;
  label: string;
  to: RouteLocationRaw | null;
  href: string | null;
  current: boolean;
}

interface NavigationMetaState {
  title: string;
  description: string;
  demo: boolean;
  breadcrumbs: NavigationBreadcrumb[];
  tokens: NavigationToken[];
}

export interface NavigationMetaPayload {
  title?: string;
  description?: string;
  demo?: boolean;
  breadcrumbs?: NavigationBreadcrumb[];
  tokens?: Array<Partial<NavigationToken> & { label?: string; id?: string; variant?: NavigationTokenVariant } | null | undefined>;
}

const DEFAULT_TITLE = 'Evo-Tactics Mission Console';
const DEFAULT_VARIANT: NavigationTokenVariant = 'info';

const state = reactive<NavigationMetaState>({
  title: DEFAULT_TITLE,
  description: '',
  demo: false,
  breadcrumbs: [],
  tokens: [],
});

function normaliseToken(token: NavigationMetaPayload['tokens'][number]): NavigationToken | null {
  if (!token) {
    return null;
  }
  const id = token.id || token.label;
  if (!id) {
    return null;
  }
  return {
    id,
    label: token.label ?? id,
    variant: (token.variant as NavigationTokenVariant) || DEFAULT_VARIANT,
    icon: token.icon ?? '',
  };
}

export function updateNavigationMeta(payload: NavigationMetaPayload = {}): void {
  state.title = payload.title && payload.title.trim() ? payload.title : DEFAULT_TITLE;
  state.description = payload.description && payload.description.trim() ? payload.description : '';
  state.demo = Boolean(payload.demo);
  state.breadcrumbs = Array.isArray(payload.breadcrumbs) ? [...payload.breadcrumbs] : [];
  const tokens = Array.isArray(payload.tokens)
    ? payload.tokens
        .map(normaliseToken)
        .filter((entry): entry is NavigationToken => Boolean(entry))
    : [];
  state.tokens = tokens;
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

export function resetNavigationMeta(): void {
  state.title = DEFAULT_TITLE;
  state.description = '';
  state.demo = false;
  state.breadcrumbs = [];
  state.tokens = [];
}
