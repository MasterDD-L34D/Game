#!/usr/bin/env node

try {
  // Husky v9 exports install on the default export.
  const husky = require('husky');
  const install =
    typeof husky === 'function'
      ? husky
      : typeof husky?.install === 'function'
        ? husky.install
        : typeof husky?.default === 'function'
          ? husky.default
          : typeof husky?.default?.install === 'function'
            ? husky.default.install
            : null;
  if (typeof install === 'function') {
    install('.husky');
  } else {
    console.warn('[husky] install skipped: install helper not available');
  }
} catch (error) {
  const message =
    error && typeof error === 'object' && 'message' in error ? error.message : String(error);
  console.warn(`[husky] install skipped: ${message}`);
}
