export function setup(state, elements, deps = {}) {
  deps.attachInsightHandlers?.(state, elements);
}

export function render(state, elements, deps = {}) {
  const { context = {}, renderContextualInsights, getRecommendations } = deps;
  const recommendations =
    context.recommendations ??
    (typeof getRecommendations === 'function' ? getRecommendations() : []);
  renderContextualInsights?.(recommendations);
}
