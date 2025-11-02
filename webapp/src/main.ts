import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles/theme.css';
import './styles/pokedex.css';
import { installErrorReporting } from './observability/errorReporting';
import { installPerformanceMetrics } from './observability/metrics';

const app = createApp(App);
app.use(router);

if (typeof window !== 'undefined') {
  installPerformanceMetrics();
  installErrorReporting(app, router).catch((error) => {
    console.warn('[observability] inizializzazione error reporting fallita', error);
  });
}

app.mount('#app');
