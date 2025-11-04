export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'class') {
      element.className = value;
    } else if (key === 'for') {
      element.setAttribute('for', value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.substring(2), value);
    } else if (key === 'dataset' && value && typeof value === 'object') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        if (dataValue !== undefined && dataValue !== null) {
          element.dataset[dataKey] = dataValue;
        }
      });
    } else {
      element.setAttribute(key, value);
    }
  });

  (Array.isArray(children) ? children : [children]).forEach((child) => {
    if (child === null || child === undefined) {
      return;
    }
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });

  return element;
}
