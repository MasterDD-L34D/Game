export function setup() {}

export function render(state, elements, deps = {}) {
  deps.renderTraitExpansions?.(state, elements);
}
