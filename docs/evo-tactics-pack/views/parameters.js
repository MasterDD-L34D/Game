export function setup(state, elements, deps = {}) {
  deps.setupFilterChangeHandlers?.(state, elements);
  deps.attachProfileHandlers?.(state, elements);
  deps.setupExportControls?.(state, elements);
}

export function render(state, elements, deps = {}) {
  const {
    context = {},
    renderProfileSlots,
    renderExportManifest,
    renderKpiSidebar,
    currentFilters,
  } = deps;

  const refreshTargets = Array.isArray(context.refresh)
    ? new Set(context.refresh)
    : new Set(['profiles', 'export', 'kpi']);

  if (refreshTargets.has('profiles') && typeof renderProfileSlots === 'function') {
    renderProfileSlots(state, elements);
  }

  if (refreshTargets.has('export') && typeof renderExportManifest === 'function') {
    const filters =
      context.filters ??
      (typeof context.getFilters === 'function' ? context.getFilters() : undefined) ??
      (typeof currentFilters === 'function' ? currentFilters() : undefined);
    renderExportManifest(filters);
  }

  if (refreshTargets.has('kpi') && typeof renderKpiSidebar === 'function') {
    renderKpiSidebar(state, elements);
  }
}
