// Sprint R.3 — minimal JSON-Patch (RFC 6902) subset for state diff broadcast.
//
// Supported ops: replace, add, remove. Path syntax is JSON-Pointer
// per RFC 6901 (`/foo/bar/0/baz`). Numeric segments addressing arrays.
//
// `add` semantics:
//   - Object target: sets key.
//   - Array target with numeric segment: inserts at index (shift right).
//   - Array target with `-` segment: appends.
//
// `remove` on missing path is a no-op (defensive, server may emit
// duplicate intent ops without strict idempotency tracking).
//
// `replace` on missing path is a no-op (likewise defensive).
//
// Returns a NEW object — does not mutate input.

'use strict';

function decodePointer(path) {
  // Codex PR #2033 P2 fix: distinguish missing/non-string path
  // (invalid input) from intentional empty-string root pointer (RFC
  // 6901 §5). Pre-fix: both produced `[]` segments and applyOp
  // silently treated them as root replacement → malformed ops without
  // a path field could corrupt entire room state.
  if (path === undefined) {
    throw new Error('invalid_pointer: missing path');
  }
  if (typeof path !== 'string') {
    throw new Error('invalid_pointer: path must be string');
  }
  if (path.length === 0) return []; // RFC 6901 root pointer.
  if (path === '/') return [''];
  if (path[0] !== '/') throw new Error(`invalid_pointer: ${path}`);
  return path
    .slice(1)
    .split('/')
    .map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepClone(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(deepClone);
  const out = {};
  for (const [k, val] of Object.entries(v)) out[k] = deepClone(val);
  return out;
}

function applyOp(state, op) {
  if (!op || typeof op !== 'object') throw new Error('invalid_op');
  const segments = decodePointer(op.path);
  if (segments.length === 0) {
    // Root replace.
    if (op.op === 'replace' || op.op === 'add') {
      return deepClone(op.value);
    }
    if (op.op === 'remove') {
      return Array.isArray(state) ? [] : {};
    }
    throw new Error(`unsupported_op: ${op.op}`);
  }

  const root = deepClone(state);
  let cursor = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i];
    if (Array.isArray(cursor)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cursor.length) {
        // Path missing — no-op for replace/remove; auto-create not in subset.
        return root;
      }
      cursor = cursor[idx];
    } else if (isPlainObject(cursor)) {
      if (!Object.prototype.hasOwnProperty.call(cursor, seg)) {
        return root;
      }
      cursor = cursor[seg];
    } else {
      return root;
    }
  }
  const last = segments[segments.length - 1];
  if (op.op === 'replace') {
    if (Array.isArray(cursor)) {
      const idx = Number(last);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cursor.length) return root;
      cursor[idx] = deepClone(op.value);
    } else if (isPlainObject(cursor)) {
      if (!Object.prototype.hasOwnProperty.call(cursor, last)) return root;
      cursor[last] = deepClone(op.value);
    }
    return root;
  }
  if (op.op === 'add') {
    if (Array.isArray(cursor)) {
      if (last === '-') {
        cursor.push(deepClone(op.value));
      } else {
        const idx = Number(last);
        if (!Number.isInteger(idx) || idx < 0 || idx > cursor.length) return root;
        cursor.splice(idx, 0, deepClone(op.value));
      }
    } else if (isPlainObject(cursor)) {
      cursor[last] = deepClone(op.value);
    }
    return root;
  }
  if (op.op === 'remove') {
    if (Array.isArray(cursor)) {
      const idx = Number(last);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cursor.length) return root;
      cursor.splice(idx, 1);
    } else if (isPlainObject(cursor)) {
      if (Object.prototype.hasOwnProperty.call(cursor, last)) delete cursor[last];
    }
    return root;
  }
  throw new Error(`unsupported_op: ${op.op}`);
}

/**
 * Apply an array of ops to a state Dictionary, returning a new state.
 * Ops applied in order; partial failure mid-array stops + returns
 * intermediate result.
 *
 * @param {object} state - input state (treated as immutable)
 * @param {Array<{op, path, value?}>} ops
 * @returns {object} new state with ops applied
 */
function applyOps(state, ops) {
  if (!Array.isArray(ops)) throw new Error('ops_array_required');
  let cur = state;
  for (const op of ops) {
    cur = applyOp(cur, op);
  }
  return cur;
}

module.exports = {
  applyOp,
  applyOps,
  decodePointer,
};
