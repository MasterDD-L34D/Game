import { createRouter, createWebHashHistory } from 'vue-router';
import FlowShellView from '../views/FlowShellView.vue';
import AtlasLayoutView from '../views/atlas/AtlasLayoutView.vue';
import AtlasPokedexView from '../views/atlas/AtlasPokedexView.vue';
import AtlasWorldBuilderView from '../views/atlas/AtlasWorldBuilderView.vue';
import AtlasEncounterLabView from '../views/atlas/AtlasEncounterLabView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'workflow',
      component: FlowShellView,
    },
    {
      path: '/atlas',
      component: AtlasLayoutView,
      children: [
        {
          path: '',
          redirect: { name: 'atlas-pokedex' },
        },
        {
          path: 'pokedex',
          name: 'atlas-pokedex',
          component: AtlasPokedexView,
        },
        {
          path: 'world-builder',
          name: 'atlas-world-builder',
          component: AtlasWorldBuilderView,
        },
        {
          path: 'encounter-lab',
          name: 'atlas-encounter-lab',
          component: AtlasEncounterLabView,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'workflow' },
    },
  ],
});

export default router;
