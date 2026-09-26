export function setup(state, elements, deps = {}) {
  deps.attachComparisonHandlers?.(state, elements);
}

export function render(state, elements, deps = {}) {
  const { context = {}, renderBiomes, currentFilters } = deps;
  const filters =
    context.filters ?? (typeof currentFilters === 'function' ? currentFilters() : undefined);
  renderBiomes?.(filters);
}
