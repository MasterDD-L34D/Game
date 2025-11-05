import { registerAppModule } from './app.module';
import './styles/main.css';

declare const document: Document;
declare const angular: any;

if (typeof angular === 'undefined') {
  throw new Error('AngularJS non è stato caricato. Verifica gli script nel file index.html.');
}

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
