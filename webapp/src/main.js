import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import './styles/theme.css';
import './styles/pokedex.css';

const app = createApp(App);
app.use(router);
app.mount('#app');
