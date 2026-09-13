const DEFAULT_LABEL = '';

function filterElements(list) {
  return Array.isArray(list) ? list.filter((node) => node instanceof HTMLElement) : [];
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

export function createAnchorNavigator(environment = {}) {
  const doc = environment.document ?? (typeof document !== 'undefined' ? document : null);
  const win = environment.window ?? (typeof window !== 'undefined' ? window : null);

  const state = {
    doc,
    win,
    ui: {
      anchors: [],
      panels: [],
      breadcrumbTargets: [],
      minimapContainers: [],
      overlay: null,
      codexToggles: [],
      codexClosers: [],
    },
    descriptors: [],
    descriptorsById: new Map(),
    sectionsById: new Map(),
    minimaps: new Map(),
    observer: null,
    scrollHandler: null,
    activeId: null,
    lastToggle: null,
    anchorHandlers: new Map(),
    toggleHandlers: new Map(),
    closerHandlers: new Map(),
    overlayClickHandler: null,
    keydownHandler: null,
    hashHandler: null,
  };

  function setUi(ui) {
    state.ui.anchors = filterElements(toArray(ui?.anchors));
    state.ui.panels = filterElements(toArray(ui?.panels));
    state.ui.breadcrumbTargets = filterElements(toArray(ui?.breadcrumbTargets));
    state.ui.minimapContainers = filterElements(toArray(ui?.minimapContainers));
    state.ui.overlay = ui?.overlay instanceof HTMLElement ? ui.overlay : null;
    state.ui.codexToggles = filterElements(toArray(ui?.codexToggles));
    state.ui.codexClosers = filterElements(toArray(ui?.codexClosers));
  }

  function getPanelIdFromHash() {
    if (!state.win) return null;
    const hash = state.win.location?.hash ?? '';
    if (!hash) return null;
    const id = hash.replace(/^#/, '');
    if (!id) return null;
    const element = state.doc?.getElementById(id);
    if (!element) return null;
    return element.dataset?.panel ?? null;
  }

  function updateBreadcrumbs(sectionId) {
    const descriptor = state.descriptorsById.get(sectionId);
    const label = descriptor?.label ?? DEFAULT_LABEL;
    state.ui.breadcrumbTargets.forEach((target) => {
      target.textContent = label;
      target.dataset.activeAnchor = sectionId ?? '';
    });
  }

  function updateMinimapState() {
    state.minimaps.forEach((registry) => {
      registry.forEach(({ item, progress }, id) => {
        const descriptor = state.descriptorsById.get(id);
        if (!descriptor) return;
        const ratio = Math.max(0, Math.min(1, descriptor.progress ?? 0));
        progress.style.setProperty('--progress', `${Math.round(ratio * 100)}%`);
        if (state.activeId === id) {
          item.classList.add('is-active');
        } else {
          item.classList.remove('is-active');
        }
      });
    });
  }

  function setActiveSection(sectionId, { updateHash = false, silent = false } = {}) {
    if (!sectionId || !state.descriptorsById.has(sectionId)) {
      return false;
    }

    const previous = state.activeId;
    state.activeId = sectionId;

    if (previous !== sectionId || !silent) {
      state.descriptors.forEach((descriptor) => {
        if (descriptor.id === sectionId) {
          descriptor.anchor.classList.add('is-active');
          descriptor.anchor.setAttribute('aria-current', 'location');
        } else {
          descriptor.anchor.classList.remove('is-active');
          descriptor.anchor.removeAttribute('aria-current');
        }
      });
      updateBreadcrumbs(sectionId);
      updateMinimapState();
    }

    if (updateHash) {
      const panel = state.sectionsById.get(sectionId)?.element;
      if (panel?.id && state.win?.history?.replaceState) {
        state.win.history.replaceState(null, '', `#${panel.id}`);
      }
    }

    return true;
  }

  function focusPanel(panel) {
    if (!panel || typeof panel.focus !== 'function') {
      return;
    }
    try {
      panel.focus({ preventScroll: true });
    } catch (error) {
      panel.focus();
    }
  }

  function scrollToPanel(panelId, { smooth = true } = {}) {
    if (!panelId) return false;
    const entry = state.sectionsById.get(panelId);
    const panel = entry?.element;
    if (!panel) return false;
    if (!panel.hasAttribute('tabindex')) {
      panel.setAttribute('tabindex', '-1');
    }
    if (typeof panel.scrollIntoView === 'function') {
      const behavior = smooth ? 'smooth' : 'auto';
      panel.scrollIntoView({ behavior, block: 'start' });
    }
    if (typeof state.win?.requestAnimationFrame === 'function') {
      state.win.requestAnimationFrame(() => focusPanel(panel));
    } else {
      focusPanel(panel);
    }
    return true;
  }

  function computeActiveSection() {
    if (!state.descriptors.length) return null;
    const visible = state.descriptors.filter((descriptor) => descriptor.isIntersecting);
    if (visible.length) {
      visible.sort((a, b) => (a.top ?? 0) - (b.top ?? 0));
      return visible[0].id;
    }

    let candidate = null;
    let minTop = Infinity;
    state.descriptors.forEach((descriptor) => {
      const section = state.sectionsById.get(descriptor.id);
      const element = section?.element;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < minTop) {
        minTop = rect.top;
        candidate = descriptor.id;
      }
    });

    if (candidate) return candidate;
    return state.descriptors[state.descriptors.length - 1]?.id ?? null;
  }

  function handleAnchorObserver(entries) {
    entries.forEach((entry) => {
      const id = entry.target?.dataset?.panel;
      if (!id) return;
      const descriptor = state.descriptorsById.get(id);
      if (!descriptor) return;
      descriptor.progress = entry.intersectionRatio ?? 0;
      descriptor.isIntersecting = !!entry.isIntersecting;
      descriptor.top = entry.boundingClientRect?.top ?? 0;
      descriptor.bottom = entry.boundingClientRect?.bottom ?? 0;
    });

    const nextActive = computeActiveSection();
    if (nextActive) {
      setActiveSection(nextActive, { silent: true });
    }
    updateMinimapState();
  }

  function cleanupScrollFallback() {
    if (!state.scrollHandler || !state.win) {
      return;
    }
    state.win.removeEventListener('scroll', state.scrollHandler);
    state.win.removeEventListener('resize', state.scrollHandler);
    state.scrollHandler = null;
  }

  function createScrollFallback() {
    if (!state.win) return;
    state.scrollHandler = () => {
      const viewportHeight = state.win.innerHeight || state.doc?.documentElement?.clientHeight || 1;

      state.descriptors.forEach((descriptor) => {
        const section = state.sectionsById.get(descriptor.id);
        const element = section?.element;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const height = rect.height || element.offsetHeight || 1;
        const visible = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        const ratio = Math.max(0, Math.min(1, visible / height));

        descriptor.progress = Number.isFinite(ratio) ? ratio : 0;
        descriptor.isIntersecting = rect.top < viewportHeight && rect.bottom > 0;
        descriptor.top = rect.top;
        descriptor.bottom = rect.bottom;
      });

      const nextActive = computeActiveSection();
      if (nextActive) {
        setActiveSection(nextActive, { silent: true });
      }
      updateMinimapState();
    };

    state.win.addEventListener('scroll', state.scrollHandler, { passive: true });
    state.win.addEventListener('resize', state.scrollHandler);
    state.scrollHandler();
  }

  function createAnchorObserver() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
    cleanupScrollFallback();
    if (!state.sectionsById.size) return;

    const IntersectionObserverCtor =
      (state.win && state.win.IntersectionObserver) || globalThis.IntersectionObserver;

    if (typeof IntersectionObserverCtor === 'undefined') {
      createScrollFallback();
      return;
    }

    const thresholds = [];
    for (let value = 0; value <= 1; value += 0.25) {
      thresholds.push(Number(value.toFixed(2)));
    }

    state.observer = new IntersectionObserverCtor(handleAnchorObserver, {
      rootMargin: '-40% 0px -40% 0px',
      threshold: thresholds,
    });

    state.sectionsById.forEach(({ element }) => {
      if (element) {
        state.observer.observe(element);
      }
    });
  }

  function setupMinimaps() {
    state.minimaps.clear();
    if (!state.doc) return;

    state.ui.minimapContainers.forEach((container) => {
      const isOverlay = container.dataset.minimapMode === 'overlay';
      const existingTitle = container.querySelector('.codex-minimap__title');
      const label =
        container.dataset.minimapLabel || existingTitle?.textContent?.trim() || 'Minimappa';

      container.innerHTML = '';

      if (!isOverlay) {
        const title = state.doc.createElement('p');
        title.className = 'codex-minimap__title';
        title.textContent = label;
        container.appendChild(title);
      }

      const list = state.doc.createElement('ol');
      list.className = isOverlay ? 'codex-overlay__list' : 'codex-minimap__list';
      const registry = new Map();

      state.descriptors.forEach((descriptor) => {
        const item = state.doc.createElement('li');
        item.className = isOverlay ? 'codex-overlay__item' : 'codex-minimap__item';
        item.dataset.minimapItem = descriptor.id;

        const trigger = state.doc.createElement('button');
        trigger.type = 'button';
        trigger.className = isOverlay ? 'codex-overlay__link' : 'codex-minimap__link';
        trigger.textContent = descriptor.label;
        const handler = () => {
          if (setActiveSection(descriptor.id, { updateHash: true })) {
            scrollToPanel(descriptor.id);
          }
          if (isOverlay) {
            closeOverlay();
          }
        };
        trigger.addEventListener('click', handler);

        const progress = state.doc.createElement('span');
        progress.className = isOverlay ? 'codex-overlay__progress' : 'codex-minimap__progress';
        progress.style.setProperty('--progress', '0%');

        item.append(trigger, progress);
        list.appendChild(item);
        registry.set(descriptor.id, { item, progress });
      });

      container.appendChild(list);
      state.minimaps.set(container, registry);
    });

    updateMinimapState();
  }

  function closeOverlay({ skipFocus = false } = {}) {
    const overlay = state.ui.overlay;
    if (!overlay || overlay.hidden) {
      state.lastToggle = skipFocus ? state.lastToggle : null;
      return;
    }
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    state.doc?.body?.classList.remove('codex-open');
    if (!skipFocus && state.lastToggle && typeof state.lastToggle.focus === 'function') {
      state.lastToggle.focus();
    }
    state.lastToggle = null;
  }

  function openOverlay() {
    const overlay = state.ui.overlay;
    if (!overlay) return;
    if (!state.minimaps.size) {
      setupMinimaps();
    }
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    state.doc?.body?.classList.add('codex-open');
    updateMinimapState();
    const closeButton = overlay.querySelector('[data-codex-close]');
    if (closeButton instanceof HTMLElement) {
      closeButton.focus({ preventScroll: true });
    }
  }

  function setupOverlayControls() {
    const overlay = state.ui.overlay;
    if (!overlay) return;

    closeOverlay({ skipFocus: true });

    state.ui.codexToggles.forEach((button) => {
      const handler = () => {
        state.lastToggle = button;
        openOverlay();
      };
      button.addEventListener('click', handler);
      state.toggleHandlers.set(button, handler);
    });

    state.ui.codexClosers.forEach((button) => {
      const handler = () => {
        closeOverlay();
      };
      button.addEventListener('click', handler);
      state.closerHandlers.set(button, handler);
    });

    state.overlayClickHandler = (event) => {
      if (event.target === overlay) {
        closeOverlay();
      }
    };
    overlay.addEventListener('click', state.overlayClickHandler);

    if (state.doc) {
      state.keydownHandler = (event) => {
        if (event.key === 'Escape' && state.doc.body?.classList.contains('codex-open')) {
          closeOverlay();
        }
      };
      state.doc.addEventListener('keydown', state.keydownHandler);
    }
  }

  function attachAnchorHandlers() {
    state.anchorHandlers.forEach((handler, anchor) => {
      anchor.removeEventListener('click', handler);
    });
    state.anchorHandlers.clear();

    state.descriptors.forEach((descriptor) => {
      const handler = (event) => {
        event.preventDefault();
        if (setActiveSection(descriptor.id, { updateHash: true })) {
          scrollToPanel(descriptor.id);
        }
        closeOverlay();
      };
      descriptor.anchor.addEventListener('click', handler);
      state.anchorHandlers.set(descriptor.anchor, handler);
    });
  }

  function attachHashHandler() {
    if (!state.win) return;
    if (state.hashHandler) {
      state.win.removeEventListener('hashchange', state.hashHandler);
    }
    state.hashHandler = () => {
      const fromHash = getPanelIdFromHash();
      if (fromHash) {
        setActiveSection(fromHash, { silent: true });
      }
    };
    state.win.addEventListener('hashchange', state.hashHandler);
  }

  function detachOverlayControls() {
    state.ui.codexToggles.forEach((button) => {
      const handler = state.toggleHandlers.get(button);
      if (handler) {
        button.removeEventListener('click', handler);
      }
    });
    state.toggleHandlers.clear();

    state.ui.codexClosers.forEach((button) => {
      const handler = state.closerHandlers.get(button);
      if (handler) {
        button.removeEventListener('click', handler);
      }
    });
    state.closerHandlers.clear();

    if (state.overlayClickHandler && state.ui.overlay) {
      state.ui.overlay.removeEventListener('click', state.overlayClickHandler);
      state.overlayClickHandler = null;
    }

    if (state.keydownHandler && state.doc) {
      state.doc.removeEventListener('keydown', state.keydownHandler);
      state.keydownHandler = null;
    }
  }

  function detachHashHandler() {
    if (state.hashHandler && state.win) {
      state.win.removeEventListener('hashchange', state.hashHandler);
      state.hashHandler = null;
    }
  }

  function destroy() {
    cleanupScrollFallback();
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
    detachHashHandler();
    detachOverlayControls();
    state.anchorHandlers.forEach((handler, anchor) => {
      anchor.removeEventListener('click', handler);
    });
    state.anchorHandlers.clear();
    closeOverlay({ skipFocus: true });
    state.descriptors = [];
    state.descriptorsById.clear();
    state.sectionsById.clear();
    state.minimaps.clear();
    state.activeId = null;
    state.lastToggle = null;
    setUi({});
  }

  function init(ui) {
    destroy();
    setUi(ui);

    if (!state.ui.anchors.length || !state.ui.panels.length) {
      return { activeId: null };
    }

    state.sectionsById = new Map();
    state.ui.panels.forEach((panel) => {
      const panelId = panel.dataset.panel;
      if (!panelId) return;
      state.sectionsById.set(panelId, { element: panel });
      if (!panel.hasAttribute('tabindex')) {
        panel.setAttribute('tabindex', '-1');
      }
    });

    state.descriptors = state.ui.anchors
      .map((anchor) => {
        const id = anchor.dataset.anchorTarget;
        if (!id || !state.sectionsById.has(id)) return null;
        const label = anchor.textContent?.trim() || id;
        return {
          id,
          label,
          anchor,
          progress: 0,
          isIntersecting: false,
          top: 0,
          bottom: 0,
        };
      })
      .filter(Boolean);

    state.descriptorsById = new Map(
      state.descriptors.map((descriptor) => [descriptor.id, descriptor]),
    );

    if (!state.descriptors.length) {
      return { activeId: null };
    }

    attachAnchorHandlers();
    setupMinimaps();
    createAnchorObserver();
    setupOverlayControls();
    attachHashHandler();

    const initialId = getPanelIdFromHash();
    if (initialId && state.descriptorsById.has(initialId)) {
      setActiveSection(initialId, { silent: true });
    } else {
      setActiveSection(state.descriptors[0].id, { silent: true });
    }

    return { activeId: state.activeId };
  }

  return {
    init,
    setActiveSection,
    scrollToPanel,
    destroy,
    openOverlay,
    closeOverlay,
    hasSection: (sectionId) => state.descriptorsById.has(sectionId),
    getActiveSection: () => state.activeId,
  };
}

export default createAnchorNavigator;
