export function setup() {}

export function render(state, elements, deps = {}) {
  deps.renderSeeds?.(state, elements);
}
