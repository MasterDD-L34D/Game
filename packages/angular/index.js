const modules = new Map();

class RouteProvider {
  constructor() {
    this.routes = [];
    this.defaultRoute = null;
  }

  when(path, definition) {
    this.routes.push({ path, definition });
    return this;
  }

  otherwise(definition) {
    this.defaultRoute = definition;
    return this;
  }
}

class LocationProvider {
  constructor() {
    this.prefix = '!';
  }

  hashPrefix(prefix) {
    this.prefix = typeof prefix === 'string' ? prefix : this.prefix;
    return this;
  }
}

const providerFactories = {
  $routeProvider: () => new RouteProvider(),
  $locationProvider: () => new LocationProvider(),
};

function normalizeInjectable(injectable) {
  if (Array.isArray(injectable)) {
    const deps = injectable.slice(0, -1);
    const fn = injectable[injectable.length - 1];
    if (typeof fn !== 'function') {
      throw new TypeError('Invalid injectable definition');
    }
    return { deps, fn };
  }

  if (typeof injectable === 'function') {
    const deps = Array.isArray(injectable.$inject) ? injectable.$inject : [];
    return { deps, fn: injectable };
  }

  throw new TypeError('Invalid injectable definition');
}

function invokeWithProviders(injectable) {
  const { deps, fn } = normalizeInjectable(injectable);
  const locals = Object.create(null);
  for (const [token, factory] of Object.entries(providerFactories)) {
    locals[token] = factory();
  }

  const args = deps.map((dep) => (dep in locals ? locals[dep] : undefined));
  return fn(...args);
}

class AngularModule {
  constructor(name, requires = []) {
    this.name = name;
    this.requires = requires;
    this.components = new Map();
    this.services = new Map();
    this.configBlocks = [];
  }

  config(injectable) {
    this.configBlocks.push(injectable);
    try {
      invokeWithProviders(injectable);
    } catch (error) {
      console.warn('[angular-stub] config block execution failed', error);
    }
    return this;
  }

  component(name, definition) {
    this.components.set(name, definition);
    return this;
  }

  service(name, constructor) {
    this.services.set(name, constructor);
    return this;
  }

  run(injectable) {
    this.configBlocks.push(injectable);
    return this;
  }
}

function ensureModuleExists(name) {
  const existing = modules.get(name);
  if (!existing) {
    const module = new AngularModule(name, []);
    modules.set(name, module);
    return module;
  }
  return existing;
}

function moduleFactory(name, requires) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('Module name must be a non-empty string');
  }

  if (requires === undefined) {
    const existing = modules.get(name);
    if (!existing) {
      throw new Error(`Module '${name}' is not available`);
    }
    return existing;
  }

  const module = new AngularModule(name, Array.isArray(requires) ? requires : []);
  modules.set(name, module);
  for (const dep of module.requires) {
    ensureModuleExists(dep);
  }
  return module;
}

function angularElement(target) {
  const doc = typeof document === 'undefined' ? undefined : document;
  const node = target && target.nodeType ? target : doc;
  return {
    ready(callback) {
      if (typeof callback !== 'function') {
        return;
      }

      if (!doc) {
        callback();
        return;
      }

      if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
        queueMicrotask(() => callback());
      } else {
        doc.addEventListener('DOMContentLoaded', () => callback(), { once: true });
      }
    },
    append(child) {
      if (node && typeof node.appendChild === 'function' && child) {
        node.appendChild(child);
      }
    },
  };
}

function bootstrap(rootElement, moduleNames = []) {
  if (!rootElement) {
    throw new Error('Cannot bootstrap Angular application without a root element');
  }

  for (const name of moduleNames) {
    ensureModuleExists(name);
  }

  rootElement.__angularBootstrapped__ = {
    modules: [...moduleNames],
  };

  return rootElement;
}

const angular = {
  module: moduleFactory,
  element: angularElement,
  bootstrap,
  version: { full: '1.8.3-stub' },
};

if (typeof globalThis !== 'undefined' && typeof globalThis.angular === 'undefined') {
  globalThis.angular = angular;
}

export default angular;
