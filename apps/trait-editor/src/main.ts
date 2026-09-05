// TKT-C1 — Vue 3 rebuild entry.
//
// Replaces AngularJS 1.8 bootstrap (legacy main.ts pre-2026-05-11 archived in
// git history). Mount point: <div id="app"> in apps/trait-editor/index.html.

import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles/main.css';

declare const document: Document;

const rootEl = document.getElementById('app');
if (!rootEl) {
  throw new Error('Unable to find application mount element with id "app".');
}

const app = createApp(App);
app.use(router);
app.mount(rootEl);
