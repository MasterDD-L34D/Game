import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles/theme.css';
import './styles/evogene-deck.css';
import { installErrorReporting } from './observability/errorReporting';
import { installPerformanceMetrics } from './observability/metrics';
import { createI18nInstance } from './locales';

const app = createApp(App);
const i18n = createI18nInstance();
app.use(router);
app.use(i18n);

if (typeof window !== 'undefined') {
  installPerformanceMetrics();
  installErrorReporting(app, router).catch((error) => {
    console.warn('[observability] inizializzazione error reporting fallita', error);
  });
}

app.mount('#app');
