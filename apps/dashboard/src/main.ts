import angular from 'angular';
import 'angular-route';
import 'angular-animate';
import 'angular-sanitize';

import { registerAppModule } from './app.module';
import '@game/ui/styles/main.css';

const appModule = registerAppModule();

angular.element(document).ready(() => {
  const rootElement = document.getElementById('app');
  if (!rootElement) {
    throw new Error('Unable to find application mount element with id "app".');
  }

  if (!rootElement.hasChildNodes()) {
    const appRoot = document.createElement('app-root');
    rootElement.append(appRoot);
  }

  angular.bootstrap(rootElement, [appModule.name], { strictDi: true });
});
