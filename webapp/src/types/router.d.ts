import 'vue-router';

import type { RouteLocationRaw } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    description?: string;
    breadcrumb?: false | { label?: string; to?: RouteLocationRaw };
    demo?: boolean;
    offline?: boolean;
    stateTokens?: Array<{ id?: string; label?: string; variant?: string; icon?: string }>;
  }
}
