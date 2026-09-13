(function () {
  const app = document.getElementById('app');
  const content = document.getElementById('content');
  const menuToggle = document.querySelector('.app-shell__menu-toggle');
  const overlay = document.querySelector('.app-shell__overlay');
  const navigation = document.getElementById('mission-console-navigation');
  const navigationButtons = Array.from(navigation.querySelectorAll('[data-target]'));
  const topbarItems = Array.from(navigation.querySelectorAll('.navigation__topbar-item'));

  const dashboardHtml = `
    <section class="page">
      <header class="page__header">
        <div>
          <h1 class="page__title">Mission Console</h1>
          <p class="page__subtitle">Monitor readiness, react to anomaly fluctuations, and keep operators sincronizzati.</p>
        </div>
        <dl class="status-summary">
          <div class="status-summary__item"><dt>In corso</dt><dd>1</dd></div>
          <div class="status-summary__item"><dt>Pianificate</dt><dd>1</dd></div>
          <div class="status-summary__item"><dt>Rischio</dt><dd>1</dd></div>
          <div class="status-summary__item"><dt>Completate</dt><dd>1</dd></div>
        </dl>
      </header>
      <section class="dashboard-grid">
        <article class="panel">
          <h2>Mission Readiness</h2>
          <ul class="metric-grid">
            <li>Operation Orion Outpost</li>
            <li>Project Tidal Initiative</li>
            <li>Nebula Watch</li>
          </ul>
        </article>
      </section>
    </section>
  `;

  const missionConsoleHtml = `
    <section class="page">
      <header class="page__header">
        <div>
          <h1 class="page__title">Mission Console</h1>
          <p class="page__subtitle">Dettaglio attività in corso.</p>
        </div>
      </header>
    </section>
  `;

  const missionControlHtml = `
    <section class="page">
      <header class="page__header">
        <h1 class="page__title">Mission Control</h1>
      </header>
      <section>
        <h2>Azioni prioritarie</h2>
        <ul>
          <li>Allineamento squadre</li>
          <li>Allocazione vettori</li>
          <li>Protocollo emergenze</li>
        </ul>
      </section>
    </section>
  `;

  const generatorHtml = `
    <section class="page">
      <header class="page__header">
        <h1 class="page__title">Generatore Operativo</h1>
        <p>Configura missioni con parametri dinamici per operatori Evo.</p>
      </header>
      <section>
        <h2>Toolkit rapido</h2>
        <ul>
          <li>Builder sequenziale</li>
          <li>Profiler missione</li>
          <li>Calcolo risorse</li>
        </ul>
      </section>
    </section>
  `;

  const ecosystemHtml = `
    <section class="page">
      <header class="page__header">
        <h1 class="page__title">Ecosystem Pack</h1>
        <p>Moduli pronti per il deployment tattico.</p>
      </header>
      <section>
        <h2>Pacchetti disponibili</h2>
        <ul>
          <li>Pack Strategico</li>
          <li>Pack Biomi</li>
          <li>Pack Supporto AI</li>
        </ul>
      </section>
    </section>
  `;

  const stubHtml = (title) => `
    <section class="page">
      <header class="page__header"><h1 class="page__title">${title}</h1></header>
      <p>Contenuto segnaposto.</p>
    </section>
  `;

  const routes = {
    '/': dashboardHtml,
    '/mission-console': missionConsoleHtml,
    '/dashboard': dashboardHtml,
    '/mission-control': missionControlHtml,
    '/generator': generatorHtml,
    '/ecosystem-pack': ecosystemHtml,
    '/atlas': stubHtml('Atlas'),
    '/traits': stubHtml('Traits'),
    '/nebula': stubHtml('Nebula'),
  };

  function setMenu(open) {
    if (open) {
      navigation.classList.add('navigation--open');
      overlay.classList.add('app-shell__overlay--visible');
      menuToggle.setAttribute('aria-expanded', 'true');
    } else {
      navigation.classList.remove('navigation--open');
      overlay.classList.remove('app-shell__overlay--visible');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  function getActiveRoutes(item) {
    const raw = item.getAttribute('data-active-when');
    if (!raw) {
      const target = normaliseRoute(item.dataset.target || item.getAttribute('data-target') || '/');
      return [target];
    }
    return raw
      .split(',')
      .map((part) => normaliseRoute(part.trim()))
      .filter(Boolean);
  }

  function activateTopbar(route) {
    const current = normaliseRoute(route);
    topbarItems.forEach((item) => {
      const activeRoutes = getActiveRoutes(item);
      if (activeRoutes.includes(current)) {
        item.classList.add('navigation__topbar-item--active');
      } else {
        item.classList.remove('navigation__topbar-item--active');
      }
    });
  }

  function normaliseRoute(value) {
    if (!value || value === '#/' || value === '#') {
      return '/';
    }
    return value.startsWith('/') ? value : `/${value.replace(/^#/, '')}`;
  }

  function navigate(route) {
    const normalised = normaliseRoute(route);
    const template = routes[normalised] ?? stubHtml('Mission Console');
    content.innerHTML = template;
    app.dataset.route = normalised;
    activateTopbar(normalised);
    if (location.hash !== `#${normalised}` && !(normalised === '/' && location.hash === '#/')) {
      const hashValue = normalised === '/' ? '#/' : `#${normalised}`;
      history.replaceState(null, '', `${location.pathname}${hashValue}`);
    }
    setMenu(false);
    content.focus({ preventScroll: true });
  }

  function syncFromHash() {
    const hash = location.hash || '#/';
    navigate(hash.replace(/^#/, ''));
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = navigation.classList.contains('navigation--open');
    setMenu(!isOpen);
  });

  overlay.addEventListener('click', () => setMenu(false));

  navigationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = normaliseRoute(button.dataset.target || '/');
      navigate(target);
    });
  });

  window.addEventListener('hashchange', syncFromHash);

  syncFromHash();
})();
