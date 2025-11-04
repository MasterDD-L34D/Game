export function setup(state, elements, deps = {}) {
  deps.attachComposerHandlers?.(state, elements);
}

export function render(state, elements, deps = {}) {
  deps.renderComposerPanel?.(state, elements);
}
