// TKT-C1 — Vue 3 rebuild: vue-router replaces angular-route.

import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/traits' },
  {
    path: '/traits',
    name: 'trait-library',
    component: () => import('./views/TraitLibraryView.vue'),
  },
  {
    path: '/traits/:id',
    name: 'trait-detail',
    component: () => import('./views/TraitDetailView.vue'),
  },
  {
    path: '/traits/:id/edit',
    name: 'trait-editor',
    component: () => import('./views/TraitEditorView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/traits' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
