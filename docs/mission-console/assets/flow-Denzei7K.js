var Jo = Object.defineProperty;
var ec = (e, t, n) =>
  t in e ? Jo(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n);
var We = (e, t, n) => ec(e, typeof t != 'symbol' ? t + '' : t, n);
import {
  e as tc,
  r as Pe,
  s as kl,
  c as T,
  w as tt,
  i as nc,
  d as es,
  g as va,
  h as wl,
  F as te,
  a as ac,
  o as ts,
  b as sc,
  f as rc,
  j as Ne,
  T as ic,
  _ as Ue,
  t as Ln,
  k as _,
  l as h,
  m as o,
  n as se,
  p as ft,
  u as le,
  q as b,
  v as za,
  x as Y,
  S as lc,
  y as ct,
  z as El,
  A as Sl,
  B as Tl,
  C as Al,
  D as Gt,
  E as oc,
  G as yn,
  H as cc,
  I as jr,
  J as zr,
  K as uc,
  L as dn,
  M as dc,
  N as fc,
  O as na,
  P as mc,
  Q as st,
  R as nt,
  U as _n,
  V as Ze,
  W as pc,
  X as Ft,
  Y as gc,
  Z as sr,
  $ as Wn,
  a0 as hc,
  a1 as Os,
  a2 as _c,
  a3 as vc,
  a4 as bc,
  a5 as yc,
  a6 as kc,
} from './atlas-CH8HkhBa.js';
/*!
 * shared v9.14.5
 * (c) 2025 kazuya kawaguchi
 * Released under the MIT License.
 */ function wc(e, t) {
  typeof console < 'u' && (console.warn('[intlify] ' + e), t && console.warn(t.stack));
}
const Va = typeof window < 'u',
  kn = (e, t = !1) => (t ? Symbol.for(e) : Symbol(e)),
  Ec = (e, t, n) => Sc({ l: e, k: t, s: n }),
  Sc = (e) =>
    JSON.stringify(e)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
      .replace(/\u0027/g, '\\u0027'),
  rt = (e) => typeof e == 'number' && isFinite(e),
  Tc = (e) => $l(e) === '[object Date]',
  vn = (e) => $l(e) === '[object RegExp]',
  ns = (e) => Oe(e) && Object.keys(e).length === 0,
  bt = Object.assign,
  Ac = Object.create,
  Xe = (e = null) => Ac(e);
let Vr;
const sn = () =>
  Vr ||
  (Vr =
    typeof globalThis < 'u'
      ? globalThis
      : typeof self < 'u'
        ? self
        : typeof window < 'u'
          ? window
          : typeof global < 'u'
            ? global
            : Xe());
function Br(e) {
  return e
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/\//g, '&#x2F;')
    .replace(/=/g, '&#x3D;');
}
function Wr(e) {
  return e
    .replace(/&(?![a-zA-Z0-9#]{2,6};)/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function Ic(e) {
  return (
    (e = e.replace(/(\w+)\s*=\s*"([^"]*)"/g, (a, s, r) => `${s}="${Wr(r)}"`)),
    (e = e.replace(/(\w+)\s*=\s*'([^']*)'/g, (a, s, r) => `${s}='${Wr(r)}'`)),
    /\s*on\w+\s*=\s*["']?[^"'>]+["']?/gi.test(e) &&
      (e = e.replace(/(\s+)(on)(\w+\s*=)/gi, '$1&#111;n$3')),
    [
      /(\s+(?:href|src|action|formaction)\s*=\s*["']?)\s*javascript:/gi,
      /(style\s*=\s*["'][^"']*url\s*\(\s*)javascript:/gi,
    ].forEach((a) => {
      e = e.replace(a, '$1javascript&#58;');
    }),
    e
  );
}
const $c = Object.prototype.hasOwnProperty;
function qt(e, t) {
  return $c.call(e, t);
}
const Qe = Array.isArray,
  Ke = (e) => typeof e == 'function',
  fe = (e) => typeof e == 'string',
  Me = (e) => typeof e == 'boolean',
  Ve = (e) => e !== null && typeof e == 'object',
  Nc = (e) => Ve(e) && Ke(e.then) && Ke(e.catch),
  Il = Object.prototype.toString,
  $l = (e) => Il.call(e),
  Oe = (e) => {
    if (!Ve(e)) return !1;
    const t = Object.getPrototypeOf(e);
    return t === null || t.constructor === Object;
  },
  xc = (e) =>
    e == null ? '' : Qe(e) || (Oe(e) && e.toString === Il) ? JSON.stringify(e, null, 2) : String(e);
function Cc(e, t = '') {
  return e.reduce((n, a, s) => (s === 0 ? n + a : n + t + a), '');
}
function as(e) {
  let t = e;
  return () => ++t;
}
const Ia = (e) => !Ve(e) || Qe(e);
function Fa(e, t) {
  if (Ia(e) || Ia(t)) throw new Error('Invalid value');
  const n = [{ src: e, des: t }];
  for (; n.length; ) {
    const { src: a, des: s } = n.pop();
    Object.keys(a).forEach((r) => {
      r !== '__proto__' &&
        (Ve(a[r]) && !Ve(s[r]) && (s[r] = Array.isArray(a[r]) ? [] : Xe()),
        Ia(s[r]) || Ia(a[r]) ? (s[r] = a[r]) : n.push({ src: a[r], des: s[r] }));
    });
  }
}
/*!
 * message-compiler v9.14.5
 * (c) 2025 kazuya kawaguchi
 * Released under the MIT License.
 */ function Oc(e, t, n) {
  return { line: e, column: t, offset: n };
}
function Ba(e, t, n) {
  return { start: e, end: t };
}
const Lc = /\{([0-9a-zA-Z]+)\}/g;
function Nl(e, ...t) {
  return (
    t.length === 1 && Rc(t[0]) && (t = t[0]),
    (!t || !t.hasOwnProperty) && (t = {}),
    e.replace(Lc, (n, a) => (t.hasOwnProperty(a) ? t[a] : ''))
  );
}
const xl = Object.assign,
  Hr = (e) => typeof e == 'string',
  Rc = (e) => e !== null && typeof e == 'object';
function Cl(e, t = '') {
  return e.reduce((n, a, s) => (s === 0 ? n + a : n + t + a), '');
}
const rr = { USE_MODULO_SYNTAX: 1, __EXTEND_POINT__: 2 },
  Pc = { [rr.USE_MODULO_SYNTAX]: "Use modulo before '{{0}}'." };
function Mc(e, t, ...n) {
  const a = Nl(Pc[e], ...(n || [])),
    s = { message: String(a), code: e };
  return (t && (s.location = t), s);
}
const Ie = {
    EXPECTED_TOKEN: 1,
    INVALID_TOKEN_IN_PLACEHOLDER: 2,
    UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER: 3,
    UNKNOWN_ESCAPE_SEQUENCE: 4,
    INVALID_UNICODE_ESCAPE_SEQUENCE: 5,
    UNBALANCED_CLOSING_BRACE: 6,
    UNTERMINATED_CLOSING_BRACE: 7,
    EMPTY_PLACEHOLDER: 8,
    NOT_ALLOW_NEST_PLACEHOLDER: 9,
    INVALID_LINKED_FORMAT: 10,
    MUST_HAVE_MESSAGES_IN_PLURAL: 11,
    UNEXPECTED_EMPTY_LINKED_MODIFIER: 12,
    UNEXPECTED_EMPTY_LINKED_KEY: 13,
    UNEXPECTED_LEXICAL_ANALYSIS: 14,
    UNHANDLED_CODEGEN_NODE_TYPE: 15,
    UNHANDLED_MINIFIER_NODE_TYPE: 16,
    __EXTEND_POINT__: 17,
  },
  Dc = {
    [Ie.EXPECTED_TOKEN]: "Expected token: '{0}'",
    [Ie.INVALID_TOKEN_IN_PLACEHOLDER]: "Invalid token in placeholder: '{0}'",
    [Ie.UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER]: 'Unterminated single quote in placeholder',
    [Ie.UNKNOWN_ESCAPE_SEQUENCE]: 'Unknown escape sequence: \\{0}',
    [Ie.INVALID_UNICODE_ESCAPE_SEQUENCE]: 'Invalid unicode escape sequence: {0}',
    [Ie.UNBALANCED_CLOSING_BRACE]: 'Unbalanced closing brace',
    [Ie.UNTERMINATED_CLOSING_BRACE]: 'Unterminated closing brace',
    [Ie.EMPTY_PLACEHOLDER]: 'Empty placeholder',
    [Ie.NOT_ALLOW_NEST_PLACEHOLDER]: 'Not allowed nest placeholder',
    [Ie.INVALID_LINKED_FORMAT]: 'Invalid linked format',
    [Ie.MUST_HAVE_MESSAGES_IN_PLURAL]: 'Plural must have messages',
    [Ie.UNEXPECTED_EMPTY_LINKED_MODIFIER]: 'Unexpected empty linked modifier',
    [Ie.UNEXPECTED_EMPTY_LINKED_KEY]: 'Unexpected empty linked key',
    [Ie.UNEXPECTED_LEXICAL_ANALYSIS]: "Unexpected lexical analysis in token: '{0}'",
    [Ie.UNHANDLED_CODEGEN_NODE_TYPE]: "unhandled codegen node type: '{0}'",
    [Ie.UNHANDLED_MINIFIER_NODE_TYPE]: "unhandled mimifier node type: '{0}'",
  };
function Jn(e, t, n = {}) {
  const { domain: a, messages: s, args: r } = n,
    i = Nl((s || Dc)[e] || '', ...(r || [])),
    l = new SyntaxError(String(i));
  return ((l.code = e), t && (l.location = t), (l.domain = a), l);
}
function Fc(e) {
  throw e;
}
const Qt = ' ',
  qc = '\r',
  wt = `
`,
  Uc = '\u2028',
  jc = '\u2029';
function zc(e) {
  const t = e;
  let n = 0,
    a = 1,
    s = 1,
    r = 0;
  const i = (C) => t[C] === qc && t[C + 1] === wt,
    l = (C) => t[C] === wt,
    d = (C) => t[C] === jc,
    c = (C) => t[C] === Uc,
    f = (C) => i(C) || l(C) || d(C) || c(C),
    p = () => n,
    g = () => a,
    v = () => s,
    y = () => r,
    N = (C) => (i(C) || d(C) || c(C) ? wt : t[C]),
    O = () => N(n),
    P = () => N(n + r);
  function V() {
    return ((r = 0), f(n) && (a++, (s = 0)), i(n) && n++, n++, s++, t[n]);
  }
  function k() {
    return (i(n + r) && r++, r++, t[n + r]);
  }
  function E() {
    ((n = 0), (a = 1), (s = 1), (r = 0));
  }
  function A(C = 0) {
    r = C;
  }
  function I() {
    const C = n + r;
    for (; C !== n; ) V();
    r = 0;
  }
  return {
    index: p,
    line: g,
    column: v,
    peekOffset: y,
    charAt: N,
    currentChar: O,
    currentPeek: P,
    next: V,
    peek: k,
    reset: E,
    resetPeek: A,
    skipToPeek: I,
  };
}
const fn = void 0,
  Vc = '.',
  Gr = "'",
  Bc = 'tokenizer';
function Wc(e, t = {}) {
  const n = t.location !== !1,
    a = zc(e),
    s = () => a.index(),
    r = () => Oc(a.line(), a.column(), a.index()),
    i = r(),
    l = s(),
    d = {
      currentType: 14,
      offset: l,
      startLoc: i,
      endLoc: i,
      lastType: 14,
      lastOffset: l,
      lastStartLoc: i,
      lastEndLoc: i,
      braceNest: 0,
      inLinked: !1,
      text: '',
    },
    c = () => d,
    { onError: f } = t;
  function p(w, u, m, ...x) {
    const q = c();
    if (((u.column += m), (u.offset += m), f)) {
      const z = n ? Ba(q.startLoc, u) : null,
        S = Jn(w, z, { domain: Bc, args: x });
      f(S);
    }
  }
  function g(w, u, m) {
    ((w.endLoc = r()), (w.currentType = u));
    const x = { type: u };
    return (n && (x.loc = Ba(w.startLoc, w.endLoc)), m != null && (x.value = m), x);
  }
  const v = (w) => g(w, 14);
  function y(w, u) {
    return w.currentChar() === u ? (w.next(), u) : (p(Ie.EXPECTED_TOKEN, r(), 0, u), '');
  }
  function N(w) {
    let u = '';
    for (; w.currentPeek() === Qt || w.currentPeek() === wt; ) ((u += w.currentPeek()), w.peek());
    return u;
  }
  function O(w) {
    const u = N(w);
    return (w.skipToPeek(), u);
  }
  function P(w) {
    if (w === fn) return !1;
    const u = w.charCodeAt(0);
    return (u >= 97 && u <= 122) || (u >= 65 && u <= 90) || u === 95;
  }
  function V(w) {
    if (w === fn) return !1;
    const u = w.charCodeAt(0);
    return u >= 48 && u <= 57;
  }
  function k(w, u) {
    const { currentType: m } = u;
    if (m !== 2) return !1;
    N(w);
    const x = P(w.currentPeek());
    return (w.resetPeek(), x);
  }
  function E(w, u) {
    const { currentType: m } = u;
    if (m !== 2) return !1;
    N(w);
    const x = w.currentPeek() === '-' ? w.peek() : w.currentPeek(),
      q = V(x);
    return (w.resetPeek(), q);
  }
  function A(w, u) {
    const { currentType: m } = u;
    if (m !== 2) return !1;
    N(w);
    const x = w.currentPeek() === Gr;
    return (w.resetPeek(), x);
  }
  function I(w, u) {
    const { currentType: m } = u;
    if (m !== 8) return !1;
    N(w);
    const x = w.currentPeek() === '.';
    return (w.resetPeek(), x);
  }
  function C(w, u) {
    const { currentType: m } = u;
    if (m !== 9) return !1;
    N(w);
    const x = P(w.currentPeek());
    return (w.resetPeek(), x);
  }
  function D(w, u) {
    const { currentType: m } = u;
    if (!(m === 8 || m === 12)) return !1;
    N(w);
    const x = w.currentPeek() === ':';
    return (w.resetPeek(), x);
  }
  function M(w, u) {
    const { currentType: m } = u;
    if (m !== 10) return !1;
    const x = () => {
        const z = w.currentPeek();
        return z === '{'
          ? P(w.peek())
          : z === '@' || z === '%' || z === '|' || z === ':' || z === '.' || z === Qt || !z
            ? !1
            : z === wt
              ? (w.peek(), x())
              : Z(w, !1);
      },
      q = x();
    return (w.resetPeek(), q);
  }
  function ce(w) {
    N(w);
    const u = w.currentPeek() === '|';
    return (w.resetPeek(), u);
  }
  function ve(w) {
    const u = N(w),
      m = w.currentPeek() === '%' && w.peek() === '{';
    return (w.resetPeek(), { isModulo: m, hasSpace: u.length > 0 });
  }
  function Z(w, u = !0) {
    const m = (q = !1, z = '', S = !1) => {
        const $ = w.currentPeek();
        return $ === '{'
          ? z === '%'
            ? !1
            : q
          : $ === '@' || !$
            ? z === '%'
              ? !0
              : q
            : $ === '%'
              ? (w.peek(), m(q, '%', !0))
              : $ === '|'
                ? z === '%' || S
                  ? !0
                  : !(z === Qt || z === wt)
                : $ === Qt
                  ? (w.peek(), m(!0, Qt, S))
                  : $ === wt
                    ? (w.peek(), m(!0, wt, S))
                    : !0;
      },
      x = m();
    return (u && w.resetPeek(), x);
  }
  function Ae(w, u) {
    const m = w.currentChar();
    return m === fn ? fn : u(m) ? (w.next(), m) : null;
  }
  function Ye(w) {
    const u = w.charCodeAt(0);
    return (
      (u >= 97 && u <= 122) || (u >= 65 && u <= 90) || (u >= 48 && u <= 57) || u === 95 || u === 36
    );
  }
  function De(w) {
    return Ae(w, Ye);
  }
  function Be(w) {
    const u = w.charCodeAt(0);
    return (
      (u >= 97 && u <= 122) ||
      (u >= 65 && u <= 90) ||
      (u >= 48 && u <= 57) ||
      u === 95 ||
      u === 36 ||
      u === 45
    );
  }
  function B(w) {
    return Ae(w, Be);
  }
  function K(w) {
    const u = w.charCodeAt(0);
    return u >= 48 && u <= 57;
  }
  function ue(w) {
    return Ae(w, K);
  }
  function F(w) {
    const u = w.charCodeAt(0);
    return (u >= 48 && u <= 57) || (u >= 65 && u <= 70) || (u >= 97 && u <= 102);
  }
  function G(w) {
    return Ae(w, F);
  }
  function H(w) {
    let u = '',
      m = '';
    for (; (u = ue(w)); ) m += u;
    return m;
  }
  function de(w) {
    O(w);
    const u = w.currentChar();
    return (u !== '%' && p(Ie.EXPECTED_TOKEN, r(), 0, u), w.next(), '%');
  }
  function Te(w) {
    let u = '';
    for (;;) {
      const m = w.currentChar();
      if (m === '{' || m === '}' || m === '@' || m === '|' || !m) break;
      if (m === '%')
        if (Z(w)) ((u += m), w.next());
        else break;
      else if (m === Qt || m === wt)
        if (Z(w)) ((u += m), w.next());
        else {
          if (ce(w)) break;
          ((u += m), w.next());
        }
      else ((u += m), w.next());
    }
    return u;
  }
  function ne(w) {
    O(w);
    let u = '',
      m = '';
    for (; (u = B(w)); ) m += u;
    return (w.currentChar() === fn && p(Ie.UNTERMINATED_CLOSING_BRACE, r(), 0), m);
  }
  function ge(w) {
    O(w);
    let u = '';
    return (
      w.currentChar() === '-' ? (w.next(), (u += `-${H(w)}`)) : (u += H(w)),
      w.currentChar() === fn && p(Ie.UNTERMINATED_CLOSING_BRACE, r(), 0),
      u
    );
  }
  function oe(w) {
    return w !== Gr && w !== wt;
  }
  function j(w) {
    (O(w), y(w, "'"));
    let u = '',
      m = '';
    for (; (u = Ae(w, oe)); ) u === '\\' ? (m += W(w)) : (m += u);
    const x = w.currentChar();
    return x === wt || x === fn
      ? (p(Ie.UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER, r(), 0),
        x === wt && (w.next(), y(w, "'")),
        m)
      : (y(w, "'"), m);
  }
  function W(w) {
    const u = w.currentChar();
    switch (u) {
      case '\\':
      case "'":
        return (w.next(), `\\${u}`);
      case 'u':
        return ae(w, u, 4);
      case 'U':
        return ae(w, u, 6);
      default:
        return (p(Ie.UNKNOWN_ESCAPE_SEQUENCE, r(), 0, u), '');
    }
  }
  function ae(w, u, m) {
    y(w, u);
    let x = '';
    for (let q = 0; q < m; q++) {
      const z = G(w);
      if (!z) {
        p(Ie.INVALID_UNICODE_ESCAPE_SEQUENCE, r(), 0, `\\${u}${x}${w.currentChar()}`);
        break;
      }
      x += z;
    }
    return `\\${u}${x}`;
  }
  function he(w) {
    return w !== '{' && w !== '}' && w !== Qt && w !== wt;
  }
  function R(w) {
    O(w);
    let u = '',
      m = '';
    for (; (u = Ae(w, he)); ) m += u;
    return m;
  }
  function X(w) {
    let u = '',
      m = '';
    for (; (u = De(w)); ) m += u;
    return m;
  }
  function U(w) {
    const u = (m) => {
      const x = w.currentChar();
      return x === '{' ||
        x === '%' ||
        x === '@' ||
        x === '|' ||
        x === '(' ||
        x === ')' ||
        !x ||
        x === Qt
        ? m
        : ((m += x), w.next(), u(m));
    };
    return u('');
  }
  function ie(w) {
    O(w);
    const u = y(w, '|');
    return (O(w), u);
  }
  function we(w, u) {
    let m = null;
    switch (w.currentChar()) {
      case '{':
        return (
          u.braceNest >= 1 && p(Ie.NOT_ALLOW_NEST_PLACEHOLDER, r(), 0),
          w.next(),
          (m = g(u, 2, '{')),
          O(w),
          u.braceNest++,
          m
        );
      case '}':
        return (
          u.braceNest > 0 && u.currentType === 2 && p(Ie.EMPTY_PLACEHOLDER, r(), 0),
          w.next(),
          (m = g(u, 3, '}')),
          u.braceNest--,
          u.braceNest > 0 && O(w),
          u.inLinked && u.braceNest === 0 && (u.inLinked = !1),
          m
        );
      case '@':
        return (
          u.braceNest > 0 && p(Ie.UNTERMINATED_CLOSING_BRACE, r(), 0),
          (m = Le(w, u) || v(u)),
          (u.braceNest = 0),
          m
        );
      default: {
        let q = !0,
          z = !0,
          S = !0;
        if (ce(w))
          return (
            u.braceNest > 0 && p(Ie.UNTERMINATED_CLOSING_BRACE, r(), 0),
            (m = g(u, 1, ie(w))),
            (u.braceNest = 0),
            (u.inLinked = !1),
            m
          );
        if (u.braceNest > 0 && (u.currentType === 5 || u.currentType === 6 || u.currentType === 7))
          return (p(Ie.UNTERMINATED_CLOSING_BRACE, r(), 0), (u.braceNest = 0), Q(w, u));
        if ((q = k(w, u))) return ((m = g(u, 5, ne(w))), O(w), m);
        if ((z = E(w, u))) return ((m = g(u, 6, ge(w))), O(w), m);
        if ((S = A(w, u))) return ((m = g(u, 7, j(w))), O(w), m);
        if (!q && !z && !S)
          return (
            (m = g(u, 13, R(w))),
            p(Ie.INVALID_TOKEN_IN_PLACEHOLDER, r(), 0, m.value),
            O(w),
            m
          );
        break;
      }
    }
    return m;
  }
  function Le(w, u) {
    const { currentType: m } = u;
    let x = null;
    const q = w.currentChar();
    switch (
      ((m === 8 || m === 9 || m === 12 || m === 10) &&
        (q === wt || q === Qt) &&
        p(Ie.INVALID_LINKED_FORMAT, r(), 0),
      q)
    ) {
      case '@':
        return (w.next(), (x = g(u, 8, '@')), (u.inLinked = !0), x);
      case '.':
        return (O(w), w.next(), g(u, 9, '.'));
      case ':':
        return (O(w), w.next(), g(u, 10, ':'));
      default:
        return ce(w)
          ? ((x = g(u, 1, ie(w))), (u.braceNest = 0), (u.inLinked = !1), x)
          : I(w, u) || D(w, u)
            ? (O(w), Le(w, u))
            : C(w, u)
              ? (O(w), g(u, 12, X(w)))
              : M(w, u)
                ? (O(w), q === '{' ? we(w, u) || x : g(u, 11, U(w)))
                : (m === 8 && p(Ie.INVALID_LINKED_FORMAT, r(), 0),
                  (u.braceNest = 0),
                  (u.inLinked = !1),
                  Q(w, u));
    }
  }
  function Q(w, u) {
    let m = { type: 14 };
    if (u.braceNest > 0) return we(w, u) || v(u);
    if (u.inLinked) return Le(w, u) || v(u);
    switch (w.currentChar()) {
      case '{':
        return we(w, u) || v(u);
      case '}':
        return (p(Ie.UNBALANCED_CLOSING_BRACE, r(), 0), w.next(), g(u, 3, '}'));
      case '@':
        return Le(w, u) || v(u);
      default: {
        if (ce(w)) return ((m = g(u, 1, ie(w))), (u.braceNest = 0), (u.inLinked = !1), m);
        const { isModulo: q, hasSpace: z } = ve(w);
        if (q) return z ? g(u, 0, Te(w)) : g(u, 4, de(w));
        if (Z(w)) return g(u, 0, Te(w));
        break;
      }
    }
    return m;
  }
  function ke() {
    const { currentType: w, offset: u, startLoc: m, endLoc: x } = d;
    return (
      (d.lastType = w),
      (d.lastOffset = u),
      (d.lastStartLoc = m),
      (d.lastEndLoc = x),
      (d.offset = s()),
      (d.startLoc = r()),
      a.currentChar() === fn ? g(d, 14) : Q(a, d)
    );
  }
  return { nextToken: ke, currentOffset: s, currentPosition: r, context: c };
}
const Hc = 'parser',
  Gc = /(?:\\\\|\\'|\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{6}))/g;
function Zc(e, t, n) {
  switch (e) {
    case '\\\\':
      return '\\';
    case "\\'":
      return "'";
    default: {
      const a = parseInt(t || n, 16);
      return a <= 55295 || a >= 57344 ? String.fromCodePoint(a) : '�';
    }
  }
}
function Yc(e = {}) {
  const t = e.location !== !1,
    { onError: n, onWarn: a } = e;
  function s(k, E, A, I, ...C) {
    const D = k.currentPosition();
    if (((D.offset += I), (D.column += I), n)) {
      const M = t ? Ba(A, D) : null,
        ce = Jn(E, M, { domain: Hc, args: C });
      n(ce);
    }
  }
  function r(k, E, A, I, ...C) {
    const D = k.currentPosition();
    if (((D.offset += I), (D.column += I), a)) {
      const M = t ? Ba(A, D) : null;
      a(Mc(E, M, C));
    }
  }
  function i(k, E, A) {
    const I = { type: k };
    return (t && ((I.start = E), (I.end = E), (I.loc = { start: A, end: A })), I);
  }
  function l(k, E, A, I) {
    t && ((k.end = E), k.loc && (k.loc.end = A));
  }
  function d(k, E) {
    const A = k.context(),
      I = i(3, A.offset, A.startLoc);
    return ((I.value = E), l(I, k.currentOffset(), k.currentPosition()), I);
  }
  function c(k, E) {
    const A = k.context(),
      { lastOffset: I, lastStartLoc: C } = A,
      D = i(5, I, C);
    return (
      (D.index = parseInt(E, 10)),
      k.nextToken(),
      l(D, k.currentOffset(), k.currentPosition()),
      D
    );
  }
  function f(k, E, A) {
    const I = k.context(),
      { lastOffset: C, lastStartLoc: D } = I,
      M = i(4, C, D);
    return (
      (M.key = E),
      A === !0 && (M.modulo = !0),
      k.nextToken(),
      l(M, k.currentOffset(), k.currentPosition()),
      M
    );
  }
  function p(k, E) {
    const A = k.context(),
      { lastOffset: I, lastStartLoc: C } = A,
      D = i(9, I, C);
    return (
      (D.value = E.replace(Gc, Zc)),
      k.nextToken(),
      l(D, k.currentOffset(), k.currentPosition()),
      D
    );
  }
  function g(k) {
    const E = k.nextToken(),
      A = k.context(),
      { lastOffset: I, lastStartLoc: C } = A,
      D = i(8, I, C);
    return E.type !== 12
      ? (s(k, Ie.UNEXPECTED_EMPTY_LINKED_MODIFIER, A.lastStartLoc, 0),
        (D.value = ''),
        l(D, I, C),
        { nextConsumeToken: E, node: D })
      : (E.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, A.lastStartLoc, 0, Pt(E)),
        (D.value = E.value || ''),
        l(D, k.currentOffset(), k.currentPosition()),
        { node: D });
  }
  function v(k, E) {
    const A = k.context(),
      I = i(7, A.offset, A.startLoc);
    return ((I.value = E), l(I, k.currentOffset(), k.currentPosition()), I);
  }
  function y(k) {
    const E = k.context(),
      A = i(6, E.offset, E.startLoc);
    let I = k.nextToken();
    if (I.type === 9) {
      const C = g(k);
      ((A.modifier = C.node), (I = C.nextConsumeToken || k.nextToken()));
    }
    switch (
      (I.type !== 10 && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(I)),
      (I = k.nextToken()),
      I.type === 2 && (I = k.nextToken()),
      I.type)
    ) {
      case 11:
        (I.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(I)),
          (A.key = v(k, I.value || '')));
        break;
      case 5:
        (I.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(I)),
          (A.key = f(k, I.value || '')));
        break;
      case 6:
        (I.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(I)),
          (A.key = c(k, I.value || '')));
        break;
      case 7:
        (I.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(I)),
          (A.key = p(k, I.value || '')));
        break;
      default: {
        s(k, Ie.UNEXPECTED_EMPTY_LINKED_KEY, E.lastStartLoc, 0);
        const C = k.context(),
          D = i(7, C.offset, C.startLoc);
        return (
          (D.value = ''),
          l(D, C.offset, C.startLoc),
          (A.key = D),
          l(A, C.offset, C.startLoc),
          { nextConsumeToken: I, node: A }
        );
      }
    }
    return (l(A, k.currentOffset(), k.currentPosition()), { node: A });
  }
  function N(k) {
    const E = k.context(),
      A = E.currentType === 1 ? k.currentOffset() : E.offset,
      I = E.currentType === 1 ? E.endLoc : E.startLoc,
      C = i(2, A, I);
    C.items = [];
    let D = null,
      M = null;
    do {
      const Z = D || k.nextToken();
      switch (((D = null), Z.type)) {
        case 0:
          (Z.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(Z)),
            C.items.push(d(k, Z.value || '')));
          break;
        case 6:
          (Z.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(Z)),
            C.items.push(c(k, Z.value || '')));
          break;
        case 4:
          M = !0;
          break;
        case 5:
          (Z.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(Z)),
            C.items.push(f(k, Z.value || '', !!M)),
            M && (r(k, rr.USE_MODULO_SYNTAX, E.lastStartLoc, 0, Pt(Z)), (M = null)));
          break;
        case 7:
          (Z.value == null && s(k, Ie.UNEXPECTED_LEXICAL_ANALYSIS, E.lastStartLoc, 0, Pt(Z)),
            C.items.push(p(k, Z.value || '')));
          break;
        case 8: {
          const Ae = y(k);
          (C.items.push(Ae.node), (D = Ae.nextConsumeToken || null));
          break;
        }
      }
    } while (E.currentType !== 14 && E.currentType !== 1);
    const ce = E.currentType === 1 ? E.lastOffset : k.currentOffset(),
      ve = E.currentType === 1 ? E.lastEndLoc : k.currentPosition();
    return (l(C, ce, ve), C);
  }
  function O(k, E, A, I) {
    const C = k.context();
    let D = I.items.length === 0;
    const M = i(1, E, A);
    ((M.cases = []), M.cases.push(I));
    do {
      const ce = N(k);
      (D || (D = ce.items.length === 0), M.cases.push(ce));
    } while (C.currentType !== 14);
    return (
      D && s(k, Ie.MUST_HAVE_MESSAGES_IN_PLURAL, A, 0),
      l(M, k.currentOffset(), k.currentPosition()),
      M
    );
  }
  function P(k) {
    const E = k.context(),
      { offset: A, startLoc: I } = E,
      C = N(k);
    return E.currentType === 14 ? C : O(k, A, I, C);
  }
  function V(k) {
    const E = Wc(k, xl({}, e)),
      A = E.context(),
      I = i(0, A.offset, A.startLoc);
    return (
      t && I.loc && (I.loc.source = k),
      (I.body = P(E)),
      e.onCacheKey && (I.cacheKey = e.onCacheKey(k)),
      A.currentType !== 14 &&
        s(E, Ie.UNEXPECTED_LEXICAL_ANALYSIS, A.lastStartLoc, 0, k[A.offset] || ''),
      l(I, E.currentOffset(), E.currentPosition()),
      I
    );
  }
  return { parse: V };
}
function Pt(e) {
  if (e.type === 14) return 'EOF';
  const t = (e.value || '').replace(/\r?\n/gu, '\\n');
  return t.length > 10 ? t.slice(0, 9) + '…' : t;
}
function Xc(e, t = {}) {
  const n = { ast: e, helpers: new Set() };
  return { context: () => n, helper: (r) => (n.helpers.add(r), r) };
}
function Zr(e, t) {
  for (let n = 0; n < e.length; n++) ir(e[n], t);
}
function ir(e, t) {
  switch (e.type) {
    case 1:
      (Zr(e.cases, t), t.helper('plural'));
      break;
    case 2:
      Zr(e.items, t);
      break;
    case 6: {
      (ir(e.key, t), t.helper('linked'), t.helper('type'));
      break;
    }
    case 5:
      (t.helper('interpolate'), t.helper('list'));
      break;
    case 4:
      (t.helper('interpolate'), t.helper('named'));
      break;
  }
}
function Kc(e, t = {}) {
  const n = Xc(e);
  (n.helper('normalize'), e.body && ir(e.body, n));
  const a = n.context();
  e.helpers = Array.from(a.helpers);
}
function Qc(e) {
  const t = e.body;
  return (t.type === 2 ? Yr(t) : t.cases.forEach((n) => Yr(n)), e);
}
function Yr(e) {
  if (e.items.length === 1) {
    const t = e.items[0];
    (t.type === 3 || t.type === 9) && ((e.static = t.value), delete t.value);
  } else {
    const t = [];
    for (let n = 0; n < e.items.length; n++) {
      const a = e.items[n];
      if (!(a.type === 3 || a.type === 9) || a.value == null) break;
      t.push(a.value);
    }
    if (t.length === e.items.length) {
      e.static = Cl(t);
      for (let n = 0; n < e.items.length; n++) {
        const a = e.items[n];
        (a.type === 3 || a.type === 9) && delete a.value;
      }
    }
  }
}
const Jc = 'minifier';
function qn(e) {
  switch (((e.t = e.type), e.type)) {
    case 0: {
      const t = e;
      (qn(t.body), (t.b = t.body), delete t.body);
      break;
    }
    case 1: {
      const t = e,
        n = t.cases;
      for (let a = 0; a < n.length; a++) qn(n[a]);
      ((t.c = n), delete t.cases);
      break;
    }
    case 2: {
      const t = e,
        n = t.items;
      for (let a = 0; a < n.length; a++) qn(n[a]);
      ((t.i = n), delete t.items, t.static && ((t.s = t.static), delete t.static));
      break;
    }
    case 3:
    case 9:
    case 8:
    case 7: {
      const t = e;
      t.value && ((t.v = t.value), delete t.value);
      break;
    }
    case 6: {
      const t = e;
      (qn(t.key),
        (t.k = t.key),
        delete t.key,
        t.modifier && (qn(t.modifier), (t.m = t.modifier), delete t.modifier));
      break;
    }
    case 5: {
      const t = e;
      ((t.i = t.index), delete t.index);
      break;
    }
    case 4: {
      const t = e;
      ((t.k = t.key), delete t.key);
      break;
    }
    default:
      throw Jn(Ie.UNHANDLED_MINIFIER_NODE_TYPE, null, { domain: Jc, args: [e.type] });
  }
  delete e.type;
}
const eu = 'parser';
function tu(e, t) {
  const { filename: n, breakLineCode: a, needIndent: s } = t,
    r = t.location !== !1,
    i = {
      filename: n,
      code: '',
      column: 1,
      line: 1,
      offset: 0,
      map: void 0,
      breakLineCode: a,
      needIndent: s,
      indentLevel: 0,
    };
  r && e.loc && (i.source = e.loc.source);
  const l = () => i;
  function d(N, O) {
    i.code += N;
  }
  function c(N, O = !0) {
    const P = O ? a : '';
    d(s ? P + '  '.repeat(N) : P);
  }
  function f(N = !0) {
    const O = ++i.indentLevel;
    N && c(O);
  }
  function p(N = !0) {
    const O = --i.indentLevel;
    N && c(O);
  }
  function g() {
    c(i.indentLevel);
  }
  return {
    context: l,
    push: d,
    indent: f,
    deindent: p,
    newline: g,
    helper: (N) => `_${N}`,
    needIndent: () => i.needIndent,
  };
}
function nu(e, t) {
  const { helper: n } = e;
  (e.push(`${n('linked')}(`),
    Hn(e, t.key),
    t.modifier
      ? (e.push(', '), Hn(e, t.modifier), e.push(', _type'))
      : e.push(', undefined, _type'),
    e.push(')'));
}
function au(e, t) {
  const { helper: n, needIndent: a } = e;
  (e.push(`${n('normalize')}([`), e.indent(a()));
  const s = t.items.length;
  for (let r = 0; r < s && (Hn(e, t.items[r]), r !== s - 1); r++) e.push(', ');
  (e.deindent(a()), e.push('])'));
}
function su(e, t) {
  const { helper: n, needIndent: a } = e;
  if (t.cases.length > 1) {
    (e.push(`${n('plural')}([`), e.indent(a()));
    const s = t.cases.length;
    for (let r = 0; r < s && (Hn(e, t.cases[r]), r !== s - 1); r++) e.push(', ');
    (e.deindent(a()), e.push('])'));
  }
}
function ru(e, t) {
  t.body ? Hn(e, t.body) : e.push('null');
}
function Hn(e, t) {
  const { helper: n } = e;
  switch (t.type) {
    case 0:
      ru(e, t);
      break;
    case 1:
      su(e, t);
      break;
    case 2:
      au(e, t);
      break;
    case 6:
      nu(e, t);
      break;
    case 8:
      e.push(JSON.stringify(t.value), t);
      break;
    case 7:
      e.push(JSON.stringify(t.value), t);
      break;
    case 5:
      e.push(`${n('interpolate')}(${n('list')}(${t.index}))`, t);
      break;
    case 4:
      e.push(`${n('interpolate')}(${n('named')}(${JSON.stringify(t.key)}))`, t);
      break;
    case 9:
      e.push(JSON.stringify(t.value), t);
      break;
    case 3:
      e.push(JSON.stringify(t.value), t);
      break;
    default:
      throw Jn(Ie.UNHANDLED_CODEGEN_NODE_TYPE, null, { domain: eu, args: [t.type] });
  }
}
const iu = (e, t = {}) => {
  const n = Hr(t.mode) ? t.mode : 'normal',
    a = Hr(t.filename) ? t.filename : 'message.intl';
  t.sourceMap;
  const s =
      t.breakLineCode != null
        ? t.breakLineCode
        : n === 'arrow'
          ? ';'
          : `
`,
    r = t.needIndent ? t.needIndent : n !== 'arrow',
    i = e.helpers || [],
    l = tu(e, { filename: a, breakLineCode: s, needIndent: r });
  (l.push(n === 'normal' ? 'function __msg__ (ctx) {' : '(ctx) => {'),
    l.indent(r),
    i.length > 0 &&
      (l.push(
        `const { ${Cl(
          i.map((f) => `${f}: _${f}`),
          ', ',
        )} } = ctx`,
      ),
      l.newline()),
    l.push('return '),
    Hn(l, e),
    l.deindent(r),
    l.push('}'),
    delete e.helpers);
  const { code: d, map: c } = l.context();
  return { ast: e, code: d, map: c ? c.toJSON() : void 0 };
};
function lu(e, t = {}) {
  const n = xl({}, t),
    a = !!n.jit,
    s = !!n.minify,
    r = n.optimize == null ? !0 : n.optimize,
    l = Yc(n).parse(e);
  return a ? (r && Qc(l), s && qn(l), { ast: l, code: '' }) : (Kc(l, n), iu(l, n));
}
/*!
 * core-base v9.14.5
 * (c) 2025 kazuya kawaguchi
 * Released under the MIT License.
 */ function ou() {
  (typeof __INTLIFY_PROD_DEVTOOLS__ != 'boolean' && (sn().__INTLIFY_PROD_DEVTOOLS__ = !1),
    typeof __INTLIFY_JIT_COMPILATION__ != 'boolean' && (sn().__INTLIFY_JIT_COMPILATION__ = !1),
    typeof __INTLIFY_DROP_MESSAGE_COMPILER__ != 'boolean' &&
      (sn().__INTLIFY_DROP_MESSAGE_COMPILER__ = !1));
}
function Wt(e) {
  return Ve(e) && lr(e) === 0 && (qt(e, 'b') || qt(e, 'body'));
}
const Ol = ['b', 'body'];
function cu(e) {
  return wn(e, Ol);
}
const Ll = ['c', 'cases'];
function uu(e) {
  return wn(e, Ll, []);
}
const Rl = ['s', 'static'];
function du(e) {
  return wn(e, Rl);
}
const Pl = ['i', 'items'];
function fu(e) {
  return wn(e, Pl, []);
}
const Ml = ['t', 'type'];
function lr(e) {
  return wn(e, Ml);
}
const Dl = ['v', 'value'];
function $a(e, t) {
  const n = wn(e, Dl);
  if (n != null) return n;
  throw ba(t);
}
const Fl = ['m', 'modifier'];
function mu(e) {
  return wn(e, Fl);
}
const ql = ['k', 'key'];
function pu(e) {
  const t = wn(e, ql);
  if (t) return t;
  throw ba(6);
}
function wn(e, t, n) {
  for (let a = 0; a < t.length; a++) {
    const s = t[a];
    if (qt(e, s) && e[s] != null) return e[s];
  }
  return n;
}
const Ul = [...Ol, ...Ll, ...Rl, ...Pl, ...ql, ...Fl, ...Dl, ...Ml];
function ba(e) {
  return new Error(`unhandled node type: ${e}`);
}
const En = [];
En[0] = { w: [0], i: [3, 0], '[': [4], o: [7] };
En[1] = { w: [1], '.': [2], '[': [4], o: [7] };
En[2] = { w: [2], i: [3, 0], 0: [3, 0] };
En[3] = { i: [3, 0], 0: [3, 0], w: [1, 1], '.': [2, 1], '[': [4, 1], o: [7, 1] };
En[4] = { "'": [5, 0], '"': [6, 0], '[': [4, 2], ']': [1, 3], o: 8, l: [4, 0] };
En[5] = { "'": [4, 0], o: 8, l: [5, 0] };
En[6] = { '"': [4, 0], o: 8, l: [6, 0] };
const gu = /^\s?(?:true|false|-?[\d.]+|'[^']*'|"[^"]*")\s?$/;
function hu(e) {
  return gu.test(e);
}
function _u(e) {
  const t = e.charCodeAt(0),
    n = e.charCodeAt(e.length - 1);
  return t === n && (t === 34 || t === 39) ? e.slice(1, -1) : e;
}
function vu(e) {
  if (e == null) return 'o';
  switch (e.charCodeAt(0)) {
    case 91:
    case 93:
    case 46:
    case 34:
    case 39:
      return e;
    case 95:
    case 36:
    case 45:
      return 'i';
    case 9:
    case 10:
    case 13:
    case 160:
    case 65279:
    case 8232:
    case 8233:
      return 'w';
  }
  return 'i';
}
function bu(e) {
  const t = e.trim();
  return e.charAt(0) === '0' && isNaN(parseInt(e)) ? !1 : hu(t) ? _u(t) : '*' + t;
}
function yu(e) {
  const t = [];
  let n = -1,
    a = 0,
    s = 0,
    r,
    i,
    l,
    d,
    c,
    f,
    p;
  const g = [];
  ((g[0] = () => {
    i === void 0 ? (i = l) : (i += l);
  }),
    (g[1] = () => {
      i !== void 0 && (t.push(i), (i = void 0));
    }),
    (g[2] = () => {
      (g[0](), s++);
    }),
    (g[3] = () => {
      if (s > 0) (s--, (a = 4), g[0]());
      else {
        if (((s = 0), i === void 0 || ((i = bu(i)), i === !1))) return !1;
        g[1]();
      }
    }));
  function v() {
    const y = e[n + 1];
    if ((a === 5 && y === "'") || (a === 6 && y === '"')) return (n++, (l = '\\' + y), g[0](), !0);
  }
  for (; a !== null; )
    if ((n++, (r = e[n]), !(r === '\\' && v()))) {
      if (
        ((d = vu(r)),
        (p = En[a]),
        (c = p[d] || p.l || 8),
        c === 8 || ((a = c[0]), c[1] !== void 0 && ((f = g[c[1]]), f && ((l = r), f() === !1))))
      )
        return;
      if (a === 7) return t;
    }
}
const Xr = new Map();
function ku(e, t) {
  return Ve(e) ? e[t] : null;
}
function wu(e, t) {
  if (!Ve(e)) return null;
  let n = Xr.get(t);
  if ((n || ((n = yu(t)), n && Xr.set(t, n)), !n)) return null;
  const a = n.length;
  let s = e,
    r = 0;
  for (; r < a; ) {
    const i = n[r];
    if (Ul.includes(i) && Wt(s)) return null;
    const l = s[i];
    if (l === void 0 || Ke(s)) return null;
    ((s = l), r++);
  }
  return s;
}
const Eu = (e) => e,
  Su = (e) => '',
  Tu = 'text',
  Au = (e) => (e.length === 0 ? '' : Cc(e)),
  Iu = xc;
function Kr(e, t) {
  return ((e = Math.abs(e)), t === 2 ? (e ? (e > 1 ? 1 : 0) : 1) : e ? Math.min(e, 2) : 0);
}
function $u(e) {
  const t = rt(e.pluralIndex) ? e.pluralIndex : -1;
  return e.named && (rt(e.named.count) || rt(e.named.n))
    ? rt(e.named.count)
      ? e.named.count
      : rt(e.named.n)
        ? e.named.n
        : t
    : t;
}
function Nu(e, t) {
  (t.count || (t.count = e), t.n || (t.n = e));
}
function xu(e = {}) {
  const t = e.locale,
    n = $u(e),
    a = Ve(e.pluralRules) && fe(t) && Ke(e.pluralRules[t]) ? e.pluralRules[t] : Kr,
    s = Ve(e.pluralRules) && fe(t) && Ke(e.pluralRules[t]) ? Kr : void 0,
    r = (P) => P[a(n, P.length, s)],
    i = e.list || [],
    l = (P) => i[P],
    d = e.named || Xe();
  rt(e.pluralIndex) && Nu(n, d);
  const c = (P) => d[P];
  function f(P) {
    const V = Ke(e.messages) ? e.messages(P) : Ve(e.messages) ? e.messages[P] : !1;
    return V || (e.parent ? e.parent.message(P) : Su);
  }
  const p = (P) => (e.modifiers ? e.modifiers[P] : Eu),
    g = Oe(e.processor) && Ke(e.processor.normalize) ? e.processor.normalize : Au,
    v = Oe(e.processor) && Ke(e.processor.interpolate) ? e.processor.interpolate : Iu,
    y = Oe(e.processor) && fe(e.processor.type) ? e.processor.type : Tu,
    O = {
      list: l,
      named: c,
      plural: r,
      linked: (P, ...V) => {
        const [k, E] = V;
        let A = 'text',
          I = '';
        V.length === 1
          ? Ve(k)
            ? ((I = k.modifier || I), (A = k.type || A))
            : fe(k) && (I = k || I)
          : V.length === 2 && (fe(k) && (I = k || I), fe(E) && (A = E || A));
        const C = f(P)(O),
          D = A === 'vnode' && Qe(C) && I ? C[0] : C;
        return I ? p(I)(D, A) : D;
      },
      message: f,
      type: y,
      interpolate: v,
      normalize: g,
      values: bt(Xe(), i, d),
    };
  return O;
}
let ya = null;
function Cu(e) {
  ya = e;
}
function Ou(e, t, n) {
  ya && ya.emit('i18n:init', { timestamp: Date.now(), i18n: e, version: t, meta: n });
}
const Lu = Ru('function:translate');
function Ru(e) {
  return (t) => ya && ya.emit(e, t);
}
const Pu = rr.__EXTEND_POINT__,
  An = as(Pu),
  Mu = {
    FALLBACK_TO_TRANSLATE: An(),
    CANNOT_FORMAT_NUMBER: An(),
    FALLBACK_TO_NUMBER_FORMAT: An(),
    CANNOT_FORMAT_DATE: An(),
    FALLBACK_TO_DATE_FORMAT: An(),
    EXPERIMENTAL_CUSTOM_MESSAGE_COMPILER: An(),
    __EXTEND_POINT__: An(),
  },
  jl = Ie.__EXTEND_POINT__,
  In = as(jl),
  Ut = {
    INVALID_ARGUMENT: jl,
    INVALID_DATE_ARGUMENT: In(),
    INVALID_ISO_DATE_ARGUMENT: In(),
    NOT_SUPPORT_NON_STRING_MESSAGE: In(),
    NOT_SUPPORT_LOCALE_PROMISE_VALUE: In(),
    NOT_SUPPORT_LOCALE_ASYNC_FUNCTION: In(),
    NOT_SUPPORT_LOCALE_TYPE: In(),
    __EXTEND_POINT__: In(),
  };
function Bt(e) {
  return Jn(e, null, void 0);
}
function or(e, t) {
  return t.locale != null ? Qr(t.locale) : Qr(e.locale);
}
let ps;
function Qr(e) {
  if (fe(e)) return e;
  if (Ke(e)) {
    if (e.resolvedOnce && ps != null) return ps;
    if (e.constructor.name === 'Function') {
      const t = e();
      if (Nc(t)) throw Bt(Ut.NOT_SUPPORT_LOCALE_PROMISE_VALUE);
      return (ps = t);
    } else throw Bt(Ut.NOT_SUPPORT_LOCALE_ASYNC_FUNCTION);
  } else throw Bt(Ut.NOT_SUPPORT_LOCALE_TYPE);
}
function Du(e, t, n) {
  return [...new Set([n, ...(Qe(t) ? t : Ve(t) ? Object.keys(t) : fe(t) ? [t] : [n])])];
}
function zl(e, t, n) {
  const a = fe(n) ? n : Gn,
    s = e;
  s.__localeChainCache || (s.__localeChainCache = new Map());
  let r = s.__localeChainCache.get(a);
  if (!r) {
    r = [];
    let i = [n];
    for (; Qe(i); ) i = Jr(r, i, t);
    const l = Qe(t) || !Oe(t) ? t : t.default ? t.default : null;
    ((i = fe(l) ? [l] : l), Qe(i) && Jr(r, i, !1), s.__localeChainCache.set(a, r));
  }
  return r;
}
function Jr(e, t, n) {
  let a = !0;
  for (let s = 0; s < t.length && Me(a); s++) {
    const r = t[s];
    fe(r) && (a = Fu(e, t[s], n));
  }
  return a;
}
function Fu(e, t, n) {
  let a;
  const s = t.split('-');
  do {
    const r = s.join('-');
    ((a = qu(e, r, n)), s.splice(-1, 1));
  } while (s.length && a === !0);
  return a;
}
function qu(e, t, n) {
  let a = !1;
  if (!e.includes(t) && ((a = !0), t)) {
    a = t[t.length - 1] !== '!';
    const s = t.replace(/!/g, '');
    (e.push(s), (Qe(n) || Oe(n)) && n[s] && (a = n[s]));
  }
  return a;
}
const Uu = '9.14.5',
  ss = -1,
  Gn = 'en-US',
  ei = '',
  ti = (e) => `${e.charAt(0).toLocaleUpperCase()}${e.substr(1)}`;
function ju() {
  return {
    upper: (e, t) =>
      t === 'text' && fe(e)
        ? e.toUpperCase()
        : t === 'vnode' && Ve(e) && '__v_isVNode' in e
          ? e.children.toUpperCase()
          : e,
    lower: (e, t) =>
      t === 'text' && fe(e)
        ? e.toLowerCase()
        : t === 'vnode' && Ve(e) && '__v_isVNode' in e
          ? e.children.toLowerCase()
          : e,
    capitalize: (e, t) =>
      t === 'text' && fe(e)
        ? ti(e)
        : t === 'vnode' && Ve(e) && '__v_isVNode' in e
          ? ti(e.children)
          : e,
  };
}
let Vl;
function ni(e) {
  Vl = e;
}
let Bl;
function zu(e) {
  Bl = e;
}
let Wl;
function Vu(e) {
  Wl = e;
}
let Hl = null;
const Bu = (e) => {
    Hl = e;
  },
  Wu = () => Hl;
let Gl = null;
const ai = (e) => {
    Gl = e;
  },
  Hu = () => Gl;
let si = 0;
function Gu(e = {}) {
  const t = Ke(e.onWarn) ? e.onWarn : wc,
    n = fe(e.version) ? e.version : Uu,
    a = fe(e.locale) || Ke(e.locale) ? e.locale : Gn,
    s = Ke(a) ? Gn : a,
    r =
      Qe(e.fallbackLocale) ||
      Oe(e.fallbackLocale) ||
      fe(e.fallbackLocale) ||
      e.fallbackLocale === !1
        ? e.fallbackLocale
        : s,
    i = Oe(e.messages) ? e.messages : gs(s),
    l = Oe(e.datetimeFormats) ? e.datetimeFormats : gs(s),
    d = Oe(e.numberFormats) ? e.numberFormats : gs(s),
    c = bt(Xe(), e.modifiers, ju()),
    f = e.pluralRules || Xe(),
    p = Ke(e.missing) ? e.missing : null,
    g = Me(e.missingWarn) || vn(e.missingWarn) ? e.missingWarn : !0,
    v = Me(e.fallbackWarn) || vn(e.fallbackWarn) ? e.fallbackWarn : !0,
    y = !!e.fallbackFormat,
    N = !!e.unresolving,
    O = Ke(e.postTranslation) ? e.postTranslation : null,
    P = Oe(e.processor) ? e.processor : null,
    V = Me(e.warnHtmlMessage) ? e.warnHtmlMessage : !0,
    k = !!e.escapeParameter,
    E = Ke(e.messageCompiler) ? e.messageCompiler : Vl,
    A = Ke(e.messageResolver) ? e.messageResolver : Bl || ku,
    I = Ke(e.localeFallbacker) ? e.localeFallbacker : Wl || Du,
    C = Ve(e.fallbackContext) ? e.fallbackContext : void 0,
    D = e,
    M = Ve(D.__datetimeFormatters) ? D.__datetimeFormatters : new Map(),
    ce = Ve(D.__numberFormatters) ? D.__numberFormatters : new Map(),
    ve = Ve(D.__meta) ? D.__meta : {};
  si++;
  const Z = {
    version: n,
    cid: si,
    locale: a,
    fallbackLocale: r,
    messages: i,
    modifiers: c,
    pluralRules: f,
    missing: p,
    missingWarn: g,
    fallbackWarn: v,
    fallbackFormat: y,
    unresolving: N,
    postTranslation: O,
    processor: P,
    warnHtmlMessage: V,
    escapeParameter: k,
    messageCompiler: E,
    messageResolver: A,
    localeFallbacker: I,
    fallbackContext: C,
    onWarn: t,
    __meta: ve,
  };
  return (
    (Z.datetimeFormats = l),
    (Z.numberFormats = d),
    (Z.__datetimeFormatters = M),
    (Z.__numberFormatters = ce),
    __INTLIFY_PROD_DEVTOOLS__ && Ou(Z, n, ve),
    Z
  );
}
const gs = (e) => ({ [e]: Xe() });
function cr(e, t, n, a, s) {
  const { missing: r, onWarn: i } = e;
  if (r !== null) {
    const l = r(e, n, t, s);
    return fe(l) ? l : t;
  } else return t;
}
function aa(e, t, n) {
  const a = e;
  ((a.__localeChainCache = new Map()), e.localeFallbacker(e, n, t));
}
function Zu(e, t) {
  return e === t ? !1 : e.split('-')[0] === t.split('-')[0];
}
function Yu(e, t) {
  const n = t.indexOf(e);
  if (n === -1) return !1;
  for (let a = n + 1; a < t.length; a++) if (Zu(e, t[a])) return !0;
  return !1;
}
function hs(e) {
  return (n) => Xu(n, e);
}
function Xu(e, t) {
  const n = cu(t);
  if (n == null) throw ba(0);
  if (lr(n) === 1) {
    const r = uu(n);
    return e.plural(r.reduce((i, l) => [...i, ri(e, l)], []));
  } else return ri(e, n);
}
function ri(e, t) {
  const n = du(t);
  if (n != null) return e.type === 'text' ? n : e.normalize([n]);
  {
    const a = fu(t).reduce((s, r) => [...s, Ls(e, r)], []);
    return e.normalize(a);
  }
}
function Ls(e, t) {
  const n = lr(t);
  switch (n) {
    case 3:
      return $a(t, n);
    case 9:
      return $a(t, n);
    case 4: {
      const a = t;
      if (qt(a, 'k') && a.k) return e.interpolate(e.named(a.k));
      if (qt(a, 'key') && a.key) return e.interpolate(e.named(a.key));
      throw ba(n);
    }
    case 5: {
      const a = t;
      if (qt(a, 'i') && rt(a.i)) return e.interpolate(e.list(a.i));
      if (qt(a, 'index') && rt(a.index)) return e.interpolate(e.list(a.index));
      throw ba(n);
    }
    case 6: {
      const a = t,
        s = mu(a),
        r = pu(a);
      return e.linked(Ls(e, r), s ? Ls(e, s) : void 0, e.type);
    }
    case 7:
      return $a(t, n);
    case 8:
      return $a(t, n);
    default:
      throw new Error(`unhandled node on format message part: ${n}`);
  }
}
const Zl = (e) => e;
let zn = Xe();
function Yl(e, t = {}) {
  let n = !1;
  const a = t.onError || Fc;
  return (
    (t.onError = (s) => {
      ((n = !0), a(s));
    }),
    { ...lu(e, t), detectError: n }
  );
}
const Ku = (e, t) => {
  if (!fe(e)) throw Bt(Ut.NOT_SUPPORT_NON_STRING_MESSAGE);
  {
    Me(t.warnHtmlMessage) && t.warnHtmlMessage;
    const a = (t.onCacheKey || Zl)(e),
      s = zn[a];
    if (s) return s;
    const { code: r, detectError: i } = Yl(e, t),
      l = new Function(`return ${r}`)();
    return i ? l : (zn[a] = l);
  }
};
function Qu(e, t) {
  if (__INTLIFY_JIT_COMPILATION__ && !__INTLIFY_DROP_MESSAGE_COMPILER__ && fe(e)) {
    Me(t.warnHtmlMessage) && t.warnHtmlMessage;
    const a = (t.onCacheKey || Zl)(e),
      s = zn[a];
    if (s) return s;
    const { ast: r, detectError: i } = Yl(e, { ...t, location: !1, jit: !0 }),
      l = hs(r);
    return i ? l : (zn[a] = l);
  } else {
    const n = e.cacheKey;
    if (n) {
      const a = zn[n];
      return a || (zn[n] = hs(e));
    } else return hs(e);
  }
}
const ii = () => '',
  Ct = (e) => Ke(e);
function li(e, ...t) {
  const {
      fallbackFormat: n,
      postTranslation: a,
      unresolving: s,
      messageCompiler: r,
      fallbackLocale: i,
      messages: l,
    } = e,
    [d, c] = Rs(...t),
    f = Me(c.missingWarn) ? c.missingWarn : e.missingWarn,
    p = Me(c.fallbackWarn) ? c.fallbackWarn : e.fallbackWarn,
    g = Me(c.escapeParameter) ? c.escapeParameter : e.escapeParameter,
    v = !!c.resolvedMessage,
    y =
      fe(c.default) || Me(c.default)
        ? Me(c.default)
          ? r
            ? d
            : () => d
          : c.default
        : n
          ? r
            ? d
            : () => d
          : '',
    N = n || y !== '',
    O = or(e, c);
  g && Ju(c);
  let [P, V, k] = v ? [d, O, l[O] || Xe()] : Xl(e, d, O, i, p, f),
    E = P,
    A = d;
  if (
    (!v && !(fe(E) || Wt(E) || Ct(E)) && N && ((E = y), (A = E)),
    !v && (!(fe(E) || Wt(E) || Ct(E)) || !fe(V)))
  )
    return s ? ss : d;
  let I = !1;
  const C = () => {
      I = !0;
    },
    D = Ct(E) ? E : Kl(e, d, V, E, A, C);
  if (I) return E;
  const M = nd(e, V, k, c),
    ce = xu(M),
    ve = ed(e, D, ce);
  let Z = a ? a(ve, d) : ve;
  if ((g && fe(Z) && (Z = Ic(Z)), __INTLIFY_PROD_DEVTOOLS__)) {
    const Ae = {
      timestamp: Date.now(),
      key: fe(d) ? d : Ct(E) ? E.key : '',
      locale: V || (Ct(E) ? E.locale : ''),
      format: fe(E) ? E : Ct(E) ? E.source : '',
      message: Z,
    };
    ((Ae.meta = bt({}, e.__meta, Wu() || {})), Lu(Ae));
  }
  return Z;
}
function Ju(e) {
  Qe(e.list)
    ? (e.list = e.list.map((t) => (fe(t) ? Br(t) : t)))
    : Ve(e.named) &&
      Object.keys(e.named).forEach((t) => {
        fe(e.named[t]) && (e.named[t] = Br(e.named[t]));
      });
}
function Xl(e, t, n, a, s, r) {
  const { messages: i, onWarn: l, messageResolver: d, localeFallbacker: c } = e,
    f = c(e, a, n);
  let p = Xe(),
    g,
    v = null;
  const y = 'translate';
  for (
    let N = 0;
    N < f.length &&
    ((g = f[N]),
    (p = i[g] || Xe()),
    (v = d(p, t)) === null && (v = p[t]),
    !(fe(v) || Wt(v) || Ct(v)));
    N++
  )
    if (!Yu(g, f)) {
      const O = cr(e, t, g, r, y);
      O !== t && (v = O);
    }
  return [v, g, p];
}
function Kl(e, t, n, a, s, r) {
  const { messageCompiler: i, warnHtmlMessage: l } = e;
  if (Ct(a)) {
    const c = a;
    return ((c.locale = c.locale || n), (c.key = c.key || t), c);
  }
  if (i == null) {
    const c = () => a;
    return ((c.locale = n), (c.key = t), c);
  }
  const d = i(a, td(e, n, s, a, l, r));
  return ((d.locale = n), (d.key = t), (d.source = a), d);
}
function ed(e, t, n) {
  return t(n);
}
function Rs(...e) {
  const [t, n, a] = e,
    s = Xe();
  if (!fe(t) && !rt(t) && !Ct(t) && !Wt(t)) throw Bt(Ut.INVALID_ARGUMENT);
  const r = rt(t) ? String(t) : (Ct(t), t);
  return (
    rt(n)
      ? (s.plural = n)
      : fe(n)
        ? (s.default = n)
        : Oe(n) && !ns(n)
          ? (s.named = n)
          : Qe(n) && (s.list = n),
    rt(a) ? (s.plural = a) : fe(a) ? (s.default = a) : Oe(a) && bt(s, a),
    [r, s]
  );
}
function td(e, t, n, a, s, r) {
  return {
    locale: t,
    key: n,
    warnHtmlMessage: s,
    onError: (i) => {
      throw (r && r(i), i);
    },
    onCacheKey: (i) => Ec(t, n, i),
  };
}
function nd(e, t, n, a) {
  const {
      modifiers: s,
      pluralRules: r,
      messageResolver: i,
      fallbackLocale: l,
      fallbackWarn: d,
      missingWarn: c,
      fallbackContext: f,
    } = e,
    g = {
      locale: t,
      modifiers: s,
      pluralRules: r,
      messages: (v) => {
        let y = i(n, v);
        if (y == null && f) {
          const [, , N] = Xl(f, v, t, l, d, c);
          y = i(N, v);
        }
        if (fe(y) || Wt(y)) {
          let N = !1;
          const P = Kl(e, v, t, y, v, () => {
            N = !0;
          });
          return N ? ii : P;
        } else return Ct(y) ? y : ii;
      },
    };
  return (
    e.processor && (g.processor = e.processor),
    a.list && (g.list = a.list),
    a.named && (g.named = a.named),
    rt(a.plural) && (g.pluralIndex = a.plural),
    g
  );
}
function oi(e, ...t) {
  const {
      datetimeFormats: n,
      unresolving: a,
      fallbackLocale: s,
      onWarn: r,
      localeFallbacker: i,
    } = e,
    { __datetimeFormatters: l } = e,
    [d, c, f, p] = Ps(...t),
    g = Me(f.missingWarn) ? f.missingWarn : e.missingWarn;
  Me(f.fallbackWarn) ? f.fallbackWarn : e.fallbackWarn;
  const v = !!f.part,
    y = or(e, f),
    N = i(e, s, y);
  if (!fe(d) || d === '') return new Intl.DateTimeFormat(y, p).format(c);
  let O = {},
    P,
    V = null;
  const k = 'datetime format';
  for (let I = 0; I < N.length && ((P = N[I]), (O = n[P] || {}), (V = O[d]), !Oe(V)); I++)
    cr(e, d, P, g, k);
  if (!Oe(V) || !fe(P)) return a ? ss : d;
  let E = `${P}__${d}`;
  ns(p) || (E = `${E}__${JSON.stringify(p)}`);
  let A = l.get(E);
  return (
    A || ((A = new Intl.DateTimeFormat(P, bt({}, V, p))), l.set(E, A)),
    v ? A.formatToParts(c) : A.format(c)
  );
}
const Ql = [
  'localeMatcher',
  'weekday',
  'era',
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
  'timeZoneName',
  'formatMatcher',
  'hour12',
  'timeZone',
  'dateStyle',
  'timeStyle',
  'calendar',
  'dayPeriod',
  'numberingSystem',
  'hourCycle',
  'fractionalSecondDigits',
];
function Ps(...e) {
  const [t, n, a, s] = e,
    r = Xe();
  let i = Xe(),
    l;
  if (fe(t)) {
    const d = t.match(/(\d{4}-\d{2}-\d{2})(T|\s)?(.*)/);
    if (!d) throw Bt(Ut.INVALID_ISO_DATE_ARGUMENT);
    const c = d[3]
      ? d[3].trim().startsWith('T')
        ? `${d[1].trim()}${d[3].trim()}`
        : `${d[1].trim()}T${d[3].trim()}`
      : d[1].trim();
    l = new Date(c);
    try {
      l.toISOString();
    } catch {
      throw Bt(Ut.INVALID_ISO_DATE_ARGUMENT);
    }
  } else if (Tc(t)) {
    if (isNaN(t.getTime())) throw Bt(Ut.INVALID_DATE_ARGUMENT);
    l = t;
  } else if (rt(t)) l = t;
  else throw Bt(Ut.INVALID_ARGUMENT);
  return (
    fe(n)
      ? (r.key = n)
      : Oe(n) &&
        Object.keys(n).forEach((d) => {
          Ql.includes(d) ? (i[d] = n[d]) : (r[d] = n[d]);
        }),
    fe(a) ? (r.locale = a) : Oe(a) && (i = a),
    Oe(s) && (i = s),
    [r.key || '', l, r, i]
  );
}
function ci(e, t, n) {
  const a = e;
  for (const s in n) {
    const r = `${t}__${s}`;
    a.__datetimeFormatters.has(r) && a.__datetimeFormatters.delete(r);
  }
}
function ui(e, ...t) {
  const { numberFormats: n, unresolving: a, fallbackLocale: s, onWarn: r, localeFallbacker: i } = e,
    { __numberFormatters: l } = e,
    [d, c, f, p] = Ms(...t),
    g = Me(f.missingWarn) ? f.missingWarn : e.missingWarn;
  Me(f.fallbackWarn) ? f.fallbackWarn : e.fallbackWarn;
  const v = !!f.part,
    y = or(e, f),
    N = i(e, s, y);
  if (!fe(d) || d === '') return new Intl.NumberFormat(y, p).format(c);
  let O = {},
    P,
    V = null;
  const k = 'number format';
  for (let I = 0; I < N.length && ((P = N[I]), (O = n[P] || {}), (V = O[d]), !Oe(V)); I++)
    cr(e, d, P, g, k);
  if (!Oe(V) || !fe(P)) return a ? ss : d;
  let E = `${P}__${d}`;
  ns(p) || (E = `${E}__${JSON.stringify(p)}`);
  let A = l.get(E);
  return (
    A || ((A = new Intl.NumberFormat(P, bt({}, V, p))), l.set(E, A)),
    v ? A.formatToParts(c) : A.format(c)
  );
}
const Jl = [
  'localeMatcher',
  'style',
  'currency',
  'currencyDisplay',
  'currencySign',
  'useGrouping',
  'minimumIntegerDigits',
  'minimumFractionDigits',
  'maximumFractionDigits',
  'minimumSignificantDigits',
  'maximumSignificantDigits',
  'compactDisplay',
  'notation',
  'signDisplay',
  'unit',
  'unitDisplay',
  'roundingMode',
  'roundingPriority',
  'roundingIncrement',
  'trailingZeroDisplay',
];
function Ms(...e) {
  const [t, n, a, s] = e,
    r = Xe();
  let i = Xe();
  if (!rt(t)) throw Bt(Ut.INVALID_ARGUMENT);
  const l = t;
  return (
    fe(n)
      ? (r.key = n)
      : Oe(n) &&
        Object.keys(n).forEach((d) => {
          Jl.includes(d) ? (i[d] = n[d]) : (r[d] = n[d]);
        }),
    fe(a) ? (r.locale = a) : Oe(a) && (i = a),
    Oe(s) && (i = s),
    [r.key || '', l, r, i]
  );
}
function di(e, t, n) {
  const a = e;
  for (const s in n) {
    const r = `${t}__${s}`;
    a.__numberFormatters.has(r) && a.__numberFormatters.delete(r);
  }
}
ou();
/*!
 * vue-i18n v9.14.5
 * (c) 2025 kazuya kawaguchi
 * Released under the MIT License.
 */ const ad = '9.14.5';
function sd() {
  (typeof __VUE_I18N_FULL_INSTALL__ != 'boolean' && (sn().__VUE_I18N_FULL_INSTALL__ = !0),
    typeof __VUE_I18N_LEGACY_API__ != 'boolean' && (sn().__VUE_I18N_LEGACY_API__ = !0),
    typeof __INTLIFY_JIT_COMPILATION__ != 'boolean' && (sn().__INTLIFY_JIT_COMPILATION__ = !1),
    typeof __INTLIFY_DROP_MESSAGE_COMPILER__ != 'boolean' &&
      (sn().__INTLIFY_DROP_MESSAGE_COMPILER__ = !1),
    typeof __INTLIFY_PROD_DEVTOOLS__ != 'boolean' && (sn().__INTLIFY_PROD_DEVTOOLS__ = !1));
}
const rd = Mu.__EXTEND_POINT__,
  Jt = as(rd);
(Jt(), Jt(), Jt(), Jt(), Jt(), Jt(), Jt(), Jt(), Jt());
const eo = Ut.__EXTEND_POINT__,
  $t = as(eo),
  mt = {
    UNEXPECTED_RETURN_TYPE: eo,
    INVALID_ARGUMENT: $t(),
    MUST_BE_CALL_SETUP_TOP: $t(),
    NOT_INSTALLED: $t(),
    NOT_AVAILABLE_IN_LEGACY_MODE: $t(),
    REQUIRED_VALUE: $t(),
    INVALID_VALUE: $t(),
    CANNOT_SETUP_VUE_DEVTOOLS_PLUGIN: $t(),
    NOT_INSTALLED_WITH_PROVIDE: $t(),
    UNEXPECTED_ERROR: $t(),
    NOT_COMPATIBLE_LEGACY_VUE_I18N: $t(),
    BRIDGE_SUPPORT_VUE_2_ONLY: $t(),
    MUST_DEFINE_I18N_OPTION_IN_ALLOW_COMPOSITION: $t(),
    NOT_AVAILABLE_COMPOSITION_IN_LEGACY: $t(),
    __EXTEND_POINT__: $t(),
  };
function ht(e, ...t) {
  return Jn(e, null, void 0);
}
const Ds = kn('__translateVNode'),
  Fs = kn('__datetimeParts'),
  qs = kn('__numberParts'),
  to = kn('__setPluralRules'),
  no = kn('__injectWithOption'),
  Us = kn('__dispose');
function ka(e) {
  if (!Ve(e) || Wt(e)) return e;
  for (const t in e)
    if (qt(e, t))
      if (!t.includes('.')) Ve(e[t]) && ka(e[t]);
      else {
        const n = t.split('.'),
          a = n.length - 1;
        let s = e,
          r = !1;
        for (let i = 0; i < a; i++) {
          if (n[i] === '__proto__') throw new Error(`unsafe key: ${n[i]}`);
          if ((n[i] in s || (s[n[i]] = Xe()), !Ve(s[n[i]]))) {
            r = !0;
            break;
          }
          s = s[n[i]];
        }
        if (
          (r || (Wt(s) ? Ul.includes(n[a]) || delete e[t] : ((s[n[a]] = e[t]), delete e[t])),
          !Wt(s))
        ) {
          const i = s[n[a]];
          Ve(i) && ka(i);
        }
      }
  return e;
}
function rs(e, t) {
  const { messages: n, __i18n: a, messageResolver: s, flatJson: r } = t,
    i = Oe(n) ? n : Qe(a) ? Xe() : { [e]: Xe() };
  if (
    (Qe(a) &&
      a.forEach((l) => {
        if ('locale' in l && 'resource' in l) {
          const { locale: d, resource: c } = l;
          d ? ((i[d] = i[d] || Xe()), Fa(c, i[d])) : Fa(c, i);
        } else fe(l) && Fa(JSON.parse(l), i);
      }),
    s == null && r)
  )
    for (const l in i) qt(i, l) && ka(i[l]);
  return i;
}
function ao(e) {
  return e.type;
}
function so(e, t, n) {
  let a = Ve(t.messages) ? t.messages : Xe();
  '__i18nGlobal' in n && (a = rs(e.locale.value, { messages: a, __i18n: n.__i18nGlobal }));
  const s = Object.keys(a);
  s.length &&
    s.forEach((r) => {
      e.mergeLocaleMessage(r, a[r]);
    });
  {
    if (Ve(t.datetimeFormats)) {
      const r = Object.keys(t.datetimeFormats);
      r.length &&
        r.forEach((i) => {
          e.mergeDateTimeFormat(i, t.datetimeFormats[i]);
        });
    }
    if (Ve(t.numberFormats)) {
      const r = Object.keys(t.numberFormats);
      r.length &&
        r.forEach((i) => {
          e.mergeNumberFormat(i, t.numberFormats[i]);
        });
    }
  }
}
function fi(e) {
  return Ne(ic, null, e, 0);
}
const mi = '__INTLIFY_META__',
  pi = () => [],
  id = () => !1;
let gi = 0;
function hi(e) {
  return (t, n, a, s) => e(n, a, va() || void 0, s);
}
const ld = () => {
  const e = va();
  let t = null;
  return e && (t = ao(e)[mi]) ? { [mi]: t } : null;
};
function ur(e = {}, t) {
  const { __root: n, __injectWithOption: a } = e,
    s = n === void 0,
    r = e.flatJson,
    i = Va ? Pe : kl,
    l = !!e.translateExistCompatible;
  let d = Me(e.inheritLocale) ? e.inheritLocale : !0;
  const c = i(n && d ? n.locale.value : fe(e.locale) ? e.locale : Gn),
    f = i(
      n && d
        ? n.fallbackLocale.value
        : fe(e.fallbackLocale) ||
            Qe(e.fallbackLocale) ||
            Oe(e.fallbackLocale) ||
            e.fallbackLocale === !1
          ? e.fallbackLocale
          : c.value,
    ),
    p = i(rs(c.value, e)),
    g = i(Oe(e.datetimeFormats) ? e.datetimeFormats : { [c.value]: {} }),
    v = i(Oe(e.numberFormats) ? e.numberFormats : { [c.value]: {} });
  let y = n ? n.missingWarn : Me(e.missingWarn) || vn(e.missingWarn) ? e.missingWarn : !0,
    N = n ? n.fallbackWarn : Me(e.fallbackWarn) || vn(e.fallbackWarn) ? e.fallbackWarn : !0,
    O = n ? n.fallbackRoot : Me(e.fallbackRoot) ? e.fallbackRoot : !0,
    P = !!e.fallbackFormat,
    V = Ke(e.missing) ? e.missing : null,
    k = Ke(e.missing) ? hi(e.missing) : null,
    E = Ke(e.postTranslation) ? e.postTranslation : null,
    A = n ? n.warnHtmlMessage : Me(e.warnHtmlMessage) ? e.warnHtmlMessage : !0,
    I = !!e.escapeParameter;
  const C = n ? n.modifiers : Oe(e.modifiers) ? e.modifiers : {};
  let D = e.pluralRules || (n && n.pluralRules),
    M;
  ((M = (() => {
    s && ai(null);
    const S = {
      version: ad,
      locale: c.value,
      fallbackLocale: f.value,
      messages: p.value,
      modifiers: C,
      pluralRules: D,
      missing: k === null ? void 0 : k,
      missingWarn: y,
      fallbackWarn: N,
      fallbackFormat: P,
      unresolving: !0,
      postTranslation: E === null ? void 0 : E,
      warnHtmlMessage: A,
      escapeParameter: I,
      messageResolver: e.messageResolver,
      messageCompiler: e.messageCompiler,
      __meta: { framework: 'vue' },
    };
    ((S.datetimeFormats = g.value),
      (S.numberFormats = v.value),
      (S.__datetimeFormatters = Oe(M) ? M.__datetimeFormatters : void 0),
      (S.__numberFormatters = Oe(M) ? M.__numberFormatters : void 0));
    const $ = Gu(S);
    return (s && ai($), $);
  })()),
    aa(M, c.value, f.value));
  function ve() {
    return [c.value, f.value, p.value, g.value, v.value];
  }
  const Z = T({
      get: () => c.value,
      set: (S) => {
        ((c.value = S), (M.locale = c.value));
      },
    }),
    Ae = T({
      get: () => f.value,
      set: (S) => {
        ((f.value = S), (M.fallbackLocale = f.value), aa(M, c.value, S));
      },
    }),
    Ye = T(() => p.value),
    De = T(() => g.value),
    Be = T(() => v.value);
  function B() {
    return Ke(E) ? E : null;
  }
  function K(S) {
    ((E = S), (M.postTranslation = S));
  }
  function ue() {
    return V;
  }
  function F(S) {
    (S !== null && (k = hi(S)), (V = S), (M.missing = k));
  }
  const G = (S, $, me, re, Se, ut) => {
    ve();
    let xt;
    try {
      (__INTLIFY_PROD_DEVTOOLS__, s || (M.fallbackContext = n ? Hu() : void 0), (xt = S(M)));
    } finally {
      (__INTLIFY_PROD_DEVTOOLS__, s || (M.fallbackContext = void 0));
    }
    if ((me !== 'translate exists' && rt(xt) && xt === ss) || (me === 'translate exists' && !xt)) {
      const [at, jt] = $();
      return n && O ? re(n) : Se(at);
    } else {
      if (ut(xt)) return xt;
      throw ht(mt.UNEXPECTED_RETURN_TYPE);
    }
  };
  function H(...S) {
    return G(
      ($) => Reflect.apply(li, null, [$, ...S]),
      () => Rs(...S),
      'translate',
      ($) => Reflect.apply($.t, $, [...S]),
      ($) => $,
      ($) => fe($),
    );
  }
  function de(...S) {
    const [$, me, re] = S;
    if (re && !Ve(re)) throw ht(mt.INVALID_ARGUMENT);
    return H($, me, bt({ resolvedMessage: !0 }, re || {}));
  }
  function Te(...S) {
    return G(
      ($) => Reflect.apply(oi, null, [$, ...S]),
      () => Ps(...S),
      'datetime format',
      ($) => Reflect.apply($.d, $, [...S]),
      () => ei,
      ($) => fe($),
    );
  }
  function ne(...S) {
    return G(
      ($) => Reflect.apply(ui, null, [$, ...S]),
      () => Ms(...S),
      'number format',
      ($) => Reflect.apply($.n, $, [...S]),
      () => ei,
      ($) => fe($),
    );
  }
  function ge(S) {
    return S.map(($) => (fe($) || rt($) || Me($) ? fi(String($)) : $));
  }
  const j = { normalize: ge, interpolate: (S) => S, type: 'vnode' };
  function W(...S) {
    return G(
      ($) => {
        let me;
        const re = $;
        try {
          ((re.processor = j), (me = Reflect.apply(li, null, [re, ...S])));
        } finally {
          re.processor = null;
        }
        return me;
      },
      () => Rs(...S),
      'translate',
      ($) => $[Ds](...S),
      ($) => [fi($)],
      ($) => Qe($),
    );
  }
  function ae(...S) {
    return G(
      ($) => Reflect.apply(ui, null, [$, ...S]),
      () => Ms(...S),
      'number format',
      ($) => $[qs](...S),
      pi,
      ($) => fe($) || Qe($),
    );
  }
  function he(...S) {
    return G(
      ($) => Reflect.apply(oi, null, [$, ...S]),
      () => Ps(...S),
      'datetime format',
      ($) => $[Fs](...S),
      pi,
      ($) => fe($) || Qe($),
    );
  }
  function R(S) {
    ((D = S), (M.pluralRules = D));
  }
  function X(S, $) {
    return G(
      () => {
        if (!S) return !1;
        const me = fe($) ? $ : c.value,
          re = we(me),
          Se = M.messageResolver(re, S);
        return l ? Se != null : Wt(Se) || Ct(Se) || fe(Se);
      },
      () => [S],
      'translate exists',
      (me) => Reflect.apply(me.te, me, [S, $]),
      id,
      (me) => Me(me),
    );
  }
  function U(S) {
    let $ = null;
    const me = zl(M, f.value, c.value);
    for (let re = 0; re < me.length; re++) {
      const Se = p.value[me[re]] || {},
        ut = M.messageResolver(Se, S);
      if (ut != null) {
        $ = ut;
        break;
      }
    }
    return $;
  }
  function ie(S) {
    const $ = U(S);
    return $ ?? (n ? n.tm(S) || {} : {});
  }
  function we(S) {
    return p.value[S] || {};
  }
  function Le(S, $) {
    if (r) {
      const me = { [S]: $ };
      for (const re in me) qt(me, re) && ka(me[re]);
      $ = me[S];
    }
    ((p.value[S] = $), (M.messages = p.value));
  }
  function Q(S, $) {
    p.value[S] = p.value[S] || {};
    const me = { [S]: $ };
    if (r) for (const re in me) qt(me, re) && ka(me[re]);
    (($ = me[S]), Fa($, p.value[S]), (M.messages = p.value));
  }
  function ke(S) {
    return g.value[S] || {};
  }
  function w(S, $) {
    ((g.value[S] = $), (M.datetimeFormats = g.value), ci(M, S, $));
  }
  function u(S, $) {
    ((g.value[S] = bt(g.value[S] || {}, $)), (M.datetimeFormats = g.value), ci(M, S, $));
  }
  function m(S) {
    return v.value[S] || {};
  }
  function x(S, $) {
    ((v.value[S] = $), (M.numberFormats = v.value), di(M, S, $));
  }
  function q(S, $) {
    ((v.value[S] = bt(v.value[S] || {}, $)), (M.numberFormats = v.value), di(M, S, $));
  }
  (gi++,
    n &&
      Va &&
      (tt(n.locale, (S) => {
        d && ((c.value = S), (M.locale = S), aa(M, c.value, f.value));
      }),
      tt(n.fallbackLocale, (S) => {
        d && ((f.value = S), (M.fallbackLocale = S), aa(M, c.value, f.value));
      })));
  const z = {
    id: gi,
    locale: Z,
    fallbackLocale: Ae,
    get inheritLocale() {
      return d;
    },
    set inheritLocale(S) {
      ((d = S),
        S &&
          n &&
          ((c.value = n.locale.value),
          (f.value = n.fallbackLocale.value),
          aa(M, c.value, f.value)));
    },
    get availableLocales() {
      return Object.keys(p.value).sort();
    },
    messages: Ye,
    get modifiers() {
      return C;
    },
    get pluralRules() {
      return D || {};
    },
    get isGlobal() {
      return s;
    },
    get missingWarn() {
      return y;
    },
    set missingWarn(S) {
      ((y = S), (M.missingWarn = y));
    },
    get fallbackWarn() {
      return N;
    },
    set fallbackWarn(S) {
      ((N = S), (M.fallbackWarn = N));
    },
    get fallbackRoot() {
      return O;
    },
    set fallbackRoot(S) {
      O = S;
    },
    get fallbackFormat() {
      return P;
    },
    set fallbackFormat(S) {
      ((P = S), (M.fallbackFormat = P));
    },
    get warnHtmlMessage() {
      return A;
    },
    set warnHtmlMessage(S) {
      ((A = S), (M.warnHtmlMessage = S));
    },
    get escapeParameter() {
      return I;
    },
    set escapeParameter(S) {
      ((I = S), (M.escapeParameter = S));
    },
    t: H,
    getLocaleMessage: we,
    setLocaleMessage: Le,
    mergeLocaleMessage: Q,
    getPostTranslationHandler: B,
    setPostTranslationHandler: K,
    getMissingHandler: ue,
    setMissingHandler: F,
    [to]: R,
  };
  return (
    (z.datetimeFormats = De),
    (z.numberFormats = Be),
    (z.rt = de),
    (z.te = X),
    (z.tm = ie),
    (z.d = Te),
    (z.n = ne),
    (z.getDateTimeFormat = ke),
    (z.setDateTimeFormat = w),
    (z.mergeDateTimeFormat = u),
    (z.getNumberFormat = m),
    (z.setNumberFormat = x),
    (z.mergeNumberFormat = q),
    (z[no] = a),
    (z[Ds] = W),
    (z[Fs] = he),
    (z[qs] = ae),
    z
  );
}
function od(e) {
  const t = fe(e.locale) ? e.locale : Gn,
    n =
      fe(e.fallbackLocale) ||
      Qe(e.fallbackLocale) ||
      Oe(e.fallbackLocale) ||
      e.fallbackLocale === !1
        ? e.fallbackLocale
        : t,
    a = Ke(e.missing) ? e.missing : void 0,
    s = Me(e.silentTranslationWarn) || vn(e.silentTranslationWarn) ? !e.silentTranslationWarn : !0,
    r = Me(e.silentFallbackWarn) || vn(e.silentFallbackWarn) ? !e.silentFallbackWarn : !0,
    i = Me(e.fallbackRoot) ? e.fallbackRoot : !0,
    l = !!e.formatFallbackMessages,
    d = Oe(e.modifiers) ? e.modifiers : {},
    c = e.pluralizationRules,
    f = Ke(e.postTranslation) ? e.postTranslation : void 0,
    p = fe(e.warnHtmlInMessage) ? e.warnHtmlInMessage !== 'off' : !0,
    g = !!e.escapeParameterHtml,
    v = Me(e.sync) ? e.sync : !0;
  let y = e.messages;
  if (Oe(e.sharedMessages)) {
    const I = e.sharedMessages;
    y = Object.keys(I).reduce((D, M) => {
      const ce = D[M] || (D[M] = {});
      return (bt(ce, I[M]), D);
    }, y || {});
  }
  const { __i18n: N, __root: O, __injectWithOption: P } = e,
    V = e.datetimeFormats,
    k = e.numberFormats,
    E = e.flatJson,
    A = e.translateExistCompatible;
  return {
    locale: t,
    fallbackLocale: n,
    messages: y,
    flatJson: E,
    datetimeFormats: V,
    numberFormats: k,
    missing: a,
    missingWarn: s,
    fallbackWarn: r,
    fallbackRoot: i,
    fallbackFormat: l,
    modifiers: d,
    pluralRules: c,
    postTranslation: f,
    warnHtmlMessage: p,
    escapeParameter: g,
    messageResolver: e.messageResolver,
    inheritLocale: v,
    translateExistCompatible: A,
    __i18n: N,
    __root: O,
    __injectWithOption: P,
  };
}
function js(e = {}, t) {
  {
    const n = ur(od(e)),
      { __extender: a } = e,
      s = {
        id: n.id,
        get locale() {
          return n.locale.value;
        },
        set locale(r) {
          n.locale.value = r;
        },
        get fallbackLocale() {
          return n.fallbackLocale.value;
        },
        set fallbackLocale(r) {
          n.fallbackLocale.value = r;
        },
        get messages() {
          return n.messages.value;
        },
        get datetimeFormats() {
          return n.datetimeFormats.value;
        },
        get numberFormats() {
          return n.numberFormats.value;
        },
        get availableLocales() {
          return n.availableLocales;
        },
        get formatter() {
          return {
            interpolate() {
              return [];
            },
          };
        },
        set formatter(r) {},
        get missing() {
          return n.getMissingHandler();
        },
        set missing(r) {
          n.setMissingHandler(r);
        },
        get silentTranslationWarn() {
          return Me(n.missingWarn) ? !n.missingWarn : n.missingWarn;
        },
        set silentTranslationWarn(r) {
          n.missingWarn = Me(r) ? !r : r;
        },
        get silentFallbackWarn() {
          return Me(n.fallbackWarn) ? !n.fallbackWarn : n.fallbackWarn;
        },
        set silentFallbackWarn(r) {
          n.fallbackWarn = Me(r) ? !r : r;
        },
        get modifiers() {
          return n.modifiers;
        },
        get formatFallbackMessages() {
          return n.fallbackFormat;
        },
        set formatFallbackMessages(r) {
          n.fallbackFormat = r;
        },
        get postTranslation() {
          return n.getPostTranslationHandler();
        },
        set postTranslation(r) {
          n.setPostTranslationHandler(r);
        },
        get sync() {
          return n.inheritLocale;
        },
        set sync(r) {
          n.inheritLocale = r;
        },
        get warnHtmlInMessage() {
          return n.warnHtmlMessage ? 'warn' : 'off';
        },
        set warnHtmlInMessage(r) {
          n.warnHtmlMessage = r !== 'off';
        },
        get escapeParameterHtml() {
          return n.escapeParameter;
        },
        set escapeParameterHtml(r) {
          n.escapeParameter = r;
        },
        get preserveDirectiveContent() {
          return !0;
        },
        set preserveDirectiveContent(r) {},
        get pluralizationRules() {
          return n.pluralRules || {};
        },
        __composer: n,
        t(...r) {
          const [i, l, d] = r,
            c = {};
          let f = null,
            p = null;
          if (!fe(i)) throw ht(mt.INVALID_ARGUMENT);
          const g = i;
          return (
            fe(l) ? (c.locale = l) : Qe(l) ? (f = l) : Oe(l) && (p = l),
            Qe(d) ? (f = d) : Oe(d) && (p = d),
            Reflect.apply(n.t, n, [g, f || p || {}, c])
          );
        },
        rt(...r) {
          return Reflect.apply(n.rt, n, [...r]);
        },
        tc(...r) {
          const [i, l, d] = r,
            c = { plural: 1 };
          let f = null,
            p = null;
          if (!fe(i)) throw ht(mt.INVALID_ARGUMENT);
          const g = i;
          return (
            fe(l) ? (c.locale = l) : rt(l) ? (c.plural = l) : Qe(l) ? (f = l) : Oe(l) && (p = l),
            fe(d) ? (c.locale = d) : Qe(d) ? (f = d) : Oe(d) && (p = d),
            Reflect.apply(n.t, n, [g, f || p || {}, c])
          );
        },
        te(r, i) {
          return n.te(r, i);
        },
        tm(r) {
          return n.tm(r);
        },
        getLocaleMessage(r) {
          return n.getLocaleMessage(r);
        },
        setLocaleMessage(r, i) {
          n.setLocaleMessage(r, i);
        },
        mergeLocaleMessage(r, i) {
          n.mergeLocaleMessage(r, i);
        },
        d(...r) {
          return Reflect.apply(n.d, n, [...r]);
        },
        getDateTimeFormat(r) {
          return n.getDateTimeFormat(r);
        },
        setDateTimeFormat(r, i) {
          n.setDateTimeFormat(r, i);
        },
        mergeDateTimeFormat(r, i) {
          n.mergeDateTimeFormat(r, i);
        },
        n(...r) {
          return Reflect.apply(n.n, n, [...r]);
        },
        getNumberFormat(r) {
          return n.getNumberFormat(r);
        },
        setNumberFormat(r, i) {
          n.setNumberFormat(r, i);
        },
        mergeNumberFormat(r, i) {
          n.mergeNumberFormat(r, i);
        },
        getChoiceIndex(r, i) {
          return -1;
        },
      };
    return ((s.__extender = a), s);
  }
}
const dr = {
  tag: { type: [String, Object] },
  locale: { type: String },
  scope: { type: String, validator: (e) => e === 'parent' || e === 'global', default: 'parent' },
  i18n: { type: Object },
};
function cd({ slots: e }, t) {
  return t.length === 1 && t[0] === 'default'
    ? (e.default ? e.default() : []).reduce(
        (a, s) => [...a, ...(s.type === te ? s.children : [s])],
        [],
      )
    : t.reduce((n, a) => {
        const s = e[a];
        return (s && (n[a] = s()), n);
      }, Xe());
}
function ro(e) {
  return te;
}
const ud = es({
    name: 'i18n-t',
    props: bt(
      {
        keypath: { type: String, required: !0 },
        plural: { type: [Number, String], validator: (e) => rt(e) || !isNaN(e) },
      },
      dr,
    ),
    setup(e, t) {
      const { slots: n, attrs: a } = t,
        s = e.i18n || ea({ useScope: e.scope, __useComponent: !0 });
      return () => {
        const r = Object.keys(n).filter((p) => p !== '_'),
          i = Xe();
        (e.locale && (i.locale = e.locale),
          e.plural !== void 0 && (i.plural = fe(e.plural) ? +e.plural : e.plural));
        const l = cd(t, r),
          d = s[Ds](e.keypath, l, i),
          c = bt(Xe(), a),
          f = fe(e.tag) || Ve(e.tag) ? e.tag : ro();
        return wl(f, c, d);
      };
    },
  }),
  _i = ud;
function dd(e) {
  return Qe(e) && !fe(e[0]);
}
function io(e, t, n, a) {
  const { slots: s, attrs: r } = t;
  return () => {
    const i = { part: !0 };
    let l = Xe();
    (e.locale && (i.locale = e.locale),
      fe(e.format)
        ? (i.key = e.format)
        : Ve(e.format) &&
          (fe(e.format.key) && (i.key = e.format.key),
          (l = Object.keys(e.format).reduce(
            (g, v) => (n.includes(v) ? bt(Xe(), g, { [v]: e.format[v] }) : g),
            Xe(),
          ))));
    const d = a(e.value, i, l);
    let c = [i.key];
    Qe(d)
      ? (c = d.map((g, v) => {
          const y = s[g.type],
            N = y ? y({ [g.type]: g.value, index: v, parts: d }) : [g.value];
          return (dd(N) && (N[0].key = `${g.type}-${v}`), N);
        }))
      : fe(d) && (c = [d]);
    const f = bt(Xe(), r),
      p = fe(e.tag) || Ve(e.tag) ? e.tag : ro();
    return wl(p, f, c);
  };
}
const fd = es({
    name: 'i18n-n',
    props: bt({ value: { type: Number, required: !0 }, format: { type: [String, Object] } }, dr),
    setup(e, t) {
      const n = e.i18n || ea({ useScope: e.scope, __useComponent: !0 });
      return io(e, t, Jl, (...a) => n[qs](...a));
    },
  }),
  vi = fd,
  md = es({
    name: 'i18n-d',
    props: bt(
      { value: { type: [Number, Date], required: !0 }, format: { type: [String, Object] } },
      dr,
    ),
    setup(e, t) {
      const n = e.i18n || ea({ useScope: e.scope, __useComponent: !0 });
      return io(e, t, Ql, (...a) => n[Fs](...a));
    },
  }),
  bi = md;
function pd(e, t) {
  const n = e;
  if (e.mode === 'composition') return n.__getInstance(t) || e.global;
  {
    const a = n.__getInstance(t);
    return a != null ? a.__composer : e.global.__composer;
  }
}
function gd(e) {
  const t = (i) => {
    const { instance: l, modifiers: d, value: c } = i;
    if (!l || !l.$) throw ht(mt.UNEXPECTED_ERROR);
    const f = pd(e, l.$),
      p = yi(c);
    return [Reflect.apply(f.t, f, [...ki(p)]), f];
  };
  return {
    created: (i, l) => {
      const [d, c] = t(l);
      (Va &&
        e.global === c &&
        (i.__i18nWatcher = tt(c.locale, () => {
          l.instance && l.instance.$forceUpdate();
        })),
        (i.__composer = c),
        (i.textContent = d));
    },
    unmounted: (i) => {
      (Va &&
        i.__i18nWatcher &&
        (i.__i18nWatcher(), (i.__i18nWatcher = void 0), delete i.__i18nWatcher),
        i.__composer && ((i.__composer = void 0), delete i.__composer));
    },
    beforeUpdate: (i, { value: l }) => {
      if (i.__composer) {
        const d = i.__composer,
          c = yi(l);
        i.textContent = Reflect.apply(d.t, d, [...ki(c)]);
      }
    },
    getSSRProps: (i) => {
      const [l] = t(i);
      return { textContent: l };
    },
  };
}
function yi(e) {
  if (fe(e)) return { path: e };
  if (Oe(e)) {
    if (!('path' in e)) throw ht(mt.REQUIRED_VALUE, 'path');
    return e;
  } else throw ht(mt.INVALID_VALUE);
}
function ki(e) {
  const { path: t, locale: n, args: a, choice: s, plural: r } = e,
    i = {},
    l = a || {};
  return (fe(n) && (i.locale = n), rt(s) && (i.plural = s), rt(r) && (i.plural = r), [t, l, i]);
}
function hd(e, t, ...n) {
  const a = Oe(n[0]) ? n[0] : {},
    s = !!a.useI18nComponentName;
  ((Me(a.globalInstall) ? a.globalInstall : !0) &&
    ([s ? 'i18n' : _i.name, 'I18nT'].forEach((i) => e.component(i, _i)),
    [vi.name, 'I18nN'].forEach((i) => e.component(i, vi)),
    [bi.name, 'I18nD'].forEach((i) => e.component(i, bi))),
    e.directive('t', gd(t)));
}
function _d(e, t, n) {
  return {
    beforeCreate() {
      const a = va();
      if (!a) throw ht(mt.UNEXPECTED_ERROR);
      const s = this.$options;
      if (s.i18n) {
        const r = s.i18n;
        if ((s.__i18n && (r.__i18n = s.__i18n), (r.__root = t), this === this.$root))
          this.$i18n = wi(e, r);
        else {
          ((r.__injectWithOption = !0), (r.__extender = n.__vueI18nExtend), (this.$i18n = js(r)));
          const i = this.$i18n;
          i.__extender && (i.__disposer = i.__extender(this.$i18n));
        }
      } else if (s.__i18n)
        if (this === this.$root) this.$i18n = wi(e, s);
        else {
          this.$i18n = js({
            __i18n: s.__i18n,
            __injectWithOption: !0,
            __extender: n.__vueI18nExtend,
            __root: t,
          });
          const r = this.$i18n;
          r.__extender && (r.__disposer = r.__extender(this.$i18n));
        }
      else this.$i18n = e;
      (s.__i18nGlobal && so(t, s, s),
        (this.$t = (...r) => this.$i18n.t(...r)),
        (this.$rt = (...r) => this.$i18n.rt(...r)),
        (this.$tc = (...r) => this.$i18n.tc(...r)),
        (this.$te = (r, i) => this.$i18n.te(r, i)),
        (this.$d = (...r) => this.$i18n.d(...r)),
        (this.$n = (...r) => this.$i18n.n(...r)),
        (this.$tm = (r) => this.$i18n.tm(r)),
        n.__setInstance(a, this.$i18n));
    },
    mounted() {},
    unmounted() {
      const a = va();
      if (!a) throw ht(mt.UNEXPECTED_ERROR);
      const s = this.$i18n;
      (delete this.$t,
        delete this.$rt,
        delete this.$tc,
        delete this.$te,
        delete this.$d,
        delete this.$n,
        delete this.$tm,
        s.__disposer && (s.__disposer(), delete s.__disposer, delete s.__extender),
        n.__deleteInstance(a),
        delete this.$i18n);
    },
  };
}
function wi(e, t) {
  ((e.locale = t.locale || e.locale),
    (e.fallbackLocale = t.fallbackLocale || e.fallbackLocale),
    (e.missing = t.missing || e.missing),
    (e.silentTranslationWarn = t.silentTranslationWarn || e.silentFallbackWarn),
    (e.silentFallbackWarn = t.silentFallbackWarn || e.silentFallbackWarn),
    (e.formatFallbackMessages = t.formatFallbackMessages || e.formatFallbackMessages),
    (e.postTranslation = t.postTranslation || e.postTranslation),
    (e.warnHtmlInMessage = t.warnHtmlInMessage || e.warnHtmlInMessage),
    (e.escapeParameterHtml = t.escapeParameterHtml || e.escapeParameterHtml),
    (e.sync = t.sync || e.sync),
    e.__composer[to](t.pluralizationRules || e.pluralizationRules));
  const n = rs(e.locale, { messages: t.messages, __i18n: t.__i18n });
  return (
    Object.keys(n).forEach((a) => e.mergeLocaleMessage(a, n[a])),
    t.datetimeFormats &&
      Object.keys(t.datetimeFormats).forEach((a) => e.mergeDateTimeFormat(a, t.datetimeFormats[a])),
    t.numberFormats &&
      Object.keys(t.numberFormats).forEach((a) => e.mergeNumberFormat(a, t.numberFormats[a])),
    e
  );
}
const vd = kn('global-vue-i18n');
function JE(e = {}, t) {
  const n = __VUE_I18N_LEGACY_API__ && Me(e.legacy) ? e.legacy : __VUE_I18N_LEGACY_API__,
    a = Me(e.globalInjection) ? e.globalInjection : !0,
    s = __VUE_I18N_LEGACY_API__ && n ? !!e.allowComposition : !0,
    r = new Map(),
    [i, l] = bd(e, n),
    d = kn('');
  function c(g) {
    return r.get(g) || null;
  }
  function f(g, v) {
    r.set(g, v);
  }
  function p(g) {
    r.delete(g);
  }
  {
    const g = {
      get mode() {
        return __VUE_I18N_LEGACY_API__ && n ? 'legacy' : 'composition';
      },
      get allowComposition() {
        return s;
      },
      async install(v, ...y) {
        if (((v.__VUE_I18N_SYMBOL__ = d), v.provide(v.__VUE_I18N_SYMBOL__, g), Oe(y[0]))) {
          const P = y[0];
          ((g.__composerExtend = P.__composerExtend), (g.__vueI18nExtend = P.__vueI18nExtend));
        }
        let N = null;
        (!n && a && (N = $d(v, g.global)),
          __VUE_I18N_FULL_INSTALL__ && hd(v, g, ...y),
          __VUE_I18N_LEGACY_API__ && n && v.mixin(_d(l, l.__composer, g)));
        const O = v.unmount;
        v.unmount = () => {
          (N && N(), g.dispose(), O());
        };
      },
      get global() {
        return l;
      },
      dispose() {
        i.stop();
      },
      __instances: r,
      __getInstance: c,
      __setInstance: f,
      __deleteInstance: p,
    };
    return g;
  }
}
function ea(e = {}) {
  const t = va();
  if (t == null) throw ht(mt.MUST_BE_CALL_SETUP_TOP);
  if (!t.isCE && t.appContext.app != null && !t.appContext.app.__VUE_I18N_SYMBOL__)
    throw ht(mt.NOT_INSTALLED);
  const n = yd(t),
    a = wd(n),
    s = ao(t),
    r = kd(e, s);
  if (__VUE_I18N_LEGACY_API__ && n.mode === 'legacy' && !e.__useComponent) {
    if (!n.allowComposition) throw ht(mt.NOT_AVAILABLE_IN_LEGACY_MODE);
    return Ad(t, r, a, e);
  }
  if (r === 'global') return (so(a, e, s), a);
  if (r === 'parent') {
    let d = Ed(n, t, e.__useComponent);
    return (d == null && (d = a), d);
  }
  const i = n;
  let l = i.__getInstance(t);
  if (l == null) {
    const d = bt({}, e);
    ('__i18n' in s && (d.__i18n = s.__i18n),
      a && (d.__root = a),
      (l = ur(d)),
      i.__composerExtend && (l[Us] = i.__composerExtend(l)),
      Td(i, t, l),
      i.__setInstance(t, l));
  }
  return l;
}
function bd(e, t, n) {
  const a = tc();
  {
    const s = __VUE_I18N_LEGACY_API__ && t ? a.run(() => js(e)) : a.run(() => ur(e));
    if (s == null) throw ht(mt.UNEXPECTED_ERROR);
    return [a, s];
  }
}
function yd(e) {
  {
    const t = ac(e.isCE ? vd : e.appContext.app.__VUE_I18N_SYMBOL__);
    if (!t) throw ht(e.isCE ? mt.NOT_INSTALLED_WITH_PROVIDE : mt.UNEXPECTED_ERROR);
    return t;
  }
}
function kd(e, t) {
  return ns(e) ? ('__i18n' in t ? 'local' : 'global') : e.useScope ? e.useScope : 'local';
}
function wd(e) {
  return e.mode === 'composition' ? e.global : e.global.__composer;
}
function Ed(e, t, n = !1) {
  let a = null;
  const s = t.root;
  let r = Sd(t, n);
  for (; r != null; ) {
    const i = e;
    if (e.mode === 'composition') a = i.__getInstance(r);
    else if (__VUE_I18N_LEGACY_API__) {
      const l = i.__getInstance(r);
      l != null && ((a = l.__composer), n && a && !a[no] && (a = null));
    }
    if (a != null || s === r) break;
    r = r.parent;
  }
  return a;
}
function Sd(e, t = !1) {
  return e == null ? null : (t && e.vnode.ctx) || e.parent;
}
function Td(e, t, n) {
  (ts(() => {}, t),
    sc(() => {
      const a = n;
      e.__deleteInstance(t);
      const s = a[Us];
      s && (s(), delete a[Us]);
    }, t));
}
function Ad(e, t, n, a = {}) {
  const s = t === 'local',
    r = kl(null);
  if (s && e.proxy && !(e.proxy.$options.i18n || e.proxy.$options.__i18n))
    throw ht(mt.MUST_DEFINE_I18N_OPTION_IN_ALLOW_COMPOSITION);
  const i = Me(a.inheritLocale) ? a.inheritLocale : !fe(a.locale),
    l = Pe(!s || i ? n.locale.value : fe(a.locale) ? a.locale : Gn),
    d = Pe(
      !s || i
        ? n.fallbackLocale.value
        : fe(a.fallbackLocale) ||
            Qe(a.fallbackLocale) ||
            Oe(a.fallbackLocale) ||
            a.fallbackLocale === !1
          ? a.fallbackLocale
          : l.value,
    ),
    c = Pe(rs(l.value, a)),
    f = Pe(Oe(a.datetimeFormats) ? a.datetimeFormats : { [l.value]: {} }),
    p = Pe(Oe(a.numberFormats) ? a.numberFormats : { [l.value]: {} }),
    g = s ? n.missingWarn : Me(a.missingWarn) || vn(a.missingWarn) ? a.missingWarn : !0,
    v = s ? n.fallbackWarn : Me(a.fallbackWarn) || vn(a.fallbackWarn) ? a.fallbackWarn : !0,
    y = s ? n.fallbackRoot : Me(a.fallbackRoot) ? a.fallbackRoot : !0,
    N = !!a.fallbackFormat,
    O = Ke(a.missing) ? a.missing : null,
    P = Ke(a.postTranslation) ? a.postTranslation : null,
    V = s ? n.warnHtmlMessage : Me(a.warnHtmlMessage) ? a.warnHtmlMessage : !0,
    k = !!a.escapeParameter,
    E = s ? n.modifiers : Oe(a.modifiers) ? a.modifiers : {},
    A = a.pluralRules || (s && n.pluralRules);
  function I() {
    return [l.value, d.value, c.value, f.value, p.value];
  }
  const C = T({
      get: () => (r.value ? r.value.locale.value : l.value),
      set: (U) => {
        (r.value && (r.value.locale.value = U), (l.value = U));
      },
    }),
    D = T({
      get: () => (r.value ? r.value.fallbackLocale.value : d.value),
      set: (U) => {
        (r.value && (r.value.fallbackLocale.value = U), (d.value = U));
      },
    }),
    M = T(() => (r.value ? r.value.messages.value : c.value)),
    ce = T(() => f.value),
    ve = T(() => p.value);
  function Z() {
    return r.value ? r.value.getPostTranslationHandler() : P;
  }
  function Ae(U) {
    r.value && r.value.setPostTranslationHandler(U);
  }
  function Ye() {
    return r.value ? r.value.getMissingHandler() : O;
  }
  function De(U) {
    r.value && r.value.setMissingHandler(U);
  }
  function Be(U) {
    return (I(), U());
  }
  function B(...U) {
    return r.value ? Be(() => Reflect.apply(r.value.t, null, [...U])) : Be(() => '');
  }
  function K(...U) {
    return r.value ? Reflect.apply(r.value.rt, null, [...U]) : '';
  }
  function ue(...U) {
    return r.value ? Be(() => Reflect.apply(r.value.d, null, [...U])) : Be(() => '');
  }
  function F(...U) {
    return r.value ? Be(() => Reflect.apply(r.value.n, null, [...U])) : Be(() => '');
  }
  function G(U) {
    return r.value ? r.value.tm(U) : {};
  }
  function H(U, ie) {
    return r.value ? r.value.te(U, ie) : !1;
  }
  function de(U) {
    return r.value ? r.value.getLocaleMessage(U) : {};
  }
  function Te(U, ie) {
    r.value && (r.value.setLocaleMessage(U, ie), (c.value[U] = ie));
  }
  function ne(U, ie) {
    r.value && r.value.mergeLocaleMessage(U, ie);
  }
  function ge(U) {
    return r.value ? r.value.getDateTimeFormat(U) : {};
  }
  function oe(U, ie) {
    r.value && (r.value.setDateTimeFormat(U, ie), (f.value[U] = ie));
  }
  function j(U, ie) {
    r.value && r.value.mergeDateTimeFormat(U, ie);
  }
  function W(U) {
    return r.value ? r.value.getNumberFormat(U) : {};
  }
  function ae(U, ie) {
    r.value && (r.value.setNumberFormat(U, ie), (p.value[U] = ie));
  }
  function he(U, ie) {
    r.value && r.value.mergeNumberFormat(U, ie);
  }
  const R = {
    get id() {
      return r.value ? r.value.id : -1;
    },
    locale: C,
    fallbackLocale: D,
    messages: M,
    datetimeFormats: ce,
    numberFormats: ve,
    get inheritLocale() {
      return r.value ? r.value.inheritLocale : i;
    },
    set inheritLocale(U) {
      r.value && (r.value.inheritLocale = U);
    },
    get availableLocales() {
      return r.value ? r.value.availableLocales : Object.keys(c.value);
    },
    get modifiers() {
      return r.value ? r.value.modifiers : E;
    },
    get pluralRules() {
      return r.value ? r.value.pluralRules : A;
    },
    get isGlobal() {
      return r.value ? r.value.isGlobal : !1;
    },
    get missingWarn() {
      return r.value ? r.value.missingWarn : g;
    },
    set missingWarn(U) {
      r.value && (r.value.missingWarn = U);
    },
    get fallbackWarn() {
      return r.value ? r.value.fallbackWarn : v;
    },
    set fallbackWarn(U) {
      r.value && (r.value.missingWarn = U);
    },
    get fallbackRoot() {
      return r.value ? r.value.fallbackRoot : y;
    },
    set fallbackRoot(U) {
      r.value && (r.value.fallbackRoot = U);
    },
    get fallbackFormat() {
      return r.value ? r.value.fallbackFormat : N;
    },
    set fallbackFormat(U) {
      r.value && (r.value.fallbackFormat = U);
    },
    get warnHtmlMessage() {
      return r.value ? r.value.warnHtmlMessage : V;
    },
    set warnHtmlMessage(U) {
      r.value && (r.value.warnHtmlMessage = U);
    },
    get escapeParameter() {
      return r.value ? r.value.escapeParameter : k;
    },
    set escapeParameter(U) {
      r.value && (r.value.escapeParameter = U);
    },
    t: B,
    getPostTranslationHandler: Z,
    setPostTranslationHandler: Ae,
    getMissingHandler: Ye,
    setMissingHandler: De,
    rt: K,
    d: ue,
    n: F,
    tm: G,
    te: H,
    getLocaleMessage: de,
    setLocaleMessage: Te,
    mergeLocaleMessage: ne,
    getDateTimeFormat: ge,
    setDateTimeFormat: oe,
    mergeDateTimeFormat: j,
    getNumberFormat: W,
    setNumberFormat: ae,
    mergeNumberFormat: he,
  };
  function X(U) {
    ((U.locale.value = l.value),
      (U.fallbackLocale.value = d.value),
      Object.keys(c.value).forEach((ie) => {
        U.mergeLocaleMessage(ie, c.value[ie]);
      }),
      Object.keys(f.value).forEach((ie) => {
        U.mergeDateTimeFormat(ie, f.value[ie]);
      }),
      Object.keys(p.value).forEach((ie) => {
        U.mergeNumberFormat(ie, p.value[ie]);
      }),
      (U.escapeParameter = k),
      (U.fallbackFormat = N),
      (U.fallbackRoot = y),
      (U.fallbackWarn = v),
      (U.missingWarn = g),
      (U.warnHtmlMessage = V));
  }
  return (
    rc(() => {
      if (e.proxy == null || e.proxy.$i18n == null)
        throw ht(mt.NOT_AVAILABLE_COMPOSITION_IN_LEGACY);
      const U = (r.value = e.proxy.$i18n.__composer);
      t === 'global'
        ? ((l.value = U.locale.value),
          (d.value = U.fallbackLocale.value),
          (c.value = U.messages.value),
          (f.value = U.datetimeFormats.value),
          (p.value = U.numberFormats.value))
        : s && X(U);
    }),
    R
  );
}
const Id = ['locale', 'fallbackLocale', 'availableLocales'],
  Ei = ['t', 'rt', 'd', 'n', 'tm', 'te'];
function $d(e, t) {
  const n = Object.create(null);
  return (
    Id.forEach((s) => {
      const r = Object.getOwnPropertyDescriptor(t, s);
      if (!r) throw ht(mt.UNEXPECTED_ERROR);
      const i = nc(r.value)
        ? {
            get() {
              return r.value.value;
            },
            set(l) {
              r.value.value = l;
            },
          }
        : {
            get() {
              return r.get && r.get();
            },
          };
      Object.defineProperty(n, s, i);
    }),
    (e.config.globalProperties.$i18n = n),
    Ei.forEach((s) => {
      const r = Object.getOwnPropertyDescriptor(t, s);
      if (!r || !r.value) throw ht(mt.UNEXPECTED_ERROR);
      Object.defineProperty(e.config.globalProperties, `$${s}`, r);
    }),
    () => {
      (delete e.config.globalProperties.$i18n,
        Ei.forEach((s) => {
          delete e.config.globalProperties[`$${s}`];
        }));
    }
  );
}
sd();
__INTLIFY_JIT_COMPILATION__ ? ni(Qu) : ni(Ku);
zu(wu);
Vu(zl);
if (__INTLIFY_PROD_DEVTOOLS__) {
  const e = sn();
  ((e.__INTLIFY__ = !0), Cu(e.__INTLIFY_DEVTOOLS_GLOBAL_HOOK__));
}
const Nd = { class: 'flow-breadcrumb', 'aria-label': 'Percorso di generazione' },
  xd = { class: 'flow-breadcrumb__list' },
  Cd = ['disabled', 'onClick'],
  Od = { class: 'flow-breadcrumb__index' },
  Ld = { class: 'flow-breadcrumb__label' },
  Rd = {
    __name: 'FlowBreadcrumb',
    props: { steps: { type: Array, default: () => [] }, current: { type: Object, default: null } },
    emits: ['navigate'],
    setup(e) {
      const t = e,
        { steps: n, current: a } = Ln(t);
      return (s, r) => (
        h(),
        _('nav', Nd, [
          o('ol', xd, [
            (h(!0),
            _(
              te,
              null,
              se(le(n), (i) => {
                var l, d;
                return (
                  h(),
                  _('li', { key: i.id, class: 'flow-breadcrumb__item' }, [
                    o(
                      'button',
                      {
                        type: 'button',
                        class: ft([
                          'flow-breadcrumb__link',
                          {
                            'flow-breadcrumb__link--active':
                              i.id === ((l = le(a)) == null ? void 0 : l.id),
                          },
                        ]),
                        disabled: i.id === ((d = le(a)) == null ? void 0 : d.id),
                        onClick: (c) => s.$emit('navigate', i.id),
                      },
                      [o('span', Od, b(i.index + 1), 1), o('span', Ld, b(i.title), 1)],
                      10,
                      Cd,
                    ),
                  ])
                );
              }),
              128,
            )),
          ]),
        ])
      );
    },
  },
  Pd = Ue(Rd, [['__scopeId', 'data-v-1140a026']]),
  Md = { class: 'progress-tracker' },
  Dd = { class: 'progress-tracker__header' },
  Fd = { class: 'progress-tracker__subtitle' },
  qd = { class: 'progress-tracker__chip' },
  Ud = { class: 'progress-tracker__chip-label' },
  jd = { class: 'progress-tracker__chip-value' },
  zd = ['aria-valuenow'],
  Vd = { class: 'progress-tracker__cards', role: 'list' },
  Bd = { class: 'progress-card__header' },
  Wd = { class: 'progress-card__caption' },
  Hd = { class: 'progress-card__title' },
  Gd = ['onClick', 'aria-label'],
  Zd = { class: 'progress-card__index' },
  Yd = { class: 'progress-card__description' },
  Xd = { key: 0, class: 'progress-card__metrics' },
  Kd = {
    __name: 'ProgressTracker',
    props: {
      steps: { type: Array, default: () => [] },
      summary: {
        type: Object,
        default: () => ({ totalSteps: 0, completedSteps: 0, percent: 0, active: null }),
      },
    },
    emits: ['navigate'],
    setup(e) {
      const t = e,
        { steps: n, summary: a } = Ln(t),
        s = {
          done: { label: 'Completo', variant: 'success' },
          current: { label: 'In corso', variant: 'info' },
          pending: { label: 'In attesa', variant: 'neutral' },
          blocked: { label: 'Bloccato', variant: 'danger' },
        },
        r = (d) => (s[d] || s.pending).label,
        i = (d) => (s[d] || s.pending).variant,
        l = (d) => {
          const c = Number.isFinite(d.total) ? d.total : 0,
            f = Number.isFinite(d.completed) ? d.completed : 0;
          return c ? Math.min(100, Math.round((f / c) * 100)) : 0;
        };
      return (d, c) => {
        var f;
        return (
          h(),
          _('section', Md, [
            o('header', Dd, [
              o('div', null, [
                c[0] ||
                  (c[0] = o(
                    'h1',
                    { class: 'progress-tracker__title' },
                    'Orchestrazione generazione',
                    -1,
                  )),
                o(
                  'p',
                  Fd,
                  ' Stato globale · ' +
                    b(le(a).completedSteps) +
                    ' / ' +
                    b(le(a).totalSteps) +
                    ' fasi completate ',
                  1,
                ),
              ]),
              o('div', qd, [
                o('span', Ud, b((f = le(a).active) == null ? void 0 : f.title), 1),
                o('span', jd, b(le(a).percent) + '%', 1),
              ]),
            ]),
            o(
              'div',
              {
                class: 'progress-tracker__bar',
                role: 'progressbar',
                'aria-valuenow': le(a).percent,
                'aria-valuemin': '0',
                'aria-valuemax': '100',
              },
              [
                o(
                  'div',
                  {
                    class: 'progress-tracker__bar-fill',
                    style: za({ width: `${le(a).percent}%` }),
                  },
                  null,
                  4,
                ),
              ],
              8,
              zd,
            ),
            o('div', Vd, [
              (h(!0),
              _(
                te,
                null,
                se(le(n), (p) => {
                  var g;
                  return (
                    h(),
                    _(
                      'article',
                      {
                        key: p.id,
                        class: ft([
                          'progress-card',
                          [
                            `progress-card--${p.status}`,
                            {
                              'progress-card--active':
                                p.id === ((g = le(a).active) == null ? void 0 : g.id),
                            },
                          ],
                        ]),
                        role: 'listitem',
                      },
                      [
                        o('header', Bd, [
                          o('div', null, [o('p', Wd, b(p.caption), 1), o('h2', Hd, b(p.title), 1)]),
                          o(
                            'button',
                            {
                              type: 'button',
                              class: 'progress-card__status',
                              onClick: (v) => d.$emit('navigate', p.id),
                              'aria-label': `Vai alla fase ${p.title}`,
                            },
                            [
                              Ne(
                                lc,
                                { label: r(p.status), variant: i(p.status), compact: '' },
                                null,
                                8,
                                ['label', 'variant'],
                              ),
                              o('span', Zd, '#' + b(p.index + 1), 1),
                            ],
                            8,
                            Gd,
                          ),
                        ]),
                        o('p', Yd, b(p.description), 1),
                        p.metrics.total
                          ? (h(),
                            _('dl', Xd, [
                              o('div', null, [
                                o('dt', null, b(p.metrics.label || 'Elementi'), 1),
                                o(
                                  'dd',
                                  null,
                                  b(p.metrics.completed) + ' / ' + b(p.metrics.total),
                                  1,
                                ),
                              ]),
                              o('div', null, [
                                c[1] || (c[1] = o('dt', null, 'Completezza', -1)),
                                o('dd', null, b(l(p.metrics)) + '%', 1),
                              ]),
                            ]))
                          : Y('', !0),
                      ],
                      2,
                    )
                  );
                }),
                128,
              )),
            ]),
          ])
        );
      };
    },
  },
  Qd = Ue(Kd, [['__scopeId', 'data-v-e174894c']]),
  lo = [
    {
      id: 'overview',
      title: 'Overview',
      caption: 'Panoramica del progetto',
      description: 'Riepilogo degli obiettivi e dei vincoli di generazione.',
    },
    {
      id: 'species',
      title: 'Specie',
      caption: 'Curazione faunistica',
      description: 'Selezione e revisione delle specie protagoniste.',
    },
    {
      id: 'biomeSetup',
      title: 'Setup Biomi',
      caption: 'Parametri di sintesi',
      description: 'Definizione dei vincoli ambientali prima della generazione.',
    },
    {
      id: 'biomes',
      title: 'Biomi',
      caption: 'Scenari ecologici',
      description: 'Biomi candidati e condizioni ambientali principali.',
    },
    {
      id: 'encounter',
      title: 'Encounter',
      caption: 'Configurazioni di scontro',
      description: 'Seed, varianti e parametri del combattimento.',
    },
    {
      id: 'qualityRelease',
      title: 'Quality & Release',
      caption: 'Validazione runtime',
      description: 'Controlli QA automatizzati e readiness per la release.',
    },
    {
      id: 'publishing',
      title: 'Publishing',
      caption: 'Preparazione artefatti',
      description: 'Pacchetti finali e consegna dei deliverable.',
    },
  ];
function Na(e, t) {
  const n = Math.max(0, Math.min(t, e.length - 1));
  return (
    e.forEach((a, s) => {
      s < n
        ? (a.status = a.status === 'blocked' ? 'blocked' : 'done')
        : s === n
          ? (a.status = a.status === 'blocked' ? 'blocked' : 'current')
          : (a.status = a.status === 'blocked' ? 'blocked' : 'pending');
    }),
    n
  );
}
function Jd(e = {}) {
  const { initial: t = 'overview', stepOverrides: n = {} } = e,
    a = ct(
      lo.map((y, N) => {
        const O = n[y.id] || {},
          P = { completed: 0, total: 0, label: 'Elementi', ...O.metrics };
        return {
          ...y,
          ...O,
          index: N,
          status: 'pending',
          metrics: P,
          completed: !!(P.total && P.completed >= P.total),
          locked: !!O.locked,
        };
      }),
    ),
    s = a.findIndex((y) => y.id === t),
    r = ct({ currentIndex: Na(a, s === -1 ? 0 : s) }),
    i = T(() => a[r.currentIndex] || a[0]),
    l = T(() => a.slice(0, r.currentIndex + 1)),
    d = T(() => {
      const y = a.length,
        N = a.filter((P) => P.status === 'done').length,
        O = y === 0 ? 0 : Math.round((N / y) * 100);
      return { totalSteps: y, completedSteps: N, percent: O, active: i.value };
    });
  function c(y) {
    const N = a.findIndex((O) => O.id === y);
    N !== -1 && (r.currentIndex = Na(a, N));
  }
  function f() {
    r.currentIndex < a.length - 1 && (r.currentIndex = Na(a, r.currentIndex + 1));
  }
  function p() {
    r.currentIndex > 0 && (r.currentIndex = Na(a, r.currentIndex - 1));
  }
  function g(y, N = {}) {
    const O = a.find((E) => E.id === y);
    if (!O) return;
    const P = { ...O.metrics, ...N };
    O.metrics = P;
    const V = Number.isFinite(P.total) ? P.total : 0,
      k = Number.isFinite(P.completed) ? P.completed : 0;
    V > 0 && k >= V && ((O.completed = !0), a[r.currentIndex].id !== O.id && (O.status = 'done'));
  }
  function v(y, N) {
    const O = a.find((P) => P.id === y);
    O && ((O.status = N), N === 'done' && (O.completed = !0));
  }
  return {
    steps: a,
    currentStep: i,
    breadcrumb: l,
    summary: d,
    goTo: c,
    next: f,
    previous: p,
    updateMetrics: g,
    mark: v,
  };
}
lo.map((e) => ({ ...e }));
const Si = 10;
function mn(e, t = 0) {
  const n = Number(e);
  return Number.isFinite(n) ? n : t;
}
function xa(e) {
  return Array.isArray(e) ? e.filter((t) => t != null) : [];
}
function Ti(e, t) {
  if (!t) return null;
  const n = Number(e) / Number(t);
  return !Number.isFinite(n) || t === 0 ? null : `${Math.round(n * 100)}%`;
}
function ef(e, t) {
  return t
    ? e >= t
      ? 'brightgreen'
      : e / t >= 0.8
        ? 'green'
        : e / t >= 0.6
          ? 'yellow'
          : 'orange'
    : 'lightgrey';
}
function _s(e) {
  return e > 0 ? 'orange' : 'brightgreen';
}
function tf(e, t = {}) {
  var E, A, I, C, D;
  if (!e || typeof e != 'object') return null;
  const n = Number(t.limit || Si) || Si,
    a = e.summary || e.baseline_summary || ((E = e.diagnostics) == null ? void 0 : E.summary) || {},
    s =
      ((A = e.checks) == null ? void 0 : A.traits) ||
      ((C = (I = e.diagnostics) == null ? void 0 : I.checks) == null ? void 0 : C.traits) ||
      {},
    r = e.highlights || ((D = e.diagnostics) == null ? void 0 : D.highlights) || {},
    i = mn(a.total_traits || a.totalTraits),
    l = mn(a.glossary_ok || a.glossaryOk),
    d = mn(a.glossary_missing || a.glossaryMissing),
    c = mn(a.with_conflicts || a.conflicts),
    f = mn(a.matrix_mismatch || a.matrixMismatch),
    p = xa(r.matrix_only_traits || r.matrixOnlyTraits).length,
    v = xa(r.zero_coverage_traits || r.zeroCoverageTraits).length,
    y = [
      {
        key: 'traits',
        label: 'Traits',
        value: `${l}/${i || 'n/d'}`,
        color: ef(l, i || s.total),
        description: 'Tratti con metadati glossary validi',
      },
      {
        key: 'conflicts',
        label: 'Conflicts',
        value: String(s.conflicts ?? c ?? 0),
        color: _s(s.conflicts ?? c ?? 0),
        description: 'Conflitti rilevati dal matrix QA',
      },
      {
        key: 'matrix',
        label: 'Matrix mismatch',
        value: String(s.matrix_mismatch ?? f ?? 0),
        color: _s(s.matrix_mismatch ?? f ?? 0),
        description: 'Tratti non allineati con la coverage matrix',
      },
      {
        key: 'coverage',
        label: 'Zero coverage',
        value: String(v),
        color: _s(v),
        description: 'Tratti senza copertura QA',
      },
    ],
    O = [
      { key: 'glossary_missing', title: 'Glossario mancante' },
      { key: 'matrix_only_traits', title: 'Solo matrice' },
      { key: 'matrix_mismatch_traits', title: 'Mismatch matrice' },
      { key: 'zero_coverage_traits', title: 'Zero coverage' },
    ].map((M) => {
      const ce = r[M.key] || r[M.key.replace(/_(.)/g, (Z, Ae) => Ae.toUpperCase())],
        ve = xa(ce).map((Z) => String(Z));
      return { key: M.key, title: M.title, total: ve.length, items: ve.slice(0, n) };
    }),
    P = xa(r.top_conflicts || r.topConflicts).map((M) => ({
      id: (M == null ? void 0 : M.id) || (M == null ? void 0 : M.name) || '',
      conflicts: mn((M == null ? void 0 : M.conflicts) || (M == null ? void 0 : M.count)),
    })),
    V = mn(s.total || a.total_traits),
    k = mn(s.passed || a.glossary_ok);
  return {
    generatedAt: e.generated_at || e.generatedAt || null,
    metrics: {
      totalTraits: i,
      glossaryOk: l,
      glossaryMissing: d,
      glossaryPercent: Ti(l, i),
      conflicts: c,
      matrixMismatch: f,
      matrixOnly: p,
      zeroCoverage: v,
    },
    badges: y,
    sections: O,
    topConflicts: P.slice(0, n),
    checks: { total: V, passed: k, percent: Ti(k, V) },
  };
}
function nf(e, t) {
  return typeof e == 'function'
    ? Math.max(0, Number(e(t)) || 0)
    : typeof e == 'number' && Number.isFinite(e)
      ? Math.max(0, e)
      : t <= 1
        ? 1e3
        : Math.min(t * 1500, 1e4);
}
function af() {
  return new Map();
}
function Ai(e, t, n) {
  const a = e.get(t);
  !a ||
    a.size === 0 ||
    [...a].forEach((s) => {
      try {
        s(n);
      } catch (r) {
        console.warn('[useEventSource] handler error', r);
      }
    });
}
function sf(e = null, t = {}) {
  const n = af(),
    a = ct({
      status: t.initialStatus ?? 'idle',
      url: e,
      error: null,
      lastEventId: null,
      lastEventAt: null,
      attempts: 0,
    }),
    s = t.autoReconnect !== !1,
    r = t.reconnectDelay;
  let i = null,
    l = null;
  function d() {
    l && (clearTimeout(l), (l = null));
  }
  function c(E) {
    a.status = E;
  }
  function f() {
    i && ((i.onopen = null), (i.onerror = null), (i.onmessage = null), i.close(), (i = null));
  }
  function p() {
    if (!s || typeof window > 'u') return;
    d();
    const E = a.attempts + 1;
    a.attempts = E;
    const A = nf(r, E);
    l = setTimeout(() => {
      ((l = null), a.url && v(a.url));
    }, A);
  }
  function g(E) {
    ((a.lastEventId = E.lastEventId || null),
      (a.lastEventAt = Date.now()),
      Ai(n, 'message', E),
      E.type && E.type !== 'message' && Ai(n, E.type, E));
  }
  function v(E = a.url) {
    if (typeof window > 'u' || typeof EventSource > 'u') {
      (c('unsupported'),
        (a.error = new Error("EventSource non supportato nell'ambiente corrente")));
      return;
    }
    if (E && !(i && a.url === E && a.status === 'open')) {
      (f(), d(), (a.error = null), (a.url = E), (a.status = 'connecting'), (a.attempts = 0));
      try {
        i = new EventSource(E, { withCredentials: !!t.withCredentials });
      } catch (A) {
        ((a.error = A instanceof Error ? A : new Error(String(A))), c('errored'), p());
        return;
      }
      ((i.onopen = () => {
        ((a.attempts = 0), (a.error = null), c('open'));
      }),
        (i.onerror = () => {
          ((a.error = new Error('Connessione stream QA interrotta')), c('errored'), f(), p());
        }),
        (i.onmessage = g));
    }
  }
  function y() {
    (d(), f(), (a.attempts = 0), (a.status === 'open' || a.status === 'connecting') && c('closed'));
  }
  function N() {
    const E = a.url;
    (y(), E && v(E));
  }
  function O(E) {
    a.url = E;
  }
  function P(E, A) {
    const I = E || 'message';
    n.has(I) || n.set(I, new Set());
    const C = n.get(I);
    return (
      C.add(A),
      () => {
        (C.delete(A), C.size === 0 && n.delete(I));
      }
    );
  }
  function V(E, A) {
    const I = E || 'message',
      C = n.get(I);
    C && (A ? C.delete(A) : C.clear(), C.size === 0 && n.delete(I));
  }
  return (
    Tl() &&
      Sl(() => {
        (d(), f(), n.clear());
      }),
    { state: El(a), connect: v, disconnect: y, reconnect: N, setUrl: O, on: P, off: V }
  );
}
const Ii = 500,
  $i = [
    ['id', (e) => e.id || ''],
    ['timestamp', (e) => e.timestamp || ''],
    ['scope', (e) => e.scope || ''],
    ['level', (e) => e.level || ''],
    ['message', (e) => e.message || ''],
    ['request_id', (e) => e.request_id || ''],
    ['meta', (e) => (e.meta === void 0 || e.meta === null ? '' : JSON.stringify(e.meta, null, 0))],
    [
      'validation',
      (e) =>
        e.validation === void 0 || e.validation === null
          ? ''
          : JSON.stringify(e.validation, null, 0),
    ],
    ['data', (e) => (e.data === void 0 || e.data === null ? '' : JSON.stringify(e.data, null, 0))],
    ['source', (e) => e.source || ''],
  ];
let rf = 0;
const cn = ct({ entries: [] }),
  Nn = sf(null, { autoReconnect: !0, reconnectDelay: (e) => Math.min((e + 1) * 1200, 8e3) });
let $n = null,
  Mt = { scope: 'quality', level: 'info', source: 'stream', event: 'message', parseJson: !0 };
function lf() {
  const e = Al('VITE_QA_LOG_STREAM_URL');
  if (typeof e == 'string') {
    const t = e.trim();
    return !t || t.toLowerCase() === 'null' ? null : Gt(t);
  }
  return Gt('/api/v1/quality/logs/stream');
}
const zs = lf();
function Vn(e) {
  if (e === void 0) return e;
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return e;
  }
}
function fr(e) {
  return typeof e == 'function' ? cn.entries.filter(e) : cn.entries.slice();
}
function mr(e) {
  return { ...e, meta: Vn(e.meta), validation: Vn(e.validation), data: Vn(e.data) };
}
function oo(e) {
  const t = mr(e);
  (cn.entries.unshift(t), cn.entries.length > Ii && (cn.entries.length = Ii));
  const n = typeof t.level == 'string' ? t.level.toLowerCase() : '';
  return (
    (n === 'error' || n === 'warn' || n === 'warning') &&
      oc({
        id: t.id,
        level: t.level,
        message: t.message,
        scope: t.scope,
        source: t.source,
        timestamp: Date.parse(t.timestamp) || Date.now(),
      }),
    t
  );
}
function of(e) {
  const t = (e || '').trim();
  return t.length ? t : 'app';
}
function cf(e) {
  return e instanceof Date
    ? e.toISOString()
    : typeof e == 'number'
      ? new Date(e).toISOString()
      : typeof e == 'string' && e.length
        ? e
        : new Date().toISOString();
}
function Vs(e, t, n = {}) {
  const a = of(t.scope ?? n.scope),
    s = t.level ?? n.level ?? 'info',
    r = typeof t.message == 'string' ? t.message : '',
    i = cf(t.timestamp ?? n.timestamp ?? null),
    l = t.request_id ?? t.requestId ?? n.request_id ?? null,
    d = typeof t.source == 'string' && t.source.length ? t.source : n.source || 'ui';
  return {
    id:
      typeof t.id == 'string' && t.id.length
        ? t.id
        : typeof n.id == 'string' && n.id.length
          ? n.id
          : `${e}-${Date.now()}-${rf++}`,
    event: e || 'app.event',
    scope: a,
    level: s,
    message: r,
    timestamp: i,
    request_id: l,
    meta: Vn(t.meta ?? n.meta ?? null),
    validation: Vn(t.validation ?? n.validation ?? null),
    data: Vn(t.data ?? n.data ?? null),
    source: d,
  };
}
function uf(e) {
  const t = e == null ? '' : String(e);
  return t.length ? (/[,"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t) : '';
}
function df(e) {
  const t = $i.map(([a]) => a).join(','),
    n = e.map((a) => $i.map(([, s]) => uf(s(a))).join(','));
  return [t, ...n].join(`\r
`);
}
function Ni(e, t) {
  return typeof Blob == 'function' ? new Blob([e], { type: t }) : null;
}
function ff(e) {
  return JSON.stringify(e, null, 2);
}
function mf(e, { filename: t, format: n }) {
  const a = String(n || 'json').toLowerCase() === 'csv' ? 'csv' : 'json',
    s = e.map((l) => mr(l));
  if (a === 'csv') {
    const l = df(s),
      d = 'text/csv;charset=utf-8';
    return {
      entries: s,
      format: 'csv',
      filename: t || 'qa-flow-logs.csv',
      content: l,
      contentType: d,
      blob: Ni(l, d),
    };
  }
  const r = ff(s),
    i = 'application/json';
  return {
    entries: s,
    format: 'json',
    filename: t || 'qa-flow-logs.json',
    content: r,
    contentType: i,
    blob: Ni(r, i),
  };
}
function pf(e, t) {
  if (!e || typeof window > 'u' || typeof document > 'u') return;
  const n = URL.createObjectURL(e),
    a = document.createElement('a');
  ((a.href = n),
    (a.download = t),
    (a.rel = 'noopener'),
    (a.style.display = 'none'),
    document.body.appendChild(a),
    a.click(),
    document.body.removeChild(a),
    setTimeout(() => URL.revokeObjectURL(n), 0));
}
function vt(e, t = {}) {
  const n = Vs(e, t);
  return oo(n);
}
function gf(e, t = {}) {
  const n = tf(e, t);
  if (!n) return null;
  const a = n.metrics || {},
    s = !!(a.conflicts || a.matrixMismatch || a.zeroCoverage);
  return (
    vt('quality.qa.badges', {
      scope: 'quality',
      level: s ? 'warn' : 'info',
      message: 'Aggiornati badge QA',
      data: {
        metrics: a,
        badges: n.badges,
        sections: Array.isArray(n.sections)
          ? n.sections.map((r) => ({ key: r.key, total: r.total }))
          : [],
        checks: n.checks,
      },
    }),
    n
  );
}
function hf() {
  cn.entries.splice(0, cn.entries.length);
}
function _f({ filter: e } = {}) {
  return fr(e).map((n) => mr(n));
}
function co({ filename: e, filter: t, format: n = 'json' } = {}) {
  const a = fr(t);
  return mf(a, { filename: e, format: n });
}
function pr(e = {}) {
  const t = co(e);
  return (pf(t.blob, t.filename), t);
}
function vf(e = {}) {
  pr({ ...e, format: 'json' });
}
function bf(e = {}) {
  pr({ ...e, format: 'csv' });
}
function sa(e, t) {
  if (e == null) return null;
  if (typeof e == 'string') {
    const r = e.trim();
    return r
      ? Vs(t.event || 'quality.stream.log', {
          message: r,
          scope: t.scope,
          level: t.level,
          source: t.source,
        })
      : null;
  }
  if (typeof e != 'object') return null;
  const n = e,
    a = typeof n.event == 'string' && n.event.length ? n.event : t.event || 'quality.stream.log';
  return Vs(a, {
    id: typeof n.id == 'string' && n.id.length ? n.id : void 0,
    scope: n.scope ?? t.scope,
    level: n.level ?? t.level,
    message: typeof n.message == 'string' ? n.message : '',
    timestamp: n.timestamp ?? n.time,
    request_id: n.request_id ?? n.requestId,
    meta: n.meta,
    validation: n.validation,
    data: n.data,
    source: n.source ?? t.source,
  });
}
function yf(e, t) {
  if (Array.isArray(e)) return e.map((a) => sa(a, t)).filter((a) => !!a);
  if (e && typeof e == 'object') {
    const a = e;
    if (Array.isArray(a.entries)) return a.entries.map((s) => sa(s, t)).filter((s) => !!s);
    if (Array.isArray(a.logs)) return a.logs.map((s) => sa(s, t)).filter((s) => !!s);
    if (a.entry) {
      const s = sa(a.entry, t);
      return s ? [s] : [];
    }
  }
  const n = sa(e, t);
  return n ? [n] : [];
}
function kf(e) {
  $n && ($n(), ($n = null));
  const t = {
    scope: e.scope ?? Mt.scope,
    level: e.level ?? Mt.level,
    source: e.source ?? Mt.source,
    event: e.event ?? Mt.event,
  };
  ((Mt = {
    scope: t.scope || 'quality',
    level: t.level || 'info',
    source: t.source || 'stream',
    event: t.event || 'message',
    parseJson: e.parseJson !== !1,
  }),
    ($n = Nn.on(Mt.event, (n) => {
      let a = n.data;
      if (Mt.parseJson && typeof a == 'string') {
        const r = a.trim();
        if (r)
          try {
            a = JSON.parse(r);
          } catch {
            a = r;
          }
      }
      yf(a, {
        scope: Mt.scope,
        level: Mt.level,
        source: Mt.source,
        event: n.type && n.type !== 'message' ? n.type : e.event || 'quality.stream.log',
      }).forEach((r) => oo({ ...r, source: r.source || Mt.source }));
    })));
}
function vs(e = {}) {
  if (typeof window > 'u') return;
  const t = e.url ?? Nn.state.url ?? zs;
  if (!t) {
    uo();
    return;
  }
  (kf(e), Nn.setUrl(t), Nn.connect(t));
}
function uo() {
  ($n && ($n(), ($n = null)), Nn.disconnect());
}
function wf() {
  Nn.reconnect();
}
function fo(e = {}) {
  e.autoConnect
    ? vs({ url: e.streamUrl ?? zs, event: e.event ?? 'message', scope: e.scope ?? 'quality' })
    : e.streamUrl &&
      vs({ url: e.streamUrl, event: e.event ?? 'message', scope: e.scope ?? 'quality' });
  const t = El(cn.entries),
    n = T(() => cn.entries.length),
    a = Nn.state,
    s = T(() => a.status),
    r = T(() => a.url),
    i = T(() => a.error),
    l = T(() => a.lastEventAt),
    d = T(() => a.attempts),
    c = T(() => a.status !== 'unsupported'),
    f = T(() => a.status === 'open');
  return {
    entries: t,
    total: n,
    list: (p) => fr(p),
    snapshot: (p) => _f({ filter: p == null ? void 0 : p.filter }),
    createLogExport: co,
    exportLogs: pr,
    exportLogsAsJson: vf,
    exportLogsAsCsv: bf,
    logEvent: vt,
    logQaBadgeSummary: gf,
    clear: hf,
    connectStream: vs,
    disconnectStream: uo,
    reconnectStream: wf,
    streamState: a,
    streamStatus: s,
    streamUrl: r,
    streamError: i,
    streamLastEventAt: l,
    streamAttempts: d,
    streamSupported: c,
    streamConnected: f,
    defaultStreamUrl: zs,
  };
}
let Ef = 0;
function Sf(e) {
  const t = (e || '').trim();
  return t.length ? t : 'app';
}
function Tf(e, t) {
  const n = String(e || '').toLowerCase();
  return n === 'warn' || n === 'warning' ? 'warn' : n === 'error' || n === 'critical' ? 'error' : t;
}
function Af(e, t, n, a = {}) {
  const s = typeof a.message == 'string' ? a.message : '',
    r = a.request_id ?? a.requestId ?? null,
    i =
      typeof a.timestamp == 'string' && a.timestamp.length ? a.timestamp : new Date().toISOString(),
    { meta: l = null, validation: d = null, data: c = null, source: f = 'ui', ...p } = a,
    g = { ...p };
  (delete g.id,
    delete g.level,
    delete g.message,
    delete g.request_id,
    delete g.requestId,
    delete g.meta,
    delete g.validation,
    delete g.data,
    delete g.source,
    delete g.timestamp);
  const v = Object.keys(g).length > 0;
  return {
    id: typeof a.id == 'string' && a.id.length ? a.id : `${e}-${Date.now()}-${Ef++}`,
    event: t || 'app.event',
    scope: e,
    level: a.level ?? n,
    message: s,
    timestamp: i,
    request_id: r,
    meta: l,
    validation: d,
    data: c,
    source: typeof f == 'string' && f.length ? f : 'ui',
    ...(v ? { context: g } : {}),
  };
}
function Ca(e, t, n, a, s) {
  const r = Af(e, n, t, a);
  if (
    (vt(r.event, {
      id: r.id,
      scope: r.scope,
      level: r.level,
      message: r.message,
      request_id: r.request_id,
      meta: r.meta,
      validation: r.validation,
      data: r.data,
      source: r.source,
      timestamp: r.timestamp,
    }),
    s.console !== !1 && typeof console < 'u')
  ) {
    const i = Tf(r.level, t),
      l = [`[${r.scope}] ${r.event}`];
    r.message && l.push(r.message);
    const d = {};
    (r.meta !== null && r.meta !== void 0 && (d.meta = r.meta),
      r.validation !== null && r.validation !== void 0 && (d.validation = r.validation),
      r.data !== null && r.data !== void 0 && (d.data = r.data),
      r.context && Object.keys(r.context).length > 0 && (d.context = r.context),
      Object.keys(d).length > 0 && l.push(d),
      (console[i] || console.log)(...l));
  }
  return (typeof s.sink == 'function' && s.sink(r), r);
}
function mo(e, t = {}) {
  const n = Sf(e);
  return {
    scope: n,
    log(a, s = {}) {
      const r = (() => {
        const i = String(s.level || '').toLowerCase();
        return i === 'warn' || i === 'warning'
          ? 'warn'
          : i === 'error' || i === 'critical'
            ? 'error'
            : 'info';
      })();
      return Ca(n, r, a, s, t);
    },
    info(a, s = {}) {
      return Ca(n, 'info', a, s, t);
    },
    warn(a, s = {}) {
      return (s.level || (s.level = 'warning'), Ca(n, 'warn', a, s, t));
    },
    error(a, s = {}) {
      return ((s.level = s.level || 'error'), Ca(n, 'error', a, s, t));
    },
  };
}
const xi = 200;
function If() {
  const e = new Map();
  return {
    on: (s, r) => {
      if (!s || typeof r != 'function') return () => {};
      const i = String(s);
      e.has(i) || e.set(i, new Set());
      const l = e.get(i);
      return (
        l.add(r),
        () => {
          (l.delete(r), l.size === 0 && e.delete(i));
        }
      );
    },
    off: (s, r) => {
      if (!s) return;
      const i = e.get(String(s));
      i && (typeof r == 'function' ? i.delete(r) : i.clear(), i.size === 0 && e.delete(String(s)));
    },
    emit: (s, r) => {
      if (!s) return;
      const i = e.get(String(s));
      !i ||
        i.size === 0 ||
        [...i].forEach((l) => {
          try {
            l(r);
          } catch {}
        });
    },
  };
}
function $f(e) {
  return {
    id: e.id,
    scope: e.scope,
    level: e.level,
    message: e.message,
    timestamp: e.timestamp,
    event: e.event,
    request_id: e.request_id,
    meta: e.meta,
    validation: e.validation,
    source: e.source,
    ...(e.data !== void 0 ? { data: e.data } : {}),
    ...(e.context !== void 0 ? { context: e.context } : {}),
  };
}
function Nf() {
  const e = ct({ entries: [] }),
    t = If(),
    n = mo('flow', {
      sink(f) {
        const p = $f(f);
        (e.entries.unshift(p),
          e.entries.length > xi && (e.entries.length = xi),
          t.emit(f.event, p));
      },
    }),
    a = (f, p = {}) => n.log(f, { source: 'flow', ...p }),
    s = (f, p = {}) => n.info(f, { source: 'flow', ...p }),
    r = (f, p = {}) => n.warn(f, { source: 'flow', ...p }),
    i = (f, p = {}) => n.error(f, { source: 'flow', ...p }),
    l = T(() => e.entries.map((f) => ({ ...f })));
  return {
    log: a,
    info: s,
    warn: r,
    error: i,
    logs: l,
    on: (f, p) => t.on(f, p),
    off: (f, p) => t.off(f, p),
  };
}
var ze;
(function (e) {
  e.assertEqual = (s) => {};
  function t(s) {}
  e.assertIs = t;
  function n(s) {
    throw new Error();
  }
  ((e.assertNever = n),
    (e.arrayToEnum = (s) => {
      const r = {};
      for (const i of s) r[i] = i;
      return r;
    }),
    (e.getValidEnumValues = (s) => {
      const r = e.objectKeys(s).filter((l) => typeof s[s[l]] != 'number'),
        i = {};
      for (const l of r) i[l] = s[l];
      return e.objectValues(i);
    }),
    (e.objectValues = (s) =>
      e.objectKeys(s).map(function (r) {
        return s[r];
      })),
    (e.objectKeys =
      typeof Object.keys == 'function'
        ? (s) => Object.keys(s)
        : (s) => {
            const r = [];
            for (const i in s) Object.prototype.hasOwnProperty.call(s, i) && r.push(i);
            return r;
          }),
    (e.find = (s, r) => {
      for (const i of s) if (r(i)) return i;
    }),
    (e.isInteger =
      typeof Number.isInteger == 'function'
        ? (s) => Number.isInteger(s)
        : (s) => typeof s == 'number' && Number.isFinite(s) && Math.floor(s) === s));
  function a(s, r = ' | ') {
    return s.map((i) => (typeof i == 'string' ? `'${i}'` : i)).join(r);
  }
  ((e.joinValues = a),
    (e.jsonStringifyReplacer = (s, r) => (typeof r == 'bigint' ? r.toString() : r)));
})(ze || (ze = {}));
var Ci;
(function (e) {
  e.mergeShapes = (t, n) => ({ ...t, ...n });
})(Ci || (Ci = {}));
const _e = ze.arrayToEnum([
    'string',
    'nan',
    'number',
    'integer',
    'float',
    'boolean',
    'date',
    'bigint',
    'symbol',
    'function',
    'undefined',
    'null',
    'array',
    'object',
    'unknown',
    'promise',
    'void',
    'never',
    'map',
    'set',
  ]),
  gn = (e) => {
    switch (typeof e) {
      case 'undefined':
        return _e.undefined;
      case 'string':
        return _e.string;
      case 'number':
        return Number.isNaN(e) ? _e.nan : _e.number;
      case 'boolean':
        return _e.boolean;
      case 'function':
        return _e.function;
      case 'bigint':
        return _e.bigint;
      case 'symbol':
        return _e.symbol;
      case 'object':
        return Array.isArray(e)
          ? _e.array
          : e === null
            ? _e.null
            : e.then && typeof e.then == 'function' && e.catch && typeof e.catch == 'function'
              ? _e.promise
              : typeof Map < 'u' && e instanceof Map
                ? _e.map
                : typeof Set < 'u' && e instanceof Set
                  ? _e.set
                  : typeof Date < 'u' && e instanceof Date
                    ? _e.date
                    : _e.object;
      default:
        return _e.unknown;
    }
  },
  ee = ze.arrayToEnum([
    'invalid_type',
    'invalid_literal',
    'custom',
    'invalid_union',
    'invalid_union_discriminator',
    'invalid_enum_value',
    'unrecognized_keys',
    'invalid_arguments',
    'invalid_return_type',
    'invalid_date',
    'invalid_string',
    'too_small',
    'too_big',
    'invalid_intersection_types',
    'not_multiple_of',
    'not_finite',
  ]);
class gt extends Error {
  get errors() {
    return this.issues;
  }
  constructor(t) {
    (super(),
      (this.issues = []),
      (this.addIssue = (a) => {
        this.issues = [...this.issues, a];
      }),
      (this.addIssues = (a = []) => {
        this.issues = [...this.issues, ...a];
      }));
    const n = new.target.prototype;
    (Object.setPrototypeOf ? Object.setPrototypeOf(this, n) : (this.__proto__ = n),
      (this.name = 'ZodError'),
      (this.issues = t));
  }
  format(t) {
    const n =
        t ||
        function (r) {
          return r.message;
        },
      a = { _errors: [] },
      s = (r) => {
        for (const i of r.issues)
          if (i.code === 'invalid_union') i.unionErrors.map(s);
          else if (i.code === 'invalid_return_type') s(i.returnTypeError);
          else if (i.code === 'invalid_arguments') s(i.argumentsError);
          else if (i.path.length === 0) a._errors.push(n(i));
          else {
            let l = a,
              d = 0;
            for (; d < i.path.length; ) {
              const c = i.path[d];
              (d === i.path.length - 1
                ? ((l[c] = l[c] || { _errors: [] }), l[c]._errors.push(n(i)))
                : (l[c] = l[c] || { _errors: [] }),
                (l = l[c]),
                d++);
            }
          }
      };
    return (s(this), a);
  }
  static assert(t) {
    if (!(t instanceof gt)) throw new Error(`Not a ZodError: ${t}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, ze.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(t = (n) => n.message) {
    const n = {},
      a = [];
    for (const s of this.issues)
      if (s.path.length > 0) {
        const r = s.path[0];
        ((n[r] = n[r] || []), n[r].push(t(s)));
      } else a.push(t(s));
    return { formErrors: a, fieldErrors: n };
  }
  get formErrors() {
    return this.flatten();
  }
}
gt.create = (e) => new gt(e);
const Bs = (e, t) => {
  let n;
  switch (e.code) {
    case ee.invalid_type:
      e.received === _e.undefined
        ? (n = 'Required')
        : (n = `Expected ${e.expected}, received ${e.received}`);
      break;
    case ee.invalid_literal:
      n = `Invalid literal value, expected ${JSON.stringify(e.expected, ze.jsonStringifyReplacer)}`;
      break;
    case ee.unrecognized_keys:
      n = `Unrecognized key(s) in object: ${ze.joinValues(e.keys, ', ')}`;
      break;
    case ee.invalid_union:
      n = 'Invalid input';
      break;
    case ee.invalid_union_discriminator:
      n = `Invalid discriminator value. Expected ${ze.joinValues(e.options)}`;
      break;
    case ee.invalid_enum_value:
      n = `Invalid enum value. Expected ${ze.joinValues(e.options)}, received '${e.received}'`;
      break;
    case ee.invalid_arguments:
      n = 'Invalid function arguments';
      break;
    case ee.invalid_return_type:
      n = 'Invalid function return type';
      break;
    case ee.invalid_date:
      n = 'Invalid date';
      break;
    case ee.invalid_string:
      typeof e.validation == 'object'
        ? 'includes' in e.validation
          ? ((n = `Invalid input: must include "${e.validation.includes}"`),
            typeof e.validation.position == 'number' &&
              (n = `${n} at one or more positions greater than or equal to ${e.validation.position}`))
          : 'startsWith' in e.validation
            ? (n = `Invalid input: must start with "${e.validation.startsWith}"`)
            : 'endsWith' in e.validation
              ? (n = `Invalid input: must end with "${e.validation.endsWith}"`)
              : ze.assertNever(e.validation)
        : e.validation !== 'regex'
          ? (n = `Invalid ${e.validation}`)
          : (n = 'Invalid');
      break;
    case ee.too_small:
      e.type === 'array'
        ? (n = `Array must contain ${e.exact ? 'exactly' : e.inclusive ? 'at least' : 'more than'} ${e.minimum} element(s)`)
        : e.type === 'string'
          ? (n = `String must contain ${e.exact ? 'exactly' : e.inclusive ? 'at least' : 'over'} ${e.minimum} character(s)`)
          : e.type === 'number'
            ? (n = `Number must be ${e.exact ? 'exactly equal to ' : e.inclusive ? 'greater than or equal to ' : 'greater than '}${e.minimum}`)
            : e.type === 'bigint'
              ? (n = `Number must be ${e.exact ? 'exactly equal to ' : e.inclusive ? 'greater than or equal to ' : 'greater than '}${e.minimum}`)
              : e.type === 'date'
                ? (n = `Date must be ${e.exact ? 'exactly equal to ' : e.inclusive ? 'greater than or equal to ' : 'greater than '}${new Date(Number(e.minimum))}`)
                : (n = 'Invalid input');
      break;
    case ee.too_big:
      e.type === 'array'
        ? (n = `Array must contain ${e.exact ? 'exactly' : e.inclusive ? 'at most' : 'less than'} ${e.maximum} element(s)`)
        : e.type === 'string'
          ? (n = `String must contain ${e.exact ? 'exactly' : e.inclusive ? 'at most' : 'under'} ${e.maximum} character(s)`)
          : e.type === 'number'
            ? (n = `Number must be ${e.exact ? 'exactly' : e.inclusive ? 'less than or equal to' : 'less than'} ${e.maximum}`)
            : e.type === 'bigint'
              ? (n = `BigInt must be ${e.exact ? 'exactly' : e.inclusive ? 'less than or equal to' : 'less than'} ${e.maximum}`)
              : e.type === 'date'
                ? (n = `Date must be ${e.exact ? 'exactly' : e.inclusive ? 'smaller than or equal to' : 'smaller than'} ${new Date(Number(e.maximum))}`)
                : (n = 'Invalid input');
      break;
    case ee.custom:
      n = 'Invalid input';
      break;
    case ee.invalid_intersection_types:
      n = 'Intersection results could not be merged';
      break;
    case ee.not_multiple_of:
      n = `Number must be a multiple of ${e.multipleOf}`;
      break;
    case ee.not_finite:
      n = 'Number must be finite';
      break;
    default:
      ((n = t.defaultError), ze.assertNever(e));
  }
  return { message: n };
};
let xf = Bs;
function Cf() {
  return xf;
}
const Of = (e) => {
  const { data: t, path: n, errorMaps: a, issueData: s } = e,
    r = [...n, ...(s.path || [])],
    i = { ...s, path: r };
  if (s.message !== void 0) return { ...s, path: r, message: s.message };
  let l = '';
  const d = a
    .filter((c) => !!c)
    .slice()
    .reverse();
  for (const c of d) l = c(i, { data: t, defaultError: l }).message;
  return { ...s, path: r, message: l };
};
function pe(e, t) {
  const n = Cf(),
    a = Of({
      issueData: t,
      data: e.data,
      path: e.path,
      errorMaps: [e.common.contextualErrorMap, e.schemaErrorMap, n, n === Bs ? void 0 : Bs].filter(
        (s) => !!s,
      ),
    });
  e.common.issues.push(a);
}
class St {
  constructor() {
    this.value = 'valid';
  }
  dirty() {
    this.value === 'valid' && (this.value = 'dirty');
  }
  abort() {
    this.value !== 'aborted' && (this.value = 'aborted');
  }
  static mergeArray(t, n) {
    const a = [];
    for (const s of n) {
      if (s.status === 'aborted') return Ce;
      (s.status === 'dirty' && t.dirty(), a.push(s.value));
    }
    return { status: t.value, value: a };
  }
  static async mergeObjectAsync(t, n) {
    const a = [];
    for (const s of n) {
      const r = await s.key,
        i = await s.value;
      a.push({ key: r, value: i });
    }
    return St.mergeObjectSync(t, a);
  }
  static mergeObjectSync(t, n) {
    const a = {};
    for (const s of n) {
      const { key: r, value: i } = s;
      if (r.status === 'aborted' || i.status === 'aborted') return Ce;
      (r.status === 'dirty' && t.dirty(),
        i.status === 'dirty' && t.dirty(),
        r.value !== '__proto__' && (typeof i.value < 'u' || s.alwaysSet) && (a[r.value] = i.value));
    }
    return { status: t.value, value: a };
  }
}
const Ce = Object.freeze({ status: 'aborted' }),
  ga = (e) => ({ status: 'dirty', value: e }),
  Rt = (e) => ({ status: 'valid', value: e }),
  Oi = (e) => e.status === 'aborted',
  Li = (e) => e.status === 'dirty',
  Zn = (e) => e.status === 'valid',
  Wa = (e) => typeof Promise < 'u' && e instanceof Promise;
var ye;
(function (e) {
  ((e.errToObj = (t) => (typeof t == 'string' ? { message: t } : t || {})),
    (e.toString = (t) => (typeof t == 'string' ? t : t == null ? void 0 : t.message)));
})(ye || (ye = {}));
class Zt {
  constructor(t, n, a, s) {
    ((this._cachedPath = []),
      (this.parent = t),
      (this.data = n),
      (this._path = a),
      (this._key = s));
  }
  get path() {
    return (
      this._cachedPath.length ||
        (Array.isArray(this._key)
          ? this._cachedPath.push(...this._path, ...this._key)
          : this._cachedPath.push(...this._path, this._key)),
      this._cachedPath
    );
  }
}
const Ri = (e, t) => {
  if (Zn(t)) return { success: !0, data: t.value };
  if (!e.common.issues.length) throw new Error('Validation failed but no issues detected.');
  return {
    success: !1,
    get error() {
      if (this._error) return this._error;
      const n = new gt(e.common.issues);
      return ((this._error = n), this._error);
    },
  };
};
function Re(e) {
  if (!e) return {};
  const { errorMap: t, invalid_type_error: n, required_error: a, description: s } = e;
  if (t && (n || a))
    throw new Error(
      `Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`,
    );
  return t
    ? { errorMap: t, description: s }
    : {
        errorMap: (i, l) => {
          const { message: d } = e;
          return i.code === 'invalid_enum_value'
            ? { message: d ?? l.defaultError }
            : typeof l.data > 'u'
              ? { message: d ?? a ?? l.defaultError }
              : i.code !== 'invalid_type'
                ? { message: l.defaultError }
                : { message: d ?? n ?? l.defaultError };
        },
        description: s,
      };
}
class qe {
  get description() {
    return this._def.description;
  }
  _getType(t) {
    return gn(t.data);
  }
  _getOrReturnCtx(t, n) {
    return (
      n || {
        common: t.parent.common,
        data: t.data,
        parsedType: gn(t.data),
        schemaErrorMap: this._def.errorMap,
        path: t.path,
        parent: t.parent,
      }
    );
  }
  _processInputParams(t) {
    return {
      status: new St(),
      ctx: {
        common: t.parent.common,
        data: t.data,
        parsedType: gn(t.data),
        schemaErrorMap: this._def.errorMap,
        path: t.path,
        parent: t.parent,
      },
    };
  }
  _parseSync(t) {
    const n = this._parse(t);
    if (Wa(n)) throw new Error('Synchronous parse encountered promise.');
    return n;
  }
  _parseAsync(t) {
    const n = this._parse(t);
    return Promise.resolve(n);
  }
  parse(t, n) {
    const a = this.safeParse(t, n);
    if (a.success) return a.data;
    throw a.error;
  }
  safeParse(t, n) {
    const a = {
        common: {
          issues: [],
          async: (n == null ? void 0 : n.async) ?? !1,
          contextualErrorMap: n == null ? void 0 : n.errorMap,
        },
        path: (n == null ? void 0 : n.path) || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: t,
        parsedType: gn(t),
      },
      s = this._parseSync({ data: t, path: a.path, parent: a });
    return Ri(a, s);
  }
  '~validate'(t) {
    var a, s;
    const n = {
      common: { issues: [], async: !!this['~standard'].async },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: t,
      parsedType: gn(t),
    };
    if (!this['~standard'].async)
      try {
        const r = this._parseSync({ data: t, path: [], parent: n });
        return Zn(r) ? { value: r.value } : { issues: n.common.issues };
      } catch (r) {
        ((s = (a = r == null ? void 0 : r.message) == null ? void 0 : a.toLowerCase()) != null &&
          s.includes('encountered') &&
          (this['~standard'].async = !0),
          (n.common = { issues: [], async: !0 }));
      }
    return this._parseAsync({ data: t, path: [], parent: n }).then((r) =>
      Zn(r) ? { value: r.value } : { issues: n.common.issues },
    );
  }
  async parseAsync(t, n) {
    const a = await this.safeParseAsync(t, n);
    if (a.success) return a.data;
    throw a.error;
  }
  async safeParseAsync(t, n) {
    const a = {
        common: { issues: [], contextualErrorMap: n == null ? void 0 : n.errorMap, async: !0 },
        path: (n == null ? void 0 : n.path) || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data: t,
        parsedType: gn(t),
      },
      s = this._parse({ data: t, path: a.path, parent: a }),
      r = await (Wa(s) ? s : Promise.resolve(s));
    return Ri(a, r);
  }
  refine(t, n) {
    const a = (s) =>
      typeof n == 'string' || typeof n > 'u' ? { message: n } : typeof n == 'function' ? n(s) : n;
    return this._refinement((s, r) => {
      const i = t(s),
        l = () => r.addIssue({ code: ee.custom, ...a(s) });
      return typeof Promise < 'u' && i instanceof Promise
        ? i.then((d) => (d ? !0 : (l(), !1)))
        : i
          ? !0
          : (l(), !1);
    });
  }
  refinement(t, n) {
    return this._refinement((a, s) =>
      t(a) ? !0 : (s.addIssue(typeof n == 'function' ? n(a, s) : n), !1),
    );
  }
  _refinement(t) {
    return new Kn({
      schema: this,
      typeName: xe.ZodEffects,
      effect: { type: 'refinement', refinement: t },
    });
  }
  superRefine(t) {
    return this._refinement(t);
  }
  constructor(t) {
    ((this.spa = this.safeParseAsync),
      (this._def = t),
      (this.parse = this.parse.bind(this)),
      (this.safeParse = this.safeParse.bind(this)),
      (this.parseAsync = this.parseAsync.bind(this)),
      (this.safeParseAsync = this.safeParseAsync.bind(this)),
      (this.spa = this.spa.bind(this)),
      (this.refine = this.refine.bind(this)),
      (this.refinement = this.refinement.bind(this)),
      (this.superRefine = this.superRefine.bind(this)),
      (this.optional = this.optional.bind(this)),
      (this.nullable = this.nullable.bind(this)),
      (this.nullish = this.nullish.bind(this)),
      (this.array = this.array.bind(this)),
      (this.promise = this.promise.bind(this)),
      (this.or = this.or.bind(this)),
      (this.and = this.and.bind(this)),
      (this.transform = this.transform.bind(this)),
      (this.brand = this.brand.bind(this)),
      (this.default = this.default.bind(this)),
      (this.catch = this.catch.bind(this)),
      (this.describe = this.describe.bind(this)),
      (this.pipe = this.pipe.bind(this)),
      (this.readonly = this.readonly.bind(this)),
      (this.isNullable = this.isNullable.bind(this)),
      (this.isOptional = this.isOptional.bind(this)),
      (this['~standard'] = { version: 1, vendor: 'zod', validate: (n) => this['~validate'](n) }));
  }
  optional() {
    return hn.create(this, this._def);
  }
  nullable() {
    return Qn.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return Ht.create(this);
  }
  promise() {
    return Xa.create(this, this._def);
  }
  or(t) {
    return Ga.create([this, t], this._def);
  }
  and(t) {
    return Za.create(this, t, this._def);
  }
  transform(t) {
    return new Kn({
      ...Re(this._def),
      schema: this,
      typeName: xe.ZodEffects,
      effect: { type: 'transform', transform: t },
    });
  }
  default(t) {
    const n = typeof t == 'function' ? t : () => t;
    return new Zs({ ...Re(this._def), innerType: this, defaultValue: n, typeName: xe.ZodDefault });
  }
  brand() {
    return new tm({ typeName: xe.ZodBranded, type: this, ...Re(this._def) });
  }
  catch(t) {
    const n = typeof t == 'function' ? t : () => t;
    return new Ys({ ...Re(this._def), innerType: this, catchValue: n, typeName: xe.ZodCatch });
  }
  describe(t) {
    const n = this.constructor;
    return new n({ ...this._def, description: t });
  }
  pipe(t) {
    return gr.create(this, t);
  }
  readonly() {
    return Xs.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const Lf = /^c[^\s-]{8,}$/i,
  Rf = /^[0-9a-z]+$/,
  Pf = /^[0-9A-HJKMNP-TV-Z]{26}$/i,
  Mf = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
  Df = /^[a-z0-9_-]{21}$/i,
  Ff = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  qf =
    /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
  Uf = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,
  jf = '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$';
let bs;
const zf =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  Vf =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  Bf =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  Wf =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  Hf = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  Gf = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  po =
    '((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))',
  Zf = new RegExp(`^${po}$`);
function go(e) {
  let t = '[0-5]\\d';
  e.precision ? (t = `${t}\\.\\d{${e.precision}}`) : e.precision == null && (t = `${t}(\\.\\d+)?`);
  const n = e.precision ? '+' : '?';
  return `([01]\\d|2[0-3]):[0-5]\\d(:${t})${n}`;
}
function Yf(e) {
  return new RegExp(`^${go(e)}$`);
}
function Xf(e) {
  let t = `${po}T${go(e)}`;
  const n = [];
  return (
    n.push(e.local ? 'Z?' : 'Z'),
    e.offset && n.push('([+-]\\d{2}:?\\d{2})'),
    (t = `${t}(${n.join('|')})`),
    new RegExp(`^${t}$`)
  );
}
function Kf(e, t) {
  return !!(((t === 'v4' || !t) && zf.test(e)) || ((t === 'v6' || !t) && Bf.test(e)));
}
function Qf(e, t) {
  if (!Ff.test(e)) return !1;
  try {
    const [n] = e.split('.');
    if (!n) return !1;
    const a = n
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(n.length + ((4 - (n.length % 4)) % 4), '='),
      s = JSON.parse(atob(a));
    return !(
      typeof s != 'object' ||
      s === null ||
      ('typ' in s && (s == null ? void 0 : s.typ) !== 'JWT') ||
      !s.alg ||
      (t && s.alg !== t)
    );
  } catch {
    return !1;
  }
}
function Jf(e, t) {
  return !!(((t === 'v4' || !t) && Vf.test(e)) || ((t === 'v6' || !t) && Wf.test(e)));
}
class rn extends qe {
  _parse(t) {
    if ((this._def.coerce && (t.data = String(t.data)), this._getType(t) !== _e.string)) {
      const r = this._getOrReturnCtx(t);
      return (pe(r, { code: ee.invalid_type, expected: _e.string, received: r.parsedType }), Ce);
    }
    const a = new St();
    let s;
    for (const r of this._def.checks)
      if (r.kind === 'min')
        t.data.length < r.value &&
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, {
            code: ee.too_small,
            minimum: r.value,
            type: 'string',
            inclusive: !0,
            exact: !1,
            message: r.message,
          }),
          a.dirty());
      else if (r.kind === 'max')
        t.data.length > r.value &&
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, {
            code: ee.too_big,
            maximum: r.value,
            type: 'string',
            inclusive: !0,
            exact: !1,
            message: r.message,
          }),
          a.dirty());
      else if (r.kind === 'length') {
        const i = t.data.length > r.value,
          l = t.data.length < r.value;
        (i || l) &&
          ((s = this._getOrReturnCtx(t, s)),
          i
            ? pe(s, {
                code: ee.too_big,
                maximum: r.value,
                type: 'string',
                inclusive: !0,
                exact: !0,
                message: r.message,
              })
            : l &&
              pe(s, {
                code: ee.too_small,
                minimum: r.value,
                type: 'string',
                inclusive: !0,
                exact: !0,
                message: r.message,
              }),
          a.dirty());
      } else if (r.kind === 'email')
        Uf.test(t.data) ||
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, { validation: 'email', code: ee.invalid_string, message: r.message }),
          a.dirty());
      else if (r.kind === 'emoji')
        (bs || (bs = new RegExp(jf, 'u')),
          bs.test(t.data) ||
            ((s = this._getOrReturnCtx(t, s)),
            pe(s, { validation: 'emoji', code: ee.invalid_string, message: r.message }),
            a.dirty()));
      else if (r.kind === 'uuid')
        Mf.test(t.data) ||
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, { validation: 'uuid', code: ee.invalid_string, message: r.message }),
          a.dirty());
      else if (r.kind === 'nanoid')
        Df.test(t.data) ||
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, { validation: 'nanoid', code: ee.invalid_string, message: r.message }),
          a.dirty());
      else if (r.kind === 'cuid')
        Lf.test(t.data) ||
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, { validation: 'cuid', code: ee.invalid_string, message: r.message }),
          a.dirty());
      else if (r.kind === 'cuid2')
        Rf.test(t.data) ||
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, { validation: 'cuid2', code: ee.invalid_string, message: r.message }),
          a.dirty());
      else if (r.kind === 'ulid')
        Pf.test(t.data) ||
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, { validation: 'ulid', code: ee.invalid_string, message: r.message }),
          a.dirty());
      else if (r.kind === 'url')
        try {
          new URL(t.data);
        } catch {
          ((s = this._getOrReturnCtx(t, s)),
            pe(s, { validation: 'url', code: ee.invalid_string, message: r.message }),
            a.dirty());
        }
      else
        r.kind === 'regex'
          ? ((r.regex.lastIndex = 0),
            r.regex.test(t.data) ||
              ((s = this._getOrReturnCtx(t, s)),
              pe(s, { validation: 'regex', code: ee.invalid_string, message: r.message }),
              a.dirty()))
          : r.kind === 'trim'
            ? (t.data = t.data.trim())
            : r.kind === 'includes'
              ? t.data.includes(r.value, r.position) ||
                ((s = this._getOrReturnCtx(t, s)),
                pe(s, {
                  code: ee.invalid_string,
                  validation: { includes: r.value, position: r.position },
                  message: r.message,
                }),
                a.dirty())
              : r.kind === 'toLowerCase'
                ? (t.data = t.data.toLowerCase())
                : r.kind === 'toUpperCase'
                  ? (t.data = t.data.toUpperCase())
                  : r.kind === 'startsWith'
                    ? t.data.startsWith(r.value) ||
                      ((s = this._getOrReturnCtx(t, s)),
                      pe(s, {
                        code: ee.invalid_string,
                        validation: { startsWith: r.value },
                        message: r.message,
                      }),
                      a.dirty())
                    : r.kind === 'endsWith'
                      ? t.data.endsWith(r.value) ||
                        ((s = this._getOrReturnCtx(t, s)),
                        pe(s, {
                          code: ee.invalid_string,
                          validation: { endsWith: r.value },
                          message: r.message,
                        }),
                        a.dirty())
                      : r.kind === 'datetime'
                        ? Xf(r).test(t.data) ||
                          ((s = this._getOrReturnCtx(t, s)),
                          pe(s, {
                            code: ee.invalid_string,
                            validation: 'datetime',
                            message: r.message,
                          }),
                          a.dirty())
                        : r.kind === 'date'
                          ? Zf.test(t.data) ||
                            ((s = this._getOrReturnCtx(t, s)),
                            pe(s, {
                              code: ee.invalid_string,
                              validation: 'date',
                              message: r.message,
                            }),
                            a.dirty())
                          : r.kind === 'time'
                            ? Yf(r).test(t.data) ||
                              ((s = this._getOrReturnCtx(t, s)),
                              pe(s, {
                                code: ee.invalid_string,
                                validation: 'time',
                                message: r.message,
                              }),
                              a.dirty())
                            : r.kind === 'duration'
                              ? qf.test(t.data) ||
                                ((s = this._getOrReturnCtx(t, s)),
                                pe(s, {
                                  validation: 'duration',
                                  code: ee.invalid_string,
                                  message: r.message,
                                }),
                                a.dirty())
                              : r.kind === 'ip'
                                ? Kf(t.data, r.version) ||
                                  ((s = this._getOrReturnCtx(t, s)),
                                  pe(s, {
                                    validation: 'ip',
                                    code: ee.invalid_string,
                                    message: r.message,
                                  }),
                                  a.dirty())
                                : r.kind === 'jwt'
                                  ? Qf(t.data, r.alg) ||
                                    ((s = this._getOrReturnCtx(t, s)),
                                    pe(s, {
                                      validation: 'jwt',
                                      code: ee.invalid_string,
                                      message: r.message,
                                    }),
                                    a.dirty())
                                  : r.kind === 'cidr'
                                    ? Jf(t.data, r.version) ||
                                      ((s = this._getOrReturnCtx(t, s)),
                                      pe(s, {
                                        validation: 'cidr',
                                        code: ee.invalid_string,
                                        message: r.message,
                                      }),
                                      a.dirty())
                                    : r.kind === 'base64'
                                      ? Hf.test(t.data) ||
                                        ((s = this._getOrReturnCtx(t, s)),
                                        pe(s, {
                                          validation: 'base64',
                                          code: ee.invalid_string,
                                          message: r.message,
                                        }),
                                        a.dirty())
                                      : r.kind === 'base64url'
                                        ? Gf.test(t.data) ||
                                          ((s = this._getOrReturnCtx(t, s)),
                                          pe(s, {
                                            validation: 'base64url',
                                            code: ee.invalid_string,
                                            message: r.message,
                                          }),
                                          a.dirty())
                                        : ze.assertNever(r);
    return { status: a.value, value: t.data };
  }
  _regex(t, n, a) {
    return this.refinement((s) => t.test(s), {
      validation: n,
      code: ee.invalid_string,
      ...ye.errToObj(a),
    });
  }
  _addCheck(t) {
    return new rn({ ...this._def, checks: [...this._def.checks, t] });
  }
  email(t) {
    return this._addCheck({ kind: 'email', ...ye.errToObj(t) });
  }
  url(t) {
    return this._addCheck({ kind: 'url', ...ye.errToObj(t) });
  }
  emoji(t) {
    return this._addCheck({ kind: 'emoji', ...ye.errToObj(t) });
  }
  uuid(t) {
    return this._addCheck({ kind: 'uuid', ...ye.errToObj(t) });
  }
  nanoid(t) {
    return this._addCheck({ kind: 'nanoid', ...ye.errToObj(t) });
  }
  cuid(t) {
    return this._addCheck({ kind: 'cuid', ...ye.errToObj(t) });
  }
  cuid2(t) {
    return this._addCheck({ kind: 'cuid2', ...ye.errToObj(t) });
  }
  ulid(t) {
    return this._addCheck({ kind: 'ulid', ...ye.errToObj(t) });
  }
  base64(t) {
    return this._addCheck({ kind: 'base64', ...ye.errToObj(t) });
  }
  base64url(t) {
    return this._addCheck({ kind: 'base64url', ...ye.errToObj(t) });
  }
  jwt(t) {
    return this._addCheck({ kind: 'jwt', ...ye.errToObj(t) });
  }
  ip(t) {
    return this._addCheck({ kind: 'ip', ...ye.errToObj(t) });
  }
  cidr(t) {
    return this._addCheck({ kind: 'cidr', ...ye.errToObj(t) });
  }
  datetime(t) {
    return typeof t == 'string'
      ? this._addCheck({ kind: 'datetime', precision: null, offset: !1, local: !1, message: t })
      : this._addCheck({
          kind: 'datetime',
          precision:
            typeof (t == null ? void 0 : t.precision) > 'u'
              ? null
              : t == null
                ? void 0
                : t.precision,
          offset: (t == null ? void 0 : t.offset) ?? !1,
          local: (t == null ? void 0 : t.local) ?? !1,
          ...ye.errToObj(t == null ? void 0 : t.message),
        });
  }
  date(t) {
    return this._addCheck({ kind: 'date', message: t });
  }
  time(t) {
    return typeof t == 'string'
      ? this._addCheck({ kind: 'time', precision: null, message: t })
      : this._addCheck({
          kind: 'time',
          precision:
            typeof (t == null ? void 0 : t.precision) > 'u'
              ? null
              : t == null
                ? void 0
                : t.precision,
          ...ye.errToObj(t == null ? void 0 : t.message),
        });
  }
  duration(t) {
    return this._addCheck({ kind: 'duration', ...ye.errToObj(t) });
  }
  regex(t, n) {
    return this._addCheck({ kind: 'regex', regex: t, ...ye.errToObj(n) });
  }
  includes(t, n) {
    return this._addCheck({
      kind: 'includes',
      value: t,
      position: n == null ? void 0 : n.position,
      ...ye.errToObj(n == null ? void 0 : n.message),
    });
  }
  startsWith(t, n) {
    return this._addCheck({ kind: 'startsWith', value: t, ...ye.errToObj(n) });
  }
  endsWith(t, n) {
    return this._addCheck({ kind: 'endsWith', value: t, ...ye.errToObj(n) });
  }
  min(t, n) {
    return this._addCheck({ kind: 'min', value: t, ...ye.errToObj(n) });
  }
  max(t, n) {
    return this._addCheck({ kind: 'max', value: t, ...ye.errToObj(n) });
  }
  length(t, n) {
    return this._addCheck({ kind: 'length', value: t, ...ye.errToObj(n) });
  }
  nonempty(t) {
    return this.min(1, ye.errToObj(t));
  }
  trim() {
    return new rn({ ...this._def, checks: [...this._def.checks, { kind: 'trim' }] });
  }
  toLowerCase() {
    return new rn({ ...this._def, checks: [...this._def.checks, { kind: 'toLowerCase' }] });
  }
  toUpperCase() {
    return new rn({ ...this._def, checks: [...this._def.checks, { kind: 'toUpperCase' }] });
  }
  get isDatetime() {
    return !!this._def.checks.find((t) => t.kind === 'datetime');
  }
  get isDate() {
    return !!this._def.checks.find((t) => t.kind === 'date');
  }
  get isTime() {
    return !!this._def.checks.find((t) => t.kind === 'time');
  }
  get isDuration() {
    return !!this._def.checks.find((t) => t.kind === 'duration');
  }
  get isEmail() {
    return !!this._def.checks.find((t) => t.kind === 'email');
  }
  get isURL() {
    return !!this._def.checks.find((t) => t.kind === 'url');
  }
  get isEmoji() {
    return !!this._def.checks.find((t) => t.kind === 'emoji');
  }
  get isUUID() {
    return !!this._def.checks.find((t) => t.kind === 'uuid');
  }
  get isNANOID() {
    return !!this._def.checks.find((t) => t.kind === 'nanoid');
  }
  get isCUID() {
    return !!this._def.checks.find((t) => t.kind === 'cuid');
  }
  get isCUID2() {
    return !!this._def.checks.find((t) => t.kind === 'cuid2');
  }
  get isULID() {
    return !!this._def.checks.find((t) => t.kind === 'ulid');
  }
  get isIP() {
    return !!this._def.checks.find((t) => t.kind === 'ip');
  }
  get isCIDR() {
    return !!this._def.checks.find((t) => t.kind === 'cidr');
  }
  get isBase64() {
    return !!this._def.checks.find((t) => t.kind === 'base64');
  }
  get isBase64url() {
    return !!this._def.checks.find((t) => t.kind === 'base64url');
  }
  get minLength() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === 'min' && (t === null || n.value > t) && (t = n.value);
    return t;
  }
  get maxLength() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === 'max' && (t === null || n.value < t) && (t = n.value);
    return t;
  }
}
rn.create = (e) =>
  new rn({
    checks: [],
    typeName: xe.ZodString,
    coerce: (e == null ? void 0 : e.coerce) ?? !1,
    ...Re(e),
  });
function em(e, t) {
  const n = (e.toString().split('.')[1] || '').length,
    a = (t.toString().split('.')[1] || '').length,
    s = n > a ? n : a,
    r = Number.parseInt(e.toFixed(s).replace('.', '')),
    i = Number.parseInt(t.toFixed(s).replace('.', ''));
  return (r % i) / 10 ** s;
}
class Yn extends qe {
  constructor() {
    (super(...arguments),
      (this.min = this.gte),
      (this.max = this.lte),
      (this.step = this.multipleOf));
  }
  _parse(t) {
    if ((this._def.coerce && (t.data = Number(t.data)), this._getType(t) !== _e.number)) {
      const r = this._getOrReturnCtx(t);
      return (pe(r, { code: ee.invalid_type, expected: _e.number, received: r.parsedType }), Ce);
    }
    let a;
    const s = new St();
    for (const r of this._def.checks)
      r.kind === 'int'
        ? ze.isInteger(t.data) ||
          ((a = this._getOrReturnCtx(t, a)),
          pe(a, {
            code: ee.invalid_type,
            expected: 'integer',
            received: 'float',
            message: r.message,
          }),
          s.dirty())
        : r.kind === 'min'
          ? (r.inclusive ? t.data < r.value : t.data <= r.value) &&
            ((a = this._getOrReturnCtx(t, a)),
            pe(a, {
              code: ee.too_small,
              minimum: r.value,
              type: 'number',
              inclusive: r.inclusive,
              exact: !1,
              message: r.message,
            }),
            s.dirty())
          : r.kind === 'max'
            ? (r.inclusive ? t.data > r.value : t.data >= r.value) &&
              ((a = this._getOrReturnCtx(t, a)),
              pe(a, {
                code: ee.too_big,
                maximum: r.value,
                type: 'number',
                inclusive: r.inclusive,
                exact: !1,
                message: r.message,
              }),
              s.dirty())
            : r.kind === 'multipleOf'
              ? em(t.data, r.value) !== 0 &&
                ((a = this._getOrReturnCtx(t, a)),
                pe(a, { code: ee.not_multiple_of, multipleOf: r.value, message: r.message }),
                s.dirty())
              : r.kind === 'finite'
                ? Number.isFinite(t.data) ||
                  ((a = this._getOrReturnCtx(t, a)),
                  pe(a, { code: ee.not_finite, message: r.message }),
                  s.dirty())
                : ze.assertNever(r);
    return { status: s.value, value: t.data };
  }
  gte(t, n) {
    return this.setLimit('min', t, !0, ye.toString(n));
  }
  gt(t, n) {
    return this.setLimit('min', t, !1, ye.toString(n));
  }
  lte(t, n) {
    return this.setLimit('max', t, !0, ye.toString(n));
  }
  lt(t, n) {
    return this.setLimit('max', t, !1, ye.toString(n));
  }
  setLimit(t, n, a, s) {
    return new Yn({
      ...this._def,
      checks: [...this._def.checks, { kind: t, value: n, inclusive: a, message: ye.toString(s) }],
    });
  }
  _addCheck(t) {
    return new Yn({ ...this._def, checks: [...this._def.checks, t] });
  }
  int(t) {
    return this._addCheck({ kind: 'int', message: ye.toString(t) });
  }
  positive(t) {
    return this._addCheck({ kind: 'min', value: 0, inclusive: !1, message: ye.toString(t) });
  }
  negative(t) {
    return this._addCheck({ kind: 'max', value: 0, inclusive: !1, message: ye.toString(t) });
  }
  nonpositive(t) {
    return this._addCheck({ kind: 'max', value: 0, inclusive: !0, message: ye.toString(t) });
  }
  nonnegative(t) {
    return this._addCheck({ kind: 'min', value: 0, inclusive: !0, message: ye.toString(t) });
  }
  multipleOf(t, n) {
    return this._addCheck({ kind: 'multipleOf', value: t, message: ye.toString(n) });
  }
  finite(t) {
    return this._addCheck({ kind: 'finite', message: ye.toString(t) });
  }
  safe(t) {
    return this._addCheck({
      kind: 'min',
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: ye.toString(t),
    })._addCheck({
      kind: 'max',
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: ye.toString(t),
    });
  }
  get minValue() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === 'min' && (t === null || n.value > t) && (t = n.value);
    return t;
  }
  get maxValue() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === 'max' && (t === null || n.value < t) && (t = n.value);
    return t;
  }
  get isInt() {
    return !!this._def.checks.find(
      (t) => t.kind === 'int' || (t.kind === 'multipleOf' && ze.isInteger(t.value)),
    );
  }
  get isFinite() {
    let t = null,
      n = null;
    for (const a of this._def.checks) {
      if (a.kind === 'finite' || a.kind === 'int' || a.kind === 'multipleOf') return !0;
      a.kind === 'min'
        ? (n === null || a.value > n) && (n = a.value)
        : a.kind === 'max' && (t === null || a.value < t) && (t = a.value);
    }
    return Number.isFinite(n) && Number.isFinite(t);
  }
}
Yn.create = (e) =>
  new Yn({
    checks: [],
    typeName: xe.ZodNumber,
    coerce: (e == null ? void 0 : e.coerce) || !1,
    ...Re(e),
  });
class wa extends qe {
  constructor() {
    (super(...arguments), (this.min = this.gte), (this.max = this.lte));
  }
  _parse(t) {
    if (this._def.coerce)
      try {
        t.data = BigInt(t.data);
      } catch {
        return this._getInvalidInput(t);
      }
    if (this._getType(t) !== _e.bigint) return this._getInvalidInput(t);
    let a;
    const s = new St();
    for (const r of this._def.checks)
      r.kind === 'min'
        ? (r.inclusive ? t.data < r.value : t.data <= r.value) &&
          ((a = this._getOrReturnCtx(t, a)),
          pe(a, {
            code: ee.too_small,
            type: 'bigint',
            minimum: r.value,
            inclusive: r.inclusive,
            message: r.message,
          }),
          s.dirty())
        : r.kind === 'max'
          ? (r.inclusive ? t.data > r.value : t.data >= r.value) &&
            ((a = this._getOrReturnCtx(t, a)),
            pe(a, {
              code: ee.too_big,
              type: 'bigint',
              maximum: r.value,
              inclusive: r.inclusive,
              message: r.message,
            }),
            s.dirty())
          : r.kind === 'multipleOf'
            ? t.data % r.value !== BigInt(0) &&
              ((a = this._getOrReturnCtx(t, a)),
              pe(a, { code: ee.not_multiple_of, multipleOf: r.value, message: r.message }),
              s.dirty())
            : ze.assertNever(r);
    return { status: s.value, value: t.data };
  }
  _getInvalidInput(t) {
    const n = this._getOrReturnCtx(t);
    return (pe(n, { code: ee.invalid_type, expected: _e.bigint, received: n.parsedType }), Ce);
  }
  gte(t, n) {
    return this.setLimit('min', t, !0, ye.toString(n));
  }
  gt(t, n) {
    return this.setLimit('min', t, !1, ye.toString(n));
  }
  lte(t, n) {
    return this.setLimit('max', t, !0, ye.toString(n));
  }
  lt(t, n) {
    return this.setLimit('max', t, !1, ye.toString(n));
  }
  setLimit(t, n, a, s) {
    return new wa({
      ...this._def,
      checks: [...this._def.checks, { kind: t, value: n, inclusive: a, message: ye.toString(s) }],
    });
  }
  _addCheck(t) {
    return new wa({ ...this._def, checks: [...this._def.checks, t] });
  }
  positive(t) {
    return this._addCheck({
      kind: 'min',
      value: BigInt(0),
      inclusive: !1,
      message: ye.toString(t),
    });
  }
  negative(t) {
    return this._addCheck({
      kind: 'max',
      value: BigInt(0),
      inclusive: !1,
      message: ye.toString(t),
    });
  }
  nonpositive(t) {
    return this._addCheck({
      kind: 'max',
      value: BigInt(0),
      inclusive: !0,
      message: ye.toString(t),
    });
  }
  nonnegative(t) {
    return this._addCheck({
      kind: 'min',
      value: BigInt(0),
      inclusive: !0,
      message: ye.toString(t),
    });
  }
  multipleOf(t, n) {
    return this._addCheck({ kind: 'multipleOf', value: t, message: ye.toString(n) });
  }
  get minValue() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === 'min' && (t === null || n.value > t) && (t = n.value);
    return t;
  }
  get maxValue() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === 'max' && (t === null || n.value < t) && (t = n.value);
    return t;
  }
}
wa.create = (e) =>
  new wa({
    checks: [],
    typeName: xe.ZodBigInt,
    coerce: (e == null ? void 0 : e.coerce) ?? !1,
    ...Re(e),
  });
class Ws extends qe {
  _parse(t) {
    if ((this._def.coerce && (t.data = !!t.data), this._getType(t) !== _e.boolean)) {
      const a = this._getOrReturnCtx(t);
      return (pe(a, { code: ee.invalid_type, expected: _e.boolean, received: a.parsedType }), Ce);
    }
    return Rt(t.data);
  }
}
Ws.create = (e) =>
  new Ws({ typeName: xe.ZodBoolean, coerce: (e == null ? void 0 : e.coerce) || !1, ...Re(e) });
class Ha extends qe {
  _parse(t) {
    if ((this._def.coerce && (t.data = new Date(t.data)), this._getType(t) !== _e.date)) {
      const r = this._getOrReturnCtx(t);
      return (pe(r, { code: ee.invalid_type, expected: _e.date, received: r.parsedType }), Ce);
    }
    if (Number.isNaN(t.data.getTime())) {
      const r = this._getOrReturnCtx(t);
      return (pe(r, { code: ee.invalid_date }), Ce);
    }
    const a = new St();
    let s;
    for (const r of this._def.checks)
      r.kind === 'min'
        ? t.data.getTime() < r.value &&
          ((s = this._getOrReturnCtx(t, s)),
          pe(s, {
            code: ee.too_small,
            message: r.message,
            inclusive: !0,
            exact: !1,
            minimum: r.value,
            type: 'date',
          }),
          a.dirty())
        : r.kind === 'max'
          ? t.data.getTime() > r.value &&
            ((s = this._getOrReturnCtx(t, s)),
            pe(s, {
              code: ee.too_big,
              message: r.message,
              inclusive: !0,
              exact: !1,
              maximum: r.value,
              type: 'date',
            }),
            a.dirty())
          : ze.assertNever(r);
    return { status: a.value, value: new Date(t.data.getTime()) };
  }
  _addCheck(t) {
    return new Ha({ ...this._def, checks: [...this._def.checks, t] });
  }
  min(t, n) {
    return this._addCheck({ kind: 'min', value: t.getTime(), message: ye.toString(n) });
  }
  max(t, n) {
    return this._addCheck({ kind: 'max', value: t.getTime(), message: ye.toString(n) });
  }
  get minDate() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === 'min' && (t === null || n.value > t) && (t = n.value);
    return t != null ? new Date(t) : null;
  }
  get maxDate() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === 'max' && (t === null || n.value < t) && (t = n.value);
    return t != null ? new Date(t) : null;
  }
}
Ha.create = (e) =>
  new Ha({
    checks: [],
    coerce: (e == null ? void 0 : e.coerce) || !1,
    typeName: xe.ZodDate,
    ...Re(e),
  });
class Pi extends qe {
  _parse(t) {
    if (this._getType(t) !== _e.symbol) {
      const a = this._getOrReturnCtx(t);
      return (pe(a, { code: ee.invalid_type, expected: _e.symbol, received: a.parsedType }), Ce);
    }
    return Rt(t.data);
  }
}
Pi.create = (e) => new Pi({ typeName: xe.ZodSymbol, ...Re(e) });
class Mi extends qe {
  _parse(t) {
    if (this._getType(t) !== _e.undefined) {
      const a = this._getOrReturnCtx(t);
      return (pe(a, { code: ee.invalid_type, expected: _e.undefined, received: a.parsedType }), Ce);
    }
    return Rt(t.data);
  }
}
Mi.create = (e) => new Mi({ typeName: xe.ZodUndefined, ...Re(e) });
class Di extends qe {
  _parse(t) {
    if (this._getType(t) !== _e.null) {
      const a = this._getOrReturnCtx(t);
      return (pe(a, { code: ee.invalid_type, expected: _e.null, received: a.parsedType }), Ce);
    }
    return Rt(t.data);
  }
}
Di.create = (e) => new Di({ typeName: xe.ZodNull, ...Re(e) });
class Fi extends qe {
  constructor() {
    (super(...arguments), (this._any = !0));
  }
  _parse(t) {
    return Rt(t.data);
  }
}
Fi.create = (e) => new Fi({ typeName: xe.ZodAny, ...Re(e) });
class Hs extends qe {
  constructor() {
    (super(...arguments), (this._unknown = !0));
  }
  _parse(t) {
    return Rt(t.data);
  }
}
Hs.create = (e) => new Hs({ typeName: xe.ZodUnknown, ...Re(e) });
class bn extends qe {
  _parse(t) {
    const n = this._getOrReturnCtx(t);
    return (pe(n, { code: ee.invalid_type, expected: _e.never, received: n.parsedType }), Ce);
  }
}
bn.create = (e) => new bn({ typeName: xe.ZodNever, ...Re(e) });
class qi extends qe {
  _parse(t) {
    if (this._getType(t) !== _e.undefined) {
      const a = this._getOrReturnCtx(t);
      return (pe(a, { code: ee.invalid_type, expected: _e.void, received: a.parsedType }), Ce);
    }
    return Rt(t.data);
  }
}
qi.create = (e) => new qi({ typeName: xe.ZodVoid, ...Re(e) });
class Ht extends qe {
  _parse(t) {
    const { ctx: n, status: a } = this._processInputParams(t),
      s = this._def;
    if (n.parsedType !== _e.array)
      return (pe(n, { code: ee.invalid_type, expected: _e.array, received: n.parsedType }), Ce);
    if (s.exactLength !== null) {
      const i = n.data.length > s.exactLength.value,
        l = n.data.length < s.exactLength.value;
      (i || l) &&
        (pe(n, {
          code: i ? ee.too_big : ee.too_small,
          minimum: l ? s.exactLength.value : void 0,
          maximum: i ? s.exactLength.value : void 0,
          type: 'array',
          inclusive: !0,
          exact: !0,
          message: s.exactLength.message,
        }),
        a.dirty());
    }
    if (
      (s.minLength !== null &&
        n.data.length < s.minLength.value &&
        (pe(n, {
          code: ee.too_small,
          minimum: s.minLength.value,
          type: 'array',
          inclusive: !0,
          exact: !1,
          message: s.minLength.message,
        }),
        a.dirty()),
      s.maxLength !== null &&
        n.data.length > s.maxLength.value &&
        (pe(n, {
          code: ee.too_big,
          maximum: s.maxLength.value,
          type: 'array',
          inclusive: !0,
          exact: !1,
          message: s.maxLength.message,
        }),
        a.dirty()),
      n.common.async)
    )
      return Promise.all(
        [...n.data].map((i, l) => s.type._parseAsync(new Zt(n, i, n.path, l))),
      ).then((i) => St.mergeArray(a, i));
    const r = [...n.data].map((i, l) => s.type._parseSync(new Zt(n, i, n.path, l)));
    return St.mergeArray(a, r);
  }
  get element() {
    return this._def.type;
  }
  min(t, n) {
    return new Ht({ ...this._def, minLength: { value: t, message: ye.toString(n) } });
  }
  max(t, n) {
    return new Ht({ ...this._def, maxLength: { value: t, message: ye.toString(n) } });
  }
  length(t, n) {
    return new Ht({ ...this._def, exactLength: { value: t, message: ye.toString(n) } });
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
Ht.create = (e, t) =>
  new Ht({
    type: e,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: xe.ZodArray,
    ...Re(t),
  });
function Un(e) {
  if (e instanceof ot) {
    const t = {};
    for (const n in e.shape) {
      const a = e.shape[n];
      t[n] = hn.create(Un(a));
    }
    return new ot({ ...e._def, shape: () => t });
  } else
    return e instanceof Ht
      ? new Ht({ ...e._def, type: Un(e.element) })
      : e instanceof hn
        ? hn.create(Un(e.unwrap()))
        : e instanceof Qn
          ? Qn.create(Un(e.unwrap()))
          : e instanceof xn
            ? xn.create(e.items.map((t) => Un(t)))
            : e;
}
class ot extends qe {
  constructor() {
    (super(...arguments),
      (this._cached = null),
      (this.nonstrict = this.passthrough),
      (this.augment = this.extend));
  }
  _getCached() {
    if (this._cached !== null) return this._cached;
    const t = this._def.shape(),
      n = ze.objectKeys(t);
    return ((this._cached = { shape: t, keys: n }), this._cached);
  }
  _parse(t) {
    if (this._getType(t) !== _e.object) {
      const c = this._getOrReturnCtx(t);
      return (pe(c, { code: ee.invalid_type, expected: _e.object, received: c.parsedType }), Ce);
    }
    const { status: a, ctx: s } = this._processInputParams(t),
      { shape: r, keys: i } = this._getCached(),
      l = [];
    if (!(this._def.catchall instanceof bn && this._def.unknownKeys === 'strip'))
      for (const c in s.data) i.includes(c) || l.push(c);
    const d = [];
    for (const c of i) {
      const f = r[c],
        p = s.data[c];
      d.push({
        key: { status: 'valid', value: c },
        value: f._parse(new Zt(s, p, s.path, c)),
        alwaysSet: c in s.data,
      });
    }
    if (this._def.catchall instanceof bn) {
      const c = this._def.unknownKeys;
      if (c === 'passthrough')
        for (const f of l)
          d.push({
            key: { status: 'valid', value: f },
            value: { status: 'valid', value: s.data[f] },
          });
      else if (c === 'strict')
        l.length > 0 && (pe(s, { code: ee.unrecognized_keys, keys: l }), a.dirty());
      else if (c !== 'strip')
        throw new Error('Internal ZodObject error: invalid unknownKeys value.');
    } else {
      const c = this._def.catchall;
      for (const f of l) {
        const p = s.data[f];
        d.push({
          key: { status: 'valid', value: f },
          value: c._parse(new Zt(s, p, s.path, f)),
          alwaysSet: f in s.data,
        });
      }
    }
    return s.common.async
      ? Promise.resolve()
          .then(async () => {
            const c = [];
            for (const f of d) {
              const p = await f.key,
                g = await f.value;
              c.push({ key: p, value: g, alwaysSet: f.alwaysSet });
            }
            return c;
          })
          .then((c) => St.mergeObjectSync(a, c))
      : St.mergeObjectSync(a, d);
  }
  get shape() {
    return this._def.shape();
  }
  strict(t) {
    return (
      ye.errToObj,
      new ot({
        ...this._def,
        unknownKeys: 'strict',
        ...(t !== void 0
          ? {
              errorMap: (n, a) => {
                var r, i;
                const s =
                  ((i = (r = this._def).errorMap) == null ? void 0 : i.call(r, n, a).message) ??
                  a.defaultError;
                return n.code === 'unrecognized_keys'
                  ? { message: ye.errToObj(t).message ?? s }
                  : { message: s };
              },
            }
          : {}),
      })
    );
  }
  strip() {
    return new ot({ ...this._def, unknownKeys: 'strip' });
  }
  passthrough() {
    return new ot({ ...this._def, unknownKeys: 'passthrough' });
  }
  extend(t) {
    return new ot({ ...this._def, shape: () => ({ ...this._def.shape(), ...t }) });
  }
  merge(t) {
    return new ot({
      unknownKeys: t._def.unknownKeys,
      catchall: t._def.catchall,
      shape: () => ({ ...this._def.shape(), ...t._def.shape() }),
      typeName: xe.ZodObject,
    });
  }
  setKey(t, n) {
    return this.augment({ [t]: n });
  }
  catchall(t) {
    return new ot({ ...this._def, catchall: t });
  }
  pick(t) {
    const n = {};
    for (const a of ze.objectKeys(t)) t[a] && this.shape[a] && (n[a] = this.shape[a]);
    return new ot({ ...this._def, shape: () => n });
  }
  omit(t) {
    const n = {};
    for (const a of ze.objectKeys(this.shape)) t[a] || (n[a] = this.shape[a]);
    return new ot({ ...this._def, shape: () => n });
  }
  deepPartial() {
    return Un(this);
  }
  partial(t) {
    const n = {};
    for (const a of ze.objectKeys(this.shape)) {
      const s = this.shape[a];
      t && !t[a] ? (n[a] = s) : (n[a] = s.optional());
    }
    return new ot({ ...this._def, shape: () => n });
  }
  required(t) {
    const n = {};
    for (const a of ze.objectKeys(this.shape))
      if (t && !t[a]) n[a] = this.shape[a];
      else {
        let r = this.shape[a];
        for (; r instanceof hn; ) r = r._def.innerType;
        n[a] = r;
      }
    return new ot({ ...this._def, shape: () => n });
  }
  keyof() {
    return ho(ze.objectKeys(this.shape));
  }
}
ot.create = (e, t) =>
  new ot({
    shape: () => e,
    unknownKeys: 'strip',
    catchall: bn.create(),
    typeName: xe.ZodObject,
    ...Re(t),
  });
ot.strictCreate = (e, t) =>
  new ot({
    shape: () => e,
    unknownKeys: 'strict',
    catchall: bn.create(),
    typeName: xe.ZodObject,
    ...Re(t),
  });
ot.lazycreate = (e, t) =>
  new ot({
    shape: e,
    unknownKeys: 'strip',
    catchall: bn.create(),
    typeName: xe.ZodObject,
    ...Re(t),
  });
class Ga extends qe {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t),
      a = this._def.options;
    function s(r) {
      for (const l of r) if (l.result.status === 'valid') return l.result;
      for (const l of r)
        if (l.result.status === 'dirty')
          return (n.common.issues.push(...l.ctx.common.issues), l.result);
      const i = r.map((l) => new gt(l.ctx.common.issues));
      return (pe(n, { code: ee.invalid_union, unionErrors: i }), Ce);
    }
    if (n.common.async)
      return Promise.all(
        a.map(async (r) => {
          const i = { ...n, common: { ...n.common, issues: [] }, parent: null };
          return { result: await r._parseAsync({ data: n.data, path: n.path, parent: i }), ctx: i };
        }),
      ).then(s);
    {
      let r;
      const i = [];
      for (const d of a) {
        const c = { ...n, common: { ...n.common, issues: [] }, parent: null },
          f = d._parseSync({ data: n.data, path: n.path, parent: c });
        if (f.status === 'valid') return f;
        (f.status === 'dirty' && !r && (r = { result: f, ctx: c }),
          c.common.issues.length && i.push(c.common.issues));
      }
      if (r) return (n.common.issues.push(...r.ctx.common.issues), r.result);
      const l = i.map((d) => new gt(d));
      return (pe(n, { code: ee.invalid_union, unionErrors: l }), Ce);
    }
  }
  get options() {
    return this._def.options;
  }
}
Ga.create = (e, t) => new Ga({ options: e, typeName: xe.ZodUnion, ...Re(t) });
function Gs(e, t) {
  const n = gn(e),
    a = gn(t);
  if (e === t) return { valid: !0, data: e };
  if (n === _e.object && a === _e.object) {
    const s = ze.objectKeys(t),
      r = ze.objectKeys(e).filter((l) => s.indexOf(l) !== -1),
      i = { ...e, ...t };
    for (const l of r) {
      const d = Gs(e[l], t[l]);
      if (!d.valid) return { valid: !1 };
      i[l] = d.data;
    }
    return { valid: !0, data: i };
  } else if (n === _e.array && a === _e.array) {
    if (e.length !== t.length) return { valid: !1 };
    const s = [];
    for (let r = 0; r < e.length; r++) {
      const i = e[r],
        l = t[r],
        d = Gs(i, l);
      if (!d.valid) return { valid: !1 };
      s.push(d.data);
    }
    return { valid: !0, data: s };
  } else return n === _e.date && a === _e.date && +e == +t ? { valid: !0, data: e } : { valid: !1 };
}
class Za extends qe {
  _parse(t) {
    const { status: n, ctx: a } = this._processInputParams(t),
      s = (r, i) => {
        if (Oi(r) || Oi(i)) return Ce;
        const l = Gs(r.value, i.value);
        return l.valid
          ? ((Li(r) || Li(i)) && n.dirty(), { status: n.value, value: l.data })
          : (pe(a, { code: ee.invalid_intersection_types }), Ce);
      };
    return a.common.async
      ? Promise.all([
          this._def.left._parseAsync({ data: a.data, path: a.path, parent: a }),
          this._def.right._parseAsync({ data: a.data, path: a.path, parent: a }),
        ]).then(([r, i]) => s(r, i))
      : s(
          this._def.left._parseSync({ data: a.data, path: a.path, parent: a }),
          this._def.right._parseSync({ data: a.data, path: a.path, parent: a }),
        );
  }
}
Za.create = (e, t, n) => new Za({ left: e, right: t, typeName: xe.ZodIntersection, ...Re(n) });
class xn extends qe {
  _parse(t) {
    const { status: n, ctx: a } = this._processInputParams(t);
    if (a.parsedType !== _e.array)
      return (pe(a, { code: ee.invalid_type, expected: _e.array, received: a.parsedType }), Ce);
    if (a.data.length < this._def.items.length)
      return (
        pe(a, {
          code: ee.too_small,
          minimum: this._def.items.length,
          inclusive: !0,
          exact: !1,
          type: 'array',
        }),
        Ce
      );
    !this._def.rest &&
      a.data.length > this._def.items.length &&
      (pe(a, {
        code: ee.too_big,
        maximum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: 'array',
      }),
      n.dirty());
    const r = [...a.data]
      .map((i, l) => {
        const d = this._def.items[l] || this._def.rest;
        return d ? d._parse(new Zt(a, i, a.path, l)) : null;
      })
      .filter((i) => !!i);
    return a.common.async ? Promise.all(r).then((i) => St.mergeArray(n, i)) : St.mergeArray(n, r);
  }
  get items() {
    return this._def.items;
  }
  rest(t) {
    return new xn({ ...this._def, rest: t });
  }
}
xn.create = (e, t) => {
  if (!Array.isArray(e)) throw new Error('You must pass an array of schemas to z.tuple([ ... ])');
  return new xn({ items: e, typeName: xe.ZodTuple, rest: null, ...Re(t) });
};
class Ya extends qe {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: n, ctx: a } = this._processInputParams(t);
    if (a.parsedType !== _e.object)
      return (pe(a, { code: ee.invalid_type, expected: _e.object, received: a.parsedType }), Ce);
    const s = [],
      r = this._def.keyType,
      i = this._def.valueType;
    for (const l in a.data)
      s.push({
        key: r._parse(new Zt(a, l, a.path, l)),
        value: i._parse(new Zt(a, a.data[l], a.path, l)),
        alwaysSet: l in a.data,
      });
    return a.common.async ? St.mergeObjectAsync(n, s) : St.mergeObjectSync(n, s);
  }
  get element() {
    return this._def.valueType;
  }
  static create(t, n, a) {
    return n instanceof qe
      ? new Ya({ keyType: t, valueType: n, typeName: xe.ZodRecord, ...Re(a) })
      : new Ya({ keyType: rn.create(), valueType: t, typeName: xe.ZodRecord, ...Re(n) });
  }
}
class Ui extends qe {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: n, ctx: a } = this._processInputParams(t);
    if (a.parsedType !== _e.map)
      return (pe(a, { code: ee.invalid_type, expected: _e.map, received: a.parsedType }), Ce);
    const s = this._def.keyType,
      r = this._def.valueType,
      i = [...a.data.entries()].map(([l, d], c) => ({
        key: s._parse(new Zt(a, l, a.path, [c, 'key'])),
        value: r._parse(new Zt(a, d, a.path, [c, 'value'])),
      }));
    if (a.common.async) {
      const l = new Map();
      return Promise.resolve().then(async () => {
        for (const d of i) {
          const c = await d.key,
            f = await d.value;
          if (c.status === 'aborted' || f.status === 'aborted') return Ce;
          ((c.status === 'dirty' || f.status === 'dirty') && n.dirty(), l.set(c.value, f.value));
        }
        return { status: n.value, value: l };
      });
    } else {
      const l = new Map();
      for (const d of i) {
        const c = d.key,
          f = d.value;
        if (c.status === 'aborted' || f.status === 'aborted') return Ce;
        ((c.status === 'dirty' || f.status === 'dirty') && n.dirty(), l.set(c.value, f.value));
      }
      return { status: n.value, value: l };
    }
  }
}
Ui.create = (e, t, n) => new Ui({ valueType: t, keyType: e, typeName: xe.ZodMap, ...Re(n) });
class Ea extends qe {
  _parse(t) {
    const { status: n, ctx: a } = this._processInputParams(t);
    if (a.parsedType !== _e.set)
      return (pe(a, { code: ee.invalid_type, expected: _e.set, received: a.parsedType }), Ce);
    const s = this._def;
    (s.minSize !== null &&
      a.data.size < s.minSize.value &&
      (pe(a, {
        code: ee.too_small,
        minimum: s.minSize.value,
        type: 'set',
        inclusive: !0,
        exact: !1,
        message: s.minSize.message,
      }),
      n.dirty()),
      s.maxSize !== null &&
        a.data.size > s.maxSize.value &&
        (pe(a, {
          code: ee.too_big,
          maximum: s.maxSize.value,
          type: 'set',
          inclusive: !0,
          exact: !1,
          message: s.maxSize.message,
        }),
        n.dirty()));
    const r = this._def.valueType;
    function i(d) {
      const c = new Set();
      for (const f of d) {
        if (f.status === 'aborted') return Ce;
        (f.status === 'dirty' && n.dirty(), c.add(f.value));
      }
      return { status: n.value, value: c };
    }
    const l = [...a.data.values()].map((d, c) => r._parse(new Zt(a, d, a.path, c)));
    return a.common.async ? Promise.all(l).then((d) => i(d)) : i(l);
  }
  min(t, n) {
    return new Ea({ ...this._def, minSize: { value: t, message: ye.toString(n) } });
  }
  max(t, n) {
    return new Ea({ ...this._def, maxSize: { value: t, message: ye.toString(n) } });
  }
  size(t, n) {
    return this.min(t, n).max(t, n);
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
Ea.create = (e, t) =>
  new Ea({ valueType: e, minSize: null, maxSize: null, typeName: xe.ZodSet, ...Re(t) });
class ji extends qe {
  get schema() {
    return this._def.getter();
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    return this._def.getter()._parse({ data: n.data, path: n.path, parent: n });
  }
}
ji.create = (e, t) => new ji({ getter: e, typeName: xe.ZodLazy, ...Re(t) });
class zi extends qe {
  _parse(t) {
    if (t.data !== this._def.value) {
      const n = this._getOrReturnCtx(t);
      return (pe(n, { received: n.data, code: ee.invalid_literal, expected: this._def.value }), Ce);
    }
    return { status: 'valid', value: t.data };
  }
  get value() {
    return this._def.value;
  }
}
zi.create = (e, t) => new zi({ value: e, typeName: xe.ZodLiteral, ...Re(t) });
function ho(e, t) {
  return new Xn({ values: e, typeName: xe.ZodEnum, ...Re(t) });
}
class Xn extends qe {
  _parse(t) {
    if (typeof t.data != 'string') {
      const n = this._getOrReturnCtx(t),
        a = this._def.values;
      return (
        pe(n, { expected: ze.joinValues(a), received: n.parsedType, code: ee.invalid_type }),
        Ce
      );
    }
    if ((this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(t.data))) {
      const n = this._getOrReturnCtx(t),
        a = this._def.values;
      return (pe(n, { received: n.data, code: ee.invalid_enum_value, options: a }), Ce);
    }
    return Rt(t.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const t = {};
    for (const n of this._def.values) t[n] = n;
    return t;
  }
  get Values() {
    const t = {};
    for (const n of this._def.values) t[n] = n;
    return t;
  }
  get Enum() {
    const t = {};
    for (const n of this._def.values) t[n] = n;
    return t;
  }
  extract(t, n = this._def) {
    return Xn.create(t, { ...this._def, ...n });
  }
  exclude(t, n = this._def) {
    return Xn.create(
      this.options.filter((a) => !t.includes(a)),
      { ...this._def, ...n },
    );
  }
}
Xn.create = ho;
class Vi extends qe {
  _parse(t) {
    const n = ze.getValidEnumValues(this._def.values),
      a = this._getOrReturnCtx(t);
    if (a.parsedType !== _e.string && a.parsedType !== _e.number) {
      const s = ze.objectValues(n);
      return (
        pe(a, { expected: ze.joinValues(s), received: a.parsedType, code: ee.invalid_type }),
        Ce
      );
    }
    if (
      (this._cache || (this._cache = new Set(ze.getValidEnumValues(this._def.values))),
      !this._cache.has(t.data))
    ) {
      const s = ze.objectValues(n);
      return (pe(a, { received: a.data, code: ee.invalid_enum_value, options: s }), Ce);
    }
    return Rt(t.data);
  }
  get enum() {
    return this._def.values;
  }
}
Vi.create = (e, t) => new Vi({ values: e, typeName: xe.ZodNativeEnum, ...Re(t) });
class Xa extends qe {
  unwrap() {
    return this._def.type;
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== _e.promise && n.common.async === !1)
      return (pe(n, { code: ee.invalid_type, expected: _e.promise, received: n.parsedType }), Ce);
    const a = n.parsedType === _e.promise ? n.data : Promise.resolve(n.data);
    return Rt(
      a.then((s) =>
        this._def.type.parseAsync(s, { path: n.path, errorMap: n.common.contextualErrorMap }),
      ),
    );
  }
}
Xa.create = (e, t) => new Xa({ type: e, typeName: xe.ZodPromise, ...Re(t) });
class Kn extends qe {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === xe.ZodEffects
      ? this._def.schema.sourceType()
      : this._def.schema;
  }
  _parse(t) {
    const { status: n, ctx: a } = this._processInputParams(t),
      s = this._def.effect || null,
      r = {
        addIssue: (i) => {
          (pe(a, i), i.fatal ? n.abort() : n.dirty());
        },
        get path() {
          return a.path;
        },
      };
    if (((r.addIssue = r.addIssue.bind(r)), s.type === 'preprocess')) {
      const i = s.transform(a.data, r);
      if (a.common.async)
        return Promise.resolve(i).then(async (l) => {
          if (n.value === 'aborted') return Ce;
          const d = await this._def.schema._parseAsync({ data: l, path: a.path, parent: a });
          return d.status === 'aborted'
            ? Ce
            : d.status === 'dirty' || n.value === 'dirty'
              ? ga(d.value)
              : d;
        });
      {
        if (n.value === 'aborted') return Ce;
        const l = this._def.schema._parseSync({ data: i, path: a.path, parent: a });
        return l.status === 'aborted'
          ? Ce
          : l.status === 'dirty' || n.value === 'dirty'
            ? ga(l.value)
            : l;
      }
    }
    if (s.type === 'refinement') {
      const i = (l) => {
        const d = s.refinement(l, r);
        if (a.common.async) return Promise.resolve(d);
        if (d instanceof Promise)
          throw new Error(
            'Async refinement encountered during synchronous parse operation. Use .parseAsync instead.',
          );
        return l;
      };
      if (a.common.async === !1) {
        const l = this._def.schema._parseSync({ data: a.data, path: a.path, parent: a });
        return l.status === 'aborted'
          ? Ce
          : (l.status === 'dirty' && n.dirty(), i(l.value), { status: n.value, value: l.value });
      } else
        return this._def.schema
          ._parseAsync({ data: a.data, path: a.path, parent: a })
          .then((l) =>
            l.status === 'aborted'
              ? Ce
              : (l.status === 'dirty' && n.dirty(),
                i(l.value).then(() => ({ status: n.value, value: l.value }))),
          );
    }
    if (s.type === 'transform')
      if (a.common.async === !1) {
        const i = this._def.schema._parseSync({ data: a.data, path: a.path, parent: a });
        if (!Zn(i)) return Ce;
        const l = s.transform(i.value, r);
        if (l instanceof Promise)
          throw new Error(
            'Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.',
          );
        return { status: n.value, value: l };
      } else
        return this._def.schema._parseAsync({ data: a.data, path: a.path, parent: a }).then((i) =>
          Zn(i)
            ? Promise.resolve(s.transform(i.value, r)).then((l) => ({
                status: n.value,
                value: l,
              }))
            : Ce,
        );
    ze.assertNever(s);
  }
}
Kn.create = (e, t, n) => new Kn({ schema: e, typeName: xe.ZodEffects, effect: t, ...Re(n) });
Kn.createWithPreprocess = (e, t, n) =>
  new Kn({
    schema: t,
    effect: { type: 'preprocess', transform: e },
    typeName: xe.ZodEffects,
    ...Re(n),
  });
class hn extends qe {
  _parse(t) {
    return this._getType(t) === _e.undefined ? Rt(void 0) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
hn.create = (e, t) => new hn({ innerType: e, typeName: xe.ZodOptional, ...Re(t) });
class Qn extends qe {
  _parse(t) {
    return this._getType(t) === _e.null ? Rt(null) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Qn.create = (e, t) => new Qn({ innerType: e, typeName: xe.ZodNullable, ...Re(t) });
class Zs extends qe {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    let a = n.data;
    return (
      n.parsedType === _e.undefined && (a = this._def.defaultValue()),
      this._def.innerType._parse({ data: a, path: n.path, parent: n })
    );
  }
  removeDefault() {
    return this._def.innerType;
  }
}
Zs.create = (e, t) =>
  new Zs({
    innerType: e,
    typeName: xe.ZodDefault,
    defaultValue: typeof t.default == 'function' ? t.default : () => t.default,
    ...Re(t),
  });
class Ys extends qe {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t),
      a = { ...n, common: { ...n.common, issues: [] } },
      s = this._def.innerType._parse({ data: a.data, path: a.path, parent: { ...a } });
    return Wa(s)
      ? s.then((r) => ({
          status: 'valid',
          value:
            r.status === 'valid'
              ? r.value
              : this._def.catchValue({
                  get error() {
                    return new gt(a.common.issues);
                  },
                  input: a.data,
                }),
        }))
      : {
          status: 'valid',
          value:
            s.status === 'valid'
              ? s.value
              : this._def.catchValue({
                  get error() {
                    return new gt(a.common.issues);
                  },
                  input: a.data,
                }),
        };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
Ys.create = (e, t) =>
  new Ys({
    innerType: e,
    typeName: xe.ZodCatch,
    catchValue: typeof t.catch == 'function' ? t.catch : () => t.catch,
    ...Re(t),
  });
class Bi extends qe {
  _parse(t) {
    if (this._getType(t) !== _e.nan) {
      const a = this._getOrReturnCtx(t);
      return (pe(a, { code: ee.invalid_type, expected: _e.nan, received: a.parsedType }), Ce);
    }
    return { status: 'valid', value: t.data };
  }
}
Bi.create = (e) => new Bi({ typeName: xe.ZodNaN, ...Re(e) });
class tm extends qe {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t),
      a = n.data;
    return this._def.type._parse({ data: a, path: n.path, parent: n });
  }
  unwrap() {
    return this._def.type;
  }
}
class gr extends qe {
  _parse(t) {
    const { status: n, ctx: a } = this._processInputParams(t);
    if (a.common.async)
      return (async () => {
        const r = await this._def.in._parseAsync({ data: a.data, path: a.path, parent: a });
        return r.status === 'aborted'
          ? Ce
          : r.status === 'dirty'
            ? (n.dirty(), ga(r.value))
            : this._def.out._parseAsync({ data: r.value, path: a.path, parent: a });
      })();
    {
      const s = this._def.in._parseSync({ data: a.data, path: a.path, parent: a });
      return s.status === 'aborted'
        ? Ce
        : s.status === 'dirty'
          ? (n.dirty(), { status: 'dirty', value: s.value })
          : this._def.out._parseSync({ data: s.value, path: a.path, parent: a });
    }
  }
  static create(t, n) {
    return new gr({ in: t, out: n, typeName: xe.ZodPipeline });
  }
}
class Xs extends qe {
  _parse(t) {
    const n = this._def.innerType._parse(t),
      a = (s) => (Zn(s) && (s.value = Object.freeze(s.value)), s);
    return Wa(n) ? n.then((s) => a(s)) : a(n);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Xs.create = (e, t) => new Xs({ innerType: e, typeName: xe.ZodReadonly, ...Re(t) });
var xe;
(function (e) {
  ((e.ZodString = 'ZodString'),
    (e.ZodNumber = 'ZodNumber'),
    (e.ZodNaN = 'ZodNaN'),
    (e.ZodBigInt = 'ZodBigInt'),
    (e.ZodBoolean = 'ZodBoolean'),
    (e.ZodDate = 'ZodDate'),
    (e.ZodSymbol = 'ZodSymbol'),
    (e.ZodUndefined = 'ZodUndefined'),
    (e.ZodNull = 'ZodNull'),
    (e.ZodAny = 'ZodAny'),
    (e.ZodUnknown = 'ZodUnknown'),
    (e.ZodNever = 'ZodNever'),
    (e.ZodVoid = 'ZodVoid'),
    (e.ZodArray = 'ZodArray'),
    (e.ZodObject = 'ZodObject'),
    (e.ZodUnion = 'ZodUnion'),
    (e.ZodDiscriminatedUnion = 'ZodDiscriminatedUnion'),
    (e.ZodIntersection = 'ZodIntersection'),
    (e.ZodTuple = 'ZodTuple'),
    (e.ZodRecord = 'ZodRecord'),
    (e.ZodMap = 'ZodMap'),
    (e.ZodSet = 'ZodSet'),
    (e.ZodFunction = 'ZodFunction'),
    (e.ZodLazy = 'ZodLazy'),
    (e.ZodLiteral = 'ZodLiteral'),
    (e.ZodEnum = 'ZodEnum'),
    (e.ZodEffects = 'ZodEffects'),
    (e.ZodNativeEnum = 'ZodNativeEnum'),
    (e.ZodOptional = 'ZodOptional'),
    (e.ZodNullable = 'ZodNullable'),
    (e.ZodDefault = 'ZodDefault'),
    (e.ZodCatch = 'ZodCatch'),
    (e.ZodPromise = 'ZodPromise'),
    (e.ZodBranded = 'ZodBranded'),
    (e.ZodPipeline = 'ZodPipeline'),
    (e.ZodReadonly = 'ZodReadonly'));
})(xe || (xe = {}));
const je = rn.create,
  nm = Yn.create,
  am = Ws.create,
  $e = Hs.create;
bn.create;
const Nt = Ht.create,
  et = ot.create,
  sm = Ga.create;
Za.create;
xn.create;
const Cn = Ya.create,
  Wi = Xn.create;
Xa.create;
hn.create;
Qn.create;
function hr(e) {
  if (typeof e == 'function') return e;
  if (typeof fetch == 'function') return fetch;
  if (typeof globalThis < 'u' && typeof globalThis.fetch == 'function')
    return globalThis.fetch.bind(globalThis);
  throw new Error("fetch non disponibile nell'ambiente corrente");
}
function Hi(e, t = 'Richiesta fallita') {
  return e instanceof Error
    ? e
    : e && typeof e == 'object' && 'message' in e
      ? new Error(String(e.message))
      : new Error(typeof e == 'string' ? e : t);
}
async function Gi(e, t, n) {
  if (typeof n == 'function') {
    const s = await n(e);
    if (s) {
      if (s instanceof Error) return s;
      if (typeof s == 'string') return new Error(s);
    }
  }
  const a = t ? `${t} (${e.status})` : `Richiesta fallita (${e.status})`;
  try {
    const s = await e.clone().json();
    if (s && typeof s.error == 'string' && s.error.trim()) return new Error(s.error.trim());
  } catch {}
  try {
    const s = await e.clone().text();
    if (s && s.trim()) return new Error(s.trim());
  } catch {}
  return new Error(a);
}
async function un(e, t = {}) {
  const {
      fetchImpl: n,
      requestInit: a = {},
      parse: s = (N) => N.json(),
      fallbackUrl: r,
      fallbackInit: i,
      allowFallback: l = yn(),
      errorMessage: d,
      fallbackErrorMessage: c,
      buildErrorMessage: f,
      buildFallbackErrorMessage: p,
    } = t,
    g = hr(n),
    v = cc({ url: e, method: a.method, fallbackUrl: r, fallbackAllowed: l });
  let y;
  try {
    if (((y = await g(e, a)), !y.ok)) throw await Gi(y, d, f);
    const N = await s(y);
    return (
      jr(v, { status: 'success', source: 'remote', message: 'Risposta remota ricevuta' }),
      { data: N, source: 'remote', response: y }
    );
  } catch (N) {
    const O = Hi(N, d || 'Richiesta remota fallita');
    if ((jr(v, { message: O.message, error: O.message, completed: !1 }), !l || !r))
      throw (zr(v, O.message, O), O);
    try {
      const P = { cache: 'no-store', ...i },
        V = await g(r, P);
      if (!V.ok) throw await Gi(V, c || 'Fallback non disponibile', p || f);
      const k = await s(V);
      return (
        uc(v, `Risposta fallback (${V.status}) ricevuta per ${r}`),
        { data: k, source: 'fallback', response: V, error: O }
      );
    } catch (P) {
      const V = Hi(P, c || 'Fallback non disponibile');
      throw (V.cause || (V.cause = O), zr(v, V.message, V), V);
    }
  }
}
function ys(e, { allowNull: t = !0 } = {}) {
  if (!e) return;
  const n = Al(e);
  if (!(typeof n > 'u')) return t && n.toLowerCase() === 'null' ? null : n;
}
function rm(e, t) {
  var r, i, l;
  const n = ys((r = t.env) == null ? void 0 : r.endpoint, { allowNull: !1 }),
    a = ys((i = t.env) == null ? void 0 : i.fallback),
    s = ys((l = t.env) == null ? void 0 : l.mock);
  return {
    id: e,
    endpoint: n ?? t.endpoint ?? null,
    fallback: a === void 0 ? (t.fallback ?? null) : a,
    mock: s === void 0 ? (t.mock ?? null) : s,
  };
}
const im = {
    flowSnapshot: {
      endpoint: '/api/v1/generation/snapshot',
      fallback: 'data/flow/snapshots/flow-shell-snapshot.json',
      env: { endpoint: 'VITE_FLOW_SNAPSHOT_URL', fallback: 'VITE_FLOW_SNAPSHOT_FALLBACK' },
    },
    generationSpecies: {
      endpoint: '/api/v1/generation/species',
      fallback: 'data/flow/generation/species.json',
      env: {
        endpoint: 'VITE_GENERATION_SPECIES_URL',
        fallback: 'VITE_GENERATION_SPECIES_FALLBACK',
      },
    },
    generationSpeciesBatch: {
      endpoint: '/api/v1/generation/species/batch',
      fallback: 'data/flow/generation/species-batch.json',
      env: {
        endpoint: 'VITE_GENERATION_SPECIES_BATCH_URL',
        fallback: 'VITE_GENERATION_SPECIES_BATCH_FALLBACK',
      },
    },
    generationSpeciesPreview: {
      endpoint: '/api/v1/generation/species/batch',
      fallback: 'data/flow/generation/species-preview.json',
      env: {
        endpoint: 'VITE_GENERATION_SPECIES_PREVIEW_URL',
        fallback: 'VITE_GENERATION_SPECIES_PREVIEW_FALLBACK',
      },
    },
    runtimeValidatorSpecies: {
      endpoint: '/api/v1/validators/runtime',
      fallback: 'data/flow/validators/species.json',
      env: {
        endpoint: 'VITE_RUNTIME_VALIDATION_URL',
        fallback: 'VITE_RUNTIME_VALIDATION_SPECIES_FALLBACK',
      },
    },
    runtimeValidatorBiome: {
      endpoint: '/api/v1/validators/runtime',
      fallback: 'data/flow/validators/biome.json',
      env: {
        endpoint: 'VITE_RUNTIME_VALIDATION_URL',
        fallback: 'VITE_RUNTIME_VALIDATION_BIOME_FALLBACK',
      },
    },
    runtimeValidatorFoodweb: {
      endpoint: '/api/v1/validators/runtime',
      fallback: 'data/flow/validators/foodweb.json',
      env: {
        endpoint: 'VITE_RUNTIME_VALIDATION_URL',
        fallback: 'VITE_RUNTIME_VALIDATION_FOODWEB_FALLBACK',
      },
    },
    qualitySuggestionsApply: {
      endpoint: '/api/v1/quality/suggestions/apply',
      fallback: 'data/flow/quality/suggestions/apply.json',
      env: {
        endpoint: 'VITE_QUALITY_SUGGESTIONS_URL',
        fallback: 'VITE_QUALITY_SUGGESTIONS_FALLBACK',
      },
    },
    traitDiagnostics: {
      endpoint: '/api/traits/diagnostics',
      fallback: 'data/flow/traits/diagnostics.json',
      env: { endpoint: 'VITE_TRAIT_DIAGNOSTICS_URL', fallback: 'VITE_TRAIT_DIAGNOSTICS_FALLBACK' },
    },
    nebulaAtlas: {
      endpoint: '/api/v1/atlas',
      fallback: 'data/nebula/atlas.json',
      mock: 'data/nebula/telemetry.json',
      env: {
        endpoint: 'VITE_NEBULA_ATLAS_URL',
        fallback: 'VITE_NEBULA_ATLAS_FALLBACK',
        mock: 'VITE_NEBULA_TELEMETRY_MOCK',
      },
    },
  },
  lm = Object.entries(im).reduce((e, [t, n]) => {
    const a = rm(t, n);
    return ((e[t] = a), e);
  }, {});
function om(e) {
  const t = lm[e];
  if (!t) throw new Error(`Data source non configurato: ${e}`);
  return t;
}
function Sn(e, t = {}) {
  const n = om(e),
    a = { id: e, endpoint: n.endpoint, fallback: n.fallback, mock: n.mock };
  if (Object.prototype.hasOwnProperty.call(t, 'endpoint')) {
    const s = t.endpoint;
    s === null ? (a.endpoint = null) : typeof s == 'string' && s.trim() && (a.endpoint = s.trim());
  }
  if (Object.prototype.hasOwnProperty.call(t, 'fallback')) {
    const s = t.fallback;
    s === null
      ? (a.fallback = null)
      : typeof s == 'string' && s.trim()
        ? (a.fallback = s.trim())
        : (a.fallback = null);
  }
  if (Object.prototype.hasOwnProperty.call(t, 'mock')) {
    const s = t.mock;
    s === null
      ? (a.mock = null)
      : typeof s == 'string' && s.trim()
        ? (a.mock = s.trim())
        : (a.mock = null);
  }
  return a;
}
function Zi(e, t) {
  if (e instanceof Error) return (t && !e.message && (e.message = t), e);
  if (typeof e == 'string') return new Error(e);
  const n = new Error(t || 'errors.generic');
  return (Object.defineProperty(n, 'cause', { value: e, enumerable: !1, configurable: !0 }), n);
}
function en(e, t, n, a = {}) {
  !e ||
    typeof e.log != 'function' ||
    !(n != null && n.event) ||
    e.log(n.event, { scope: t, level: n.level ?? 'info', message: n.message, ...a });
}
function Fn(e, t) {
  if (e != null && e.metaBuilder)
    try {
      return e.metaBuilder(t);
    } catch {
      return;
    }
}
async function cm({
  attemptPrimary: e,
  attemptFallback: t,
  preferFallbackFirst: n = !1,
  logger: a = null,
  scope: s = 'flow',
  events: r = {},
}) {
  var d;
  const i = async (c, f) => {
      const p = r[`${c}Start`];
      en(a, s, p, {});
      const g = await f(),
        v = r[`${c}Success`];
      return (en(a, s, v, { meta: Fn(v, g) }), g);
    },
    l = async (c) => {
      var p;
      if (!t) throw c;
      const f = () => t(c);
      try {
        en(a, s, r.fallbackStart, { meta: Fn(r.fallbackStart, c) });
        const g = await f();
        return (
          en(a, s, r.fallbackSuccess, { meta: Fn(r.fallbackSuccess, g) }),
          Object.assign({}, g, { source: 'fallback', error: c })
        );
      } catch (g) {
        const v = Zi(g, (p = r.fallbackFailure) == null ? void 0 : p.message);
        throw (
          c && !('cause' in v) && Object.defineProperty(v, 'cause', { value: c, configurable: !0 }),
          en(a, s, r.fallbackFailure, {}),
          v
        );
      }
    };
  if (n && t) {
    en(a, s, r.fallbackPreferred, {});
    try {
      const c = await t();
      return (
        en(a, s, r.fallbackSuccess, { meta: Fn(r.fallbackSuccess, c) }),
        Object.assign({}, c, { source: 'fallback', error: null })
      );
    } catch (c) {
      en(a, s, r.fallbackFirstFailure, { meta: Fn(r.fallbackFirstFailure, c) });
    }
  }
  try {
    const c = await i('primary', e);
    return Object.assign({}, c, { source: 'remote', error: null });
  } catch (c) {
    const f = Zi(c, (d = r.primaryFailure) == null ? void 0 : d.message);
    return (en(a, s, r.primaryFailure, { meta: Fn(r.primaryFailure, f) }), l(f));
  }
}
class ha extends Error {
  constructor(n, a = {}) {
    super(n);
    We(this, 'code');
    We(this, 'status');
    We(this, 'details');
    ((this.name = 'ServiceError'),
      (this.code = a.code),
      (this.status = a.status),
      (this.details = a.details),
      a.cause !== void 0 &&
        Object.defineProperty(this, 'cause', { value: a.cause, configurable: !0 }));
  }
}
function nn(e, t, n = {}) {
  if (e instanceof ha) return e;
  if (e instanceof Error) {
    const a = { ...n, cause: e };
    (typeof e.code == 'string' && (a.code = a.code ?? e.code),
      typeof e.status == 'number' && (a.status = a.status ?? e.status));
    const s = e.message && e.message.trim() ? e.message : t;
    return new ha(s, a);
  }
  return typeof e == 'string' && e.trim() ? new ha(e.trim(), n) : new ha(t, { ...n, cause: e });
}
function an(e, t, n = {}) {
  const a = e.issues.map((r) => ({ path: r.path.join('.'), message: r.message, code: r.code })),
    s = a.length ? `${t}: ${a.map((r) => r.message).join('; ')}` : t;
  return new ha(s, { ...n, cause: e, details: a });
}
/*! @license DOMPurify 3.3.0 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.3.0/LICENSE */ const {
  entries: _o,
  setPrototypeOf: Yi,
  isFrozen: um,
  getPrototypeOf: dm,
  getOwnPropertyDescriptor: fm,
} = Object;
let { freeze: Tt, seal: Lt, create: Ks } = Object,
  { apply: Qs, construct: Js } = typeof Reflect < 'u' && Reflect;
Tt ||
  (Tt = function (t) {
    return t;
  });
Lt ||
  (Lt = function (t) {
    return t;
  });
Qs ||
  (Qs = function (t, n) {
    for (var a = arguments.length, s = new Array(a > 2 ? a - 2 : 0), r = 2; r < a; r++)
      s[r - 2] = arguments[r];
    return t.apply(n, s);
  });
Js ||
  (Js = function (t) {
    for (var n = arguments.length, a = new Array(n > 1 ? n - 1 : 0), s = 1; s < n; s++)
      a[s - 1] = arguments[s];
    return new t(...a);
  });
const Oa = At(Array.prototype.forEach),
  mm = At(Array.prototype.lastIndexOf),
  Xi = At(Array.prototype.pop),
  ra = At(Array.prototype.push),
  pm = At(Array.prototype.splice),
  qa = At(String.prototype.toLowerCase),
  ks = At(String.prototype.toString),
  ws = At(String.prototype.match),
  ia = At(String.prototype.replace),
  gm = At(String.prototype.indexOf),
  hm = At(String.prototype.trim),
  Dt = At(Object.prototype.hasOwnProperty),
  kt = At(RegExp.prototype.test),
  la = _m(TypeError);
function At(e) {
  return function (t) {
    t instanceof RegExp && (t.lastIndex = 0);
    for (var n = arguments.length, a = new Array(n > 1 ? n - 1 : 0), s = 1; s < n; s++)
      a[s - 1] = arguments[s];
    return Qs(e, t, a);
  };
}
function _m(e) {
  return function () {
    for (var t = arguments.length, n = new Array(t), a = 0; a < t; a++) n[a] = arguments[a];
    return Js(e, n);
  };
}
function Fe(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : qa;
  Yi && Yi(e, null);
  let a = t.length;
  for (; a--; ) {
    let s = t[a];
    if (typeof s == 'string') {
      const r = n(s);
      r !== s && (um(t) || (t[a] = r), (s = r));
    }
    e[s] = !0;
  }
  return e;
}
function vm(e) {
  for (let t = 0; t < e.length; t++) Dt(e, t) || (e[t] = null);
  return e;
}
function tn(e) {
  const t = Ks(null);
  for (const [n, a] of _o(e))
    Dt(e, n) &&
      (Array.isArray(a)
        ? (t[n] = vm(a))
        : a && typeof a == 'object' && a.constructor === Object
          ? (t[n] = tn(a))
          : (t[n] = a));
  return t;
}
function oa(e, t) {
  for (; e !== null; ) {
    const a = fm(e, t);
    if (a) {
      if (a.get) return At(a.get);
      if (typeof a.value == 'function') return At(a.value);
    }
    e = dm(e);
  }
  function n() {
    return null;
  }
  return n;
}
const Ki = Tt([
    'a',
    'abbr',
    'acronym',
    'address',
    'area',
    'article',
    'aside',
    'audio',
    'b',
    'bdi',
    'bdo',
    'big',
    'blink',
    'blockquote',
    'body',
    'br',
    'button',
    'canvas',
    'caption',
    'center',
    'cite',
    'code',
    'col',
    'colgroup',
    'content',
    'data',
    'datalist',
    'dd',
    'decorator',
    'del',
    'details',
    'dfn',
    'dialog',
    'dir',
    'div',
    'dl',
    'dt',
    'element',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'font',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'head',
    'header',
    'hgroup',
    'hr',
    'html',
    'i',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'main',
    'map',
    'mark',
    'marquee',
    'menu',
    'menuitem',
    'meter',
    'nav',
    'nobr',
    'ol',
    'optgroup',
    'option',
    'output',
    'p',
    'picture',
    'pre',
    'progress',
    'q',
    'rp',
    'rt',
    'ruby',
    's',
    'samp',
    'search',
    'section',
    'select',
    'shadow',
    'slot',
    'small',
    'source',
    'spacer',
    'span',
    'strike',
    'strong',
    'style',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'template',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'track',
    'tt',
    'u',
    'ul',
    'var',
    'video',
    'wbr',
  ]),
  Es = Tt([
    'svg',
    'a',
    'altglyph',
    'altglyphdef',
    'altglyphitem',
    'animatecolor',
    'animatemotion',
    'animatetransform',
    'circle',
    'clippath',
    'defs',
    'desc',
    'ellipse',
    'enterkeyhint',
    'exportparts',
    'filter',
    'font',
    'g',
    'glyph',
    'glyphref',
    'hkern',
    'image',
    'inputmode',
    'line',
    'lineargradient',
    'marker',
    'mask',
    'metadata',
    'mpath',
    'part',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialgradient',
    'rect',
    'stop',
    'style',
    'switch',
    'symbol',
    'text',
    'textpath',
    'title',
    'tref',
    'tspan',
    'view',
    'vkern',
  ]),
  Ss = Tt([
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feDistantLight',
    'feDropShadow',
    'feFlood',
    'feFuncA',
    'feFuncB',
    'feFuncG',
    'feFuncR',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMergeNode',
    'feMorphology',
    'feOffset',
    'fePointLight',
    'feSpecularLighting',
    'feSpotLight',
    'feTile',
    'feTurbulence',
  ]),
  bm = Tt([
    'animate',
    'color-profile',
    'cursor',
    'discard',
    'font-face',
    'font-face-format',
    'font-face-name',
    'font-face-src',
    'font-face-uri',
    'foreignobject',
    'hatch',
    'hatchpath',
    'mesh',
    'meshgradient',
    'meshpatch',
    'meshrow',
    'missing-glyph',
    'script',
    'set',
    'solidcolor',
    'unknown',
    'use',
  ]),
  Ts = Tt([
    'math',
    'menclose',
    'merror',
    'mfenced',
    'mfrac',
    'mglyph',
    'mi',
    'mlabeledtr',
    'mmultiscripts',
    'mn',
    'mo',
    'mover',
    'mpadded',
    'mphantom',
    'mroot',
    'mrow',
    'ms',
    'mspace',
    'msqrt',
    'mstyle',
    'msub',
    'msup',
    'msubsup',
    'mtable',
    'mtd',
    'mtext',
    'mtr',
    'munder',
    'munderover',
    'mprescripts',
  ]),
  ym = Tt([
    'maction',
    'maligngroup',
    'malignmark',
    'mlongdiv',
    'mscarries',
    'mscarry',
    'msgroup',
    'mstack',
    'msline',
    'msrow',
    'semantics',
    'annotation',
    'annotation-xml',
    'mprescripts',
    'none',
  ]),
  Qi = Tt(['#text']),
  Ji = Tt([
    'accept',
    'action',
    'align',
    'alt',
    'autocapitalize',
    'autocomplete',
    'autopictureinpicture',
    'autoplay',
    'background',
    'bgcolor',
    'border',
    'capture',
    'cellpadding',
    'cellspacing',
    'checked',
    'cite',
    'class',
    'clear',
    'color',
    'cols',
    'colspan',
    'controls',
    'controlslist',
    'coords',
    'crossorigin',
    'datetime',
    'decoding',
    'default',
    'dir',
    'disabled',
    'disablepictureinpicture',
    'disableremoteplayback',
    'download',
    'draggable',
    'enctype',
    'enterkeyhint',
    'exportparts',
    'face',
    'for',
    'headers',
    'height',
    'hidden',
    'high',
    'href',
    'hreflang',
    'id',
    'inert',
    'inputmode',
    'integrity',
    'ismap',
    'kind',
    'label',
    'lang',
    'list',
    'loading',
    'loop',
    'low',
    'max',
    'maxlength',
    'media',
    'method',
    'min',
    'minlength',
    'multiple',
    'muted',
    'name',
    'nonce',
    'noshade',
    'novalidate',
    'nowrap',
    'open',
    'optimum',
    'part',
    'pattern',
    'placeholder',
    'playsinline',
    'popover',
    'popovertarget',
    'popovertargetaction',
    'poster',
    'preload',
    'pubdate',
    'radiogroup',
    'readonly',
    'rel',
    'required',
    'rev',
    'reversed',
    'role',
    'rows',
    'rowspan',
    'spellcheck',
    'scope',
    'selected',
    'shape',
    'size',
    'sizes',
    'slot',
    'span',
    'srclang',
    'start',
    'src',
    'srcset',
    'step',
    'style',
    'summary',
    'tabindex',
    'title',
    'translate',
    'type',
    'usemap',
    'valign',
    'value',
    'width',
    'wrap',
    'xmlns',
    'slot',
  ]),
  As = Tt([
    'accent-height',
    'accumulate',
    'additive',
    'alignment-baseline',
    'amplitude',
    'ascent',
    'attributename',
    'attributetype',
    'azimuth',
    'basefrequency',
    'baseline-shift',
    'begin',
    'bias',
    'by',
    'class',
    'clip',
    'clippathunits',
    'clip-path',
    'clip-rule',
    'color',
    'color-interpolation',
    'color-interpolation-filters',
    'color-profile',
    'color-rendering',
    'cx',
    'cy',
    'd',
    'dx',
    'dy',
    'diffuseconstant',
    'direction',
    'display',
    'divisor',
    'dur',
    'edgemode',
    'elevation',
    'end',
    'exponent',
    'fill',
    'fill-opacity',
    'fill-rule',
    'filter',
    'filterunits',
    'flood-color',
    'flood-opacity',
    'font-family',
    'font-size',
    'font-size-adjust',
    'font-stretch',
    'font-style',
    'font-variant',
    'font-weight',
    'fx',
    'fy',
    'g1',
    'g2',
    'glyph-name',
    'glyphref',
    'gradientunits',
    'gradienttransform',
    'height',
    'href',
    'id',
    'image-rendering',
    'in',
    'in2',
    'intercept',
    'k',
    'k1',
    'k2',
    'k3',
    'k4',
    'kerning',
    'keypoints',
    'keysplines',
    'keytimes',
    'lang',
    'lengthadjust',
    'letter-spacing',
    'kernelmatrix',
    'kernelunitlength',
    'lighting-color',
    'local',
    'marker-end',
    'marker-mid',
    'marker-start',
    'markerheight',
    'markerunits',
    'markerwidth',
    'maskcontentunits',
    'maskunits',
    'max',
    'mask',
    'mask-type',
    'media',
    'method',
    'mode',
    'min',
    'name',
    'numoctaves',
    'offset',
    'operator',
    'opacity',
    'order',
    'orient',
    'orientation',
    'origin',
    'overflow',
    'paint-order',
    'path',
    'pathlength',
    'patterncontentunits',
    'patterntransform',
    'patternunits',
    'points',
    'preservealpha',
    'preserveaspectratio',
    'primitiveunits',
    'r',
    'rx',
    'ry',
    'radius',
    'refx',
    'refy',
    'repeatcount',
    'repeatdur',
    'restart',
    'result',
    'rotate',
    'scale',
    'seed',
    'shape-rendering',
    'slope',
    'specularconstant',
    'specularexponent',
    'spreadmethod',
    'startoffset',
    'stddeviation',
    'stitchtiles',
    'stop-color',
    'stop-opacity',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke',
    'stroke-width',
    'style',
    'surfacescale',
    'systemlanguage',
    'tabindex',
    'tablevalues',
    'targetx',
    'targety',
    'transform',
    'transform-origin',
    'text-anchor',
    'text-decoration',
    'text-rendering',
    'textlength',
    'type',
    'u1',
    'u2',
    'unicode',
    'values',
    'viewbox',
    'visibility',
    'version',
    'vert-adv-y',
    'vert-origin-x',
    'vert-origin-y',
    'width',
    'word-spacing',
    'wrap',
    'writing-mode',
    'xchannelselector',
    'ychannelselector',
    'x',
    'x1',
    'x2',
    'xmlns',
    'y',
    'y1',
    'y2',
    'z',
    'zoomandpan',
  ]),
  el = Tt([
    'accent',
    'accentunder',
    'align',
    'bevelled',
    'close',
    'columnsalign',
    'columnlines',
    'columnspan',
    'denomalign',
    'depth',
    'dir',
    'display',
    'displaystyle',
    'encoding',
    'fence',
    'frame',
    'height',
    'href',
    'id',
    'largeop',
    'length',
    'linethickness',
    'lspace',
    'lquote',
    'mathbackground',
    'mathcolor',
    'mathsize',
    'mathvariant',
    'maxsize',
    'minsize',
    'movablelimits',
    'notation',
    'numalign',
    'open',
    'rowalign',
    'rowlines',
    'rowspacing',
    'rowspan',
    'rspace',
    'rquote',
    'scriptlevel',
    'scriptminsize',
    'scriptsizemultiplier',
    'selection',
    'separator',
    'separators',
    'stretchy',
    'subscriptshift',
    'supscriptshift',
    'symmetric',
    'voffset',
    'width',
    'xmlns',
  ]),
  La = Tt(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']),
  km = Lt(/\{\{[\w\W]*|[\w\W]*\}\}/gm),
  wm = Lt(/<%[\w\W]*|[\w\W]*%>/gm),
  Em = Lt(/\$\{[\w\W]*/gm),
  Sm = Lt(/^data-[\-\w.\u00B7-\uFFFF]+$/),
  Tm = Lt(/^aria-[\-\w]+$/),
  vo = Lt(
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ),
  Am = Lt(/^(?:\w+script|data):/i),
  Im = Lt(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),
  bo = Lt(/^html$/i),
  $m = Lt(/^[a-z][.\w]*(-[.\w]+)+$/i);
var tl = Object.freeze({
  __proto__: null,
  ARIA_ATTR: Tm,
  ATTR_WHITESPACE: Im,
  CUSTOM_ELEMENT: $m,
  DATA_ATTR: Sm,
  DOCTYPE_NAME: bo,
  ERB_EXPR: wm,
  IS_ALLOWED_URI: vo,
  IS_SCRIPT_OR_DATA: Am,
  MUSTACHE_EXPR: km,
  TMPLIT_EXPR: Em,
});
const ca = { element: 1, text: 3, progressingInstruction: 7, comment: 8, document: 9 },
  Nm = function () {
    return typeof window > 'u' ? null : window;
  },
  xm = function (t, n) {
    if (typeof t != 'object' || typeof t.createPolicy != 'function') return null;
    let a = null;
    const s = 'data-tt-policy-suffix';
    n && n.hasAttribute(s) && (a = n.getAttribute(s));
    const r = 'dompurify' + (a ? '#' + a : '');
    try {
      return t.createPolicy(r, {
        createHTML(i) {
          return i;
        },
        createScriptURL(i) {
          return i;
        },
      });
    } catch {
      return (console.warn('TrustedTypes policy ' + r + ' could not be created.'), null);
    }
  },
  nl = function () {
    return {
      afterSanitizeAttributes: [],
      afterSanitizeElements: [],
      afterSanitizeShadowDOM: [],
      beforeSanitizeAttributes: [],
      beforeSanitizeElements: [],
      beforeSanitizeShadowDOM: [],
      uponSanitizeAttribute: [],
      uponSanitizeElement: [],
      uponSanitizeShadowNode: [],
    };
  };
function yo() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Nm();
  const t = (Ee) => yo(Ee);
  if (
    ((t.version = '3.3.0'),
    (t.removed = []),
    !e || !e.document || e.document.nodeType !== ca.document || !e.Element)
  )
    return ((t.isSupported = !1), t);
  let { document: n } = e;
  const a = n,
    s = a.currentScript,
    {
      DocumentFragment: r,
      HTMLTemplateElement: i,
      Node: l,
      Element: d,
      NodeFilter: c,
      NamedNodeMap: f = e.NamedNodeMap || e.MozNamedAttrMap,
      HTMLFormElement: p,
      DOMParser: g,
      trustedTypes: v,
    } = e,
    y = d.prototype,
    N = oa(y, 'cloneNode'),
    O = oa(y, 'remove'),
    P = oa(y, 'nextSibling'),
    V = oa(y, 'childNodes'),
    k = oa(y, 'parentNode');
  if (typeof i == 'function') {
    const Ee = n.createElement('template');
    Ee.content && Ee.content.ownerDocument && (n = Ee.content.ownerDocument);
  }
  let E,
    A = '';
  const {
      implementation: I,
      createNodeIterator: C,
      createDocumentFragment: D,
      getElementsByTagName: M,
    } = n,
    { importNode: ce } = a;
  let ve = nl();
  t.isSupported =
    typeof _o == 'function' && typeof k == 'function' && I && I.createHTMLDocument !== void 0;
  const {
    MUSTACHE_EXPR: Z,
    ERB_EXPR: Ae,
    TMPLIT_EXPR: Ye,
    DATA_ATTR: De,
    ARIA_ATTR: Be,
    IS_SCRIPT_OR_DATA: B,
    ATTR_WHITESPACE: K,
    CUSTOM_ELEMENT: ue,
  } = tl;
  let { IS_ALLOWED_URI: F } = tl,
    G = null;
  const H = Fe({}, [...Ki, ...Es, ...Ss, ...Ts, ...Qi]);
  let de = null;
  const Te = Fe({}, [...Ji, ...As, ...el, ...La]);
  let ne = Object.seal(
      Ks(null, {
        tagNameCheck: { writable: !0, configurable: !1, enumerable: !0, value: null },
        attributeNameCheck: { writable: !0, configurable: !1, enumerable: !0, value: null },
        allowCustomizedBuiltInElements: {
          writable: !0,
          configurable: !1,
          enumerable: !0,
          value: !1,
        },
      }),
    ),
    ge = null,
    oe = null;
  const j = Object.seal(
    Ks(null, {
      tagCheck: { writable: !0, configurable: !1, enumerable: !0, value: null },
      attributeCheck: { writable: !0, configurable: !1, enumerable: !0, value: null },
    }),
  );
  let W = !0,
    ae = !0,
    he = !1,
    R = !0,
    X = !1,
    U = !0,
    ie = !1,
    we = !1,
    Le = !1,
    Q = !1,
    ke = !1,
    w = !1,
    u = !0,
    m = !1;
  const x = 'user-content-';
  let q = !0,
    z = !1,
    S = {},
    $ = null;
  const me = Fe({}, [
    'annotation-xml',
    'audio',
    'colgroup',
    'desc',
    'foreignobject',
    'head',
    'iframe',
    'math',
    'mi',
    'mn',
    'mo',
    'ms',
    'mtext',
    'noembed',
    'noframes',
    'noscript',
    'plaintext',
    'script',
    'style',
    'svg',
    'template',
    'thead',
    'title',
    'video',
    'xmp',
  ]);
  let re = null;
  const Se = Fe({}, ['audio', 'video', 'img', 'source', 'image', 'track']);
  let ut = null;
  const xt = Fe({}, [
      'alt',
      'class',
      'for',
      'id',
      'label',
      'name',
      'pattern',
      'placeholder',
      'role',
      'summary',
      'title',
      'value',
      'style',
      'xmlns',
    ]),
    at = 'http://www.w3.org/1998/Math/MathML',
    jt = 'http://www.w3.org/2000/svg',
    Yt = 'http://www.w3.org/1999/xhtml';
  let Pn = Yt,
    cs = !1,
    us = null;
  const Ho = Fe({}, [at, jt, Yt], ks);
  let Ta = Fe({}, ['mi', 'mo', 'mn', 'ms', 'mtext']),
    Aa = Fe({}, ['annotation-xml']);
  const Go = Fe({}, ['title', 'style', 'font', 'a', 'script']);
  let ta = null;
  const Zo = ['application/xhtml+xml', 'text/html'],
    Yo = 'text/html';
  let pt = null,
    Mn = null;
  const Xo = n.createElement('form'),
    Nr = function (L) {
      return L instanceof RegExp || L instanceof Function;
    },
    ds = function () {
      let L = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      if (!(Mn && Mn === L)) {
        if (
          ((!L || typeof L != 'object') && (L = {}),
          (L = tn(L)),
          (ta = Zo.indexOf(L.PARSER_MEDIA_TYPE) === -1 ? Yo : L.PARSER_MEDIA_TYPE),
          (pt = ta === 'application/xhtml+xml' ? ks : qa),
          (G = Dt(L, 'ALLOWED_TAGS') ? Fe({}, L.ALLOWED_TAGS, pt) : H),
          (de = Dt(L, 'ALLOWED_ATTR') ? Fe({}, L.ALLOWED_ATTR, pt) : Te),
          (us = Dt(L, 'ALLOWED_NAMESPACES') ? Fe({}, L.ALLOWED_NAMESPACES, ks) : Ho),
          (ut = Dt(L, 'ADD_URI_SAFE_ATTR') ? Fe(tn(xt), L.ADD_URI_SAFE_ATTR, pt) : xt),
          (re = Dt(L, 'ADD_DATA_URI_TAGS') ? Fe(tn(Se), L.ADD_DATA_URI_TAGS, pt) : Se),
          ($ = Dt(L, 'FORBID_CONTENTS') ? Fe({}, L.FORBID_CONTENTS, pt) : me),
          (ge = Dt(L, 'FORBID_TAGS') ? Fe({}, L.FORBID_TAGS, pt) : tn({})),
          (oe = Dt(L, 'FORBID_ATTR') ? Fe({}, L.FORBID_ATTR, pt) : tn({})),
          (S = Dt(L, 'USE_PROFILES') ? L.USE_PROFILES : !1),
          (W = L.ALLOW_ARIA_ATTR !== !1),
          (ae = L.ALLOW_DATA_ATTR !== !1),
          (he = L.ALLOW_UNKNOWN_PROTOCOLS || !1),
          (R = L.ALLOW_SELF_CLOSE_IN_ATTR !== !1),
          (X = L.SAFE_FOR_TEMPLATES || !1),
          (U = L.SAFE_FOR_XML !== !1),
          (ie = L.WHOLE_DOCUMENT || !1),
          (Q = L.RETURN_DOM || !1),
          (ke = L.RETURN_DOM_FRAGMENT || !1),
          (w = L.RETURN_TRUSTED_TYPE || !1),
          (Le = L.FORCE_BODY || !1),
          (u = L.SANITIZE_DOM !== !1),
          (m = L.SANITIZE_NAMED_PROPS || !1),
          (q = L.KEEP_CONTENT !== !1),
          (z = L.IN_PLACE || !1),
          (F = L.ALLOWED_URI_REGEXP || vo),
          (Pn = L.NAMESPACE || Yt),
          (Ta = L.MATHML_TEXT_INTEGRATION_POINTS || Ta),
          (Aa = L.HTML_INTEGRATION_POINTS || Aa),
          (ne = L.CUSTOM_ELEMENT_HANDLING || {}),
          L.CUSTOM_ELEMENT_HANDLING &&
            Nr(L.CUSTOM_ELEMENT_HANDLING.tagNameCheck) &&
            (ne.tagNameCheck = L.CUSTOM_ELEMENT_HANDLING.tagNameCheck),
          L.CUSTOM_ELEMENT_HANDLING &&
            Nr(L.CUSTOM_ELEMENT_HANDLING.attributeNameCheck) &&
            (ne.attributeNameCheck = L.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),
          L.CUSTOM_ELEMENT_HANDLING &&
            typeof L.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements == 'boolean' &&
            (ne.allowCustomizedBuiltInElements =
              L.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),
          X && (ae = !1),
          ke && (Q = !0),
          S &&
            ((G = Fe({}, Qi)),
            (de = []),
            S.html === !0 && (Fe(G, Ki), Fe(de, Ji)),
            S.svg === !0 && (Fe(G, Es), Fe(de, As), Fe(de, La)),
            S.svgFilters === !0 && (Fe(G, Ss), Fe(de, As), Fe(de, La)),
            S.mathMl === !0 && (Fe(G, Ts), Fe(de, el), Fe(de, La))),
          L.ADD_TAGS &&
            (typeof L.ADD_TAGS == 'function'
              ? (j.tagCheck = L.ADD_TAGS)
              : (G === H && (G = tn(G)), Fe(G, L.ADD_TAGS, pt))),
          L.ADD_ATTR &&
            (typeof L.ADD_ATTR == 'function'
              ? (j.attributeCheck = L.ADD_ATTR)
              : (de === Te && (de = tn(de)), Fe(de, L.ADD_ATTR, pt))),
          L.ADD_URI_SAFE_ATTR && Fe(ut, L.ADD_URI_SAFE_ATTR, pt),
          L.FORBID_CONTENTS && ($ === me && ($ = tn($)), Fe($, L.FORBID_CONTENTS, pt)),
          q && (G['#text'] = !0),
          ie && Fe(G, ['html', 'head', 'body']),
          G.table && (Fe(G, ['tbody']), delete ge.tbody),
          L.TRUSTED_TYPES_POLICY)
        ) {
          if (typeof L.TRUSTED_TYPES_POLICY.createHTML != 'function')
            throw la('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
          if (typeof L.TRUSTED_TYPES_POLICY.createScriptURL != 'function')
            throw la(
              'TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.',
            );
          ((E = L.TRUSTED_TYPES_POLICY), (A = E.createHTML('')));
        } else
          (E === void 0 && (E = xm(v, s)),
            E !== null && typeof A == 'string' && (A = E.createHTML('')));
        (Tt && Tt(L), (Mn = L));
      }
    },
    xr = Fe({}, [...Es, ...Ss, ...bm]),
    Cr = Fe({}, [...Ts, ...ym]),
    Ko = function (L) {
      let J = k(L);
      (!J || !J.tagName) && (J = { namespaceURI: Pn, tagName: 'template' });
      const be = qa(L.tagName),
        Je = qa(J.tagName);
      return us[L.namespaceURI]
        ? L.namespaceURI === jt
          ? J.namespaceURI === Yt
            ? be === 'svg'
            : J.namespaceURI === at
              ? be === 'svg' && (Je === 'annotation-xml' || Ta[Je])
              : !!xr[be]
          : L.namespaceURI === at
            ? J.namespaceURI === Yt
              ? be === 'math'
              : J.namespaceURI === jt
                ? be === 'math' && Aa[Je]
                : !!Cr[be]
            : L.namespaceURI === Yt
              ? (J.namespaceURI === jt && !Aa[Je]) || (J.namespaceURI === at && !Ta[Je])
                ? !1
                : !Cr[be] && (Go[be] || !xr[be])
              : !!(ta === 'application/xhtml+xml' && us[L.namespaceURI])
        : !1;
    },
    zt = function (L) {
      ra(t.removed, { element: L });
      try {
        k(L).removeChild(L);
      } catch {
        O(L);
      }
    },
    Tn = function (L, J) {
      try {
        ra(t.removed, { attribute: J.getAttributeNode(L), from: J });
      } catch {
        ra(t.removed, { attribute: null, from: J });
      }
      if ((J.removeAttribute(L), L === 'is'))
        if (Q || ke)
          try {
            zt(J);
          } catch {}
        else
          try {
            J.setAttribute(L, '');
          } catch {}
    },
    Or = function (L) {
      let J = null,
        be = null;
      if (Le) L = '<remove></remove>' + L;
      else {
        const it = ws(L, /^[\r\n\t ]+/);
        be = it && it[0];
      }
      ta === 'application/xhtml+xml' &&
        Pn === Yt &&
        (L =
          '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + L + '</body></html>');
      const Je = E ? E.createHTML(L) : L;
      if (Pn === Yt)
        try {
          J = new g().parseFromString(Je, ta);
        } catch {}
      if (!J || !J.documentElement) {
        J = I.createDocument(Pn, 'template', null);
        try {
          J.documentElement.innerHTML = cs ? A : Je;
        } catch {}
      }
      const yt = J.body || J.documentElement;
      return (
        L && be && yt.insertBefore(n.createTextNode(be), yt.childNodes[0] || null),
        Pn === Yt ? M.call(J, ie ? 'html' : 'body')[0] : ie ? J.documentElement : yt
      );
    },
    Lr = function (L) {
      return C.call(
        L.ownerDocument || L,
        L,
        c.SHOW_ELEMENT |
          c.SHOW_COMMENT |
          c.SHOW_TEXT |
          c.SHOW_PROCESSING_INSTRUCTION |
          c.SHOW_CDATA_SECTION,
        null,
      );
    },
    fs = function (L) {
      return (
        L instanceof p &&
        (typeof L.nodeName != 'string' ||
          typeof L.textContent != 'string' ||
          typeof L.removeChild != 'function' ||
          !(L.attributes instanceof f) ||
          typeof L.removeAttribute != 'function' ||
          typeof L.setAttribute != 'function' ||
          typeof L.namespaceURI != 'string' ||
          typeof L.insertBefore != 'function' ||
          typeof L.hasChildNodes != 'function')
      );
    },
    Rr = function (L) {
      return typeof l == 'function' && L instanceof l;
    };
  function Xt(Ee, L, J) {
    Oa(Ee, (be) => {
      be.call(t, L, J, Mn);
    });
  }
  const Pr = function (L) {
      let J = null;
      if ((Xt(ve.beforeSanitizeElements, L, null), fs(L))) return (zt(L), !0);
      const be = pt(L.nodeName);
      if (
        (Xt(ve.uponSanitizeElement, L, { tagName: be, allowedTags: G }),
        (U &&
          L.hasChildNodes() &&
          !Rr(L.firstElementChild) &&
          kt(/<[/\w!]/g, L.innerHTML) &&
          kt(/<[/\w!]/g, L.textContent)) ||
          L.nodeType === ca.progressingInstruction ||
          (U && L.nodeType === ca.comment && kt(/<[/\w]/g, L.data)))
      )
        return (zt(L), !0);
      if (!(j.tagCheck instanceof Function && j.tagCheck(be)) && (!G[be] || ge[be])) {
        if (
          !ge[be] &&
          Dr(be) &&
          ((ne.tagNameCheck instanceof RegExp && kt(ne.tagNameCheck, be)) ||
            (ne.tagNameCheck instanceof Function && ne.tagNameCheck(be)))
        )
          return !1;
        if (q && !$[be]) {
          const Je = k(L) || L.parentNode,
            yt = V(L) || L.childNodes;
          if (yt && Je) {
            const it = yt.length;
            for (let It = it - 1; It >= 0; --It) {
              const Kt = N(yt[It], !0);
              ((Kt.__removalCount = (L.__removalCount || 0) + 1), Je.insertBefore(Kt, P(L)));
            }
          }
        }
        return (zt(L), !0);
      }
      return (L instanceof d && !Ko(L)) ||
        ((be === 'noscript' || be === 'noembed' || be === 'noframes') &&
          kt(/<\/no(script|embed|frames)/i, L.innerHTML))
        ? (zt(L), !0)
        : (X &&
            L.nodeType === ca.text &&
            ((J = L.textContent),
            Oa([Z, Ae, Ye], (Je) => {
              J = ia(J, Je, ' ');
            }),
            L.textContent !== J &&
              (ra(t.removed, { element: L.cloneNode() }), (L.textContent = J))),
          Xt(ve.afterSanitizeElements, L, null),
          !1);
    },
    Mr = function (L, J, be) {
      if (u && (J === 'id' || J === 'name') && (be in n || be in Xo)) return !1;
      if (!(ae && !oe[J] && kt(De, J))) {
        if (!(W && kt(Be, J))) {
          if (!(j.attributeCheck instanceof Function && j.attributeCheck(J, L))) {
            if (!de[J] || oe[J]) {
              if (
                !(
                  (Dr(L) &&
                    ((ne.tagNameCheck instanceof RegExp && kt(ne.tagNameCheck, L)) ||
                      (ne.tagNameCheck instanceof Function && ne.tagNameCheck(L))) &&
                    ((ne.attributeNameCheck instanceof RegExp && kt(ne.attributeNameCheck, J)) ||
                      (ne.attributeNameCheck instanceof Function &&
                        ne.attributeNameCheck(J, L)))) ||
                  (J === 'is' &&
                    ne.allowCustomizedBuiltInElements &&
                    ((ne.tagNameCheck instanceof RegExp && kt(ne.tagNameCheck, be)) ||
                      (ne.tagNameCheck instanceof Function && ne.tagNameCheck(be))))
                )
              )
                return !1;
            } else if (!ut[J]) {
              if (!kt(F, ia(be, K, ''))) {
                if (
                  !(
                    (J === 'src' || J === 'xlink:href' || J === 'href') &&
                    L !== 'script' &&
                    gm(be, 'data:') === 0 &&
                    re[L]
                  )
                ) {
                  if (!(he && !kt(B, ia(be, K, '')))) {
                    if (be) return !1;
                  }
                }
              }
            }
          }
        }
      }
      return !0;
    },
    Dr = function (L) {
      return L !== 'annotation-xml' && ws(L, ue);
    },
    Fr = function (L) {
      Xt(ve.beforeSanitizeAttributes, L, null);
      const { attributes: J } = L;
      if (!J || fs(L)) return;
      const be = {
        attrName: '',
        attrValue: '',
        keepAttr: !0,
        allowedAttributes: de,
        forceKeepAttr: void 0,
      };
      let Je = J.length;
      for (; Je--; ) {
        const yt = J[Je],
          { name: it, namespaceURI: It, value: Kt } = yt,
          Dn = pt(it),
          ms = Kt;
        let _t = it === 'value' ? ms : hm(ms);
        if (
          ((be.attrName = Dn),
          (be.attrValue = _t),
          (be.keepAttr = !0),
          (be.forceKeepAttr = void 0),
          Xt(ve.uponSanitizeAttribute, L, be),
          (_t = be.attrValue),
          m && (Dn === 'id' || Dn === 'name') && (Tn(it, L), (_t = x + _t)),
          U && kt(/((--!?|])>)|<\/(style|title|textarea)/i, _t))
        ) {
          Tn(it, L);
          continue;
        }
        if (Dn === 'attributename' && ws(_t, 'href')) {
          Tn(it, L);
          continue;
        }
        if (be.forceKeepAttr) continue;
        if (!be.keepAttr) {
          Tn(it, L);
          continue;
        }
        if (!R && kt(/\/>/i, _t)) {
          Tn(it, L);
          continue;
        }
        X &&
          Oa([Z, Ae, Ye], (Ur) => {
            _t = ia(_t, Ur, ' ');
          });
        const qr = pt(L.nodeName);
        if (!Mr(qr, Dn, _t)) {
          Tn(it, L);
          continue;
        }
        if (E && typeof v == 'object' && typeof v.getAttributeType == 'function' && !It)
          switch (v.getAttributeType(qr, Dn)) {
            case 'TrustedHTML': {
              _t = E.createHTML(_t);
              break;
            }
            case 'TrustedScriptURL': {
              _t = E.createScriptURL(_t);
              break;
            }
          }
        if (_t !== ms)
          try {
            (It ? L.setAttributeNS(It, it, _t) : L.setAttribute(it, _t),
              fs(L) ? zt(L) : Xi(t.removed));
          } catch {
            Tn(it, L);
          }
      }
      Xt(ve.afterSanitizeAttributes, L, null);
    },
    Qo = function Ee(L) {
      let J = null;
      const be = Lr(L);
      for (Xt(ve.beforeSanitizeShadowDOM, L, null); (J = be.nextNode()); )
        (Xt(ve.uponSanitizeShadowNode, J, null),
          Pr(J),
          Fr(J),
          J.content instanceof r && Ee(J.content));
      Xt(ve.afterSanitizeShadowDOM, L, null);
    };
  return (
    (t.sanitize = function (Ee) {
      let L = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {},
        J = null,
        be = null,
        Je = null,
        yt = null;
      if (((cs = !Ee), cs && (Ee = '<!-->'), typeof Ee != 'string' && !Rr(Ee)))
        if (typeof Ee.toString == 'function') {
          if (((Ee = Ee.toString()), typeof Ee != 'string'))
            throw la('dirty is not a string, aborting');
        } else throw la('toString is not a function');
      if (!t.isSupported) return Ee;
      if ((we || ds(L), (t.removed = []), typeof Ee == 'string' && (z = !1), z)) {
        if (Ee.nodeName) {
          const Kt = pt(Ee.nodeName);
          if (!G[Kt] || ge[Kt]) throw la('root node is forbidden and cannot be sanitized in-place');
        }
      } else if (Ee instanceof l)
        ((J = Or('<!---->')),
          (be = J.ownerDocument.importNode(Ee, !0)),
          (be.nodeType === ca.element && be.nodeName === 'BODY') || be.nodeName === 'HTML'
            ? (J = be)
            : J.appendChild(be));
      else {
        if (!Q && !X && !ie && Ee.indexOf('<') === -1) return E && w ? E.createHTML(Ee) : Ee;
        if (((J = Or(Ee)), !J)) return Q ? null : w ? A : '';
      }
      J && Le && zt(J.firstChild);
      const it = Lr(z ? Ee : J);
      for (; (Je = it.nextNode()); ) (Pr(Je), Fr(Je), Je.content instanceof r && Qo(Je.content));
      if (z) return Ee;
      if (Q) {
        if (ke) for (yt = D.call(J.ownerDocument); J.firstChild; ) yt.appendChild(J.firstChild);
        else yt = J;
        return ((de.shadowroot || de.shadowrootmode) && (yt = ce.call(a, yt, !0)), yt);
      }
      let It = ie ? J.outerHTML : J.innerHTML;
      return (
        ie &&
          G['!doctype'] &&
          J.ownerDocument &&
          J.ownerDocument.doctype &&
          J.ownerDocument.doctype.name &&
          kt(bo, J.ownerDocument.doctype.name) &&
          (It =
            '<!DOCTYPE ' +
            J.ownerDocument.doctype.name +
            `>
` +
            It),
        X &&
          Oa([Z, Ae, Ye], (Kt) => {
            It = ia(It, Kt, ' ');
          }),
        E && w ? E.createHTML(It) : It
      );
    }),
    (t.setConfig = function () {
      let Ee = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      (ds(Ee), (we = !0));
    }),
    (t.clearConfig = function () {
      ((Mn = null), (we = !1));
    }),
    (t.isValidAttribute = function (Ee, L, J) {
      Mn || ds({});
      const be = pt(Ee),
        Je = pt(L);
      return Mr(be, Je, J);
    }),
    (t.addHook = function (Ee, L) {
      typeof L == 'function' && ra(ve[Ee], L);
    }),
    (t.removeHook = function (Ee, L) {
      if (L !== void 0) {
        const J = mm(ve[Ee], L);
        return J === -1 ? void 0 : pm(ve[Ee], J, 1)[0];
      }
      return Xi(ve[Ee]);
    }),
    (t.removeHooks = function (Ee) {
      ve[Ee] = [];
    }),
    (t.removeAllHooks = function () {
      ve = nl();
    }),
    t
  );
}
var Cm = yo();
function _r() {
  return {
    async: !1,
    breaks: !1,
    extensions: null,
    gfm: !0,
    hooks: null,
    pedantic: !1,
    renderer: null,
    silent: !1,
    tokenizer: null,
    walkTokens: null,
  };
}
var Rn = _r();
function ko(e) {
  Rn = e;
}
var _a = { exec: () => null };
function Ge(e, t = '') {
  let n = typeof e == 'string' ? e : e.source;
  const a = {
    replace: (s, r) => {
      let i = typeof r == 'string' ? r : r.source;
      return ((i = i.replace(Et.caret, '$1')), (n = n.replace(s, i)), a);
    },
    getRegex: () => new RegExp(n, t),
  };
  return a;
}
var Et = {
    codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
    outputLinkReplace: /\\([\[\]])/g,
    indentCodeCompensation: /^(\s+)(?:```)/,
    beginningSpace: /^\s+/,
    endingHash: /#$/,
    startingSpaceChar: /^ /,
    endingSpaceChar: / $/,
    nonSpaceChar: /[^ ]/,
    newLineCharGlobal: /\n/g,
    tabCharGlobal: /\t/g,
    multipleSpaceGlobal: /\s+/g,
    blankLine: /^[ \t]*$/,
    doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
    blockquoteStart: /^ {0,3}>/,
    blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
    blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
    listReplaceTabs: /^\t+/,
    listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
    listIsTask: /^\[[ xX]\] /,
    listReplaceTask: /^\[[ xX]\] +/,
    anyLine: /\n.*\n/,
    hrefBrackets: /^<(.*)>$/,
    tableDelimiter: /[:|]/,
    tableAlignChars: /^\||\| *$/g,
    tableRowBlankLine: /\n[ \t]*$/,
    tableAlignRight: /^ *-+: *$/,
    tableAlignCenter: /^ *:-+: *$/,
    tableAlignLeft: /^ *:-+ *$/,
    startATag: /^<a /i,
    endATag: /^<\/a>/i,
    startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
    endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
    startAngleBracket: /^</,
    endAngleBracket: />$/,
    pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
    unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
    escapeTest: /[&<>"']/,
    escapeReplace: /[&<>"']/g,
    escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
    escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
    unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi,
    caret: /(^|[^\[])\^/g,
    percentDecode: /%25/g,
    findPipe: /\|/g,
    splitPipe: / \|/,
    slashPipe: /\\\|/g,
    carriageReturn: /\r\n|\r/g,
    spaceLine: /^ +$/gm,
    notSpaceStart: /^\S*/,
    endingNewline: /\n$/,
    listItemRegex: (e) => new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),
    nextBulletRegex: (e) =>
      new RegExp(`^ {0,${Math.min(3, e - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
    hrRegex: (e) =>
      new RegExp(`^ {0,${Math.min(3, e - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
    fencesBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}(?:\`\`\`|~~~)`),
    headingBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}#`),
    htmlBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}<(?:[a-z].*>|!--)`, 'i'),
  },
  Om = /^(?:[ \t]*(?:\n|$))+/,
  Lm = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,
  Rm =
    /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
  Sa = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,
  Pm = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
  vr = /(?:[*+-]|\d{1,9}[.)])/,
  wo =
    /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  Eo = Ge(wo)
    .replace(/bull/g, vr)
    .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
    .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
    .replace(/blockquote/g, / {0,3}>/)
    .replace(/heading/g, / {0,3}#{1,6}/)
    .replace(/html/g, / {0,3}<[^\n>]+>\n/)
    .replace(/\|table/g, '')
    .getRegex(),
  Mm = Ge(wo)
    .replace(/bull/g, vr)
    .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
    .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
    .replace(/blockquote/g, / {0,3}>/)
    .replace(/heading/g, / {0,3}#{1,6}/)
    .replace(/html/g, / {0,3}<[^\n>]+>\n/)
    .replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/)
    .getRegex(),
  br = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
  Dm = /^[^\n]+/,
  yr = /(?!\s*\])(?:\\.|[^\[\]\\])+/,
  Fm = Ge(
    /^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/,
  )
    .replace('label', yr)
    .replace('title', /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/)
    .getRegex(),
  qm = Ge(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/)
    .replace(/bull/g, vr)
    .getRegex(),
  is =
    'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul',
  kr = /<!--(?:-?>|[\s\S]*?(?:-->|$))/,
  Um = Ge(
    '^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))',
    'i',
  )
    .replace('comment', kr)
    .replace('tag', is)
    .replace(
      'attribute',
      / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/,
    )
    .getRegex(),
  So = Ge(br)
    .replace('hr', Sa)
    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
    .replace('|lheading', '')
    .replace('|table', '')
    .replace('blockquote', ' {0,3}>')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ')
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
    .replace('tag', is)
    .getRegex(),
  jm = Ge(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/)
    .replace('paragraph', So)
    .getRegex(),
  wr = {
    blockquote: jm,
    code: Lm,
    def: Fm,
    fences: Rm,
    heading: Pm,
    hr: Sa,
    html: Um,
    lheading: Eo,
    list: qm,
    newline: Om,
    paragraph: So,
    table: _a,
    text: Dm,
  },
  al = Ge(
    '^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)',
  )
    .replace('hr', Sa)
    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
    .replace('blockquote', ' {0,3}>')
    .replace('code', '(?: {4}| {0,3}	)[^\\n]')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ')
    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
    .replace('tag', is)
    .getRegex(),
  zm = {
    ...wr,
    lheading: Mm,
    table: al,
    paragraph: Ge(br)
      .replace('hr', Sa)
      .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
      .replace('|lheading', '')
      .replace('table', al)
      .replace('blockquote', ' {0,3}>')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ')
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
      .replace('tag', is)
      .getRegex(),
  },
  Vm = {
    ...wr,
    html: Ge(
      `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`,
    )
      .replace('comment', kr)
      .replace(
        /tag/g,
        '(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b',
      )
      .getRegex(),
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
    heading: /^(#{1,6})(.*)(?:\n+|$)/,
    fences: _a,
    lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
    paragraph: Ge(br)
      .replace('hr', Sa)
      .replace(
        'heading',
        ` *#{1,6} *[^
]`,
      )
      .replace('lheading', Eo)
      .replace('|table', '')
      .replace('blockquote', ' {0,3}>')
      .replace('|fences', '')
      .replace('|list', '')
      .replace('|html', '')
      .replace('|tag', '')
      .getRegex(),
  },
  Bm = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
  Wm = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
  To = /^( {2,}|\\)\n(?!\s*$)/,
  Hm = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
  ls = /[\p{P}\p{S}]/u,
  Er = /[\s\p{P}\p{S}]/u,
  Ao = /[^\s\p{P}\p{S}]/u,
  Gm = Ge(/^((?![*_])punctSpace)/, 'u')
    .replace(/punctSpace/g, Er)
    .getRegex(),
  Io = /(?!~)[\p{P}\p{S}]/u,
  Zm = /(?!~)[\s\p{P}\p{S}]/u,
  Ym = /(?:[^\s\p{P}\p{S}]|~)/u,
  Xm = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g,
  $o = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,
  Km = Ge($o, 'u').replace(/punct/g, ls).getRegex(),
  Qm = Ge($o, 'u').replace(/punct/g, Io).getRegex(),
  No =
    '^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)',
  Jm = Ge(No, 'gu')
    .replace(/notPunctSpace/g, Ao)
    .replace(/punctSpace/g, Er)
    .replace(/punct/g, ls)
    .getRegex(),
  ep = Ge(No, 'gu')
    .replace(/notPunctSpace/g, Ym)
    .replace(/punctSpace/g, Zm)
    .replace(/punct/g, Io)
    .getRegex(),
  tp = Ge(
    '^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)',
    'gu',
  )
    .replace(/notPunctSpace/g, Ao)
    .replace(/punctSpace/g, Er)
    .replace(/punct/g, ls)
    .getRegex(),
  np = Ge(/\\(punct)/, 'gu')
    .replace(/punct/g, ls)
    .getRegex(),
  ap = Ge(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
    .replace('scheme', /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
    .replace(
      'email',
      /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,
    )
    .getRegex(),
  sp = Ge(kr).replace('(?:-->|$)', '-->').getRegex(),
  rp = Ge(
    '^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>',
  )
    .replace('comment', sp)
    .replace(
      'attribute',
      /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/,
    )
    .getRegex(),
  Ka = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,
  ip = Ge(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/)
    .replace('label', Ka)
    .replace('href', /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/)
    .replace('title', /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/)
    .getRegex(),
  xo = Ge(/^!?\[(label)\]\[(ref)\]/)
    .replace('label', Ka)
    .replace('ref', yr)
    .getRegex(),
  Co = Ge(/^!?\[(ref)\](?:\[\])?/)
    .replace('ref', yr)
    .getRegex(),
  lp = Ge('reflink|nolink(?!\\()', 'g').replace('reflink', xo).replace('nolink', Co).getRegex(),
  Sr = {
    _backpedal: _a,
    anyPunctuation: np,
    autolink: ap,
    blockSkip: Xm,
    br: To,
    code: Wm,
    del: _a,
    emStrongLDelim: Km,
    emStrongRDelimAst: Jm,
    emStrongRDelimUnd: tp,
    escape: Bm,
    link: ip,
    nolink: Co,
    punctuation: Gm,
    reflink: xo,
    reflinkSearch: lp,
    tag: rp,
    text: Hm,
    url: _a,
  },
  op = {
    ...Sr,
    link: Ge(/^!?\[(label)\]\((.*?)\)/)
      .replace('label', Ka)
      .getRegex(),
    reflink: Ge(/^!?\[(label)\]\s*\[([^\]]*)\]/)
      .replace('label', Ka)
      .getRegex(),
  },
  er = {
    ...Sr,
    emStrongRDelimAst: ep,
    emStrongLDelim: Qm,
    url: Ge(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, 'i')
      .replace('email', /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/)
      .getRegex(),
    _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
    del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
    text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/,
  },
  cp = {
    ...er,
    br: Ge(To).replace('{2,}', '*').getRegex(),
    text: Ge(er.text)
      .replace('\\b_', '\\b_| {2,}\\n')
      .replace(/\{2,\}/g, '*')
      .getRegex(),
  },
  Ra = { normal: wr, gfm: zm, pedantic: Vm },
  ua = { normal: Sr, gfm: er, breaks: cp, pedantic: op },
  up = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' },
  sl = (e) => up[e];
function Vt(e, t) {
  if (t) {
    if (Et.escapeTest.test(e)) return e.replace(Et.escapeReplace, sl);
  } else if (Et.escapeTestNoEncode.test(e)) return e.replace(Et.escapeReplaceNoEncode, sl);
  return e;
}
function rl(e) {
  try {
    e = encodeURI(e).replace(Et.percentDecode, '%');
  } catch {
    return null;
  }
  return e;
}
function il(e, t) {
  var r;
  const n = e.replace(Et.findPipe, (i, l, d) => {
      let c = !1,
        f = l;
      for (; --f >= 0 && d[f] === '\\'; ) c = !c;
      return c ? '|' : ' |';
    }),
    a = n.split(Et.splitPipe);
  let s = 0;
  if (
    (a[0].trim() || a.shift(), a.length > 0 && !((r = a.at(-1)) != null && r.trim()) && a.pop(), t)
  )
    if (a.length > t) a.splice(t);
    else for (; a.length < t; ) a.push('');
  for (; s < a.length; s++) a[s] = a[s].trim().replace(Et.slashPipe, '|');
  return a;
}
function da(e, t, n) {
  const a = e.length;
  if (a === 0) return '';
  let s = 0;
  for (; s < a && e.charAt(a - s - 1) === t; ) s++;
  return e.slice(0, a - s);
}
function dp(e, t) {
  if (e.indexOf(t[1]) === -1) return -1;
  let n = 0;
  for (let a = 0; a < e.length; a++)
    if (e[a] === '\\') a++;
    else if (e[a] === t[0]) n++;
    else if (e[a] === t[1] && (n--, n < 0)) return a;
  return n > 0 ? -2 : -1;
}
function ll(e, t, n, a, s) {
  const r = t.href,
    i = t.title || null,
    l = e[1].replace(s.other.outputLinkReplace, '$1');
  a.state.inLink = !0;
  const d = {
    type: e[0].charAt(0) === '!' ? 'image' : 'link',
    raw: n,
    href: r,
    title: i,
    text: l,
    tokens: a.inlineTokens(l),
  };
  return ((a.state.inLink = !1), d);
}
function fp(e, t, n) {
  const a = e.match(n.other.indentCodeCompensation);
  if (a === null) return t;
  const s = a[1];
  return t
    .split(
      `
`,
    )
    .map((r) => {
      const i = r.match(n.other.beginningSpace);
      if (i === null) return r;
      const [l] = i;
      return l.length >= s.length ? r.slice(s.length) : r;
    }).join(`
`);
}
var Qa = class {
    constructor(e) {
      We(this, 'options');
      We(this, 'rules');
      We(this, 'lexer');
      this.options = e || Rn;
    }
    space(e) {
      const t = this.rules.block.newline.exec(e);
      if (t && t[0].length > 0) return { type: 'space', raw: t[0] };
    }
    code(e) {
      const t = this.rules.block.code.exec(e);
      if (t) {
        const n = t[0].replace(this.rules.other.codeRemoveIndent, '');
        return {
          type: 'code',
          raw: t[0],
          codeBlockStyle: 'indented',
          text: this.options.pedantic
            ? n
            : da(
                n,
                `
`,
              ),
        };
      }
    }
    fences(e) {
      const t = this.rules.block.fences.exec(e);
      if (t) {
        const n = t[0],
          a = fp(n, t[3] || '', this.rules);
        return {
          type: 'code',
          raw: n,
          lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, '$1') : t[2],
          text: a,
        };
      }
    }
    heading(e) {
      const t = this.rules.block.heading.exec(e);
      if (t) {
        let n = t[2].trim();
        if (this.rules.other.endingHash.test(n)) {
          const a = da(n, '#');
          (this.options.pedantic || !a || this.rules.other.endingSpaceChar.test(a)) &&
            (n = a.trim());
        }
        return {
          type: 'heading',
          raw: t[0],
          depth: t[1].length,
          text: n,
          tokens: this.lexer.inline(n),
        };
      }
    }
    hr(e) {
      const t = this.rules.block.hr.exec(e);
      if (t)
        return {
          type: 'hr',
          raw: da(
            t[0],
            `
`,
          ),
        };
    }
    blockquote(e) {
      const t = this.rules.block.blockquote.exec(e);
      if (t) {
        let n = da(
            t[0],
            `
`,
          ).split(`
`),
          a = '',
          s = '';
        const r = [];
        for (; n.length > 0; ) {
          let i = !1;
          const l = [];
          let d;
          for (d = 0; d < n.length; d++)
            if (this.rules.other.blockquoteStart.test(n[d])) (l.push(n[d]), (i = !0));
            else if (!i) l.push(n[d]);
            else break;
          n = n.slice(d);
          const c = l.join(`
`),
            f = c
              .replace(
                this.rules.other.blockquoteSetextReplace,
                `
    $1`,
              )
              .replace(this.rules.other.blockquoteSetextReplace2, '');
          ((a = a
            ? `${a}
${c}`
            : c),
            (s = s
              ? `${s}
${f}`
              : f));
          const p = this.lexer.state.top;
          if (
            ((this.lexer.state.top = !0),
            this.lexer.blockTokens(f, r, !0),
            (this.lexer.state.top = p),
            n.length === 0)
          )
            break;
          const g = r.at(-1);
          if ((g == null ? void 0 : g.type) === 'code') break;
          if ((g == null ? void 0 : g.type) === 'blockquote') {
            const v = g,
              y =
                v.raw +
                `
` +
                n.join(`
`),
              N = this.blockquote(y);
            ((r[r.length - 1] = N),
              (a = a.substring(0, a.length - v.raw.length) + N.raw),
              (s = s.substring(0, s.length - v.text.length) + N.text));
            break;
          } else if ((g == null ? void 0 : g.type) === 'list') {
            const v = g,
              y =
                v.raw +
                `
` +
                n.join(`
`),
              N = this.list(y);
            ((r[r.length - 1] = N),
              (a = a.substring(0, a.length - g.raw.length) + N.raw),
              (s = s.substring(0, s.length - v.raw.length) + N.raw),
              (n = y.substring(r.at(-1).raw.length).split(`
`)));
            continue;
          }
        }
        return { type: 'blockquote', raw: a, tokens: r, text: s };
      }
    }
    list(e) {
      let t = this.rules.block.list.exec(e);
      if (t) {
        let n = t[1].trim();
        const a = n.length > 1,
          s = {
            type: 'list',
            raw: '',
            ordered: a,
            start: a ? +n.slice(0, -1) : '',
            loose: !1,
            items: [],
          };
        ((n = a ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`),
          this.options.pedantic && (n = a ? n : '[*+-]'));
        const r = this.rules.other.listItemRegex(n);
        let i = !1;
        for (; e; ) {
          let d = !1,
            c = '',
            f = '';
          if (!(t = r.exec(e)) || this.rules.block.hr.test(e)) break;
          ((c = t[0]), (e = e.substring(c.length)));
          let p = t[2]
              .split(
                `
`,
                1,
              )[0]
              .replace(this.rules.other.listReplaceTabs, (P) => ' '.repeat(3 * P.length)),
            g = e.split(
              `
`,
              1,
            )[0],
            v = !p.trim(),
            y = 0;
          if (
            (this.options.pedantic
              ? ((y = 2), (f = p.trimStart()))
              : v
                ? (y = t[1].length + 1)
                : ((y = t[2].search(this.rules.other.nonSpaceChar)),
                  (y = y > 4 ? 1 : y),
                  (f = p.slice(y)),
                  (y += t[1].length)),
            v &&
              this.rules.other.blankLine.test(g) &&
              ((c +=
                g +
                `
`),
              (e = e.substring(g.length + 1)),
              (d = !0)),
            !d)
          ) {
            const P = this.rules.other.nextBulletRegex(y),
              V = this.rules.other.hrRegex(y),
              k = this.rules.other.fencesBeginRegex(y),
              E = this.rules.other.headingBeginRegex(y),
              A = this.rules.other.htmlBeginRegex(y);
            for (; e; ) {
              const I = e.split(
                `
`,
                1,
              )[0];
              let C;
              if (
                ((g = I),
                this.options.pedantic
                  ? ((g = g.replace(this.rules.other.listReplaceNesting, '  ')), (C = g))
                  : (C = g.replace(this.rules.other.tabCharGlobal, '    ')),
                k.test(g) || E.test(g) || A.test(g) || P.test(g) || V.test(g))
              )
                break;
              if (C.search(this.rules.other.nonSpaceChar) >= y || !g.trim())
                f +=
                  `
` + C.slice(y);
              else {
                if (
                  v ||
                  p
                    .replace(this.rules.other.tabCharGlobal, '    ')
                    .search(this.rules.other.nonSpaceChar) >= 4 ||
                  k.test(p) ||
                  E.test(p) ||
                  V.test(p)
                )
                  break;
                f +=
                  `
` + g;
              }
              (!v && !g.trim() && (v = !0),
                (c +=
                  I +
                  `
`),
                (e = e.substring(I.length + 1)),
                (p = C.slice(y)));
            }
          }
          s.loose || (i ? (s.loose = !0) : this.rules.other.doubleBlankLine.test(c) && (i = !0));
          let N = null,
            O;
          (this.options.gfm &&
            ((N = this.rules.other.listIsTask.exec(f)),
            N && ((O = N[0] !== '[ ] '), (f = f.replace(this.rules.other.listReplaceTask, '')))),
            s.items.push({
              type: 'list_item',
              raw: c,
              task: !!N,
              checked: O,
              loose: !1,
              text: f,
              tokens: [],
            }),
            (s.raw += c));
        }
        const l = s.items.at(-1);
        if (l) ((l.raw = l.raw.trimEnd()), (l.text = l.text.trimEnd()));
        else return;
        s.raw = s.raw.trimEnd();
        for (let d = 0; d < s.items.length; d++)
          if (
            ((this.lexer.state.top = !1),
            (s.items[d].tokens = this.lexer.blockTokens(s.items[d].text, [])),
            !s.loose)
          ) {
            const c = s.items[d].tokens.filter((p) => p.type === 'space'),
              f = c.length > 0 && c.some((p) => this.rules.other.anyLine.test(p.raw));
            s.loose = f;
          }
        if (s.loose) for (let d = 0; d < s.items.length; d++) s.items[d].loose = !0;
        return s;
      }
    }
    html(e) {
      const t = this.rules.block.html.exec(e);
      if (t)
        return {
          type: 'html',
          block: !0,
          raw: t[0],
          pre: t[1] === 'pre' || t[1] === 'script' || t[1] === 'style',
          text: t[0],
        };
    }
    def(e) {
      const t = this.rules.block.def.exec(e);
      if (t) {
        const n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, ' '),
          a = t[2]
            ? t[2]
                .replace(this.rules.other.hrefBrackets, '$1')
                .replace(this.rules.inline.anyPunctuation, '$1')
            : '',
          s = t[3]
            ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, '$1')
            : t[3];
        return { type: 'def', tag: n, raw: t[0], href: a, title: s };
      }
    }
    table(e) {
      var i;
      const t = this.rules.block.table.exec(e);
      if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
      const n = il(t[1]),
        a = t[2].replace(this.rules.other.tableAlignChars, '').split('|'),
        s =
          (i = t[3]) != null && i.trim()
            ? t[3].replace(this.rules.other.tableRowBlankLine, '').split(`
`)
            : [],
        r = { type: 'table', raw: t[0], header: [], align: [], rows: [] };
      if (n.length === a.length) {
        for (const l of a)
          this.rules.other.tableAlignRight.test(l)
            ? r.align.push('right')
            : this.rules.other.tableAlignCenter.test(l)
              ? r.align.push('center')
              : this.rules.other.tableAlignLeft.test(l)
                ? r.align.push('left')
                : r.align.push(null);
        for (let l = 0; l < n.length; l++)
          r.header.push({
            text: n[l],
            tokens: this.lexer.inline(n[l]),
            header: !0,
            align: r.align[l],
          });
        for (const l of s)
          r.rows.push(
            il(l, r.header.length).map((d, c) => ({
              text: d,
              tokens: this.lexer.inline(d),
              header: !1,
              align: r.align[c],
            })),
          );
        return r;
      }
    }
    lheading(e) {
      const t = this.rules.block.lheading.exec(e);
      if (t)
        return {
          type: 'heading',
          raw: t[0],
          depth: t[2].charAt(0) === '=' ? 1 : 2,
          text: t[1],
          tokens: this.lexer.inline(t[1]),
        };
    }
    paragraph(e) {
      const t = this.rules.block.paragraph.exec(e);
      if (t) {
        const n =
          t[1].charAt(t[1].length - 1) ===
          `
`
            ? t[1].slice(0, -1)
            : t[1];
        return { type: 'paragraph', raw: t[0], text: n, tokens: this.lexer.inline(n) };
      }
    }
    text(e) {
      const t = this.rules.block.text.exec(e);
      if (t) return { type: 'text', raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
    }
    escape(e) {
      const t = this.rules.inline.escape.exec(e);
      if (t) return { type: 'escape', raw: t[0], text: t[1] };
    }
    tag(e) {
      const t = this.rules.inline.tag.exec(e);
      if (t)
        return (
          !this.lexer.state.inLink && this.rules.other.startATag.test(t[0])
            ? (this.lexer.state.inLink = !0)
            : this.lexer.state.inLink &&
              this.rules.other.endATag.test(t[0]) &&
              (this.lexer.state.inLink = !1),
          !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0])
            ? (this.lexer.state.inRawBlock = !0)
            : this.lexer.state.inRawBlock &&
              this.rules.other.endPreScriptTag.test(t[0]) &&
              (this.lexer.state.inRawBlock = !1),
          {
            type: 'html',
            raw: t[0],
            inLink: this.lexer.state.inLink,
            inRawBlock: this.lexer.state.inRawBlock,
            block: !1,
            text: t[0],
          }
        );
    }
    link(e) {
      const t = this.rules.inline.link.exec(e);
      if (t) {
        const n = t[2].trim();
        if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
          if (!this.rules.other.endAngleBracket.test(n)) return;
          const r = da(n.slice(0, -1), '\\');
          if ((n.length - r.length) % 2 === 0) return;
        } else {
          const r = dp(t[2], '()');
          if (r === -2) return;
          if (r > -1) {
            const l = (t[0].indexOf('!') === 0 ? 5 : 4) + t[1].length + r;
            ((t[2] = t[2].substring(0, r)), (t[0] = t[0].substring(0, l).trim()), (t[3] = ''));
          }
        }
        let a = t[2],
          s = '';
        if (this.options.pedantic) {
          const r = this.rules.other.pedanticHrefTitle.exec(a);
          r && ((a = r[1]), (s = r[3]));
        } else s = t[3] ? t[3].slice(1, -1) : '';
        return (
          (a = a.trim()),
          this.rules.other.startAngleBracket.test(a) &&
            (this.options.pedantic && !this.rules.other.endAngleBracket.test(n)
              ? (a = a.slice(1))
              : (a = a.slice(1, -1))),
          ll(
            t,
            {
              href: a && a.replace(this.rules.inline.anyPunctuation, '$1'),
              title: s && s.replace(this.rules.inline.anyPunctuation, '$1'),
            },
            t[0],
            this.lexer,
            this.rules,
          )
        );
      }
    }
    reflink(e, t) {
      let n;
      if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
        const a = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, ' '),
          s = t[a.toLowerCase()];
        if (!s) {
          const r = n[0].charAt(0);
          return { type: 'text', raw: r, text: r };
        }
        return ll(n, s, n[0], this.lexer, this.rules);
      }
    }
    emStrong(e, t, n = '') {
      let a = this.rules.inline.emStrongLDelim.exec(e);
      if (!a || (a[3] && n.match(this.rules.other.unicodeAlphaNumeric))) return;
      if (!(a[1] || a[2] || '') || !n || this.rules.inline.punctuation.exec(n)) {
        const r = [...a[0]].length - 1;
        let i,
          l,
          d = r,
          c = 0;
        const f =
          a[0][0] === '*'
            ? this.rules.inline.emStrongRDelimAst
            : this.rules.inline.emStrongRDelimUnd;
        for (f.lastIndex = 0, t = t.slice(-1 * e.length + r); (a = f.exec(t)) != null; ) {
          if (((i = a[1] || a[2] || a[3] || a[4] || a[5] || a[6]), !i)) continue;
          if (((l = [...i].length), a[3] || a[4])) {
            d += l;
            continue;
          } else if ((a[5] || a[6]) && r % 3 && !((r + l) % 3)) {
            c += l;
            continue;
          }
          if (((d -= l), d > 0)) continue;
          l = Math.min(l, l + d + c);
          const p = [...a[0]][0].length,
            g = e.slice(0, r + a.index + p + l);
          if (Math.min(r, l) % 2) {
            const y = g.slice(1, -1);
            return { type: 'em', raw: g, text: y, tokens: this.lexer.inlineTokens(y) };
          }
          const v = g.slice(2, -2);
          return { type: 'strong', raw: g, text: v, tokens: this.lexer.inlineTokens(v) };
        }
      }
    }
    codespan(e) {
      const t = this.rules.inline.code.exec(e);
      if (t) {
        let n = t[2].replace(this.rules.other.newLineCharGlobal, ' ');
        const a = this.rules.other.nonSpaceChar.test(n),
          s =
            this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
        return (
          a && s && (n = n.substring(1, n.length - 1)),
          { type: 'codespan', raw: t[0], text: n }
        );
      }
    }
    br(e) {
      const t = this.rules.inline.br.exec(e);
      if (t) return { type: 'br', raw: t[0] };
    }
    del(e) {
      const t = this.rules.inline.del.exec(e);
      if (t) return { type: 'del', raw: t[0], text: t[2], tokens: this.lexer.inlineTokens(t[2]) };
    }
    autolink(e) {
      const t = this.rules.inline.autolink.exec(e);
      if (t) {
        let n, a;
        return (
          t[2] === '@' ? ((n = t[1]), (a = 'mailto:' + n)) : ((n = t[1]), (a = n)),
          { type: 'link', raw: t[0], text: n, href: a, tokens: [{ type: 'text', raw: n, text: n }] }
        );
      }
    }
    url(e) {
      var n;
      let t;
      if ((t = this.rules.inline.url.exec(e))) {
        let a, s;
        if (t[2] === '@') ((a = t[0]), (s = 'mailto:' + a));
        else {
          let r;
          do
            ((r = t[0]),
              (t[0] =
                ((n = this.rules.inline._backpedal.exec(t[0])) == null ? void 0 : n[0]) ?? ''));
          while (r !== t[0]);
          ((a = t[0]), t[1] === 'www.' ? (s = 'http://' + t[0]) : (s = t[0]));
        }
        return {
          type: 'link',
          raw: t[0],
          text: a,
          href: s,
          tokens: [{ type: 'text', raw: a, text: a }],
        };
      }
    }
    inlineText(e) {
      const t = this.rules.inline.text.exec(e);
      if (t) {
        const n = this.lexer.state.inRawBlock;
        return { type: 'text', raw: t[0], text: t[0], escaped: n };
      }
    }
  },
  ln = class tr {
    constructor(t) {
      We(this, 'tokens');
      We(this, 'options');
      We(this, 'state');
      We(this, 'tokenizer');
      We(this, 'inlineQueue');
      ((this.tokens = []),
        (this.tokens.links = Object.create(null)),
        (this.options = t || Rn),
        (this.options.tokenizer = this.options.tokenizer || new Qa()),
        (this.tokenizer = this.options.tokenizer),
        (this.tokenizer.options = this.options),
        (this.tokenizer.lexer = this),
        (this.inlineQueue = []),
        (this.state = { inLink: !1, inRawBlock: !1, top: !0 }));
      const n = { other: Et, block: Ra.normal, inline: ua.normal };
      (this.options.pedantic
        ? ((n.block = Ra.pedantic), (n.inline = ua.pedantic))
        : this.options.gfm &&
          ((n.block = Ra.gfm), this.options.breaks ? (n.inline = ua.breaks) : (n.inline = ua.gfm)),
        (this.tokenizer.rules = n));
    }
    static get rules() {
      return { block: Ra, inline: ua };
    }
    static lex(t, n) {
      return new tr(n).lex(t);
    }
    static lexInline(t, n) {
      return new tr(n).inlineTokens(t);
    }
    lex(t) {
      ((t = t.replace(
        Et.carriageReturn,
        `
`,
      )),
        this.blockTokens(t, this.tokens));
      for (let n = 0; n < this.inlineQueue.length; n++) {
        const a = this.inlineQueue[n];
        this.inlineTokens(a.src, a.tokens);
      }
      return ((this.inlineQueue = []), this.tokens);
    }
    blockTokens(t, n = [], a = !1) {
      var s, r, i;
      for (
        this.options.pedantic &&
        (t = t.replace(Et.tabCharGlobal, '    ').replace(Et.spaceLine, ''));
        t;

      ) {
        let l;
        if (
          (r = (s = this.options.extensions) == null ? void 0 : s.block) != null &&
          r.some((c) =>
            (l = c.call({ lexer: this }, t, n))
              ? ((t = t.substring(l.raw.length)), n.push(l), !0)
              : !1,
          )
        )
          continue;
        if ((l = this.tokenizer.space(t))) {
          t = t.substring(l.raw.length);
          const c = n.at(-1);
          l.raw.length === 1 && c !== void 0
            ? (c.raw += `
`)
            : n.push(l);
          continue;
        }
        if ((l = this.tokenizer.code(t))) {
          t = t.substring(l.raw.length);
          const c = n.at(-1);
          (c == null ? void 0 : c.type) === 'paragraph' || (c == null ? void 0 : c.type) === 'text'
            ? ((c.raw +=
                `
` + l.raw),
              (c.text +=
                `
` + l.text),
              (this.inlineQueue.at(-1).src = c.text))
            : n.push(l);
          continue;
        }
        if ((l = this.tokenizer.fences(t))) {
          ((t = t.substring(l.raw.length)), n.push(l));
          continue;
        }
        if ((l = this.tokenizer.heading(t))) {
          ((t = t.substring(l.raw.length)), n.push(l));
          continue;
        }
        if ((l = this.tokenizer.hr(t))) {
          ((t = t.substring(l.raw.length)), n.push(l));
          continue;
        }
        if ((l = this.tokenizer.blockquote(t))) {
          ((t = t.substring(l.raw.length)), n.push(l));
          continue;
        }
        if ((l = this.tokenizer.list(t))) {
          ((t = t.substring(l.raw.length)), n.push(l));
          continue;
        }
        if ((l = this.tokenizer.html(t))) {
          ((t = t.substring(l.raw.length)), n.push(l));
          continue;
        }
        if ((l = this.tokenizer.def(t))) {
          t = t.substring(l.raw.length);
          const c = n.at(-1);
          (c == null ? void 0 : c.type) === 'paragraph' || (c == null ? void 0 : c.type) === 'text'
            ? ((c.raw +=
                `
` + l.raw),
              (c.text +=
                `
` + l.raw),
              (this.inlineQueue.at(-1).src = c.text))
            : this.tokens.links[l.tag] ||
              (this.tokens.links[l.tag] = { href: l.href, title: l.title });
          continue;
        }
        if ((l = this.tokenizer.table(t))) {
          ((t = t.substring(l.raw.length)), n.push(l));
          continue;
        }
        if ((l = this.tokenizer.lheading(t))) {
          ((t = t.substring(l.raw.length)), n.push(l));
          continue;
        }
        let d = t;
        if ((i = this.options.extensions) != null && i.startBlock) {
          let c = 1 / 0;
          const f = t.slice(1);
          let p;
          (this.options.extensions.startBlock.forEach((g) => {
            ((p = g.call({ lexer: this }, f)),
              typeof p == 'number' && p >= 0 && (c = Math.min(c, p)));
          }),
            c < 1 / 0 && c >= 0 && (d = t.substring(0, c + 1)));
        }
        if (this.state.top && (l = this.tokenizer.paragraph(d))) {
          const c = n.at(-1);
          (a && (c == null ? void 0 : c.type) === 'paragraph'
            ? ((c.raw +=
                `
` + l.raw),
              (c.text +=
                `
` + l.text),
              this.inlineQueue.pop(),
              (this.inlineQueue.at(-1).src = c.text))
            : n.push(l),
            (a = d.length !== t.length),
            (t = t.substring(l.raw.length)));
          continue;
        }
        if ((l = this.tokenizer.text(t))) {
          t = t.substring(l.raw.length);
          const c = n.at(-1);
          (c == null ? void 0 : c.type) === 'text'
            ? ((c.raw +=
                `
` + l.raw),
              (c.text +=
                `
` + l.text),
              this.inlineQueue.pop(),
              (this.inlineQueue.at(-1).src = c.text))
            : n.push(l);
          continue;
        }
        if (t) {
          const c = 'Infinite loop on byte: ' + t.charCodeAt(0);
          if (this.options.silent) {
            console.error(c);
            break;
          } else throw new Error(c);
        }
      }
      return ((this.state.top = !0), n);
    }
    inline(t, n = []) {
      return (this.inlineQueue.push({ src: t, tokens: n }), n);
    }
    inlineTokens(t, n = []) {
      var l, d, c;
      let a = t,
        s = null;
      if (this.tokens.links) {
        const f = Object.keys(this.tokens.links);
        if (f.length > 0)
          for (; (s = this.tokenizer.rules.inline.reflinkSearch.exec(a)) != null; )
            f.includes(s[0].slice(s[0].lastIndexOf('[') + 1, -1)) &&
              (a =
                a.slice(0, s.index) +
                '[' +
                'a'.repeat(s[0].length - 2) +
                ']' +
                a.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
      }
      for (; (s = this.tokenizer.rules.inline.anyPunctuation.exec(a)) != null; )
        a =
          a.slice(0, s.index) +
          '++' +
          a.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
      for (; (s = this.tokenizer.rules.inline.blockSkip.exec(a)) != null; )
        a =
          a.slice(0, s.index) +
          '[' +
          'a'.repeat(s[0].length - 2) +
          ']' +
          a.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
      let r = !1,
        i = '';
      for (; t; ) {
        (r || (i = ''), (r = !1));
        let f;
        if (
          (d = (l = this.options.extensions) == null ? void 0 : l.inline) != null &&
          d.some((g) =>
            (f = g.call({ lexer: this }, t, n))
              ? ((t = t.substring(f.raw.length)), n.push(f), !0)
              : !1,
          )
        )
          continue;
        if ((f = this.tokenizer.escape(t))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        if ((f = this.tokenizer.tag(t))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        if ((f = this.tokenizer.link(t))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        if ((f = this.tokenizer.reflink(t, this.tokens.links))) {
          t = t.substring(f.raw.length);
          const g = n.at(-1);
          f.type === 'text' && (g == null ? void 0 : g.type) === 'text'
            ? ((g.raw += f.raw), (g.text += f.text))
            : n.push(f);
          continue;
        }
        if ((f = this.tokenizer.emStrong(t, a, i))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        if ((f = this.tokenizer.codespan(t))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        if ((f = this.tokenizer.br(t))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        if ((f = this.tokenizer.del(t))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        if ((f = this.tokenizer.autolink(t))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        if (!this.state.inLink && (f = this.tokenizer.url(t))) {
          ((t = t.substring(f.raw.length)), n.push(f));
          continue;
        }
        let p = t;
        if ((c = this.options.extensions) != null && c.startInline) {
          let g = 1 / 0;
          const v = t.slice(1);
          let y;
          (this.options.extensions.startInline.forEach((N) => {
            ((y = N.call({ lexer: this }, v)),
              typeof y == 'number' && y >= 0 && (g = Math.min(g, y)));
          }),
            g < 1 / 0 && g >= 0 && (p = t.substring(0, g + 1)));
        }
        if ((f = this.tokenizer.inlineText(p))) {
          ((t = t.substring(f.raw.length)),
            f.raw.slice(-1) !== '_' && (i = f.raw.slice(-1)),
            (r = !0));
          const g = n.at(-1);
          (g == null ? void 0 : g.type) === 'text'
            ? ((g.raw += f.raw), (g.text += f.text))
            : n.push(f);
          continue;
        }
        if (t) {
          const g = 'Infinite loop on byte: ' + t.charCodeAt(0);
          if (this.options.silent) {
            console.error(g);
            break;
          } else throw new Error(g);
        }
      }
      return n;
    }
  },
  Ja = class {
    constructor(e) {
      We(this, 'options');
      We(this, 'parser');
      this.options = e || Rn;
    }
    space(e) {
      return '';
    }
    code({ text: e, lang: t, escaped: n }) {
      var r;
      const a = (r = (t || '').match(Et.notSpaceStart)) == null ? void 0 : r[0],
        s =
          e.replace(Et.endingNewline, '') +
          `
`;
      return a
        ? '<pre><code class="language-' +
            Vt(a) +
            '">' +
            (n ? s : Vt(s, !0)) +
            `</code></pre>
`
        : '<pre><code>' +
            (n ? s : Vt(s, !0)) +
            `</code></pre>
`;
    }
    blockquote({ tokens: e }) {
      return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
    }
    html({ text: e }) {
      return e;
    }
    heading({ tokens: e, depth: t }) {
      return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
    }
    hr(e) {
      return `<hr>
`;
    }
    list(e) {
      const t = e.ordered,
        n = e.start;
      let a = '';
      for (let i = 0; i < e.items.length; i++) {
        const l = e.items[i];
        a += this.listitem(l);
      }
      const s = t ? 'ol' : 'ul',
        r = t && n !== 1 ? ' start="' + n + '"' : '';
      return (
        '<' +
        s +
        r +
        `>
` +
        a +
        '</' +
        s +
        `>
`
      );
    }
    listitem(e) {
      var n;
      let t = '';
      if (e.task) {
        const a = this.checkbox({ checked: !!e.checked });
        e.loose
          ? ((n = e.tokens[0]) == null ? void 0 : n.type) === 'paragraph'
            ? ((e.tokens[0].text = a + ' ' + e.tokens[0].text),
              e.tokens[0].tokens &&
                e.tokens[0].tokens.length > 0 &&
                e.tokens[0].tokens[0].type === 'text' &&
                ((e.tokens[0].tokens[0].text = a + ' ' + Vt(e.tokens[0].tokens[0].text)),
                (e.tokens[0].tokens[0].escaped = !0)))
            : e.tokens.unshift({ type: 'text', raw: a + ' ', text: a + ' ', escaped: !0 })
          : (t += a + ' ');
      }
      return (
        (t += this.parser.parse(e.tokens, !!e.loose)),
        `<li>${t}</li>
`
      );
    }
    checkbox({ checked: e }) {
      return '<input ' + (e ? 'checked="" ' : '') + 'disabled="" type="checkbox">';
    }
    paragraph({ tokens: e }) {
      return `<p>${this.parser.parseInline(e)}</p>
`;
    }
    table(e) {
      let t = '',
        n = '';
      for (let s = 0; s < e.header.length; s++) n += this.tablecell(e.header[s]);
      t += this.tablerow({ text: n });
      let a = '';
      for (let s = 0; s < e.rows.length; s++) {
        const r = e.rows[s];
        n = '';
        for (let i = 0; i < r.length; i++) n += this.tablecell(r[i]);
        a += this.tablerow({ text: n });
      }
      return (
        a && (a = `<tbody>${a}</tbody>`),
        `<table>
<thead>
` +
          t +
          `</thead>
` +
          a +
          `</table>
`
      );
    }
    tablerow({ text: e }) {
      return `<tr>
${e}</tr>
`;
    }
    tablecell(e) {
      const t = this.parser.parseInline(e.tokens),
        n = e.header ? 'th' : 'td';
      return (
        (e.align ? `<${n} align="${e.align}">` : `<${n}>`) +
        t +
        `</${n}>
`
      );
    }
    strong({ tokens: e }) {
      return `<strong>${this.parser.parseInline(e)}</strong>`;
    }
    em({ tokens: e }) {
      return `<em>${this.parser.parseInline(e)}</em>`;
    }
    codespan({ text: e }) {
      return `<code>${Vt(e, !0)}</code>`;
    }
    br(e) {
      return '<br>';
    }
    del({ tokens: e }) {
      return `<del>${this.parser.parseInline(e)}</del>`;
    }
    link({ href: e, title: t, tokens: n }) {
      const a = this.parser.parseInline(n),
        s = rl(e);
      if (s === null) return a;
      e = s;
      let r = '<a href="' + e + '"';
      return (t && (r += ' title="' + Vt(t) + '"'), (r += '>' + a + '</a>'), r);
    }
    image({ href: e, title: t, text: n, tokens: a }) {
      a && (n = this.parser.parseInline(a, this.parser.textRenderer));
      const s = rl(e);
      if (s === null) return Vt(n);
      e = s;
      let r = `<img src="${e}" alt="${n}"`;
      return (t && (r += ` title="${Vt(t)}"`), (r += '>'), r);
    }
    text(e) {
      return 'tokens' in e && e.tokens
        ? this.parser.parseInline(e.tokens)
        : 'escaped' in e && e.escaped
          ? e.text
          : Vt(e.text);
    }
  },
  Tr = class {
    strong({ text: e }) {
      return e;
    }
    em({ text: e }) {
      return e;
    }
    codespan({ text: e }) {
      return e;
    }
    del({ text: e }) {
      return e;
    }
    html({ text: e }) {
      return e;
    }
    text({ text: e }) {
      return e;
    }
    link({ text: e }) {
      return '' + e;
    }
    image({ text: e }) {
      return '' + e;
    }
    br() {
      return '';
    }
  },
  on = class nr {
    constructor(t) {
      We(this, 'options');
      We(this, 'renderer');
      We(this, 'textRenderer');
      ((this.options = t || Rn),
        (this.options.renderer = this.options.renderer || new Ja()),
        (this.renderer = this.options.renderer),
        (this.renderer.options = this.options),
        (this.renderer.parser = this),
        (this.textRenderer = new Tr()));
    }
    static parse(t, n) {
      return new nr(n).parse(t);
    }
    static parseInline(t, n) {
      return new nr(n).parseInline(t);
    }
    parse(t, n = !0) {
      var s, r;
      let a = '';
      for (let i = 0; i < t.length; i++) {
        const l = t[i];
        if (
          (r = (s = this.options.extensions) == null ? void 0 : s.renderers) != null &&
          r[l.type]
        ) {
          const c = l,
            f = this.options.extensions.renderers[c.type].call({ parser: this }, c);
          if (
            f !== !1 ||
            ![
              'space',
              'hr',
              'heading',
              'code',
              'table',
              'blockquote',
              'list',
              'html',
              'paragraph',
              'text',
            ].includes(c.type)
          ) {
            a += f || '';
            continue;
          }
        }
        const d = l;
        switch (d.type) {
          case 'space': {
            a += this.renderer.space(d);
            continue;
          }
          case 'hr': {
            a += this.renderer.hr(d);
            continue;
          }
          case 'heading': {
            a += this.renderer.heading(d);
            continue;
          }
          case 'code': {
            a += this.renderer.code(d);
            continue;
          }
          case 'table': {
            a += this.renderer.table(d);
            continue;
          }
          case 'blockquote': {
            a += this.renderer.blockquote(d);
            continue;
          }
          case 'list': {
            a += this.renderer.list(d);
            continue;
          }
          case 'html': {
            a += this.renderer.html(d);
            continue;
          }
          case 'paragraph': {
            a += this.renderer.paragraph(d);
            continue;
          }
          case 'text': {
            let c = d,
              f = this.renderer.text(c);
            for (; i + 1 < t.length && t[i + 1].type === 'text'; )
              ((c = t[++i]),
                (f +=
                  `
` + this.renderer.text(c)));
            n
              ? (a += this.renderer.paragraph({
                  type: 'paragraph',
                  raw: f,
                  text: f,
                  tokens: [{ type: 'text', raw: f, text: f, escaped: !0 }],
                }))
              : (a += f);
            continue;
          }
          default: {
            const c = 'Token with "' + d.type + '" type was not found.';
            if (this.options.silent) return (console.error(c), '');
            throw new Error(c);
          }
        }
      }
      return a;
    }
    parseInline(t, n = this.renderer) {
      var s, r;
      let a = '';
      for (let i = 0; i < t.length; i++) {
        const l = t[i];
        if (
          (r = (s = this.options.extensions) == null ? void 0 : s.renderers) != null &&
          r[l.type]
        ) {
          const c = this.options.extensions.renderers[l.type].call({ parser: this }, l);
          if (
            c !== !1 ||
            ![
              'escape',
              'html',
              'link',
              'image',
              'strong',
              'em',
              'codespan',
              'br',
              'del',
              'text',
            ].includes(l.type)
          ) {
            a += c || '';
            continue;
          }
        }
        const d = l;
        switch (d.type) {
          case 'escape': {
            a += n.text(d);
            break;
          }
          case 'html': {
            a += n.html(d);
            break;
          }
          case 'link': {
            a += n.link(d);
            break;
          }
          case 'image': {
            a += n.image(d);
            break;
          }
          case 'strong': {
            a += n.strong(d);
            break;
          }
          case 'em': {
            a += n.em(d);
            break;
          }
          case 'codespan': {
            a += n.codespan(d);
            break;
          }
          case 'br': {
            a += n.br(d);
            break;
          }
          case 'del': {
            a += n.del(d);
            break;
          }
          case 'text': {
            a += n.text(d);
            break;
          }
          default: {
            const c = 'Token with "' + d.type + '" type was not found.';
            if (this.options.silent) return (console.error(c), '');
            throw new Error(c);
          }
        }
      }
      return a;
    }
  },
  Cs,
  Ua =
    ((Cs = class {
      constructor(e) {
        We(this, 'options');
        We(this, 'block');
        this.options = e || Rn;
      }
      preprocess(e) {
        return e;
      }
      postprocess(e) {
        return e;
      }
      processAllTokens(e) {
        return e;
      }
      provideLexer() {
        return this.block ? ln.lex : ln.lexInline;
      }
      provideParser() {
        return this.block ? on.parse : on.parseInline;
      }
    }),
    We(Cs, 'passThroughHooks', new Set(['preprocess', 'postprocess', 'processAllTokens'])),
    Cs),
  mp = class {
    constructor(...e) {
      We(this, 'defaults', _r());
      We(this, 'options', this.setOptions);
      We(this, 'parse', this.parseMarkdown(!0));
      We(this, 'parseInline', this.parseMarkdown(!1));
      We(this, 'Parser', on);
      We(this, 'Renderer', Ja);
      We(this, 'TextRenderer', Tr);
      We(this, 'Lexer', ln);
      We(this, 'Tokenizer', Qa);
      We(this, 'Hooks', Ua);
      this.use(...e);
    }
    walkTokens(e, t) {
      var a, s;
      let n = [];
      for (const r of e)
        switch (((n = n.concat(t.call(this, r))), r.type)) {
          case 'table': {
            const i = r;
            for (const l of i.header) n = n.concat(this.walkTokens(l.tokens, t));
            for (const l of i.rows) for (const d of l) n = n.concat(this.walkTokens(d.tokens, t));
            break;
          }
          case 'list': {
            const i = r;
            n = n.concat(this.walkTokens(i.items, t));
            break;
          }
          default: {
            const i = r;
            (s = (a = this.defaults.extensions) == null ? void 0 : a.childTokens) != null &&
            s[i.type]
              ? this.defaults.extensions.childTokens[i.type].forEach((l) => {
                  const d = i[l].flat(1 / 0);
                  n = n.concat(this.walkTokens(d, t));
                })
              : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
          }
        }
      return n;
    }
    use(...e) {
      const t = this.defaults.extensions || { renderers: {}, childTokens: {} };
      return (
        e.forEach((n) => {
          const a = { ...n };
          if (
            ((a.async = this.defaults.async || a.async || !1),
            n.extensions &&
              (n.extensions.forEach((s) => {
                if (!s.name) throw new Error('extension name required');
                if ('renderer' in s) {
                  const r = t.renderers[s.name];
                  r
                    ? (t.renderers[s.name] = function (...i) {
                        let l = s.renderer.apply(this, i);
                        return (l === !1 && (l = r.apply(this, i)), l);
                      })
                    : (t.renderers[s.name] = s.renderer);
                }
                if ('tokenizer' in s) {
                  if (!s.level || (s.level !== 'block' && s.level !== 'inline'))
                    throw new Error("extension level must be 'block' or 'inline'");
                  const r = t[s.level];
                  (r ? r.unshift(s.tokenizer) : (t[s.level] = [s.tokenizer]),
                    s.start &&
                      (s.level === 'block'
                        ? t.startBlock
                          ? t.startBlock.push(s.start)
                          : (t.startBlock = [s.start])
                        : s.level === 'inline' &&
                          (t.startInline
                            ? t.startInline.push(s.start)
                            : (t.startInline = [s.start]))));
                }
                'childTokens' in s && s.childTokens && (t.childTokens[s.name] = s.childTokens);
              }),
              (a.extensions = t)),
            n.renderer)
          ) {
            const s = this.defaults.renderer || new Ja(this.defaults);
            for (const r in n.renderer) {
              if (!(r in s)) throw new Error(`renderer '${r}' does not exist`);
              if (['options', 'parser'].includes(r)) continue;
              const i = r,
                l = n.renderer[i],
                d = s[i];
              s[i] = (...c) => {
                let f = l.apply(s, c);
                return (f === !1 && (f = d.apply(s, c)), f || '');
              };
            }
            a.renderer = s;
          }
          if (n.tokenizer) {
            const s = this.defaults.tokenizer || new Qa(this.defaults);
            for (const r in n.tokenizer) {
              if (!(r in s)) throw new Error(`tokenizer '${r}' does not exist`);
              if (['options', 'rules', 'lexer'].includes(r)) continue;
              const i = r,
                l = n.tokenizer[i],
                d = s[i];
              s[i] = (...c) => {
                let f = l.apply(s, c);
                return (f === !1 && (f = d.apply(s, c)), f);
              };
            }
            a.tokenizer = s;
          }
          if (n.hooks) {
            const s = this.defaults.hooks || new Ua();
            for (const r in n.hooks) {
              if (!(r in s)) throw new Error(`hook '${r}' does not exist`);
              if (['options', 'block'].includes(r)) continue;
              const i = r,
                l = n.hooks[i],
                d = s[i];
              Ua.passThroughHooks.has(r)
                ? (s[i] = (c) => {
                    if (this.defaults.async)
                      return Promise.resolve(l.call(s, c)).then((p) => d.call(s, p));
                    const f = l.call(s, c);
                    return d.call(s, f);
                  })
                : (s[i] = (...c) => {
                    let f = l.apply(s, c);
                    return (f === !1 && (f = d.apply(s, c)), f);
                  });
            }
            a.hooks = s;
          }
          if (n.walkTokens) {
            const s = this.defaults.walkTokens,
              r = n.walkTokens;
            a.walkTokens = function (i) {
              let l = [];
              return (l.push(r.call(this, i)), s && (l = l.concat(s.call(this, i))), l);
            };
          }
          this.defaults = { ...this.defaults, ...a };
        }),
        this
      );
    }
    setOptions(e) {
      return ((this.defaults = { ...this.defaults, ...e }), this);
    }
    lexer(e, t) {
      return ln.lex(e, t ?? this.defaults);
    }
    parser(e, t) {
      return on.parse(e, t ?? this.defaults);
    }
    parseMarkdown(e) {
      return (n, a) => {
        const s = { ...a },
          r = { ...this.defaults, ...s },
          i = this.onError(!!r.silent, !!r.async);
        if (this.defaults.async === !0 && s.async === !1)
          return i(
            new Error(
              'marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise.',
            ),
          );
        if (typeof n > 'u' || n === null)
          return i(new Error('marked(): input parameter is undefined or null'));
        if (typeof n != 'string')
          return i(
            new Error(
              'marked(): input parameter is of type ' +
                Object.prototype.toString.call(n) +
                ', string expected',
            ),
          );
        r.hooks && ((r.hooks.options = r), (r.hooks.block = e));
        const l = r.hooks ? r.hooks.provideLexer() : e ? ln.lex : ln.lexInline,
          d = r.hooks ? r.hooks.provideParser() : e ? on.parse : on.parseInline;
        if (r.async)
          return Promise.resolve(r.hooks ? r.hooks.preprocess(n) : n)
            .then((c) => l(c, r))
            .then((c) => (r.hooks ? r.hooks.processAllTokens(c) : c))
            .then((c) =>
              r.walkTokens ? Promise.all(this.walkTokens(c, r.walkTokens)).then(() => c) : c,
            )
            .then((c) => d(c, r))
            .then((c) => (r.hooks ? r.hooks.postprocess(c) : c))
            .catch(i);
        try {
          r.hooks && (n = r.hooks.preprocess(n));
          let c = l(n, r);
          (r.hooks && (c = r.hooks.processAllTokens(c)),
            r.walkTokens && this.walkTokens(c, r.walkTokens));
          let f = d(c, r);
          return (r.hooks && (f = r.hooks.postprocess(f)), f);
        } catch (c) {
          return i(c);
        }
      };
    }
    onError(e, t) {
      return (n) => {
        if (
          ((n.message += `
Please report this to https://github.com/markedjs/marked.`),
          e)
        ) {
          const a = '<p>An error occurred:</p><pre>' + Vt(n.message + '', !0) + '</pre>';
          return t ? Promise.resolve(a) : a;
        }
        if (t) return Promise.reject(n);
        throw n;
      };
    }
  },
  On = new mp();
function He(e, t) {
  return On.parse(e, t);
}
He.options = He.setOptions = function (e) {
  return (On.setOptions(e), (He.defaults = On.defaults), ko(He.defaults), He);
};
He.getDefaults = _r;
He.defaults = Rn;
He.use = function (...e) {
  return (On.use(...e), (He.defaults = On.defaults), ko(He.defaults), He);
};
He.walkTokens = function (e, t) {
  return On.walkTokens(e, t);
};
He.parseInline = On.parseInline;
He.Parser = on;
He.parser = on.parse;
He.Renderer = Ja;
He.TextRenderer = Tr;
He.Lexer = ln;
He.lexer = ln.lex;
He.Tokenizer = Qa;
He.Hooks = Ua;
He.parse = He;
He.options;
He.setOptions;
He.use;
He.walkTokens;
He.parseInline;
on.parse;
ln.lex;
let fa = null;
function pp() {
  if (typeof window < 'u') return window;
  if (typeof globalThis < 'u' && globalThis.window) return globalThis.window;
}
function gp() {
  if (fa) return fa;
  const e = pp();
  return e ? ((fa = Cm(e)), fa.setConfig({ USE_PROFILES: { html: !0 } }), fa) : null;
}
function os(e) {
  if (!e) return '';
  const t = gp();
  return t
    ? t.sanitize(e, {
        ALLOWED_URI_REGEXP:
          /^(?:(?:https?|mailto|tel|data:image\/(?:png|jpeg|gif|webp));|[^a-z]|[a-z+.-]+:)/i,
      })
    : e.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}
He.use({ breaks: !0, gfm: !0, mangle: !1, headerIds: !1 });
function Oo(e) {
  if (!e) return '';
  const t = He.parse(e, { async: !1 }),
    n = typeof t == 'string' ? t : String(t);
  return os(n);
}
function ol(e, t = 0) {
  const n = Number(e);
  return Number.isFinite(n) ? n : t;
}
const hp = et({ total: $e().optional(), passed: $e().optional() })
    .partial()
    .transform((e) => ({ total: ol(e.total, 0), passed: ol(e.passed, 0) })),
  _p = et({
    checks: Cn(hp).optional(),
    suggestions: Nt(Cn($e())).optional(),
    releaseNotesMarkdown: je().optional(),
    releaseNotesHtml: je().optional(),
  })
    .passthrough()
    .transform((e) => {
      const t = e.checks ?? {},
        a = (Array.isArray(e.suggestions) ? e.suggestions : []).map((i, l) => ({
          id: typeof i.id == 'string' && i.id.trim() ? i.id.trim() : `suggestion-${l + 1}`,
          scope: typeof i.scope == 'string' && i.scope.trim() ? i.scope.trim() : 'general',
          title: typeof i.title == 'string' ? i.title : 'Suggerimento',
          description: typeof i.description == 'string' ? i.description : '',
          applied: !!i.applied,
          running: !!i.running,
          error: typeof i.error == 'string' && i.error.trim() ? i.error.trim() : void 0,
        })),
        s = typeof e.releaseNotesMarkdown == 'string' ? e.releaseNotesMarkdown : '',
        r = typeof e.releaseNotesHtml == 'string' ? os(e.releaseNotesHtml) : s ? Oo(s) : '';
      return { ...e, checks: t, suggestions: a, releaseNotesMarkdown: s, releaseNotesHtml: r };
    }),
  vp = et({
    id: je().optional(),
    channel: je().optional(),
    message: je().optional(),
    lastTriggeredAt: je().optional().nullable(),
  }).partial(),
  bp = et({ notifications: Nt(vp).optional() })
    .passthrough()
    .transform((e) => {
      const t = (e.notifications ?? []).map((n, a) => ({
        id: n.id && n.id.trim() ? n.id.trim() : `notification-${a + 1}`,
        channel: n.channel && n.channel.trim() ? n.channel.trim() : 'Canale interno',
        message: os(n.message || ''),
        lastTriggeredAt:
          typeof n.lastTriggeredAt == 'string' && n.lastTriggeredAt.trim()
            ? n.lastTriggeredAt
            : null,
      }));
      return { ...e, notifications: t };
    }),
  yp = et({
    releaseNotesMarkdown: je().optional(),
    releaseNotesHtml: je().optional(),
    releaseConsole: bp.optional(),
  })
    .passthrough()
    .transform((e) => {
      const t = typeof e.releaseNotesMarkdown == 'string' ? e.releaseNotesMarkdown : '',
        n = typeof e.releaseNotesHtml == 'string' ? os(e.releaseNotesHtml) : t ? Oo(t) : '';
      return {
        ...e,
        releaseNotesMarkdown: t,
        releaseNotesHtml: n,
        releaseConsole: e.releaseConsole ?? { notifications: [] },
      };
    }),
  kp = et({
    qualityRelease: $e()
      .optional()
      .transform((e) => _p.parse(e ?? {})),
    qualityReleaseContext: $e()
      .optional()
      .transform((e) => yp.parse(e ?? {})),
  }).passthrough();
function cl(e) {
  const t = e ?? {};
  return kp.parse(t);
}
function wp(e) {
  if (!(typeof e > 'u')) {
    if (e === null || (typeof e == 'string' && e.trim().toLowerCase() === 'null')) return null;
    if (typeof e == 'string') {
      const t = e.trim();
      return t.length ? t : void 0;
    }
    return e;
  }
}
function Ep(e, { refresh: t = !1 } = {}) {
  if (!t) return e;
  const n = e.includes('?') ? '&' : '?';
  return `${e}${n}refresh=1`;
}
function Lo(e) {
  if (!e) return null;
  const t = e.toLowerCase();
  return t.includes('/data/flow/') ||
    t.includes('data/flow/') ||
    t.includes('/data/nebula/') ||
    t.includes('data/nebula/') ||
    t.includes('assets/demo/')
    ? 'demo'
    : 'fallback';
}
function Sp(e = {}) {
  const t = e.logger || null,
    n = Sn('flowSnapshot', {
      endpoint: Object.prototype.hasOwnProperty.call(e, 'snapshotUrl') ? e.snapshotUrl : void 0,
      fallback: Object.prototype.hasOwnProperty.call(e, 'fallbackSnapshotUrl')
        ? wp(e.fallbackSnapshotUrl)
        : void 0,
    }),
    a = n.endpoint || '/api/v1/generation/snapshot',
    s = Gt(a),
    r = n.fallback ? dn(n.fallback) : null,
    i = hr(e.fetch),
    l = ct({
      snapshot: null,
      loading: !1,
      error: null,
      source: null,
      fallbackLabel: null,
      lastUpdatedAt: null,
      meta: null,
      refreshing: !1,
    }),
    d =
      !!e.preferFallbackFirst ||
      (!e.forceRemote && !e.preferRemote && !e.disableFallbackPreference && r && r !== s && yn());
  async function c({ force: F = !1, refresh: G = !1 } = {}) {
    var ne;
    if (l.snapshot && !F && !G) return l.snapshot;
    const H = !!l.snapshot,
      de = (G || F) && H;
    ((l.loading = !0), (l.refreshing = !!de), (l.error = null));
    const Te = !F && !G && d;
    try {
      const ge = await cm({
        attemptPrimary: async () => {
          const oe = Ep(s, { refresh: F || G }),
            j = await i(oe, { cache: 'no-store' });
          if (!j.ok) {
            const ae = new Error('errors.snapshot.remote_unavailable');
            throw ((ae.status = j.status), ae);
          }
          const W = await j.json();
          try {
            return { data: cl(W), meta: { url: oe } };
          } catch (ae) {
            throw ae instanceof gt
              ? an(ae, 'Snapshot remoto non valido', { code: 'snapshot.invalid' })
              : nn(ae, 'Snapshot remoto non valido', { code: 'snapshot.invalid' });
          }
        },
        attemptFallback: r
          ? async () => {
              const oe = await i(r, { cache: 'no-store' });
              if (!oe.ok) {
                const W = new Error('errors.snapshot.fallback_unavailable');
                throw ((W.status = oe.status), W);
              }
              const j = await oe.json();
              try {
                return { data: cl(j), meta: { url: r } };
              } catch (W) {
                throw W instanceof gt
                  ? an(W, 'Snapshot fallback non valido', { code: 'snapshot.invalid' })
                  : nn(W, 'Snapshot fallback non valido', { code: 'snapshot.invalid' });
              }
            }
          : null,
        preferFallbackFirst: Te,
        logger: t,
        scope: 'snapshot',
        events: {
          primaryStart: { event: 'snapshot.load.start', message: 'log.snapshot.load.start' },
          primarySuccess: {
            event: 'snapshot.load.success',
            level: 'info',
            message: 'log.snapshot.load.success',
            metaBuilder: (oe) => {
              var j;
              return { source: (j = oe.meta) == null ? void 0 : j.url, fallback: !1 };
            },
          },
          primaryFailure: {
            event: 'snapshot.load.failed',
            level: 'error',
            message: 'log.snapshot.load.failed',
          },
          fallbackPreferred: {
            event: 'snapshot.load.preferred',
            level: 'info',
            message: 'log.snapshot.load.preferred',
          },
          fallbackFirstFailure: {
            event: 'snapshot.load.preferred.failed',
            level: 'warning',
            message: 'log.snapshot.load.preferred_failed',
          },
          fallbackStart: {
            event: 'snapshot.load.fallback.start',
            level: 'warning',
            message: 'log.snapshot.load.fallback_start',
          },
          fallbackSuccess: {
            event: 'snapshot.load.fallback.success',
            level: 'warning',
            message: 'log.snapshot.load.fallback_success',
            metaBuilder: (oe) => {
              var j;
              return { source: (j = oe.meta) == null ? void 0 : j.url, fallback: !0 };
            },
          },
          fallbackFailure: {
            event: 'snapshot.load.fallback.failed',
            level: 'error',
            message: 'log.snapshot.load.fallback_failed',
          },
        },
      });
      return (
        (l.snapshot = (ge == null ? void 0 : ge.data) ?? {}),
        (l.meta = (ge == null ? void 0 : ge.meta) || {}),
        (l.source = (ge == null ? void 0 : ge.source) ?? 'remote'),
        (l.error = null),
        (l.lastUpdatedAt = Date.now()),
        (l.fallbackLabel =
          l.source === 'fallback'
            ? Lo((ne = ge == null ? void 0 : ge.meta) == null ? void 0 : ne.url)
            : null),
        l.snapshot
      );
    } catch (ge) {
      throw (
        (l.error = ge),
        (l.snapshot = null),
        (l.meta = null),
        (l.source = null),
        (l.fallbackLabel = null),
        ge
      );
    } finally {
      ((l.loading = !1), (l.refreshing = !1));
    }
  }
  let f = null;
  const p = () => {
    (f && clearTimeout(f),
      (f = setTimeout(() => {
        ((f = null), !l.loading && c({ refresh: !0 }).catch(() => {}));
      }, 250)));
  };
  let g;
  t && typeof t.on == 'function' && (g = t.on('snapshot.invalidate', p));
  const v = () => {
    (f && (clearTimeout(f), (f = null)),
      g ? g() : t && typeof t.off == 'function' && t.off('snapshot.invalidate', p));
  };
  Tl() && Sl(v);
  const y = T(() => l.snapshot || {}),
    N = T(() => {
      var F;
      return (
        ((F = y.value) == null ? void 0 : F.overview) || {
          objectives: [],
          blockers: [],
          completion: {},
        }
      );
    }),
    O = T(() => {
      var F;
      return (
        ((F = y.value) == null ? void 0 : F.species) || { curated: 0, total: 0, shortlist: [] }
      );
    }),
    P = T(() => {
      var F;
      return (
        ((F = y.value) == null ? void 0 : F.biomeSetup) || { config: {}, graph: {}, validators: [] }
      );
    }),
    V = T(() => {
      var F;
      return ((F = y.value) == null ? void 0 : F.biomes) || [];
    }),
    k = T(() => {
      var F;
      return ((F = y.value) == null ? void 0 : F.biomeSummary) || { validated: 0, pending: 0 };
    }),
    E = T(() => {
      var F;
      return ((F = y.value) == null ? void 0 : F.encounter) || {};
    }),
    A = T(() => {
      var F;
      return ((F = y.value) == null ? void 0 : F.encounterSummary) || { variants: 0, seeds: 0 };
    }),
    I = T(() => {
      var F;
      return ((F = y.value) == null ? void 0 : F.qualityRelease) || { checks: {} };
    }),
    C = T(() => {
      var F;
      return ((F = y.value) == null ? void 0 : F.publishing) || {};
    }),
    D = T(() => {
      var F;
      return Array.isArray((F = y.value) == null ? void 0 : F.suggestions)
        ? y.value.suggestions
        : [];
    }),
    M = T(() => {
      var F;
      return Array.isArray((F = y.value) == null ? void 0 : F.notifications)
        ? y.value.notifications
        : [];
    }),
    ce = T(() => {
      var F;
      return ((F = y.value) == null ? void 0 : F.qualityReleaseContext) || {};
    }),
    ve = T(() => {
      var Te;
      const F = ((Te = N.value) == null ? void 0 : Te.completion) || {},
        G = Number(F.total) || 0,
        H = Number(F.completed) || 0,
        de = G > 0 ? Math.round((H / G) * 100) : 0;
      return { label: `Sincronizzazione ${de}%`, percent: de };
    }),
    Z = T(() => {
      var ne, ge, oe, j, W, ae, he, R, X, U, ie, we, Le, Q, ke, w, u, m, x;
      const F = ((ne = I.value) == null ? void 0 : ne.checks) || {},
        G = Object.values(F).reduce((q, z) => q + (Number(z == null ? void 0 : z.total) || 0), 0),
        H = Object.values(F).reduce((q, z) => q + (Number(z == null ? void 0 : z.passed) || 0), 0),
        de =
          (Number((ge = k.value) == null ? void 0 : ge.validated) || 0) +
          (Number((oe = k.value) == null ? void 0 : oe.pending) || 0),
        Te =
          (Number((j = A.value) == null ? void 0 : j.variants) || 0) +
          (Number((W = A.value) == null ? void 0 : W.seeds) || 0);
      return {
        overview: {
          completed:
            Number(
              (he = (ae = N.value) == null ? void 0 : ae.completion) == null
                ? void 0
                : he.completed,
            ) || 0,
          total:
            Number(
              (X = (R = N.value) == null ? void 0 : R.completion) == null ? void 0 : X.total,
            ) || 0,
          label: 'Milestone',
        },
        species: {
          completed: Number((U = O.value) == null ? void 0 : U.curated) || 0,
          total: Number((ie = O.value) == null ? void 0 : ie.total) || 0,
          label: 'Specie',
        },
        biomeSetup: {
          completed:
            Number(
              (Le = (we = y.value) == null ? void 0 : we.biomeSetup) == null ? void 0 : Le.prepared,
            ) || 0,
          total:
            Number(
              (ke = (Q = y.value) == null ? void 0 : Q.biomeSetup) == null ? void 0 : ke.total,
            ) || 0,
          label: 'Preset',
        },
        biomes: {
          completed: Number((w = k.value) == null ? void 0 : w.validated) || 0,
          total: de,
          label: 'Biomi',
        },
        encounter: {
          completed: Number((u = A.value) == null ? void 0 : u.variants) || 0,
          total: Te,
          label: 'Varianti',
        },
        qualityRelease: { completed: H, total: G, label: 'Check QA' },
        publishing: {
          completed: Number((m = C.value) == null ? void 0 : m.artifactsReady) || 0,
          total: Number((x = C.value) == null ? void 0 : x.totalArtifacts) || 0,
          label: 'Artefatti',
        },
      };
    }),
    Ae = T(() => l.loading),
    Ye = T(() => l.error),
    De = T(() => l.source),
    Be = T(() => l.fallbackLabel),
    B = T(() => l.lastUpdatedAt),
    K = T(() => l.refreshing),
    ue = T(() => !!l.snapshot);
  return {
    state: l,
    snapshot: y,
    overview: N,
    speciesStatus: O,
    biomeSetup: P,
    biomes: V,
    biomeSummary: k,
    encounter: E,
    encounterSummary: A,
    qualityRelease: I,
    publishing: C,
    suggestions: D,
    notifications: M,
    qualityContext: ce,
    timeline: ve,
    metrics: Z,
    loading: Ae,
    error: Ye,
    source: De,
    fallbackLabel: Be,
    lastUpdatedAt: B,
    refreshing: K,
    hasSnapshot: ue,
    fetchSnapshot: c,
  };
}
function jn(e) {
  if (e == null) return null;
  const t = String(e).trim();
  return t.length ? t : null;
}
function ul(e) {
  return e
    ? typeof e == 'string'
      ? e.trim()
        ? [e.trim()]
        : []
      : Array.isArray(e)
        ? e
            .map((t) => (typeof t == 'string' ? t.trim() : String(t || '').trim()))
            .filter((t) => !!t.length)
        : []
    : [];
}
function Ro(e = {}) {
  const t = e && typeof e.corrected == 'object' && e.corrected !== null ? { ...e.corrected } : null,
    n = Array.isArray(e == null ? void 0 : e.messages)
      ? e.messages.filter(Boolean).map((s) => {
          if (typeof s == 'string') return { level: 'info', message: s };
          const r = s.level || s.severity || 'info',
            i = s.code || null,
            l = s.subject || s.scope || null,
            d = s.context && typeof s.context == 'object' ? { ...s.context } : void 0;
          return {
            level: r,
            code: i || void 0,
            message: s.message || s.text || '',
            subject: l || void 0,
            context: d,
          };
        })
      : [],
    a = Array.isArray(e == null ? void 0 : e.discarded) ? [...e.discarded] : [];
  return { corrected: t, messages: n, discarded: a };
}
function Tp(e = {}) {
  const t = {};
  return (
    e &&
      typeof e == 'object' &&
      Object.entries(e).forEach(([n, a]) => {
        a !== void 0 && (t[n] = a);
      }),
    t.request_id && !t.requestId && (t.requestId = t.request_id),
    !t.request_id && t.requestId && (t.request_id = t.requestId),
    t
  );
}
function Ap(e = {}) {
  return !e || typeof e != 'object' ? {} : { ...e };
}
function Po(e = {}) {
  const t = Ap(e.blueprint || e),
    n = Ro(e.validation || {}),
    a = Tp(e.meta || {});
  return { blueprint: t, validation: n, meta: a };
}
function Ip(e = {}) {
  const t = Number.isFinite(e.index) ? e.index : 0,
    n = typeof e.error == 'string' ? e.error : 'Errore generazione specie',
    a = jn(e.request_id || e.requestId);
  return { index: t, error: n, request_id: a, requestId: a || void 0 };
}
function Ar(e = {}) {
  const t = ul(e.trait_ids || e.traits),
    n = ul(e.fallback_trait_ids || e.fallbackTraits);
  return {
    trait_ids: t,
    biome_id: jn(e.biome_id || e.biomeId),
    seed: e.seed ?? null,
    base_name: jn(e.base_name || e.baseName),
    request_id: jn(e.request_id || e.requestId),
    fallback_trait_ids: n,
    dataset_id: jn(e.dataset_id || e.datasetId),
    profile_id: jn(e.profile_id || e.profileId),
  };
}
function Mo(e, t) {
  return e && typeof e.endpoint == 'string' && e.endpoint.trim() ? e.endpoint : t;
}
function Do(e, t) {
  if (e && Object.prototype.hasOwnProperty.call(e, 'fallback')) {
    if (e.fallback === null) return null;
    if (typeof e.fallback == 'string' && e.fallback.trim()) return e.fallback.trim();
  }
  return t;
}
function Fo(e) {
  return e && Object.prototype.hasOwnProperty.call(e, 'allowFallback') ? !!e.allowFallback : yn();
}
async function $p(e, t = {}) {
  const n = Ar(e || {});
  if (!n.trait_ids.length) throw new Error('trait_ids richiesti per la generazione specie');
  const a = Sn('generationSpecies', {
      endpoint: Object.prototype.hasOwnProperty.call(t, 'endpoint') ? t.endpoint : void 0,
      fallback: Object.prototype.hasOwnProperty.call(t, 'fallback') ? t.fallback : void 0,
    }),
    s = Gt(Mo(t, a.endpoint)),
    r = Do(t, a.fallback),
    i = r ? dn(r) : null,
    l = await un(s, {
      requestInit: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n),
        signal: t.signal,
      },
      fallbackUrl: i,
      allowFallback: Fo(t),
      errorMessage: 'Errore generazione specie',
      fallbackErrorMessage: 'Snapshot specie di fallback non disponibile',
    }),
    { data: d, error: c } = l,
    f = l.source,
    p = Po(d),
    g = { ...(p.meta || {}) };
  return (
    (g.endpoint_source = f),
    (g.endpoint_url = f === 'fallback' && i ? i : s),
    f === 'fallback' &&
      ((g.fallback_used = !0),
      (g.fallback_active = !0),
      (g.fallback_error = c ? c.message : 'Richiesta remota non disponibile')),
    (p.meta = g),
    p
  );
}
function ar(e) {
  return Array.isArray(e)
    ? e.map((t) => Ar(t)).filter((t) => Array.isArray(t.trait_ids) && t.trait_ids.length)
    : [];
}
async function Np(e, t = {}) {
  const n = Array.isArray(e == null ? void 0 : e.batch) ? ar(e.batch) : ar(e);
  if (!n.length) return { results: [], errors: [] };
  const a = Sn('generationSpeciesBatch', {
      endpoint: Object.prototype.hasOwnProperty.call(t, 'endpoint') ? t.endpoint : void 0,
      fallback: Object.prototype.hasOwnProperty.call(t, 'fallback') ? t.fallback : void 0,
    }),
    s = Gt(Mo(t, a.endpoint)),
    r = Do(t, a.fallback),
    i = r ? dn(r) : null,
    d = await un(s, {
      requestInit: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: n }),
        signal: t.signal,
      },
      fallbackUrl: i,
      allowFallback: Fo(t),
      errorMessage: 'Errore generazione batch specie',
      fallbackErrorMessage: 'Batch di fallback non disponibile',
    }),
    { data: c, error: f } = d,
    p = d.source,
    g = Array.isArray(c == null ? void 0 : c.results) ? c.results.map((O) => Po(O)) : [],
    v = Array.isArray(c == null ? void 0 : c.errors) ? c.errors.map((O) => Ip(O)) : [],
    y = p === 'fallback' && i ? i : s;
  return {
    results: g.map((O) => {
      const P = { ...(O.meta || {}) };
      return (
        (P.endpoint_source = p),
        (P.endpoint_url = y),
        p === 'fallback' &&
          ((P.fallback_used = !0),
          (P.fallback_active = !0),
          (P.fallback_error = f ? f.message : 'Richiesta remota non disponibile')),
        { ...O, meta: P }
      );
    }),
    errors: v,
    endpoint_source: p,
    endpoint_url: y,
  };
}
function dl(e = {}) {
  const t = Ro(e),
    n = t.messages.length,
    a = t.messages.filter((r) => r.level === 'warning').length,
    s = t.messages.filter((r) => r.level === 'error').length;
  return {
    total: n,
    warnings: a,
    errors: s,
    discarded: Array.isArray(t.discarded) ? t.discarded.length : 0,
    corrected: t.corrected ? 1 : 0,
  };
}
const xp = { normaliseRequest: Ar, normaliseBatchEntries: ar },
  { normaliseRequest: Cp, normaliseBatchEntries: Op } = xp,
  Lp = { endpoint: void 0, fallback: void 0, allowFallback: void 0 },
  Rp = { endpoint: void 0, fallback: void 0, allowFallback: void 0 },
  Is = new Map(),
  $s = new Map();
function fl(e) {
  if (e instanceof Error) return e;
  if (typeof e == 'string') return new Error(e);
  const t = new Error('errors.species.unknown');
  return (Object.defineProperty(t, 'cause', { value: e, configurable: !0 }), t);
}
function Pp(e) {
  const t = {
    ...e,
    trait_ids: Array.isArray(e.trait_ids) ? [...e.trait_ids].sort() : [],
    fallback_trait_ids: Array.isArray(e.fallback_trait_ids) ? [...e.fallback_trait_ids].sort() : [],
  };
  return JSON.stringify(t);
}
function Mp(e) {
  const t = e
    .map((n) => ({
      ...n,
      trait_ids: Array.isArray(n.trait_ids) ? [...n.trait_ids].sort() : [],
      fallback_trait_ids: Array.isArray(n.fallback_trait_ids)
        ? [...n.fallback_trait_ids].sort()
        : [],
    }))
    .sort((n, a) => JSON.stringify(n).localeCompare(JSON.stringify(a)));
  return JSON.stringify(t);
}
function Dp() {
  return { corrected: null, messages: [], discarded: [] };
}
function Fp(e = {}) {
  const t = e.logger || null,
    n = { ...Lp, ...(e.speciesOptions || {}) },
    a = { ...Rp, ...(e.batchOptions || {}) },
    s = ct({
      loading: !1,
      error: null,
      result: null,
      lastRequest: null,
      loadingBatch: !1,
      batchError: null,
      lastBatchResult: null,
      source: null,
      lastUpdatedAt: null,
    }),
    r = (I, C = {}) => {
      t && typeof t.log == 'function' && t.log(I, { scope: 'species', ...C });
    };
  async function i(I, { force: C = !1 } = {}) {
    var ce,
      ve,
      Z,
      Ae,
      Ye,
      De,
      Be,
      B,
      K,
      ue,
      F,
      G,
      H,
      de,
      Te,
      ne,
      ge,
      oe,
      j,
      W,
      ae,
      he,
      R,
      X,
      U,
      ie,
      we,
      Le;
    const D = Cp(I || {});
    if (!Array.isArray(D.trait_ids) || !D.trait_ids.length) {
      const Q = new Error('errors.species.trait_ids_required');
      return ((s.error = Q), Promise.reject(Q));
    }
    const M = Pp(D);
    if (!C && Is.has(M)) {
      const Q = Is.get(M);
      ((s.result = Q.result),
        (s.lastRequest = Q.request),
        (s.source =
          ((ve = (ce = Q.result) == null ? void 0 : ce.meta) == null
            ? void 0
            : ve.endpoint_source) || 'remote'),
        (s.lastUpdatedAt = Q.timestamp));
      const ke = dl(((Z = Q.result) == null ? void 0 : Z.validation) || {}),
        w = !!(
          ((Ye = (Ae = Q.result) == null ? void 0 : Ae.meta) == null ? void 0 : Ye.fallback_used) ??
          ((Be = (De = Q.result) == null ? void 0 : De.meta) == null ? void 0 : Be.fallbackUsed) ??
          ((K = (B = Q.result) == null ? void 0 : B.meta) == null ? void 0 : K.fallback_active)
        );
      return (
        r('species.cache.hit', {
          level: 'info',
          message: w ? 'log.species.cache_fallback' : 'log.species.cache_hit',
          request_id:
            ((F = (ue = Q.result) == null ? void 0 : ue.meta) == null ? void 0 : F.request_id) ||
            ((G = Q.request) == null ? void 0 : G.request_id) ||
            null,
          meta: ((H = Q.result) == null ? void 0 : H.meta) || null,
          validation: ke,
        }),
        w &&
          r('species.fallback.cached', {
            level: 'warning',
            message: 'log.species.fallback_cached',
            request_id:
              ((Te = (de = Q.result) == null ? void 0 : de.meta) == null
                ? void 0
                : Te.request_id) ||
              ((ne = Q.request) == null ? void 0 : ne.request_id) ||
              null,
            meta: ((ge = Q.result) == null ? void 0 : ge.meta) || null,
          }),
        ke.warnings > 0 &&
          r('species.validation.cached', {
            level: 'warning',
            message: 'log.species.validation_cached',
            request_id:
              ((j = (oe = Q.result) == null ? void 0 : oe.meta) == null ? void 0 : j.request_id) ||
              ((W = Q.request) == null ? void 0 : W.request_id) ||
              null,
            validation: ke,
          }),
        Q.result
      );
    }
    ((s.loading = !0),
      (s.error = null),
      r('species.requested', {
        level: 'info',
        message: 'log.species.requested',
        request_id: D.request_id || null,
        meta: { biome_id: D.biome_id, trait_ids: D.trait_ids, seed: D.seed },
      }));
    try {
      const Q = await $p(D, n),
        ke = dl(Q.validation);
      return (
        Is.set(M, { result: Q, request: D, timestamp: Date.now() }),
        (s.result = Q),
        (s.lastRequest = D),
        (s.source = ((ae = Q.meta) == null ? void 0 : ae.endpoint_source) || 'remote'),
        (s.lastUpdatedAt = Date.now()),
        r('species.success', {
          level: ke.errors > 0 ? 'warning' : 'success',
          message: ke.errors > 0 ? 'log.species.success_with_errors' : 'log.species.success',
          request_id: ((he = Q.meta) == null ? void 0 : he.request_id) || D.request_id || null,
          meta: Q.meta || null,
          validation: ke,
        }),
        !!(
          ((R = Q.meta) == null ? void 0 : R.fallback_used) ??
          ((X = Q.meta) == null ? void 0 : X.fallbackUsed) ??
          ((U = Q.meta) == null ? void 0 : U.fallback_active)
        ) &&
          r('species.fallback', {
            level: 'warning',
            message: 'log.species.fallback_triggered',
            request_id: ((ie = Q.meta) == null ? void 0 : ie.request_id) || D.request_id || null,
            meta: Q.meta || null,
          }),
        ke.warnings > 0 &&
          r('species.validation.warning', {
            level: 'warning',
            message: 'log.species.validation_warning',
            request_id: ((we = Q.meta) == null ? void 0 : we.request_id) || D.request_id || null,
            validation: ke,
          }),
        t &&
          typeof t.log == 'function' &&
          t.log('snapshot.invalidate', {
            scope: 'snapshot',
            level: 'info',
            meta: {
              source: 'species',
              request_id: ((Le = Q.meta) == null ? void 0 : Le.request_id) || D.request_id || null,
            },
          }),
        Q
      );
    } catch (Q) {
      const ke = fl(Q);
      throw (
        (s.error = ke),
        r('species.failed', {
          level: 'error',
          message: 'log.species.failed',
          request_id: D.request_id || null,
          meta: { biome_id: D.biome_id, trait_ids: D.trait_ids },
        }),
        ke
      );
    } finally {
      s.loading = !1;
    }
  }
  async function l(I, { force: C = !1 } = {}) {
    var ce, ve;
    const D = Op(Array.isArray(I) ? I : []);
    if (!D.length) return { results: [], errors: [] };
    const M = Mp(D);
    if (!C && $s.has(M)) {
      const Z = $s.get(M);
      return (
        (s.lastBatchResult = Z.result),
        r('species.batch.cache', {
          scope: 'flow',
          level: 'info',
          message: 'log.species.batch_cache_hit',
          meta: {
            entries: D.length,
            endpoint_source: ((ce = Z.result) == null ? void 0 : ce.endpoint_source) || null,
            endpoint_url: ((ve = Z.result) == null ? void 0 : ve.endpoint_url) || null,
          },
        }),
        Z.result
      );
    }
    ((s.loadingBatch = !0),
      (s.batchError = null),
      r('species.batch.requested', {
        scope: 'flow',
        level: 'info',
        message: 'log.species.batch_requested',
        meta: { entries: D.length },
      }));
    try {
      const Z = await Np({ batch: D }, a);
      return (
        $s.set(M, { result: Z, entries: D, timestamp: Date.now() }),
        (s.lastBatchResult = Z),
        r('species.batch.success', {
          scope: 'flow',
          level: Z.errors.length ? 'warning' : 'success',
          message: 'log.species.batch_success',
          meta: {
            entries: D.length,
            success: Z.results.length,
            errors: Z.errors.length,
            endpoint_source: Z.endpoint_source,
            endpoint_url: Z.endpoint_url,
          },
        }),
        Z
      );
    } catch (Z) {
      const Ae = fl(Z);
      throw (
        (s.batchError = Ae),
        r('species.batch.failed', {
          scope: 'flow',
          level: 'error',
          message: 'log.species.batch_failed',
          meta: { entries: D.length },
        }),
        Ae
      );
    } finally {
      s.loadingBatch = !1;
    }
  }
  function d() {
    var I;
    return !!(s.lastRequest && (I = s.lastRequest.trait_ids) != null && I.length);
  }
  async function c({ force: I = !0 } = {}) {
    if (!d()) throw new Error('errors.species.retry_unavailable');
    return i(s.lastRequest, { force: I });
  }
  const f = T(() => {
      var I;
      return ((I = s.result) == null ? void 0 : I.blueprint) || null;
    }),
    p = T(() => {
      var I;
      return ((I = s.result) == null ? void 0 : I.meta) || {};
    }),
    g = T(() => {
      var I;
      return ((I = s.result) == null ? void 0 : I.validation) || Dp();
    }),
    v = T(() => {
      var I, C;
      return (
        ((I = p.value) == null ? void 0 : I.request_id) ||
        ((C = p.value) == null ? void 0 : C.requestId) ||
        null
      );
    }),
    y = T(() => s.loading),
    N = T(() => s.error),
    O = T(() => s.loadingBatch),
    P = T(() => s.batchError),
    V = T(() => s.lastBatchResult),
    k = T(() => s.source || 'remote'),
    E = T(() => s.lastUpdatedAt),
    A = T(() => k.value === 'fallback');
  return {
    state: s,
    blueprint: f,
    meta: p,
    validation: g,
    requestId: v,
    loading: y,
    error: N,
    source: k,
    fallbackActive: A,
    lastUpdatedAt: E,
    loadingBatch: O,
    batchError: P,
    lastBatchResult: V,
    runSpecies: i,
    runSpeciesBatch: l,
    retry: c,
    canRetry: d,
  };
}
function qp(e, t) {
  if (e && Object.prototype.hasOwnProperty.call(e, 'fallback')) {
    if (e.fallback === null) return null;
    if (typeof e.fallback == 'string' && e.fallback.trim()) return e.fallback.trim();
  }
  return t;
}
function Up(e) {
  return e && Object.prototype.hasOwnProperty.call(e, 'allowFallback') ? !!e.allowFallback : yn();
}
async function jp(e = {}) {
  const t = Sn('traitDiagnostics', {
      endpoint: Object.prototype.hasOwnProperty.call(e, 'endpoint') ? e.endpoint : void 0,
      fallback: Object.prototype.hasOwnProperty.call(e, 'fallback') ? e.fallback : void 0,
    }),
    n = Gt(e.endpoint || t.endpoint),
    a = e.refresh ? '?refresh=true' : '',
    s = `${n}${a}`,
    r = qp(e, t.fallback),
    i = r ? dn(r) : null,
    l = await un(s, {
      requestInit: { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' },
      fallbackUrl: i,
      allowFallback: Up(e),
      errorMessage: 'Errore caricamento trait diagnostics',
      fallbackErrorMessage: 'Trait diagnostics locali non disponibili',
    }),
    { data: d, error: c } = l,
    f = l.source,
    p = d || {},
    g = (p == null ? void 0 : p.diagnostics) || p || {},
    v = { ...((p == null ? void 0 : p.meta) || {}) };
  return (
    (v.endpoint_source = f),
    (v.endpoint_url = f === 'fallback' && i ? i : n),
    f === 'fallback' && (v.fallback_error = c ? c.message : 'Richiesta remota non disponibile'),
    { diagnostics: g, meta: v }
  );
}
function zp(e) {
  if (e instanceof Error) return e;
  if (typeof e == 'string') return new Error(e);
  const t = new Error('errors.traitDiagnostics.unknown');
  return (Object.defineProperty(t, 'cause', { value: e, configurable: !0 }), t);
}
function Vp(e = {}) {
  const t = e.logger || null,
    n = e.service || jp,
    a = e.traitDiagnosticsOptions || {},
    s = ct({
      diagnostics: null,
      meta: null,
      loading: !1,
      error: null,
      source: null,
      fallbackLabel: null,
      lastUpdatedAt: null,
    }),
    r = (P, V = {}) => {
      t && typeof t.log == 'function' && t.log(P, { scope: 'quality', ...V });
    };
  async function i({ force: P = !1, refresh: V = !1 } = {}) {
    if (s.diagnostics && !P && !V) return s.diagnostics;
    ((s.loading = !0),
      (s.error = null),
      r('traitDiagnostics.requested', {
        level: 'info',
        message: V ? 'log.traitDiagnostics.refresh' : 'log.traitDiagnostics.requested',
        meta: { refresh: V },
      }));
    try {
      const { diagnostics: k, meta: E } = await n({ ...a, refresh: V });
      ((s.diagnostics = k || {}),
        (s.meta = E || {}),
        (s.source = (E == null ? void 0 : E.endpoint_source) || 'remote'));
      const A = E == null ? void 0 : E.endpoint_url;
      return (
        (s.fallbackLabel = s.source === 'fallback' ? Lo(A || null) : null),
        (s.lastUpdatedAt = Date.now()),
        r('traitDiagnostics.success', {
          level: s.source === 'fallback' ? 'warning' : 'info',
          message:
            s.source === 'fallback'
              ? 'log.traitDiagnostics.success_fallback'
              : 'log.traitDiagnostics.success',
          meta: E,
        }),
        s.source === 'fallback' &&
          r('traitDiagnostics.fallback', {
            level: 'warning',
            message: 'log.traitDiagnostics.fallback',
            meta: E,
          }),
        s.diagnostics
      );
    } catch (k) {
      const E = zp(k);
      throw (
        (s.error = E),
        r('traitDiagnostics.failed', { level: 'error', message: 'log.traitDiagnostics.failed' }),
        E
      );
    } finally {
      s.loading = !1;
    }
  }
  async function l() {
    return i({ force: !0, refresh: !0 });
  }
  const d = T(() => s.diagnostics || {}),
    c = T(() => s.meta || {}),
    f = T(() => s.loading),
    p = T(() => s.error),
    g = T(() => s.source || 'remote'),
    v = T(() => s.fallbackLabel),
    y = T(() => s.lastUpdatedAt),
    N = T(() => {
      var C;
      const P = Array.isArray((C = d.value) == null ? void 0 : C.traits) ? d.value.traits : [],
        V = {},
        k = {},
        E = {},
        A = {},
        I = {};
      for (const D of P) {
        if (!D || typeof D != 'object') continue;
        const M = D.id || void 0;
        M &&
          ((V[M] = D.label || M),
          Array.isArray(D.synergies) && (k[M] = D.synergies.filter(Boolean)),
          Array.isArray(D.usage_tags) && (E[M] = D.usage_tags.filter(Boolean)),
          D.completion_flags &&
            typeof D.completion_flags == 'object' &&
            (A[M] = D.completion_flags),
          Array.isArray(D.species_affinity) && (I[M] = D.species_affinity));
      }
      return {
        traits: P,
        labels: V,
        synergyMap: k,
        usageTags: E,
        completionFlags: A,
        speciesAffinity: I,
      };
    }),
    O = T(() => {
      var ce, ve, Z, Ae;
      const P = ((ce = d.value) == null ? void 0 : ce.summary) || {},
        V = Number(P.total_traits) || 0,
        k = Number(P.glossary_ok) || 0,
        E = Math.max(V - k, 0),
        A = Number(P.matrix_mismatch) || 0,
        I = Number(P.matrix_only_traits) || 0,
        C = Number(P.with_conflicts) || 0,
        D = [];
      V > 0 &&
        D.push({
          id: 'glossary',
          label: E === 0 ? 'Glossario OK' : 'Glossario incompleto',
          value: `${k}/${V}`,
          tone: E === 0 ? 'success' : 'warning',
        });
      const M = A + I;
      return (
        D.push({
          id: 'matrix',
          label: M === 0 ? 'Matrix OK' : 'Matrix mismatch',
          value: M === 0 ? '0 mismatch' : `${M} mismatch`,
          tone: M === 0 ? 'success' : 'warning',
        }),
        D.push({
          id: 'conflicts',
          label: C === 0 ? 'Conflicts OK' : 'Conflicts attivi',
          value: `${C}`,
          tone: C === 0 ? 'neutral' : 'warning',
        }),
        {
          badges: D,
          summary: P,
          generatedAt:
            ((ve = d.value) == null ? void 0 : ve.generated_at) ||
            ((Z = d.value) == null ? void 0 : Z.generatedAt) ||
            null,
          matrixOnlyTraits: ((Ae = d.value) == null ? void 0 : Ae.matrix_only_traits) || [],
        }
      );
    });
  return {
    state: s,
    diagnostics: d,
    meta: c,
    loading: f,
    error: p,
    source: g,
    fallbackLabel: v,
    lastUpdatedAt: y,
    traitCatalog: N,
    traitCompliance: O,
    load: i,
    reload: l,
  };
}
const Bp = { key: 0, class: 'nebula-timeline' },
  Wp = { class: 'nebula-timeline__list' },
  Hp = ['data-tone'],
  Gp = { class: 'nebula-timeline__header' },
  Zp = { class: 'nebula-timeline__title' },
  Yp = { key: 0, class: 'nebula-timeline__time' },
  Xp = { class: 'nebula-timeline__summary' },
  Kp = { key: 0, class: 'nebula-timeline__meta' },
  Qp = {
    __name: 'NebulaProgressTimeline',
    props: { entries: { type: Array, default: () => [] } },
    setup(e) {
      const t = e,
        n = T(() =>
          [...t.entries].sort((s, r) => {
            const i = new Date(s.timestamp || 0).getTime();
            return new Date(r.timestamp || 0).getTime() - i;
          }),
        );
      function a(s) {
        if (!s) return '';
        const r = new Date(s);
        return Number.isNaN(r.getTime())
          ? s
          : r.toLocaleString('it-IT', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
      }
      return (s, r) =>
        e.entries.length
          ? (h(),
            _('section', Bp, [
              r[0] || (r[0] = o('h3', null, 'Timeline Nebula', -1)),
              o('ol', Wp, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    n.value,
                    (i) => (
                      h(),
                      _(
                        'li',
                        { key: i.id, class: 'nebula-timeline__entry', 'data-tone': i.status },
                        [
                          o('header', Gp, [
                            o('span', Zp, b(i.title), 1),
                            i.timestamp ? (h(), _('time', Yp, b(a(i.timestamp)), 1)) : Y('', !0),
                          ]),
                          o('p', Xp, b(i.summary), 1),
                          i.meta ? (h(), _('p', Kp, b(i.meta), 1)) : Y('', !0),
                        ],
                        8,
                        Hp,
                      )
                    ),
                  ),
                  128,
                )),
              ]),
            ]))
          : Y('', !0);
    },
  },
  Jp = Ue(Qp, [['__scopeId', 'data-v-67ab6adb']]),
  eg = { class: 'nebula-progress' },
  tg = { class: 'nebula-progress__header' },
  ng = { class: 'nebula-progress__label' },
  ag = { class: 'nebula-progress__summary' },
  sg = { class: 'nebula-progress__meta' },
  rg = { class: 'nebula-progress__cards' },
  ig = ['data-tone'],
  lg = { key: 0, class: 'nebula-progress__bar' },
  og = { class: 'nebula-progress__grid' },
  cg = ['data-mode'],
  ug = {
    key: 0,
    class: 'nebula-progress__badge nebula-progress__badge--demo',
    'data-tone': 'offline',
  },
  dg = { key: 0, class: 'visually-hidden' },
  fg = { role: 'list' },
  mg = ['data-mode'],
  pg = { class: 'nebula-progress__telemetry-header' },
  gg = { class: 'nebula-progress__species' },
  hg = ['data-tone'],
  _g = {
    key: 0,
    class: 'nebula-progress__badge nebula-progress__badge--demo',
    'data-tone': 'offline',
  },
  vg = { class: 'nebula-progress__evolution' },
  bg = { class: 'nebula-progress__evolution-label' },
  yg = { class: 'nebula-progress__telemetry-footer' },
  kg = { class: 'nebula-progress__share' },
  wg = { key: 0, role: 'status', 'aria-live': 'polite' },
  Eg = {
    __name: 'NebulaProgressModule',
    props: {
      header: { type: Object, required: !0 },
      cards: { type: Array, default: () => [] },
      timelineEntries: { type: Array, default: () => [] },
      evolutionMatrix: { type: Array, default: () => [] },
      share: { type: Object, required: !0 },
      telemetryStatus: {
        type: Object,
        default: () => ({ mode: 'live', offline: !1, label: '', variant: 'live' }),
      },
    },
    setup(e) {
      const t = e,
        n = Pe('');
      let a = null;
      const { t: s } = ea(),
        r = T(() => {
          const g = {
              mode: 'live',
              offline: !1,
              label: s('components.nebulaProgress.telemetry.statusLive'),
              variant: 'live',
            },
            v = t.telemetryStatus || {};
          return {
            ...g,
            ...v,
            label:
              v.label ||
              (v.offline ? s('components.nebulaProgress.telemetry.statusDemo') : g.label),
          };
        }),
        i = T(() => {
          const g = (t.evolutionMatrix || []).filter((v) => v.telemetryMode !== 'live');
          if (r.value.offline) {
            const v = r.value.label;
            return g.length
              ? s('components.nebulaProgress.telemetry.offlineAnnouncementWithEntries', {
                  label: v,
                  entries: g.map((y) => y.name).join(', '),
                })
              : s('components.nebulaProgress.telemetry.offlineAnnouncement', { label: v });
          }
          return g.length
            ? s('components.nebulaProgress.telemetry.demoAnnouncement', {
                entries: g.map((v) => v.name).join(', '),
              })
            : '';
        });
      function l(g) {
        ((n.value = g),
          clearTimeout(a),
          (a = setTimeout(() => {
            n.value = '';
          }, 2500)));
      }
      function d(g) {
        const v = document.createElement('textarea');
        ((v.value = g),
          v.setAttribute('readonly', 'readonly'),
          (v.style.position = 'absolute'),
          (v.style.left = '-9999px'),
          document.body.appendChild(v),
          v.select());
        let y = !1;
        try {
          y = document.execCommand('copy');
        } catch {
          y = !1;
        }
        return (document.body.removeChild(v), y);
      }
      async function c() {
        var v;
        const g = t.share.embedSnippet;
        try {
          if ((v = navigator == null ? void 0 : navigator.clipboard) != null && v.writeText) {
            (await navigator.clipboard.writeText(g),
              l(s('components.nebulaProgress.actions.copySuccess')));
            return;
          }
        } catch {}
        d(g)
          ? l(s('components.nebulaProgress.actions.copySuccess'))
          : l(s('components.nebulaProgress.actions.copyFailure'));
      }
      function f() {
        const g = new Blob([t.share.json], { type: 'application/json' }),
          v = URL.createObjectURL(g),
          y = document.createElement('a');
        ((y.href = v),
          (y.download = `nebula-progress-${t.share.datasetId}.json`),
          document.body.appendChild(y),
          y.click(),
          document.body.removeChild(y),
          URL.revokeObjectURL(v),
          l(s('components.nebulaProgress.actions.exportSuccess')));
      }
      function p(g) {
        return g === 'success'
          ? '#73ffce'
          : g === 'warning'
            ? '#f4c060'
            : g === 'critical'
              ? '#ff6982'
              : '#61d5ff';
      }
      return (g, v) => (
        h(),
        _('section', eg, [
          o('header', tg, [
            o('div', null, [
              o(
                'p',
                ng,
                b(
                  le(s)('components.nebulaProgress.header.datasetLabel', {
                    datasetId: e.header.datasetId,
                  }),
                ),
                1,
              ),
              o('h2', null, b(e.header.title), 1),
              o('p', ag, b(e.header.summary), 1),
            ]),
            o('dl', sg, [
              o('div', null, [
                o('dt', null, b(le(s)('components.nebulaProgress.header.releaseWindow')), 1),
                o('dd', null, b(e.header.releaseWindow), 1),
              ]),
              o('div', null, [
                o('dt', null, b(le(s)('components.nebulaProgress.header.curator')), 1),
                o('dd', null, b(e.header.curator), 1),
              ]),
            ]),
          ]),
          o('div', rg, [
            (h(!0),
            _(
              te,
              null,
              se(
                e.cards,
                (y) => (
                  h(),
                  _(
                    'article',
                    { key: y.id, class: 'nebula-progress__card', 'data-tone': y.tone },
                    [
                      o('h3', null, b(y.title), 1),
                      o('p', null, b(y.body), 1),
                      y.progress !== void 0
                        ? (h(),
                          _('div', lg, [
                            o(
                              'div',
                              {
                                class: 'nebula-progress__bar-fill',
                                style: za({ width: `${Math.min(Math.max(y.progress, 0), 100)}%` }),
                              },
                              null,
                              4,
                            ),
                          ]))
                        : Y('', !0),
                    ],
                    8,
                    ig,
                  )
                ),
              ),
              128,
            )),
          ]),
          o('div', og, [
            Ne(Jp, { entries: e.timelineEntries }, null, 8, ['entries']),
            o(
              'section',
              {
                class: 'nebula-progress__telemetry',
                'data-mode': r.value.offline ? 'demo' : 'live',
                'aria-live': 'polite',
              },
              [
                o('header', null, [
                  o('h3', null, b(le(s)('components.nebulaProgress.telemetry.title')), 1),
                  o('p', null, b(le(s)('components.nebulaProgress.telemetry.description')), 1),
                  r.value.offline ? (h(), _('span', ug, b(r.value.label), 1)) : Y('', !0),
                ]),
                i.value ? (h(), _('p', dg, b(i.value), 1)) : Y('', !0),
                o('ul', fg, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(
                      e.evolutionMatrix,
                      (y) => (
                        h(),
                        _(
                          'li',
                          { key: y.id, 'data-mode': y.telemetryMode === 'live' ? 'live' : 'demo' },
                          [
                            o('header', pg, [
                              o('span', gg, b(y.name), 1),
                              o(
                                'span',
                                { class: 'nebula-progress__badge', 'data-tone': y.readinessTone },
                                b(y.stage) + ' · ' + b(y.readiness),
                                9,
                                hg,
                              ),
                              y.telemetryMode !== 'live'
                                ? (h(),
                                  _(
                                    'span',
                                    _g,
                                    b(le(s)('components.nebulaProgress.telemetry.demoBadge')),
                                    1,
                                  ))
                                : Y('', !0),
                            ]),
                            Ne(
                              dc,
                              {
                                points: y.telemetryHistory,
                                color: p(y.readinessTone),
                                variant: y.telemetryMode !== 'live' ? 'demo' : 'live',
                                'summary-label': le(s)(
                                  'components.nebulaProgress.telemetry.summaryLabel',
                                  { name: y.name },
                                ),
                              },
                              null,
                              8,
                              ['points', 'color', 'variant', 'summary-label'],
                            ),
                            o('div', vg, [
                              o(
                                'div',
                                {
                                  class: 'nebula-progress__evolution-fill',
                                  style: za({ width: `${y.telemetryCoverage}%` }),
                                },
                                null,
                                4,
                              ),
                              o('span', bg, b(y.telemetryLabel), 1),
                            ]),
                            o('footer', yg, [
                              o('span', null, b(y.telemetryTimestamp), 1),
                              o(
                                'span',
                                null,
                                b(
                                  le(s)('components.nebulaProgress.telemetry.owner', {
                                    owner: y.telemetryOwner,
                                  }),
                                ),
                                1,
                              ),
                            ]),
                          ],
                          8,
                          mg,
                        )
                      ),
                    ),
                    128,
                  )),
                ]),
              ],
              8,
              cg,
            ),
          ]),
          o('footer', kg, [
            o(
              'button',
              { type: 'button', onClick: c },
              b(le(s)('components.nebulaProgress.actions.copyCanvas')),
              1,
            ),
            o(
              'button',
              { type: 'button', onClick: f },
              b(le(s)('components.nebulaProgress.actions.exportJson')),
              1,
            ),
            n.value ? (h(), _('output', wg, b(n.value), 1)) : Y('', !0),
          ]),
        ])
      );
    },
  },
  Sg = Ue(Eg, [['__scopeId', 'data-v-223eb9f4']]);
function lt(e, t = 0) {
  const n = Number(e);
  return Number.isFinite(n) ? n : t;
}
function Pa(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : void 0;
}
function Tg(e) {
  if (e == null) return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function ja(e) {
  return Array.isArray(e) ? e.map((t) => Number(t)).filter((t) => Number.isFinite(t)) : [];
}
function ma(e) {
  return Array.isArray(e)
    ? e.map((t) => (typeof t == 'string' ? t.trim() : '')).filter((t) => t.length > 0)
    : [];
}
const qo = et({
    id: je(),
    title: je(),
    summary: je().default(''),
    releaseWindow: je().optional().nullable(),
    curator: je().optional().nullable(),
    metrics: et({ species: $e().optional(), biomes: $e().optional(), encounters: $e().optional() })
      .partial()
      .transform((e) => ({
        species: Pa(e.species),
        biomes: Pa(e.biomes),
        encounters: Pa(e.encounters),
      }))
      .optional(),
    highlights: $e()
      .optional()
      .transform((e) => ma(e))
      .default([]),
    species: Nt(
      et({
        id: je(),
        name: je(),
        readiness: je().optional(),
        archetype: je().optional(),
        telemetry: et({
          coverage: $e().optional(),
          lastValidation: je().optional(),
          curatedBy: je().optional(),
        })
          .partial()
          .transform((e) => ({
            coverage: Pa(e.coverage),
            lastValidation: typeof e.lastValidation == 'string' ? e.lastValidation : void 0,
            curatedBy: typeof e.curatedBy == 'string' ? e.curatedBy : void 0,
          }))
          .optional(),
        traits: et({ core: $e().optional(), optional: $e().optional(), synergy: $e().optional() })
          .partial()
          .transform((e) => ({
            core: ma(e.core),
            optional: ma(e.optional),
            synergy: ma(e.synergy),
          }))
          .optional(),
        habitats: $e()
          .optional()
          .transform((e) => ma(e))
          .optional(),
      }).passthrough(),
    ).default([]),
    biomes: Nt(Cn($e())).default([]),
    encounters: Nt(Cn($e())).default([]),
  }).passthrough(),
  Uo = et({
    summary: et({
      totalEvents: $e().optional(),
      openEvents: $e().optional(),
      acknowledgedEvents: $e().optional(),
      highPriorityEvents: $e().optional(),
      lastEventAt: je().optional().nullable(),
    })
      .partial()
      .transform((e) => ({
        totalEvents: lt(e.totalEvents, 0),
        openEvents: lt(e.openEvents, 0),
        acknowledgedEvents: lt(e.acknowledgedEvents, 0),
        highPriorityEvents: lt(e.highPriorityEvents, 0),
        lastEventAt: typeof e.lastEventAt == 'string' ? e.lastEventAt : null,
      })),
    coverage: et({
      average: $e().optional(),
      history: $e().optional(),
      distribution: et({
        success: $e().optional(),
        warning: $e().optional(),
        neutral: $e().optional(),
        critical: $e().optional(),
      })
        .partial()
        .optional(),
    })
      .partial()
      .transform((e) => {
        var t, n, a, s;
        return {
          average: lt(e.average, 0),
          history: ja(e.history),
          distribution: {
            success: lt((t = e.distribution) == null ? void 0 : t.success, 0),
            warning: lt((n = e.distribution) == null ? void 0 : n.warning, 0),
            neutral: lt((a = e.distribution) == null ? void 0 : a.neutral, 0),
            critical: lt((s = e.distribution) == null ? void 0 : s.critical, 0),
          },
        };
      }),
    incidents: et({
      timeline: Nt(
        et({ date: je(), total: $e().optional(), highPriority: $e().optional() })
          .partial()
          .transform((e) => ({
            date: e.date || new Date().toISOString(),
            total: lt(e.total, 0),
            highPriority: lt(e.highPriority, 0),
          })),
      ).default([]),
    })
      .partial()
      .transform((e) => ({ timeline: e.timeline ?? [] })),
    updatedAt: je().optional().nullable(),
    sample: Nt($e()).optional(),
  })
    .passthrough()
    .transform((e) => ({
      summary: e.summary,
      coverage: e.coverage,
      incidents: e.incidents,
      updatedAt: typeof e.updatedAt == 'string' ? e.updatedAt : null,
      sample: Array.isArray(e.sample) ? e.sample : [],
    })),
  jo = et({
    status: je(),
    label: je(),
    generatedAt: je().optional().nullable(),
    dataRoot: je().optional().nullable(),
    metrics: et({
      generationTimeMs: $e().optional(),
      speciesTotal: $e().optional(),
      enrichedSpecies: $e().optional(),
      eventTotal: $e().optional(),
      datasetSpeciesTotal: $e().optional(),
      coverageAverage: $e().optional(),
      coreTraits: $e().optional(),
      optionalTraits: $e().optional(),
      synergyTraits: $e().optional(),
      expectedCoreTraits: $e().optional(),
    })
      .partial()
      .transform((e) => ({
        generationTimeMs: Tg(e.generationTimeMs),
        speciesTotal: lt(e.speciesTotal, 0),
        enrichedSpecies: lt(e.enrichedSpecies, 0),
        eventTotal: lt(e.eventTotal, 0),
        datasetSpeciesTotal: lt(e.datasetSpeciesTotal, 0),
        coverageAverage: lt(e.coverageAverage, 0),
        coreTraits: lt(e.coreTraits, 0),
        optionalTraits: lt(e.optionalTraits, 0),
        synergyTraits: lt(e.synergyTraits, 0),
        expectedCoreTraits: lt(e.expectedCoreTraits, 0),
      })),
    streams: et({
      generationTime: $e().optional(),
      species: $e().optional(),
      enriched: $e().optional(),
    })
      .partial()
      .transform((e) => ({
        generationTime: ja(e.generationTime),
        species: ja(e.species),
        enriched: ja(e.enriched),
      })),
    updatedAt: je().optional().nullable(),
    sourceLabel: je().default(''),
  })
    .passthrough()
    .transform((e) => ({
      ...e,
      generatedAt: typeof e.generatedAt == 'string' ? e.generatedAt : null,
      dataRoot: typeof e.dataRoot == 'string' ? e.dataRoot : null,
      updatedAt: typeof e.updatedAt == 'string' ? e.updatedAt : null,
    })),
  Ag = et({
    dataset: qo.optional(),
    telemetry: Uo.optional(),
    generator: jo.optional(),
  }).passthrough();
function ml(e) {
  return qo.parse(e);
}
function pl(e) {
  return Uo.parse(e);
}
function Ig(e) {
  return jo.parse(e);
}
function Ns(e) {
  const t = Ag.parse(e);
  return {
    dataset: t.dataset ?? null,
    telemetry: t.telemetry ?? null,
    generator: t.generator ?? null,
  };
}
function pa(e) {
  if (e === void 0) return;
  if (e === null) return null;
  if (typeof e != 'string') return;
  const t = e.trim();
  return t || null;
}
function $g(e) {
  if (!e || typeof e != 'string') return !1;
  const t = e.trim().toLowerCase();
  return t.includes('/api/nebula/atlas') || t.endsWith('atlas.json');
}
function zo(e) {
  return e.replace(/\/(?:dataset|telemetry|generator)\/?$/i, '');
}
function xs(e, t) {
  if (!e || typeof e != 'string') return null;
  const n = e.trim();
  if (!n) return null;
  const a = n.replace(/\/+$/, ''),
    s = a.toLowerCase();
  return s.endsWith(`/${t}`)
    ? a
    : $g(a)
      ? null
      : /(?:\/dataset|\/telemetry|\/generator)\/?$/i.test(s)
        ? `${zo(a)}/${t}`
        : `${a}/${t}`;
}
function Ma(e) {
  return !e || typeof e != 'string' ? null : Gt(e);
}
function gl(e) {
  return Array.isArray(e) ? e.filter((t) => typeof t == 'string' && t.trim().length > 0) : [];
}
function hl(e) {
  if (!e) return 'neutral';
  const t = e.toLowerCase();
  return t.includes('richiede')
    ? 'critical'
    : t.includes('approvazione') || t.includes('attesa')
      ? 'warning'
      : t.includes('freeze') || t.includes('validazione completata') || t.includes('pronto')
        ? 'success'
        : 'neutral';
}
function Ng(e) {
  return e >= 85 ? 'Mega' : e >= 70 ? 'Ultimate' : e >= 55 ? 'Champion' : 'Rookie';
}
function xg(e, t) {
  const n = Number.isFinite(e) ? e : 0,
    a = Number.isFinite(t) ? t : n * 0.6,
    s = Math.max(Math.min(n - 12, n), 0),
    i = [
      Math.max(Math.round(a * 0.6), 0),
      Math.max(Math.round((a + s) / 2), 0),
      Math.max(Math.round((s + n) / 2), 0),
      Math.max(Math.round(n), 0),
    ].filter((l, d, c) => d === 0 || l !== c[d - 1]);
  return i.length >= 2 ? i : [Math.max(Math.round(n * 0.6), 0), Math.max(Math.round(n), 0)];
}
function _l(e) {
  if (!e) return 'Sync non disponibile';
  const t = new Date(e);
  if (Number.isNaN(t.getTime())) return `Sync: ${e}`;
  const n = Date.now() - t.getTime(),
    a = 60 * 1e3,
    s = 60 * a,
    r = 24 * s;
  return n < a
    ? 'Sync adesso'
    : n < s
      ? `Sync ${Math.round(n / a)} min fa`
      : n < r
        ? `Sync ${Math.round(n / s)}h fa`
        : `Sync ${Math.round(n / r)}g fa`;
}
function Da(e) {
  return {
    summary: {
      totalEvents: 0,
      openEvents: 0,
      acknowledgedEvents: 0,
      highPriorityEvents: 0,
      lastEventAt: null,
    },
    coverage: {
      average: 0,
      history: [],
      distribution: { success: 0, warning: 0, neutral: 0, critical: 0 },
    },
    incidents: { timeline: [] },
    updatedAt: e || new Date().toISOString(),
    sample: [],
  };
}
function pn(e, t = 'Errore sconosciuto') {
  if (e instanceof Error) return (!e.message && t && (e.message = t), e);
  const n = typeof e == 'string' && e.trim() ? e.trim() : t;
  return new Error(n || 'Errore sconosciuto');
}
function Cg(e = {}, t = {}) {
  const n = Sn('nebulaAtlas', {
      endpoint: Object.prototype.hasOwnProperty.call(t, 'endpoint') ? t.endpoint : void 0,
      fallback: Object.prototype.hasOwnProperty.call(t, 'fallback') ? t.fallback : void 0,
      mock: Object.prototype.hasOwnProperty.call(t, 'telemetryMock') ? t.telemetryMock : void 0,
    }),
    a = pa(n.endpoint) ?? null,
    s = a ? zo(a) : null,
    r = Object.prototype.hasOwnProperty.call(t, 'datasetEndpoint')
      ? pa(t.datasetEndpoint)
      : xs(a, 'dataset'),
    i = Object.prototype.hasOwnProperty.call(t, 'telemetryEndpoint')
      ? pa(t.telemetryEndpoint)
      : xs(a, 'telemetry'),
    l = Object.prototype.hasOwnProperty.call(t, 'generatorEndpoint')
      ? pa(t.generatorEndpoint)
      : xs(a, 'generator'),
    d = Object.prototype.hasOwnProperty.call(t, 'aggregateEndpoint') ? pa(t.aggregateEndpoint) : s,
    c = Ma(r),
    f = Ma(i),
    p = Ma(l),
    g = Ma(d),
    v = n.fallback ? dn(n.fallback) : null,
    y = n.mock ? dn(n.mock) : null,
    N = t && Object.prototype.hasOwnProperty.call(t, 'allowFallback') ? !!t.allowFallback : yn(),
    O = Number.isFinite(t.pollIntervalMs) ? Number(t.pollIntervalMs) : 15e3,
    P = hr(t.fetcher),
    V = mo('nebula'),
    k = Pe(null),
    E = Pe('static'),
    A = Pe(null),
    I = Pe(null),
    C = Pe(!1),
    D = Pe(null),
    M = Pe(null),
    ce = Pe('live');
  let ve = null;
  const Z = T(() => le(e.overview) || {}),
    Ae = T(() => le(e.qualityRelease) || {}),
    Ye = T(() => le(e.timeline) || {}),
    De = T(() => k.value || na);
  async function Be(m) {
    await mc().catch((q) => {
      V.warn('nebula.dataset.static_unavailable', {
        message: 'log.nebula.dataset.static_unavailable',
        meta: { reason: q instanceof Error ? q.message : String(q) },
      });
    });
    let x = 'static';
    if (v)
      try {
        const q = await P(v, { cache: 'no-store' });
        if (!q.ok) throw new Error(`Dataset Nebula fallback non disponibile (${q.status})`);
        const z = await q.json(),
          S = (() => {
            try {
              return z &&
                typeof z == 'object' &&
                ('dataset' in z || 'telemetry' in z || 'generator' in z)
                ? Ns(z)
                : { dataset: ml(z), telemetry: null, generator: null };
            } catch ($) {
              throw $ instanceof gt
                ? an($, 'Dataset Nebula fallback non valido', { code: 'nebula.dataset.invalid' })
                : nn($, 'Dataset Nebula fallback non valido', { code: 'nebula.dataset.invalid' });
            }
          })();
        (S != null && S.dataset ? (k.value = S.dataset) : (k.value = na),
          S != null &&
            S.telemetry &&
            ((A.value = S.telemetry),
            (M.value = S.telemetry.updatedAt || new Date().toISOString())),
          S != null && S.generator && (I.value = S.generator),
          (x = 'fallback'),
          V.warn('nebula.dataset.fallback', {
            message: 'log.nebula.dataset.fallback',
            meta: {
              source: v,
              reason: (m == null ? void 0 : m.message) || 'endpoint remoto non disponibile',
            },
          }));
      } catch (q) {
        const z = pn(q, 'Dataset Nebula locale non disponibile');
        (V.error('nebula.dataset.fallback_failed', {
          message: 'log.nebula.dataset.fallback_failed',
          meta: { source: v, reason: z.message },
        }),
          (k.value = na),
          (x = 'static'));
      }
    else ((k.value = na), (x = 'static'));
    return (
      (E.value = x),
      M.value || (M.value = new Date().toISOString()),
      A.value || (A.value = Da(M.value)),
      (ce.value = x === 'remote' ? 'live' : 'fallback'),
      (D.value = null),
      x
    );
  }
  async function B() {
    if (!g) return null;
    try {
      const m = await P(g, { cache: 'no-store' });
      if (!m.ok) throw new Error(`Aggregato Nebula non disponibile (${m.status})`);
      const x = await m.json();
      try {
        const q = Ns(x);
        return (
          V.info('nebula.dataset.aggregate', {
            message: 'log.nebula.dataset.aggregate',
            meta: { source: g },
          }),
          q
        );
      } catch (q) {
        const z =
          q instanceof gt
            ? an(q, 'Aggregato Nebula non valido', { code: 'nebula.aggregate.invalid' })
            : nn(q, 'Aggregato Nebula non valido', { code: 'nebula.aggregate.invalid' });
        return (
          V.warn('nebula.dataset.aggregate_unavailable', {
            message: 'log.nebula.dataset.aggregate_unavailable',
            meta: { reason: z.message, source: g },
          }),
          null
        );
      }
    } catch (m) {
      const x = pn(m, 'Aggregato Nebula non disponibile');
      return (
        V.warn('nebula.dataset.aggregate_unavailable', {
          message: 'log.nebula.dataset.aggregate_unavailable',
          meta: { reason: x.message, source: g },
        }),
        null
      );
    }
  }
  async function K(m) {
    if (!y) throw m || new Error('Mock telemetria non configurato');
    const x = await P(y, { cache: 'no-store' });
    if (!x.ok) {
      const S = `Mock telemetria non disponibile (${x.status})`;
      throw new Error(S);
    }
    const q = await x.json(),
      z = (() => {
        try {
          return pl(q);
        } catch (S) {
          throw S instanceof gt
            ? an(S, 'Telemetria mock non valida', { code: 'nebula.telemetry.invalid' })
            : nn(S, 'Telemetria mock non valida', { code: 'nebula.telemetry.invalid' });
        }
      })();
    ((A.value = z),
      (ce.value = 'mock'),
      (M.value = (z == null ? void 0 : z.updatedAt) || new Date().toISOString()),
      (D.value = null),
      V.warn('nebula.telemetry.mock.active', {
        message: 'log.nebula.telemetry.mock_active',
        meta: {
          source: y,
          reason: (m == null ? void 0 : m.message) || 'caricamento remoto non disponibile',
        },
        data: z,
      }));
  }
  async function ue() {
    C.value = !0;
    try {
      let m = null,
        x = E.value || 'static',
        q = null;
      const z = (re) => {
        ((m = re),
          (x = 'remote'),
          re.dataset && (k.value = re.dataset),
          re.telemetry &&
            ((A.value = re.telemetry),
            (ce.value = 'live'),
            (M.value = re.telemetry.updatedAt || M.value || new Date().toISOString())),
          re.generator && (I.value = re.generator));
      };
      if (c)
        try {
          const re = await un(c, {
              fetchImpl: P,
              requestInit: { cache: 'no-store' },
              fallbackUrl: v,
              allowFallback: N,
              errorMessage: 'Impossibile caricare dataset Nebula',
              fallbackErrorMessage: 'Dataset Nebula locale non disponibile',
            }),
            { data: Se, source: ut, error: xt } = re,
            at = (() => {
              try {
                return Se &&
                  typeof Se == 'object' &&
                  ('dataset' in Se || 'telemetry' in Se || 'generator' in Se)
                  ? Ns(Se)
                  : { dataset: ml(Se ?? {}), telemetry: null, generator: null };
              } catch (jt) {
                throw jt instanceof gt
                  ? an(jt, 'Dataset Nebula non valido', { code: 'nebula.dataset.invalid' })
                  : nn(jt, 'Dataset Nebula non valido', { code: 'nebula.dataset.invalid' });
              }
            })();
          ((x = ut === 'fallback' ? 'fallback' : 'remote'),
            (m = at),
            at != null && at.dataset && (k.value = at.dataset),
            at != null &&
              at.telemetry &&
              ((A.value = at.telemetry),
              (ce.value = ut === 'fallback' ? 'fallback' : 'live'),
              (M.value = at.telemetry.updatedAt || new Date().toISOString())),
            at != null && at.generator && (I.value = at.generator),
            (E.value = x),
            (D.value = null),
            ut === 'fallback'
              ? V.warn('nebula.dataset.remote_fallback', {
                  message: 'log.nebula.dataset.remote_fallback',
                  meta: {
                    source: v,
                    reason: (xt == null ? void 0 : xt.message) || 'endpoint remoto non disponibile',
                  },
                })
              : V.info('nebula.dataset.remote', {
                  message: 'log.nebula.dataset.remote',
                  meta: { source: c },
                }));
        } catch (re) {
          if (((q = pn(re)), g)) {
            const Se = await B();
            Se && (z(Se), (q = null));
          }
        }
      else if (g) {
        const re = await B();
        re
          ? (z(re),
            V.info('nebula.dataset.remote', {
              message: 'log.nebula.dataset.remote',
              meta: { source: g },
            }))
          : (q = new Error('Aggregato Nebula non disponibile'));
      } else q = new Error('Endpoint dataset Nebula non configurato');
      if (
        q &&
        (V.warn('nebula.dataset.remote_unavailable', {
          message: 'log.nebula.dataset.remote_unavailable',
          meta: { reason: q.message },
        }),
        (x = await Be(q)),
        (m = null),
        x === 'static')
      )
        try {
          await K(q);
        } catch (re) {
          const Se = pn(re);
          (V.error('nebula.telemetry.mock.failed', {
            message: 'log.nebula.telemetry.mock_failed',
            meta: { reason: Se.message },
          }),
            A.value || (A.value = Da(M.value)));
        }
      (k.value || (k.value = na), (E.value = x), M.value || (M.value = new Date().toISOString()));
      const S = async () => {
        if (m) return m;
        const re = await B();
        return (re && (m = re), m);
      };
      let $ = !1;
      if (f)
        try {
          const re = await un(f, {
            fetchImpl: P,
            requestInit: { cache: 'no-store' },
            allowFallback: !1,
            errorMessage: 'Impossibile caricare telemetria Nebula',
          });
          try {
            const Se = pl(re.data);
            ((A.value = Se),
              (ce.value = 'live'),
              (M.value =
                (Se == null ? void 0 : Se.updatedAt) || M.value || new Date().toISOString()),
              ($ = !0));
          } catch (Se) {
            const ut =
              Se instanceof gt
                ? an(Se, 'Telemetria Nebula non valida', { code: 'nebula.telemetry.invalid' })
                : nn(Se, 'Telemetria Nebula non valida', { code: 'nebula.telemetry.invalid' });
            V.warn('nebula.telemetry.remote_unavailable', {
              message: 'log.nebula.telemetry.remote_unavailable',
              meta: { reason: ut.message },
            });
          }
        } catch (re) {
          const Se = pn(re);
          V.warn('nebula.telemetry.remote_unavailable', {
            message: 'log.nebula.telemetry.remote_unavailable',
            meta: { reason: Se.message },
          });
        }
      if (!$)
        if (A.value) ce.value === 'live' && x !== 'remote' && (ce.value = 'fallback');
        else {
          const re = await S();
          re != null && re.telemetry
            ? ((A.value = re.telemetry),
              (ce.value = x === 'remote' ? 'live' : 'fallback'),
              (M.value = re.telemetry.updatedAt || M.value || new Date().toISOString()))
            : ((A.value = Da(M.value)), (ce.value = x === 'remote' ? 'live' : 'fallback'));
        }
      let me = !1;
      if (p)
        try {
          const re = await un(p, {
            fetchImpl: P,
            requestInit: { cache: 'no-store' },
            allowFallback: !1,
            errorMessage: 'Impossibile caricare telemetria generatore',
          });
          try {
            const Se = Ig(re.data);
            ((I.value = Se), (me = !0));
          } catch (Se) {
            const ut =
              Se instanceof gt
                ? an(Se, 'Telemetria generatore non valida', { code: 'nebula.generator.invalid' })
                : nn(Se, 'Telemetria generatore non valida', { code: 'nebula.generator.invalid' });
            V.warn('nebula.generator.remote_unavailable', {
              message: 'log.nebula.generator.remote_unavailable',
              meta: { reason: ut.message },
            });
          }
        } catch (re) {
          const Se = pn(re);
          V.warn('nebula.generator.remote_unavailable', {
            message: 'log.nebula.generator.remote_unavailable',
            meta: { reason: Se.message },
          });
        }
      if (!me && !I.value) {
        const re = await S();
        re != null && re.generator && (I.value = re.generator);
      }
      D.value = null;
    } catch (m) {
      const x = pn(m);
      ((D.value = x),
        V.error('nebula.dataset.load_failed', {
          message: 'log.nebula.dataset.load_failed',
          meta: { reason: x.message },
        }),
        A.value || ((A.value = Da(M.value)), (ce.value = 'fallback')));
    } finally {
      C.value = !1;
    }
  }
  async function F() {
    try {
      await K();
      return;
    } catch (m) {
      const x = pn(m);
      throw ((D.value = x), x);
    }
  }
  function G() {
    O <= 0 ||
      typeof setInterval != 'function' ||
      (ve = setInterval(() => {
        ue().catch(() => {});
      }, O));
  }
  function H() {
    ve && (clearInterval(ve), (ve = null));
  }
  (ts(() => {
    (ue().catch(() => {}), G());
  }),
    fc(() => {
      H();
    }));
  const de = T(() => {
      var m;
      return gl((m = Z.value) == null ? void 0 : m.objectives);
    }),
    Te = T(() => {
      var m;
      return gl((m = Z.value) == null ? void 0 : m.blockers);
    }),
    ne = T(() => {
      var x;
      const m = ((x = Ae.value) == null ? void 0 : x.checks) || {};
      return Object.entries(m)
        .map(([q, z]) => ({
          id: q,
          passed: Number(z == null ? void 0 : z.passed) || 0,
          total: Number(z == null ? void 0 : z.total) || 0,
        }))
        .filter((q) => q.total > 0);
    }),
    ge = T(() => {
      var S;
      const m = ne.value.reduce(($, me) => $ + me.total, 0),
        x = ne.value.reduce(($, me) => $ + me.passed, 0),
        q = m > 0 ? Math.round((x / m) * 100) : 0,
        z = ((S = Ae.value) == null ? void 0 : S.lastRun) || null;
      return {
        total: m,
        completed: x,
        percent: q,
        label: m > 0 ? `${x}/${m} QA checks` : 'QA checks in setup',
        lastRun: z,
      };
    }),
    oe = T(() => {
      var $;
      const m = [];
      (de.value.forEach((me, re) => {
        m.push({ id: `objective-${re}`, title: 'Obiettivo', body: me, tone: 'objective' });
      }),
        Te.value.forEach((me, re) => {
          m.push({ id: `blocker-${re}`, title: 'Blocker', body: me, tone: 'blocker' });
        }),
        m.push({
          id: 'qa-progress',
          title: 'QA Sync',
          body: ge.value.label,
          tone: ge.value.percent >= 80 ? 'success' : ge.value.percent >= 50 ? 'warning' : 'neutral',
          progress: ge.value.percent,
        }));
      const x = (($ = Z.value) == null ? void 0 : $.completion) || {},
        q = Number(x.total) || 0,
        z = Number(x.completed) || 0,
        S = q > 0 ? Math.round((z / q) * 100) : 0;
      return (
        m.push({
          id: 'milestone-progress',
          title: 'Milestone',
          body: q > 0 ? `${z}/${q} milestone confermate` : 'Milestone da definire',
          tone: S >= 70 ? 'success' : 'neutral',
          progress: S,
        }),
        m
      );
    }),
    j = T(() => ge.value.percent),
    W = T(() =>
      (Array.isArray(De.value.species) ? De.value.species : []).map((x) => {
        var me, re, Se;
        const q =
            Number((me = x == null ? void 0 : x.telemetry) == null ? void 0 : me.coverage) || 0,
          z = Math.round(q * 100),
          S = hl(x == null ? void 0 : x.readiness),
          $ = xg(z, j.value);
        return {
          id: x.id,
          name: x.name,
          readiness: x.readiness || 'In progress',
          readinessTone: S,
          telemetryOwner:
            ((re = x == null ? void 0 : x.telemetry) == null ? void 0 : re.curatedBy) || 'QA Core',
          telemetryCoverage: z,
          telemetryHistory: $,
          telemetryLabel: `${z}% copertura`,
          telemetryTimestamp: _l(
            ((Se = x == null ? void 0 : x.telemetry) == null ? void 0 : Se.lastValidation) || null,
          ),
          stage: Ng(z),
          telemetryMode: ce.value,
        };
      }),
    ),
    ae = T(() => {
      var z;
      const m = [],
        x = ge.value.lastRun || ((z = Ye.value) == null ? void 0 : z.lastSync) || null;
      return (
        de.value.forEach((S, $) => {
          m.push({
            id: `objective-${$}`,
            title: 'Obiettivo Nebula',
            status: 'info',
            summary: S,
            timestamp: x,
          });
        }),
        (Array.isArray(De.value.species) ? [...De.value.species] : [])
          .sort((S, $) => {
            var Se, ut;
            const me = new Date(
              ((Se = S == null ? void 0 : S.telemetry) == null ? void 0 : Se.lastValidation) || 0,
            ).getTime();
            return (
              new Date(
                ((ut = $ == null ? void 0 : $.telemetry) == null ? void 0 : ut.lastValidation) || 0,
              ).getTime() - me
            );
          })
          .forEach((S) => {
            var $, me;
            m.push({
              id: `species-${S.id}`,
              title: S.name,
              status: hl(S == null ? void 0 : S.readiness),
              summary: (S == null ? void 0 : S.readiness) || 'Readiness non definita',
              timestamp:
                (($ = S == null ? void 0 : S.telemetry) == null ? void 0 : $.lastValidation) || x,
              meta:
                (me = S == null ? void 0 : S.telemetry) != null && me.curatedBy
                  ? `Curato da ${S.telemetry.curatedBy}`
                  : null,
            });
          }),
        ne.value.forEach((S) => {
          m.push({
            id: `qa-${S.id}`,
            title: `QA · ${S.id}`,
            status: S.passed >= S.total ? 'success' : 'warning',
            summary: `${S.passed}/${S.total} verifiche completate`,
            timestamp: ge.value.lastRun || x,
          });
        }),
        Te.value.forEach((S, $) => {
          m.push({
            id: `blocker-${$}`,
            title: 'Blocker',
            status: 'critical',
            summary: S,
            timestamp: x,
          });
        }),
        m
      );
    }),
    he = T(() => ({
      datasetId: De.value.id,
      title: De.value.title,
      summary: De.value.summary,
      releaseWindow: De.value.releaseWindow,
      curator: De.value.curator,
    })),
    R = T(() => {
      var z;
      const m = {
          datasetId: De.value.id,
          generatedAt: new Date().toISOString(),
          telemetryMode: ce.value,
          overview: {
            objectives: de.value,
            blockers: Te.value,
            completion: ((z = Z.value) == null ? void 0 : z.completion) || {},
          },
          qa: {
            percent: ge.value.percent,
            completed: ge.value.completed,
            total: ge.value.total,
            lastRun: ge.value.lastRun,
            checks: ne.value,
          },
          timeline: ae.value.map((S) => ({
            id: S.id,
            title: S.title,
            status: S.status,
            summary: S.summary,
            timestamp: S.timestamp,
            meta: S.meta || null,
          })),
          readiness: W.value.map((S) => ({
            id: S.id,
            name: S.name,
            stage: S.stage,
            readiness: S.readiness,
            readinessTone: S.readinessTone,
            telemetry: {
              coverage: S.telemetryCoverage,
              history: S.telemetryHistory,
              owner: S.telemetryOwner,
              label: S.telemetryLabel,
              lastSync: S.telemetryTimestamp,
              mode: S.telemetryMode,
            },
          })),
        },
        x = JSON.stringify(m, null, 2),
        q = `<script type="application/json" id="nebula-progress-${De.value.id}">
${x}
<\/script>`;
      return { datasetId: De.value.id, payload: m, json: x, embedSnippet: q };
    }),
    X = T(() => {
      const m = E.value;
      return m === 'remote'
        ? { source: m, label: 'Dataset live', offline: !1, demo: !1 }
        : m === 'fallback'
          ? { source: m, label: 'Dataset offline · fallback', offline: !0, demo: !0 }
          : { source: m, label: 'Dataset statico · demo', offline: !0, demo: !0 };
    }),
    U = T(() => {
      var $, me;
      const m = ($ = A.value) == null ? void 0 : $.summary,
        x = (m == null ? void 0 : m.lastEventAt) || null,
        q = ce.value,
        z = q !== 'live',
        S =
          q === 'live'
            ? 'Telemetria live'
            : q === 'fallback'
              ? 'Telemetria offline · fallback'
              : 'Telemetria offline · demo';
      return {
        total: (m == null ? void 0 : m.totalEvents) ?? 0,
        open: (m == null ? void 0 : m.openEvents) ?? 0,
        acknowledged: (m == null ? void 0 : m.acknowledgedEvents) ?? 0,
        highPriority: (m == null ? void 0 : m.highPriorityEvents) ?? 0,
        lastEventAt: x,
        lastEventLabel: x ? _l(x) : 'Nessun evento',
        updatedAt: ((me = A.value) == null ? void 0 : me.updatedAt) || M.value,
        mode: q,
        isDemo: z,
        sourceLabel: S,
      };
    }),
    ie = T(() => {
      var q, z, S, $;
      const m =
          ((z = (q = A.value) == null ? void 0 : q.coverage) == null ? void 0 : z.history) ?? [],
        x =
          (($ = (S = A.value) == null ? void 0 : S.incidents) == null ? void 0 : $.timeline) ?? [];
      return {
        coverage: m,
        incidents: x.map((me) => me.total),
        highPriority: x.map((me) => me.highPriority),
      };
    }),
    we = T(() => {
      var x, q;
      return (
        ((q = (x = A.value) == null ? void 0 : x.coverage) == null ? void 0 : q.distribution) || {
          success: 0,
          warning: 0,
          neutral: 0,
          critical: 0,
        }
      );
    }),
    Le = T(() => {
      var m, x;
      return ((x = (m = A.value) == null ? void 0 : m.coverage) == null ? void 0 : x.average) ?? 0;
    }),
    Q = T(() => {
      const m = ce.value,
        x = m !== 'live';
      return {
        mode: m,
        offline: x,
        variant: x ? 'demo' : 'live',
        label:
          m === 'live'
            ? 'Telemetria live'
            : m === 'fallback'
              ? 'Telemetria offline · fallback'
              : 'Telemetria offline · demo',
      };
    }),
    ke = T(() => {
      const m = I.value;
      return m
        ? {
            status: m.status,
            label: m.label || 'Generatore online',
            generatedAt: m.generatedAt || null,
            updatedAt: m.updatedAt || null,
            sourceLabel: m.sourceLabel || 'Generator telemetry',
          }
        : {
            status: 'unknown',
            label: 'Generatore non disponibile',
            generatedAt: null,
            updatedAt: null,
            sourceLabel: 'Generator telemetry offline',
          };
    }),
    w = T(() => {
      var x, q, z, S, $;
      const m = (x = I.value) == null ? void 0 : x.metrics;
      return (
        m || {
          generationTimeMs: null,
          speciesTotal: 0,
          enrichedSpecies: 0,
          eventTotal: 0,
          datasetSpeciesTotal:
            ((z = (q = De.value) == null ? void 0 : q.species) == null ? void 0 : z.length) || 0,
          coverageAverage:
            (($ = (S = A.value) == null ? void 0 : S.coverage) == null ? void 0 : $.average) ?? 0,
          coreTraits: 0,
          optionalTraits: 0,
          synergyTraits: 0,
          expectedCoreTraits: 0,
        }
      );
    }),
    u = T(() => {
      var x;
      const m = (x = I.value) == null ? void 0 : x.streams;
      return m
        ? {
            generationTime: Array.isArray(m.generationTime) ? m.generationTime : [],
            species: Array.isArray(m.species) ? m.species : [],
            enriched: Array.isArray(m.enriched) ? m.enriched : [],
          }
        : { generationTime: [], species: [], enriched: [] };
    });
  return {
    header: he,
    cards: oe,
    timelineEntries: ae,
    evolutionMatrix: W,
    share: R,
    datasetStatus: X,
    telemetrySummary: U,
    telemetryStreams: ie,
    telemetryDistribution: we,
    telemetryCoverageAverage: Le,
    telemetryStatus: Q,
    generatorStatus: ke,
    generatorMetrics: w,
    generatorStreams: u,
    loading: C,
    error: D,
    lastUpdated: M,
    refresh: () => ue(),
    activateDemoTelemetry: F,
  };
}
const Og = { class: 'flow-view' },
  Lg = {
    __name: 'OverviewView',
    props: {
      overview: { type: Object, required: !0 },
      timeline: { type: Object, required: !0 },
      qualityRelease: { type: Object, default: () => ({}) },
    },
    setup(e) {
      const t = e,
        { overview: n, timeline: a, qualityRelease: s } = Ln(t),
        r = Cg({ overview: n, timeline: a, qualityRelease: s });
      return (i, l) => (
        h(),
        _('section', Og, [
          Ne(
            Sg,
            {
              header: le(r).header,
              cards: le(r).cards,
              'timeline-entries': le(r).timelineEntries,
              'evolution-matrix': le(r).evolutionMatrix,
              share: le(r).share,
            },
            null,
            8,
            ['header', 'cards', 'timeline-entries', 'evolution-matrix', 'share'],
          ),
        ])
      );
    },
  },
  vl = Ue(Lg, [['__scopeId', 'data-v-f85f2813']]),
  Rg = { class: 'nebula-shell' },
  Pg = { class: 'nebula-shell__frame' },
  Mg = { class: 'nebula-shell__header' },
  Dg = { key: 0, class: 'nebula-shell__status-grid' },
  Fg = ['data-tone'],
  qg = { class: 'nebula-shell__status-label' },
  Ug = { class: 'nebula-shell__status-value' },
  jg = { class: 'nebula-shell__actions' },
  zg = { class: 'nebula-shell__cards' },
  Vg = { key: 0, class: 'nebula-shell__tabs', 'aria-label': 'Navigazione schede', role: 'tablist' },
  Bg = ['id', 'aria-controls', 'aria-selected', 'tabindex', 'onClick', 'onKeydown'],
  Wg = { class: 'nebula-shell__tab-icon', 'aria-hidden': 'true' },
  Hg = ['id', 'aria-labelledby'],
  Gg = { class: 'nebula-shell__footer' },
  Zg = {
    __name: 'NebulaShell',
    props: {
      tabs: { type: Array, default: () => [] },
      statusIndicators: { type: Array, default: () => [] },
      modelValue: { type: String, default: '' },
    },
    emits: ['update:modelValue', 'tab-change'],
    setup(e, { emit: t }) {
      let n = 0;
      const a = e,
        s = t,
        r = `nebula-shell-${++n}`,
        i = T(() =>
          (a.tabs || []).map((N, O) => ({
            ...N,
            tabId: N.tabId || `${r}-tab-${O}`,
            panelId: N.panelId || `${r}-panel-${O}`,
          })),
        ),
        l = T(() => {
          if (a.modelValue) return a.modelValue;
          const [N] = i.value || [];
          return (N == null ? void 0 : N.id) || '';
        }),
        d = Pe(l.value),
        c = Pe([]),
        f = T(() => i.value.find((N) => N.id === d.value) || null);
      (tt(
        i,
        () => {
          c.value = [];
        },
        { flush: 'post' },
      ),
        tt(l, (N) => {
          N && d.value !== N && (d.value = N);
        }),
        tt(
          () => a.modelValue,
          (N) => {
            N && N !== d.value && (d.value = N);
          },
        ),
        tt(
          () => {
            var N;
            return (N = a.tabs) == null ? void 0 : N.length;
          },
          () => {
            var N;
            ((N = a.tabs) != null && N.some((O) => O.id === d.value)) || (d.value = l.value);
          },
        ));
      function p(N) {
        d.value !== N && ((d.value = N), s('update:modelValue', N), s('tab-change', N));
      }
      function g(N, O) {
        c.value[O] = N || null;
      }
      function v(N) {
        const O = c.value[N];
        O != null && O.focus && O.focus();
      }
      function y(N, O) {
        const P = N.key;
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(P)) return;
        N.preventDefault();
        const V = i.value.length;
        if (!V) return;
        if (P === 'Home') {
          (p(i.value[0].id), v(0));
          return;
        }
        if (P === 'End') {
          const A = V - 1;
          (p(i.value[A].id), v(A));
          return;
        }
        const E = (O + (P === 'ArrowRight' ? 1 : -1) + V) % V;
        (p(i.value[E].id), v(E));
      }
      return (N, O) => (
        h(),
        _('section', Rg, [
          o('div', Pg, [
            o('header', Mg, [
              e.statusIndicators.length
                ? (h(),
                  _('div', Dg, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(
                        e.statusIndicators,
                        (P) => (
                          h(),
                          _('div', { key: P.id || P.label, class: 'nebula-shell__status' }, [
                            o(
                              'span',
                              {
                                class: 'nebula-shell__status-led',
                                'data-tone': P.tone || 'neutral',
                              },
                              null,
                              8,
                              Fg,
                            ),
                            o('div', null, [o('p', qg, b(P.label), 1), o('p', Ug, b(P.value), 1)]),
                          ])
                        ),
                      ),
                      128,
                    )),
                  ]))
                : Y('', !0),
              o('div', jg, [st(N.$slots, 'actions', {}, void 0, !0)]),
            ]),
            o('div', zg, [st(N.$slots, 'cards', {}, void 0, !0)]),
            i.value.length
              ? (h(),
                _('nav', Vg, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(
                      i.value,
                      (P, V) => (
                        h(),
                        _(
                          'button',
                          {
                            key: P.id,
                            type: 'button',
                            class: ft([
                              'nebula-shell__tab',
                              { 'nebula-shell__tab--active': P.id === d.value },
                            ]),
                            role: 'tab',
                            id: P.tabId,
                            'aria-controls': P.panelId,
                            'aria-selected': P.id === d.value,
                            tabindex: P.id === d.value ? 0 : -1,
                            onClick: (k) => p(P.id),
                            onKeydown: (k) => y(k, V),
                            ref_for: !0,
                            ref: (k) => g(k, V),
                          },
                          [o('span', Wg, b(P.icon || '◆'), 1), o('span', null, b(P.label), 1)],
                          42,
                          Bg,
                        )
                      ),
                    ),
                    128,
                  )),
                ]))
              : Y('', !0),
            f.value
              ? (h(),
                _(
                  'div',
                  {
                    key: 1,
                    class: 'nebula-shell__content',
                    role: 'tabpanel',
                    id: f.value.panelId,
                    'aria-labelledby': f.value.tabId,
                    tabindex: '0',
                  },
                  [st(N.$slots, 'default', { activeTab: d.value }, void 0, !0)],
                  8,
                  Hg,
                ))
              : Y('', !0),
            o('footer', Gg, [st(N.$slots, 'footer', {}, void 0, !0)]),
          ]),
        ])
      );
    },
  },
  Ir = Ue(Zg, [['__scopeId', 'data-v-0fab8e00']]),
  Yg = { class: 'species-biology' },
  Xg = { class: 'species-biology__section' },
  Kg = { class: 'species-biology__header' },
  Qg = { class: 'species-biology__trait-list', 'data-testid': 'core-traits' },
  Jg = { key: 0, class: 'species-biology__section' },
  eh = {
    class: 'species-biology__trait-list species-biology__trait-list--derived',
    'data-testid': 'derived-traits',
  },
  th = { key: 1, class: 'species-biology__section' },
  nh = { class: 'species-biology__list' },
  ah = { key: 2, class: 'species-biology__section' },
  sh = { key: 0, class: 'species-biology__behaviour-tags' },
  rh = { key: 1, class: 'species-biology__list' },
  ih = {
    __name: 'SpeciesBiology',
    props: {
      coreTraits: { type: Array, default: () => [] },
      derivedTraits: { type: Array, default: () => [] },
      adaptations: { type: Array, default: () => [] },
      behaviourTags: { type: Array, default: () => [] },
      drives: { type: Array, default: () => [] },
    },
    setup(e) {
      return (t, n) => (
        h(),
        _('section', Yg, [
          o('div', Xg, [
            o('header', Kg, [
              n[0] || (n[0] = o('h3', null, 'Tratti fondamentali', -1)),
              st(t.$slots, 'filters', {}, void 0, !0),
            ]),
            o('ul', Qg, [
              (h(!0),
              _(
                te,
                null,
                se(e.coreTraits, (a) => (h(), _('li', { key: a }, b(a), 1))),
                128,
              )),
            ]),
            st(t.$slots, 'synergy-suggestions', {}, void 0, !0),
          ]),
          e.derivedTraits.length
            ? (h(),
              _('div', Jg, [
                n[1] || (n[1] = o('h3', null, 'Tratti derivati', -1)),
                o('ul', eh, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(e.derivedTraits, (a) => (h(), _('li', { key: a }, b(a), 1))),
                    128,
                  )),
                ]),
              ]))
            : Y('', !0),
          e.adaptations.length
            ? (h(),
              _('div', th, [
                n[2] || (n[2] = o('h3', null, 'Adattamenti', -1)),
                o('ul', nh, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(e.adaptations, (a) => (h(), _('li', { key: a }, b(a), 1))),
                    128,
                  )),
                ]),
              ]))
            : Y('', !0),
          e.behaviourTags.length || e.drives.length
            ? (h(),
              _('div', ah, [
                n[3] || (n[3] = o('h3', null, 'Comportamento', -1)),
                e.behaviourTags.length
                  ? (h(), _('p', sh, b(e.behaviourTags.join(', ')), 1))
                  : Y('', !0),
                e.drives.length
                  ? (h(),
                    _('ul', rh, [
                      (h(!0),
                      _(
                        te,
                        null,
                        se(e.drives, (a) => (h(), _('li', { key: a }, b(a), 1))),
                        128,
                      )),
                    ]))
                  : Y('', !0),
              ]))
            : Y('', !0),
        ])
      );
    },
  },
  lh = Ue(ih, [['__scopeId', 'data-v-a98bf0c5']]),
  oh = ['data-variant'],
  ch = { class: 'trait-chip__icon', 'aria-hidden': 'true' },
  uh = { class: 'trait-chip__label' },
  dh = {
    __name: 'TraitChip',
    props: {
      label: { type: String, default: '' },
      variant: { type: String, default: 'default' },
      icon: { type: String, default: '' },
    },
    setup(e) {
      const t = e,
        n = {
          core: '✶',
          derived: '☲',
          optional: '☰',
          synergy: '∞',
          hazard: '⚠',
          climate: '☁',
          role: '⚙',
          validator: '◈',
          telemetry: '📡',
          default: '◆',
        },
        a = T(() => (t.icon ? t.icon : n[t.variant] || n.default));
      return (s, r) => (
        h(),
        _(
          'span',
          { class: 'trait-chip', 'data-variant': e.variant },
          [o('span', ch, b(a.value), 1), o('span', uh, b(e.label), 1)],
          8,
          oh,
        )
      );
    },
  },
  dt = Ue(dh, [['__scopeId', 'data-v-fc27d620']]),
  fh = { class: 'species-card' },
  mh = { class: 'species-card__header' },
  ph = { class: 'species-card__kicker' },
  gh = { class: 'species-card__title' },
  hh = { class: 'species-card__badges' },
  _h = { key: 0, class: 'species-card__synopsis' },
  vh = { class: 'species-card__traits', 'aria-label': 'Tratti principali' },
  bh = { class: 'species-card__trait-grid' },
  yh = { class: 'species-card__trait-grid' },
  kh = { key: 0 },
  wh = { class: 'species-card__trait-grid' },
  Eh = { class: 'species-card__footer' },
  Sh = { class: 'species-card__info-block' },
  Th = { class: 'species-card__info-block' },
  Ah = { key: 0, class: 'species-card__info-block' },
  Ih = {
    __name: 'SpeciesCard',
    props: { species: { type: Object, default: () => ({}) } },
    setup(e) {
      const t = e,
        n = T(() => {
          var p, g, v;
          return (
            ((p = t.species) == null ? void 0 : p.display_name) ||
            ((g = t.species) == null ? void 0 : g.name) ||
            ((v = t.species) == null ? void 0 : v.id) ||
            'Specie'
          );
        }),
        a = T(() => {
          var p, g;
          return (
            ((p = t.species) == null ? void 0 : p.archetype) ||
            ((g = t.species) == null ? void 0 : g.role) ||
            'Profilo non definito'
          );
        }),
        s = T(() => {
          var p, g, v;
          return (
            ((p = t.species) == null ? void 0 : p.rarity) ||
            ((v = (g = t.species) == null ? void 0 : g.statistics) == null ? void 0 : v.rarity) ||
            ''
          );
        }),
        r = T(() => {
          var g, v, y, N, O;
          const p =
            ((g = t.species) == null ? void 0 : g.threatTier) ||
            ((y = (v = t.species) == null ? void 0 : v.statistics) == null
              ? void 0
              : y.threat_tier) ||
            ((O = (N = t.species) == null ? void 0 : N.balance) == null ? void 0 : O.threat_tier);
          return p ? String(p).replace(/^T/i, '') : '';
        }),
        i = T(() => {
          var p, g;
          return (
            ((p = t.species) == null ? void 0 : p.synopsis) ||
            ((g = t.species) == null ? void 0 : g.summary) ||
            ''
          );
        }),
        l = T(() => {
          var p, g, v, y, N, O, P, V, k;
          return {
            core:
              ((g = (p = t.species) == null ? void 0 : p.traits) == null ? void 0 : g.core) ||
              ((v = t.species) == null ? void 0 : v.core_traits) ||
              [],
            derived:
              ((N = (y = t.species) == null ? void 0 : y.traits) == null ? void 0 : N.derived) ||
              ((O = t.species) == null ? void 0 : O.derived_traits) ||
              [],
            optional:
              ((V = (P = t.species) == null ? void 0 : P.traits) == null ? void 0 : V.optional) ||
              ((k = t.species) == null ? void 0 : k.optional_traits) ||
              [],
          };
        }),
        d = T(() => {
          var p, g, v, y;
          return (
            ((p = t.species) == null ? void 0 : p.energyProfile) ||
            ((g = t.species) == null ? void 0 : g.energy_profile) ||
            ((y = (v = t.species) == null ? void 0 : v.statistics) == null
              ? void 0
              : y.energy_profile) ||
            '—'
          );
        }),
        c = T(() => {
          var p, g, v, y;
          return (
            ((p = t.species) == null ? void 0 : p.habitats) ||
            ((g = t.species) == null ? void 0 : g.habitat) ||
            ((y = (v = t.species) == null ? void 0 : v.morphology) == null
              ? void 0
              : y.environments) ||
            []
          );
        }),
        f = T(() => {
          var g, v, y, N;
          const p =
            ((v = (g = t.species) == null ? void 0 : g.telemetry) == null ? void 0 : v.coverage) ||
            ((N = (y = t.species) == null ? void 0 : y.statistics) == null ? void 0 : N.coverage);
          return typeof p != 'number' ? '' : `${Math.round(p * 100)}%`;
        });
      return (p, g) => (
        h(),
        _('article', fh, [
          o('header', mh, [
            o('div', null, [o('p', ph, b(a.value), 1), o('h3', gh, b(n.value), 1)]),
            o('div', hh, [
              s.value
                ? (h(),
                  nt(dt, { key: 0, label: s.value, variant: 'core', icon: '✦' }, null, 8, [
                    'label',
                  ]))
                : Y('', !0),
              r.value
                ? (h(),
                  nt(dt, { key: 1, label: `T${r.value}`, variant: 'hazard', icon: '⚡' }, null, 8, [
                    'label',
                  ]))
                : Y('', !0),
            ]),
          ]),
          i.value ? (h(), _('p', _h, b(i.value), 1)) : Y('', !0),
          o('section', vh, [
            o('div', null, [
              g[0] || (g[0] = o('h4', null, 'Core', -1)),
              o('div', bh, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    l.value.core,
                    (v) => (
                      h(),
                      nt(dt, { key: `core-${v}`, label: v, variant: 'core' }, null, 8, ['label'])
                    ),
                  ),
                  128,
                )),
              ]),
            ]),
            o('div', null, [
              g[1] || (g[1] = o('h4', null, 'Derivati', -1)),
              o('div', yh, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    l.value.derived,
                    (v) => (
                      h(),
                      nt(dt, { key: `derived-${v}`, label: v, variant: 'derived' }, null, 8, [
                        'label',
                      ])
                    ),
                  ),
                  128,
                )),
              ]),
            ]),
            l.value.optional.length
              ? (h(),
                _('div', kh, [
                  g[2] || (g[2] = o('h4', null, 'Optional', -1)),
                  o('div', wh, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(
                        l.value.optional,
                        (v) => (
                          h(),
                          nt(dt, { key: `optional-${v}`, label: v, variant: 'optional' }, null, 8, [
                            'label',
                          ])
                        ),
                      ),
                      128,
                    )),
                  ]),
                ]))
              : Y('', !0),
          ]),
          o('footer', Eh, [
            o('div', Sh, [
              g[3] || (g[3] = o('span', { class: 'species-card__label' }, 'Energia', -1)),
              o('span', null, b(d.value), 1),
            ]),
            o('div', Th, [
              g[4] || (g[4] = o('span', { class: 'species-card__label' }, 'Habitat', -1)),
              o('span', null, b(c.value.join(', ')), 1),
            ]),
            f.value
              ? (h(),
                _('div', Ah, [
                  g[5] || (g[5] = o('span', { class: 'species-card__label' }, 'Coverage QA', -1)),
                  o('span', null, b(f.value), 1),
                ]))
              : Y('', !0),
          ]),
        ])
      );
    },
  },
  $h = Ue(Ih, [['__scopeId', 'data-v-058a73f6']]),
  Nh = { class: 'species-overview' },
  xh = { class: 'species-overview__heading' },
  Ch = { class: 'species-overview__title' },
  Oh = { key: 0, class: 'species-overview__summary' },
  Lh = { key: 0, class: 'species-overview__description' },
  Rh = {
    __name: 'SpeciesOverview',
    props: {
      name: { type: String, default: '' },
      summary: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    setup(e) {
      return (t, n) => (
        h(),
        _('header', Nh, [
          o('div', xh, [
            o('h2', Ch, b(e.name), 1),
            e.summary ? (h(), _('p', Oh, b(e.summary), 1)) : Y('', !0),
          ]),
          e.description ? (h(), _('p', Lh, b(e.description), 1)) : Y('', !0),
          st(t.$slots, 'actions', {}, void 0, !0),
        ])
      );
    },
  },
  Ph = Ue(Rh, [['__scopeId', 'data-v-240ccb6b']]),
  Mh = ['aria-busy'],
  Dh = { class: 'species-preview-grid__header' },
  Fh = { key: 0, class: 'species-preview-grid__error', role: 'alert' },
  qh = { key: 1, class: 'species-preview-grid__loading', role: 'status', 'aria-live': 'polite' },
  Uh = { key: 2, class: 'species-preview-grid__cards', role: 'list' },
  jh = { class: 'species-preview-card__header' },
  zh = { class: 'species-preview-card__badge' },
  Vh = { class: 'species-preview-card__summary' },
  Bh = { class: 'species-preview-card__stats' },
  Wh = { key: 0, class: 'species-preview-card__traits' },
  Hh = { key: 3, class: 'species-preview-grid__empty', role: 'status', 'aria-live': 'polite' },
  Gh = {
    __name: 'SpeciesPreviewGrid',
    props: {
      previews: { type: Array, default: () => [] },
      loading: { type: Boolean, default: !1 },
      error: { type: String, default: '' },
    },
    setup(e) {
      return (t, n) => (
        h(),
        _(
          'section',
          { class: 'species-preview-grid', 'aria-busy': e.loading },
          [
            o('header', Dh, [
              n[0] || (n[0] = o('h3', null, 'Anteprime sintetiche', -1)),
              st(t.$slots, 'filters', {}, void 0, !0),
            ]),
            e.error
              ? (h(), _('p', Fh, b(e.error), 1))
              : e.loading
                ? (h(), _('p', qh, ' Generazione in corso... '))
                : e.previews.length
                  ? (h(),
                    _('div', Uh, [
                      (h(!0),
                      _(
                        te,
                        null,
                        se(e.previews, (a) => {
                          var s, r, i, l, d, c, f, p, g, v, y, N, O, P;
                          return (
                            h(),
                            _(
                              'article',
                              {
                                key:
                                  ((s = a.blueprint) == null ? void 0 : s.id) ||
                                  ((r = a.meta) == null ? void 0 : r.request_id),
                                class: 'species-preview-card',
                                role: 'listitem',
                              },
                              [
                                o('header', jh, [
                                  o(
                                    'h4',
                                    null,
                                    b(
                                      ((i = a.blueprint) == null ? void 0 : i.display_name) ||
                                        ((l = a.blueprint) == null ? void 0 : l.id),
                                    ),
                                    1,
                                  ),
                                  o(
                                    'span',
                                    zh,
                                    b(
                                      ((c = (d = a.blueprint) == null ? void 0 : d.statistics) ==
                                      null
                                        ? void 0
                                        : c.threat_tier) || 'T?',
                                    ),
                                    1,
                                  ),
                                ]),
                                o('p', Vh, b((f = a.blueprint) == null ? void 0 : f.summary), 1),
                                o('dl', Bh, [
                                  o('div', null, [
                                    n[1] || (n[1] = o('dt', null, 'Energia', -1)),
                                    o(
                                      'dd',
                                      null,
                                      b(
                                        ((g = (p = a.blueprint) == null ? void 0 : p.statistics) ==
                                        null
                                          ? void 0
                                          : g.energy_profile) || 'n/d',
                                      ),
                                      1,
                                    ),
                                  ]),
                                  o('div', null, [
                                    n[2] || (n[2] = o('dt', null, 'Rarità', -1)),
                                    o(
                                      'dd',
                                      null,
                                      b(
                                        ((y = (v = a.blueprint) == null ? void 0 : v.statistics) ==
                                        null
                                          ? void 0
                                          : y.rarity) || 'R?',
                                      ),
                                      1,
                                    ),
                                  ]),
                                ]),
                                (P =
                                  (O = (N = a.blueprint) == null ? void 0 : N.traits) == null
                                    ? void 0
                                    : O.core) != null && P.length
                                  ? (h(), _('p', Wh, b(a.blueprint.traits.core.join(', ')), 1))
                                  : Y('', !0),
                              ],
                            )
                          );
                        }),
                        128,
                      )),
                    ]))
                  : (h(), _('p', Hh, ' Nessuna anteprima disponibile. ')),
          ],
          8,
          Mh,
        )
      );
    },
  },
  Zh = Ue(Gh, [['__scopeId', 'data-v-2627b764']]),
  Yh = { class: 'species-quick-actions' },
  Xh = {
    __name: 'SpeciesQuickActions',
    emits: ['export', 'save'],
    setup(e) {
      return (t, n) => (
        h(),
        _('div', Yh, [
          o(
            'button',
            {
              type: 'button',
              class: 'species-quick-actions__button',
              onClick: n[0] || (n[0] = (a) => t.$emit('export')),
            },
            ' Esporta scheda ',
          ),
          o(
            'button',
            {
              type: 'button',
              class: 'species-quick-actions__button species-quick-actions__button--secondary',
              onClick: n[1] || (n[1] = (a) => t.$emit('save')),
            },
            ' Salva nel pack ',
          ),
        ])
      );
    },
  },
  Kh = Ue(Xh, [['__scopeId', 'data-v-11baf8f0']]),
  Qh = { key: 0, class: 'species-timeline' },
  Jh = { class: 'species-timeline__header' },
  e_ = { class: 'species-timeline__filters' },
  t_ = ['onClick'],
  n_ = { class: 'species-timeline__filter-icon' },
  a_ = { class: 'species-timeline__filter-label' },
  s_ = { class: 'species-timeline__filter-count' },
  r_ = { key: 0, class: 'species-timeline__list' },
  i_ = ['data-tone'],
  l_ = { class: 'species-timeline__entry-header' },
  o_ = ['data-tone'],
  c_ = { class: 'species-timeline__badge-icon' },
  u_ = { class: 'species-timeline__badge-text' },
  d_ = { class: 'species-timeline__entry-meta' },
  f_ = { class: 'species-timeline__code' },
  m_ = { class: 'species-timeline__message' },
  p_ = { key: 1, class: 'species-timeline__empty' },
  g_ = { key: 1, class: 'species-timeline species-timeline--empty' },
  h_ = {
    __name: 'SpeciesRevisionTimeline',
    props: { entries: { type: Array, default: () => [] } },
    setup(e) {
      const t = e,
        n = [
          { value: 'all', label: 'Tutte', icon: '✦' },
          { value: 'info', label: 'Info', icon: '✧' },
          { value: 'warning', label: 'Avvisi', icon: '⚠️' },
          { value: 'error', label: 'Critici', icon: '☠️' },
          { value: 'success', label: 'OK', icon: '✨' },
        ],
        a = {
          info: { label: 'Info', icon: '✧', tone: 'info' },
          warning: { label: 'Avviso', icon: '⚠️', tone: 'warning' },
          error: { label: 'Critico', icon: '☠️', tone: 'error' },
          success: { label: 'Successo', icon: '✨', tone: 'success' },
        },
        s = Pe('all'),
        r = T(() =>
          (Array.isArray(t.entries) ? t.entries : []).map((f, p) => {
            const g = f.level || f.severity || 'info',
              v = a[g] || a.info;
            return {
              id: f.id || `revision-${p}`,
              title: f.title || v.label,
              message: f.message || '',
              code: f.code || 'n/d',
              level: g,
              badgeLabel: v.label,
              badgeIcon: v.icon,
              tone: v.tone,
            };
          }),
        ),
        i = T(() => {
          const c = { all: r.value.length };
          for (const f of r.value) c[f.level] = (c[f.level] || 0) + 1;
          return c;
        }),
        l = T(() => (s.value === 'all' ? r.value : r.value.filter((c) => c.level === s.value))),
        d = T(() => r.value.length > 0);
      return (c, f) =>
        d.value
          ? (h(),
            _('section', Qh, [
              o('div', Jh, [
                f[0] || (f[0] = o('h3', null, 'Revisioni validate', -1)),
                o('div', e_, [
                  (h(),
                  _(
                    te,
                    null,
                    se(n, (p) =>
                      o(
                        'button',
                        {
                          key: p.value,
                          type: 'button',
                          class: ft([
                            'species-timeline__filter',
                            { 'species-timeline__filter--active': p.value === s.value },
                          ]),
                          onClick: (g) => (s.value = p.value),
                        },
                        [
                          o('span', n_, b(p.icon), 1),
                          o('span', a_, b(p.label), 1),
                          o('span', s_, b(i.value[p.value] || 0), 1),
                        ],
                        10,
                        t_,
                      ),
                    ),
                    64,
                  )),
                ]),
              ]),
              l.value.length
                ? (h(),
                  _('ol', r_, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(
                        l.value,
                        (p) => (
                          h(),
                          _(
                            'li',
                            { key: p.id, class: 'species-timeline__entry', 'data-tone': p.tone },
                            [
                              o('div', l_, [
                                o(
                                  'span',
                                  { class: 'species-timeline__badge', 'data-tone': p.tone },
                                  [
                                    o('span', c_, b(p.badgeIcon), 1),
                                    o('span', u_, b(p.badgeLabel), 1),
                                  ],
                                  8,
                                  o_,
                                ),
                                o('div', d_, [
                                  o('strong', null, b(p.title), 1),
                                  o('span', f_, b(p.code), 1),
                                ]),
                              ]),
                              o('p', m_, b(p.message), 1),
                            ],
                            8,
                            i_,
                          )
                        ),
                      ),
                      128,
                    )),
                  ]))
                : (h(), _('p', p_, 'Nessun evento per il filtro selezionato.')),
            ]))
          : (h(),
            _('section', g_, [
              ...(f[1] ||
                (f[1] = [
                  o('h3', null, 'Revisioni validate', -1),
                  o(
                    'p',
                    { class: 'species-timeline__empty' },
                    'Nessuna validazione registrata dal runtime.',
                    -1,
                  ),
                ])),
            ]));
    },
  },
  __ = Ue(h_, [['__scopeId', 'data-v-551b1f2d']]),
  v_ = { class: 'species-statistics' },
  b_ = { class: 'species-statistics__grid' },
  y_ = { class: 'species-statistics__stat' },
  k_ = { class: 'species-statistics__stat' },
  w_ = { class: 'species-statistics__stat' },
  E_ = { class: 'species-statistics__stat' },
  S_ = {
    __name: 'SpeciesStatistics',
    props: {
      statistics: { type: Object, default: () => ({}) },
      synergy: { type: String, default: 'n/d' },
    },
    setup(e) {
      return (t, n) => (
        h(),
        _('section', v_, [
          n[4] || (n[4] = o('h3', null, 'Statistiche', -1)),
          o('dl', b_, [
            o('div', y_, [
              n[0] || (n[0] = o('dt', null, 'Minaccia', -1)),
              o('dd', null, b(e.statistics.threat_tier || 'T?'), 1),
            ]),
            o('div', k_, [
              n[1] || (n[1] = o('dt', null, 'Rarità', -1)),
              o('dd', null, b(e.statistics.rarity || 'R?'), 1),
            ]),
            o('div', w_, [
              n[2] || (n[2] = o('dt', null, 'Energia', -1)),
              o('dd', null, b(e.statistics.energy_profile || 'n/d'), 1),
            ]),
            o('div', E_, [
              n[3] || (n[3] = o('dt', null, 'Sinergia', -1)),
              o('dd', null, b(e.synergy), 1),
            ]),
          ]),
          st(t.$slots, 'default', {}, void 0, !0),
        ])
      );
    },
  },
  T_ = Ue(S_, [['__scopeId', 'data-v-32d0ed13']]),
  A_ = { class: 'synergy-card__face synergy-card__face--front' },
  I_ = { class: 'synergy-card__title' },
  $_ = { class: 'synergy-card__face synergy-card__face--back' },
  N_ = { class: 'synergy-card__title' },
  x_ = { class: 'synergy-card__detail' },
  C_ = {
    __name: 'SpeciesSynergyCard',
    props: { title: { type: String, default: '' }, detail: { type: String, default: '' } },
    setup(e) {
      const t = e,
        n = Pe(!1),
        a = T(() =>
          t.detail
            ? t.detail
            : 'Sinergia tracciata: benchmark QA non annotato. Consultare telemetry per approfondimenti.',
        );
      function s() {
        n.value = !n.value;
      }
      return (r, i) => (
        h(),
        _(
          'button',
          {
            type: 'button',
            class: ft(['synergy-card', { 'synergy-card--flipped': n.value }]),
            onClick: s,
          },
          [
            o('div', A_, [
              i[0] ||
                (i[0] = o('span', { class: 'synergy-card__icon', 'aria-hidden': 'true' }, '∞', -1)),
              o('p', I_, b(e.title), 1),
              i[1] || (i[1] = o('p', { class: 'synergy-card__hint' }, 'Tocca per dettagli', -1)),
            ]),
            o('div', $_, [o('p', N_, b(e.title), 1), o('p', x_, b(a.value), 1)]),
          ],
          2,
        )
      );
    },
  },
  O_ = Ue(C_, [['__scopeId', 'data-v-3692c854']]),
  L_ = { class: 'trait-filter-panel', 'aria-label': 'Filtri tratti' },
  R_ = { class: 'trait-filter-panel__group' },
  P_ = { role: 'list' },
  M_ = ['value', 'checked', 'onChange'],
  D_ = { key: 0, class: 'trait-filter-panel__group' },
  F_ = { role: 'list' },
  q_ = ['value', 'checked', 'onChange'],
  U_ = {
    __name: 'TraitFilterPanel',
    props: {
      coreOptions: { type: Array, default: () => [] },
      derivedOptions: { type: Array, default: () => [] },
      labels: { type: Object, default: () => ({}) },
      highlight: { type: Array, default: () => [] },
      modelValue: { type: Object, default: () => ({ core: [], derived: [] }) },
    },
    emits: ['update:modelValue'],
    setup(e, { emit: t }) {
      const n = e,
        a = t,
        s = T(() => n.labels || {}),
        r = T(() => new Set(n.highlight || [])),
        i = T({
          get() {
            return {
              core: Array.isArray(n.modelValue.core) ? n.modelValue.core : [],
              derived: Array.isArray(n.modelValue.derived) ? n.modelValue.derived : [],
            };
          },
          set(c) {
            a('update:modelValue', c);
          },
        });
      function l(c) {
        var p;
        if (!c) return '';
        const f = (p = s.value) == null ? void 0 : p[c];
        return f && f !== c ? `${c} · ${f}` : c;
      }
      function d(c, f, p) {
        var O;
        const g = (O = p == null ? void 0 : p.target) == null ? void 0 : O.checked,
          v = { core: [...i.value.core], derived: [...i.value.derived] },
          y = v[c],
          N = y.indexOf(f);
        (g && N === -1 ? y.push(f) : !g && N !== -1 && y.splice(N, 1), (i.value = v));
      }
      return (c, f) => (
        h(),
        _('section', L_, [
          o('fieldset', R_, [
            f[0] || (f[0] = o('legend', null, 'Filtra tratti core', -1)),
            o('ul', P_, [
              (h(!0),
              _(
                te,
                null,
                se(
                  e.coreOptions,
                  (p) => (
                    h(),
                    _('li', { key: p }, [
                      o(
                        'label',
                        { class: ft({ 'trait-filter-panel__option--highlight': r.value.has(p) }) },
                        [
                          o(
                            'input',
                            {
                              type: 'checkbox',
                              value: p,
                              checked: i.value.core.includes(p),
                              onChange: (g) => d('core', p, g),
                            },
                            null,
                            40,
                            M_,
                          ),
                          _n(' ' + b(l(p)), 1),
                        ],
                        2,
                      ),
                    ])
                  ),
                ),
                128,
              )),
            ]),
          ]),
          e.derivedOptions.length
            ? (h(),
              _('fieldset', D_, [
                f[1] || (f[1] = o('legend', null, 'Filtra tratti derivati', -1)),
                o('ul', F_, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(
                      e.derivedOptions,
                      (p) => (
                        h(),
                        _('li', { key: p }, [
                          o(
                            'label',
                            {
                              class: ft({
                                'trait-filter-panel__option--highlight': r.value.has(p),
                              }),
                            },
                            [
                              o(
                                'input',
                                {
                                  type: 'checkbox',
                                  value: p,
                                  checked: i.value.derived.includes(p),
                                  onChange: (g) => d('derived', p, g),
                                },
                                null,
                                40,
                                q_,
                              ),
                              _n(' ' + b(l(p)), 1),
                            ],
                            2,
                          ),
                        ])
                      ),
                    ),
                    128,
                  )),
                ]),
              ]))
            : Y('', !0),
        ])
      );
    },
  },
  j_ = Ue(U_, [['__scopeId', 'data-v-f2c702c4']]);
function z_(e, t) {
  if (e && Object.prototype.hasOwnProperty.call(e, 'fallback')) {
    if (e.fallback === null) return null;
    if (typeof e.fallback == 'string' && e.fallback.trim()) return e.fallback.trim();
  }
  return t;
}
function V_(e) {
  return e && Object.prototype.hasOwnProperty.call(e, 'allowFallback') ? !!e.allowFallback : yn();
}
function B_(e) {
  return Array.isArray(e)
    ? e
        .filter((t) => t && Array.isArray(t.trait_ids) && t.trait_ids.length)
        .map((t) => ({
          trait_ids: t.trait_ids,
          biome_id: t.biome_id ?? null,
          seed: t.seed ?? null,
          base_name: t.base_name ?? null,
          request_id: t.request_id ?? null,
          fallback_trait_ids: t.fallback_trait_ids,
        }))
    : [];
}
async function W_(e, t = {}) {
  const n = B_(e);
  if (!n.length) return { previews: [], errors: [] };
  const a = Sn('generationSpeciesPreview', {
      endpoint: Object.prototype.hasOwnProperty.call(t, 'endpoint') ? t.endpoint : void 0,
      fallback: Object.prototype.hasOwnProperty.call(t, 'fallback') ? t.fallback : void 0,
    }),
    s = Gt(t.endpoint || a.endpoint),
    r = z_(t, a.fallback),
    i = r ? dn(r) : null,
    l = await un(s, {
      requestInit: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: n }),
      },
      fallbackUrl: i,
      allowFallback: V_(t),
      errorMessage: 'Errore richiesta anteprime specie',
      fallbackErrorMessage: 'Anteprime specie locali non disponibili',
    }),
    { data: d, error: c } = l,
    f = l.source,
    p = Array.isArray(d.results) ? d.results : Array.isArray(d.previews) ? d.previews : [],
    g = Array.isArray(d.errors) ? d.errors : [];
  return {
    previews: p,
    errors: g,
    endpoint_source: f,
    endpoint_url: f === 'fallback' && i ? i : s,
    fallback_error: f === 'fallback' && c ? c.message : void 0,
  };
}
const H_ = { key: 0, class: 'species-panel' },
  G_ = { key: 0, class: 'species-panel__section' },
  Z_ = { key: 0, class: 'species-panel__meta' },
  Y_ = { key: 1, class: 'species-panel__adaptations' },
  X_ = { key: 1, class: 'species-panel__section species-panel__section--grid' },
  K_ = { key: 0, class: 'species-panel__suggestions' },
  Q_ = { class: 'species-panel__suggestions-list' },
  J_ = ['onClick', 'aria-label'],
  ev = { key: 2, class: 'species-panel__section species-panel__section--columns' },
  tv = { key: 0, class: 'species-panel__meta-text' },
  nv = { key: 0, class: 'species-panel__telemetry' },
  av = { key: 1, class: 'species-panel__error', role: 'alert' },
  sv = { key: 3, class: 'species-panel__section species-panel__section--synergy' },
  rv = { key: 0, class: 'species-panel__synergy-grid' },
  iv = { key: 1, class: 'species-panel__empty' },
  lv = ['disabled'],
  ov = { key: 1, class: 'species-panel species-panel--empty' },
  cv = {
    __name: 'SpeciesPanel',
    props: {
      species: { type: Object, default: null },
      validation: { type: Object, default: null },
      meta: { type: Object, default: null },
      traitCatalog: { type: Object, default: () => ({ traits: [], labels: {}, synergyMap: {} }) },
      traitCompliance: { type: Object, default: () => ({ badges: [] }) },
      previewBatch: { type: Array, default: () => [] },
      autoPreview: { type: Boolean, default: !0 },
    },
    emits: ['export', 'save', 'preview-error'],
    setup(e, { emit: t }) {
      const n = e,
        a = t,
        s = T(() => {
          var j;
          return ((j = n.species) == null ? void 0 : j.summary) || null;
        }),
        r = T(() => {
          var j, W;
          return (
            ((j = n.species) == null ? void 0 : j.description) ||
            ((W = n.species) == null ? void 0 : W.summary) ||
            ''
          );
        }),
        i = T(() => {
          var j;
          return ((j = n.species) == null ? void 0 : j.traits) || {};
        }),
        l = T(() => {
          var j;
          return i.value.core || ((j = n.species) == null ? void 0 : j.core_traits) || [];
        }),
        d = T(() => {
          var j;
          return i.value.derived || ((j = n.species) == null ? void 0 : j.derived_traits) || [];
        }),
        c = T(() => {
          var j;
          return ((j = n.species) == null ? void 0 : j.morphology) || {};
        }),
        f = T(() => c.value.adaptations || []),
        p = T(() => {
          var j, W;
          return (
            ((j = n.species) == null ? void 0 : j.behavior) ||
            ((W = n.species) == null ? void 0 : W.behavior_profile) ||
            {}
          );
        }),
        g = T(() => p.value.tags || p.value.behaviourTags || []),
        v = T(() => p.value.drives || []),
        y = T(() => {
          var j, W, ae, he;
          return (
            ((j = n.species) == null ? void 0 : j.statistics) || {
              threat_tier:
                (ae = (W = n.species) == null ? void 0 : W.balance) == null
                  ? void 0
                  : ae.threat_tier,
              rarity: (he = n.species) == null ? void 0 : he.rarity,
            }
          );
        }),
        N = T(() => {
          var j, W;
          return (
            ((j = n.species) == null ? void 0 : j.display_name) ||
            ((W = n.species) == null ? void 0 : W.id) ||
            'Specie'
          );
        }),
        O = T(() => {
          var j, W;
          return (
            ((j = n.species) == null ? void 0 : j.telemetry) ||
            ((W = n.meta) == null ? void 0 : W.telemetry) ||
            {}
          );
        }),
        P = T(() => {
          var ae, he;
          const j = (ae = n.meta) == null ? void 0 : ae.attempts,
            W = (he = n.meta) == null ? void 0 : he.fallback_used;
          if (j || W) {
            const R = [];
            return (
              j && R.push(`Tentativi: ${j}`),
              W != null && R.push(`Fallback: ${W ? 'sì' : 'no'}`),
              R.join(' · ')
            );
          }
          return '';
        }),
        V = T(() => {
          var W;
          const j = (W = y.value) == null ? void 0 : W.synergy_score;
          return typeof j == 'number' && Number.isFinite(j) ? `${Math.round(j * 100)}%` : 'n/d';
        }),
        k = T(() => {
          var j;
          return Array.isArray((j = n.traitCatalog) == null ? void 0 : j.traits)
            ? n.traitCatalog.traits
            : [];
        }),
        E = T(() => {
          var j;
          return ((j = n.traitCatalog) == null ? void 0 : j.labels) || {};
        }),
        A = T(() => {
          var j;
          return ((j = n.traitCatalog) == null ? void 0 : j.synergyMap) || {};
        }),
        I = T(() =>
          k.value
            .map((j) => (j && j.id ? String(j.id) : null))
            .filter(Boolean)
            .sort((j, W) => j.localeCompare(W)),
        );
      function C(j) {
        return Array.from(new Set(j.filter(Boolean))).sort((W, ae) => W.localeCompare(ae));
      }
      const D = T(() => {
          const j = new Set(l.value || []),
            W = I.value.slice(0, 20);
          !j.size && W.length && W.forEach((he) => j.add(he));
          const ae = [...(l.value || []), ...(d.value || [])];
          for (const he of ae) (A.value[he] || []).forEach((X) => j.add(X));
          return C([...j]);
        }),
        M = T(() => {
          const j = new Set(d.value || []),
            W = I.value.slice(0, 20);
          !j.size && W.length && W.forEach((he) => j.add(he));
          const ae = [...(l.value || []), ...(d.value || [])];
          for (const he of ae) (A.value[he] || []).forEach((X) => j.add(X));
          return C([...j]);
        }),
        ce = T(() => ({ core: D.value, derived: M.value })),
        ve = T(() => {
          const j = new Set(),
            W = Array.isArray(Z.value.core) ? Z.value.core : [];
          for (const ae of W) {
            const he = A.value[ae] || [];
            for (const R of he) W.includes(R) || j.add(R);
          }
          return C([...j]);
        }),
        Z = Pe({ core: [], derived: [] }),
        Ae = Pe('overview'),
        Ye = T(() => [
          { id: 'overview', label: 'Scheda', icon: '🧬' },
          { id: 'biology', label: 'Biologia', icon: '🌿' },
          { id: 'telemetry', label: 'Telemetry', icon: '📡' },
          { id: 'synergies', label: 'Sinergie', icon: '∞' },
        ]);
      function De(j) {
        var ae;
        if (!j) return '';
        const W = (ae = E.value) == null ? void 0 : ae[j];
        return W && W !== j ? `${j} · ${W}` : j;
      }
      function Be(j) {
        if (!j) return;
        const W = Array.isArray(Z.value.core) ? [...Z.value.core] : [],
          ae = Array.isArray(Z.value.derived) ? [...Z.value.derived] : [];
        (ae.includes(j) || ae.push(j), (Z.value = { core: W, derived: ae }));
      }
      const B = T(() => {
          var U, ie, we, Le, Q, ke, w;
          const j = [],
            W =
              ((U = n.species) == null ? void 0 : U.rarity) ||
              ((ie = y.value) == null ? void 0 : ie.rarity);
          W && j.push({ id: 'rarity', label: 'Rarità', value: W, tone: 'neutral' });
          const ae =
            ((we = y.value) == null ? void 0 : we.threat_tier) ||
            ((Le = n.species) == null ? void 0 : Le.threatTier);
          if (ae) {
            const u = Number.parseInt(String(ae).replace(/[^0-9]/g, ''), 10);
            let m = 'neutral';
            (Number.isFinite(u) && (u >= 3 ? (m = 'critical') : u >= 2 && (m = 'warning')),
              j.push({ id: 'threat', label: 'Threat tier', value: `T${u || ae}`, tone: m }));
          }
          const he = (Q = y.value) == null ? void 0 : Q.synergy_score;
          if (typeof he == 'number') {
            const u = Math.round(he * 100);
            let m = 'warning';
            (u >= 80 ? (m = 'success') : u < 50 && (m = 'critical'),
              j.push({ id: 'synergy', label: 'Allineamento', value: `${u}%`, tone: m }));
          }
          const R = (ke = O.value) == null ? void 0 : ke.coverage;
          if (typeof R == 'number') {
            const u = Math.round(R * 100);
            let m = 'neutral';
            (R >= 0.8 ? (m = 'success') : R < 0.55 && (m = 'warning'),
              j.push({ id: 'coverage', label: 'Coverage QA', value: `${u}%`, tone: m }));
          }
          const X = Array.isArray((w = n.traitCompliance) == null ? void 0 : w.badges)
            ? n.traitCompliance.badges
            : [];
          for (const u of X)
            u &&
              j.push({
                id: `trait-${u.id || u.label}`,
                label: u.label || 'Trait QA',
                value: u.value || '',
                tone: u.tone || 'neutral',
              });
          return j;
        }),
        K = T(() => {
          var W, ae, he;
          const j = [];
          if ((W = O.value) != null && W.lastValidation) {
            const R = new Date(O.value.lastValidation);
            j.push({
              label: 'Ultima validazione',
              value: Number.isNaN(R.getTime())
                ? O.value.lastValidation
                : new Intl.DateTimeFormat('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(R),
            });
          }
          return (
            (ae = O.value) != null &&
              ae.curatedBy &&
              j.push({ label: 'Curatore', value: O.value.curatedBy }),
            typeof ((he = O.value) == null ? void 0 : he.coverage) == 'number' &&
              j.push({ label: 'Coverage', value: `${Math.round(O.value.coverage * 100)}%` }),
            j
          );
        }),
        ue = T(() => {
          var ae, he, R, X, U, ie;
          const j = Array.isArray(
              (he = (ae = n.species) == null ? void 0 : ae.traits) == null ? void 0 : he.synergy,
            )
              ? n.species.traits.synergy
              : [],
            W =
              ((X = (R = n.species) == null ? void 0 : R.statistics) == null
                ? void 0
                : X.synergy_breakdown) ||
              ((ie = (U = n.species) == null ? void 0 : U.statistics) == null
                ? void 0
                : ie.synergies) ||
              {};
          return j.map((we, Le) => {
            var m, x, q;
            const Q = typeof we == 'string' ? we : (we == null ? void 0 : we.id) || String(Le),
              ke =
                typeof we == 'string'
                  ? we
                  : (we == null ? void 0 : we.label) ||
                    (we == null ? void 0 : we.name) ||
                    `Sinergia ${Le + 1}`;
            let w = '';
            if (Array.isArray(W)) {
              const z = W[Le];
              z && typeof z == 'object'
                ? (w = z.note || z.summary || z.detail || '')
                : typeof z == 'string' && (w = z);
            } else if (W && typeof W == 'object') {
              const z = W[Q] || W[ke];
              z && typeof z == 'object'
                ? (w = z.note || z.summary || z.detail || '')
                : typeof z == 'string' && (w = z);
            }
            const u = [];
            return (
              w && u.push(w),
              typeof ((m = O.value) == null ? void 0 : m.coverage) == 'number' &&
                u.push(`Coverage ${Math.round(O.value.coverage * 100)}%`),
              (x = y.value) != null && x.synergy_score && u.push(`Allineamento ${V.value}`),
              u.length || u.push('Sinergia registrata dal generator senza annotazioni extra.'),
              {
                id: `${((q = n.species) == null ? void 0 : q.id) || 'synergy'}-${Le}`,
                title: ke,
                detail: u.join(' · '),
              }
            );
          });
        }),
        F = T(() => {
          var W;
          return (
            Array.isArray((W = n.validation) == null ? void 0 : W.messages)
              ? n.validation.messages
              : []
          ).map((ae, he) => ({
            id: `${ae.code || 'msg'}-${he}`,
            title: ae.level === 'error' ? 'Errore' : ae.level === 'warning' ? 'Avviso' : 'Info',
            message: ae.message || ae.code,
            code: ae.code || 'n/d',
            level: ae.level || 'info',
          }));
        }),
        G = Pe([]),
        H = Pe(!1),
        de = Pe('');
      (tt(
        () => n.previewBatch,
        (j) => {
          Array.isArray(j) && (G.value = j);
        },
        { immediate: !0 },
      ),
        tt(
          () => {
            var j;
            return (j = n.species) == null ? void 0 : j.id;
          },
          () => {
            ((Ae.value = 'overview'),
              (Z.value = { core: C([...(l.value || [])]), derived: C([...(d.value || [])]) }),
              (G.value = Array.isArray(n.previewBatch) ? n.previewBatch : []),
              (de.value = ''),
              n.autoPreview && ne());
          },
          { immediate: !0 },
        ),
        tt(
          () => {
            var j;
            return [
              Z.value.core.slice().sort().join(','),
              Z.value.derived.slice().sort().join(','),
              n.autoPreview,
              (j = n.species) == null ? void 0 : j.id,
            ];
          },
          async () => {
            n.autoPreview && (await ne());
          },
        ));
      function Te() {
        var we, Le;
        const j = Z.value.core.length
            ? Z.value.core
            : Array.isArray(l.value) && l.value.length
              ? C([...l.value])
              : D.value,
          W = Z.value.derived,
          ae = Array.from(new Set([...j, ...W]));
        if (!ae.length) return [];
        const he =
            ((we = n.meta) == null ? void 0 : we.biome_id) ||
            ((Le = c.value.environments) == null ? void 0 : Le[0]) ||
            null,
          R = D.value,
          X = [ae];
        for (const Q of W) X.push(Array.from(new Set([...j, Q])));
        const U = [],
          ie = new Set();
        for (const Q of X) {
          const ke = Q.slice().sort().join('|');
          !ke || ie.has(ke) || (ie.add(ke), U.push(Q));
        }
        return U.slice(0, 4).map((Q, ke) => {
          var w;
          return {
            trait_ids: Q,
            biome_id: he,
            seed: ke,
            base_name: `${N.value} Preview ${ke + 1}`,
            request_id: `${((w = n.species) == null ? void 0 : w.id) || 'preview'}-${ke}`,
            fallback_trait_ids: R,
          };
        });
      }
      async function ne() {
        if (!n.species) {
          G.value = [];
          return;
        }
        const j = Te();
        if (!j.length) {
          G.value = [];
          return;
        }
        ((H.value = !0), (de.value = ''));
        try {
          const W = await W_(j);
          G.value = W.previews || [];
        } catch (W) {
          const ae = W instanceof Error ? W.message : String(W);
          ((de.value = ae), a('preview-error', ae));
        } finally {
          H.value = !1;
        }
      }
      function ge() {
        a('export', n.species);
      }
      function oe() {
        a('save', n.species);
      }
      return (j, W) =>
        e.species
          ? (h(),
            _('section', H_, [
              Ne(
                Ir,
                {
                  tabs: Ye.value,
                  modelValue: Ae.value,
                  'onUpdate:modelValue': W[1] || (W[1] = (ae) => (Ae.value = ae)),
                  'status-indicators': B.value,
                },
                {
                  actions: Ze(() => [Ne(Kh, { onExport: ge, onSave: oe })]),
                  cards: Ze(() => [Ne($h, { species: e.species }, null, 8, ['species'])]),
                  default: Ze(({ activeTab: ae }) => [
                    ae === 'overview'
                      ? (h(),
                        _('div', G_, [
                          Ne(
                            Ph,
                            { name: N.value, summary: s.value, description: r.value },
                            null,
                            8,
                            ['name', 'summary', 'description'],
                          ),
                          P.value
                            ? (h(),
                              _('div', Z_, [
                                Ne(
                                  dt,
                                  { label: P.value, variant: 'telemetry', icon: '⧉' },
                                  null,
                                  8,
                                  ['label'],
                                ),
                              ]))
                            : Y('', !0),
                          f.value.length
                            ? (h(),
                              _('div', Y_, [
                                W[2] || (W[2] = o('h4', null, 'Adattamenti', -1)),
                                o('ul', null, [
                                  (h(!0),
                                  _(
                                    te,
                                    null,
                                    se(f.value, (he) => (h(), _('li', { key: he }, b(he), 1))),
                                    128,
                                  )),
                                ]),
                              ]))
                            : Y('', !0),
                        ]))
                      : ae === 'biology'
                        ? (h(),
                          _('div', X_, [
                            Ne(
                              lh,
                              {
                                'core-traits': l.value,
                                'derived-traits': d.value,
                                adaptations: f.value,
                                'behaviour-tags': g.value,
                                drives: v.value,
                              },
                              {
                                filters: Ze(() => [
                                  Ne(
                                    j_,
                                    {
                                      modelValue: Z.value,
                                      'onUpdate:modelValue':
                                        W[0] || (W[0] = (he) => (Z.value = he)),
                                      'core-options': ce.value.core,
                                      'derived-options': ce.value.derived,
                                      labels: E.value,
                                      highlight: ve.value,
                                    },
                                    null,
                                    8,
                                    [
                                      'modelValue',
                                      'core-options',
                                      'derived-options',
                                      'labels',
                                      'highlight',
                                    ],
                                  ),
                                ]),
                                'synergy-suggestions': Ze(() => [
                                  ve.value.length
                                    ? (h(),
                                      _('div', K_, [
                                        W[3] || (W[3] = o('p', null, 'Sinergie dal catalogo', -1)),
                                        o('div', Q_, [
                                          (h(!0),
                                          _(
                                            te,
                                            null,
                                            se(
                                              ve.value,
                                              (he) => (
                                                h(),
                                                _(
                                                  'button',
                                                  {
                                                    key: `suggestion-${he}`,
                                                    type: 'button',
                                                    class: 'species-panel__suggestion',
                                                    onClick: (R) => Be(he),
                                                    'aria-label': `Applica suggerimento sinergia ${De(he)}`,
                                                  },
                                                  [
                                                    Ne(
                                                      dt,
                                                      { label: De(he), variant: 'synergy' },
                                                      null,
                                                      8,
                                                      ['label'],
                                                    ),
                                                  ],
                                                  8,
                                                  J_,
                                                )
                                              ),
                                            ),
                                            128,
                                          )),
                                        ]),
                                      ]))
                                    : Y('', !0),
                                ]),
                                _: 1,
                              },
                              8,
                              [
                                'core-traits',
                                'derived-traits',
                                'adaptations',
                                'behaviour-tags',
                                'drives',
                              ],
                            ),
                          ]))
                        : ae === 'telemetry'
                          ? (h(),
                            _('div', ev, [
                              Ne(
                                T_,
                                { statistics: y.value, synergy: V.value },
                                {
                                  default: Ze(() => [
                                    P.value ? (h(), _('p', tv, b(P.value), 1)) : Y('', !0),
                                  ]),
                                  _: 1,
                                },
                                8,
                                ['statistics', 'synergy'],
                              ),
                              Ne(__, { entries: F.value }, null, 8, ['entries']),
                              K.value.length
                                ? (h(),
                                  _('div', nv, [
                                    W[4] || (W[4] = o('h4', null, 'Telemetry', -1)),
                                    o('ul', null, [
                                      (h(!0),
                                      _(
                                        te,
                                        null,
                                        se(
                                          K.value,
                                          (he) => (
                                            h(),
                                            _('li', { key: he.label }, [
                                              o('strong', null, b(he.label), 1),
                                              o('span', null, b(he.value), 1),
                                            ])
                                          ),
                                        ),
                                        128,
                                      )),
                                    ]),
                                  ]))
                                : Y('', !0),
                              de.value ? (h(), _('div', av, b(de.value), 1)) : Y('', !0),
                            ]))
                          : ae === 'synergies'
                            ? (h(),
                              _('div', sv, [
                                ue.value.length
                                  ? (h(),
                                    _('div', rv, [
                                      (h(!0),
                                      _(
                                        te,
                                        null,
                                        se(
                                          ue.value,
                                          (he) => (
                                            h(),
                                            nt(
                                              O_,
                                              { key: he.id, title: he.title, detail: he.detail },
                                              null,
                                              8,
                                              ['title', 'detail'],
                                            )
                                          ),
                                        ),
                                        128,
                                      )),
                                    ]))
                                  : (h(),
                                    _('p', iv, 'Nessuna sinergia registrata per questa specie.')),
                                Ne(
                                  Zh,
                                  {
                                    class: 'species-panel__previews',
                                    previews: G.value,
                                    loading: H.value,
                                    error: de.value,
                                  },
                                  {
                                    filters: Ze(() => [
                                      o(
                                        'button',
                                        {
                                          type: 'button',
                                          class: 'species-panel__refresh',
                                          onClick: ne,
                                          disabled: H.value,
                                        },
                                        ' Aggiorna batch ',
                                        8,
                                        lv,
                                      ),
                                    ]),
                                    _: 1,
                                  },
                                  8,
                                  ['previews', 'loading', 'error'],
                                ),
                              ]))
                            : Y('', !0),
                  ]),
                  _: 1,
                },
                8,
                ['tabs', 'modelValue', 'status-indicators'],
              ),
            ]))
          : (h(),
            _('section', ov, [
              ...(W[5] || (W[5] = [o('p', null, 'Nessuna specie selezionata.', -1)])),
            ]));
    },
  },
  uv = Ue(cv, [['__scopeId', 'data-v-634279c2']]),
  dv = ['data-tone'],
  fv = { key: 0, class: 'insight-card__header' },
  mv = { class: 'insight-card__title' },
  pv = { key: 0, class: 'insight-card__icon', 'aria-hidden': 'true' },
  gv = { key: 0 },
  hv = { key: 1, class: 'insight-card__subtitle' },
  _v = { class: 'insight-card__actions' },
  vv = { key: 1, class: 'insight-card__tabs', role: 'tablist' },
  bv = ['aria-selected', 'onClick'],
  yv = { key: 0, class: 'insight-card__tab-icon', 'aria-hidden': 'true' },
  kv = { class: 'insight-card__body' },
  wv = {
    __name: 'InsightCard',
    props: {
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
      icon: { type: String, default: '' },
      tone: { type: String, default: 'neutral' },
      tabs: { type: Array, default: () => [] },
      modelValue: { type: String, default: '' },
    },
    emits: ['update:modelValue'],
    setup(e, { emit: t }) {
      const n = e,
        a = t,
        s = T(() => (Array.isArray(n.tabs) ? n.tabs.filter(Boolean) : [])),
        r = T({
          get() {
            if (!s.value.length) return '';
            const f = n.modelValue && s.value.find((p) => p.id === n.modelValue);
            return (f && f.id) || s.value[0].id;
          },
          set(f) {
            f !== n.modelValue && a('update:modelValue', f);
          },
        }),
        i = pc(),
        l = T(() => !!(n.title || n.subtitle || n.icon || i.actions)),
        d = T(() => s.value);
      function c(f) {
        d.value.some((p) => p.id === f) && (r.value = f);
      }
      return (
        ts(() => {
          d.value.length && !n.modelValue && a('update:modelValue', d.value[0].id);
        }),
        tt(
          () => n.tabs,
          (f) => {
            var g;
            const p = Array.isArray(f) ? f : [];
            if (!p.some((v) => v.id === r.value)) {
              const v = ((g = p[0]) == null ? void 0 : g.id) || '';
              v && a('update:modelValue', v);
            }
          },
        ),
        (f, p) => (
          h(),
          _(
            'section',
            { class: 'insight-card', 'data-tone': e.tone },
            [
              l.value
                ? (h(),
                  _('header', fv, [
                    o('div', mv, [
                      e.icon ? (h(), _('span', pv, b(e.icon), 1)) : Y('', !0),
                      o('div', null, [
                        e.title ? (h(), _('h3', gv, b(e.title), 1)) : Y('', !0),
                        e.subtitle
                          ? (h(), _('p', hv, b(e.subtitle), 1))
                          : st(f.$slots, 'subtitle', { key: 2 }, void 0, !0),
                      ]),
                    ]),
                    o('div', _v, [st(f.$slots, 'actions', {}, void 0, !0)]),
                  ]))
                : Y('', !0),
              d.value.length
                ? (h(),
                  _('div', vv, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(
                        d.value,
                        (g) => (
                          h(),
                          _(
                            'button',
                            {
                              key: g.id,
                              type: 'button',
                              class: ft([
                                'insight-card__tab',
                                { 'insight-card__tab--active': g.id === r.value },
                              ]),
                              role: 'tab',
                              'aria-selected': g.id === r.value,
                              onClick: (v) => c(g.id),
                            },
                            [
                              g.icon ? (h(), _('span', yv, b(g.icon), 1)) : Y('', !0),
                              o('span', null, b(g.label), 1),
                            ],
                            10,
                            bv,
                          )
                        ),
                      ),
                      128,
                    )),
                  ]))
                : Y('', !0),
              o('div', kv, [
                d.value.length
                  ? (h(!0),
                    _(
                      te,
                      { key: 0 },
                      se(d.value, (g) =>
                        Ft(
                          (h(),
                          _(
                            'div',
                            {
                              key: `panel-${g.id}`,
                              role: 'tabpanel',
                              class: 'insight-card__panel',
                            },
                            [st(f.$slots, `tab-${g.id}`, { tab: g }, void 0, !0)],
                          )),
                          [[gc, g.id === r.value]],
                        ),
                      ),
                      128,
                    ))
                  : st(f.$slots, 'default', { key: 1 }, void 0, !0),
              ]),
            ],
            8,
            dv,
          )
        )
      );
    },
  },
  Bn = Ue(wv, [['__scopeId', 'data-v-10f57747']]),
  Ev = ['aria-valuenow'],
  Sv = { class: 'telemetry-progress__header' },
  Tv = { class: 'telemetry-progress__label' },
  Av = { class: 'telemetry-progress__value' },
  Iv = { class: 'telemetry-progress__bar' },
  $v = { key: 0, class: 'telemetry-progress__description' },
  Nv = {
    __name: 'TelemetryProgressBar',
    props: {
      label: { type: String, required: !0 },
      current: { type: Number, default: null },
      total: { type: Number, default: null },
      percent: { type: Number, default: null },
      value: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    setup(e) {
      const t = e,
        n = T(() =>
          typeof t.percent == 'number' && Number.isFinite(t.percent)
            ? t.percent
            : typeof t.current == 'number' && typeof t.total == 'number' && t.total > 0
              ? (t.current / t.total) * 100
              : 0,
        ),
        a = T(() =>
          t.value
            ? t.value
            : t.current != null && t.total != null
              ? `${t.current} / ${t.total}`
              : `${Math.round(n.value)}%`,
        );
      return (s, r) => (
        h(),
        _(
          'div',
          {
            class: 'telemetry-progress',
            role: 'progressbar',
            'aria-valuenow': Math.round(n.value),
            'aria-valuemin': '0',
            'aria-valuemax': '100',
          },
          [
            o('div', Sv, [o('span', Tv, b(e.label), 1), o('span', Av, b(a.value), 1)]),
            o('div', Iv, [
              o(
                'div',
                {
                  class: 'telemetry-progress__fill',
                  style: za({ width: `${Math.min(100, Math.max(n.value, 0))}%` }),
                },
                null,
                4,
              ),
            ]),
            e.description ? (h(), _('p', $v, b(e.description), 1)) : Y('', !0),
          ],
          8,
          Ev,
        )
      );
    },
  },
  xv = Ue(Nv, [['__scopeId', 'data-v-e28d173a']]),
  Cv = { class: 'species-view' },
  Ov = { class: 'species-view__header' },
  Lv = { class: 'species-view__layout' },
  Rv = { key: 0, class: 'species-view__progress' },
  Pv = { key: 1, class: 'species-view__empty' },
  Mv = { key: 2, class: 'species-view__meta' },
  Dv = { key: 0, class: 'species-view__request' },
  Fv = { key: 1, class: 'species-view__shortlist' },
  qv = { key: 3, class: 'species-view__error', role: 'alert' },
  Uv = { key: 0, class: 'species-view__synergy' },
  jv = { key: 0 },
  zv = { key: 0 },
  Vv = { key: 1, class: 'species-view__empty' },
  Bv = { key: 2, class: 'species-view__compliance' },
  Wv = ['data-tone'],
  Hv = { key: 0, class: 'species-view__timestamp' },
  Gv = { class: 'species-view__qa' },
  Zv = ['data-tone'],
  Yv = { key: 0, class: 'species-view__qa-text' },
  Xv = { key: 1, class: 'species-view__qa-text' },
  Kv = { key: 2, class: 'species-view__qa-messages' },
  Qv = ['data-level'],
  Jv = { key: 3, class: 'species-view__qa-counters' },
  eb = { key: 0 },
  tb = { key: 1 },
  nb = { key: 2 },
  ab = { key: 3 },
  sb = { key: 4, class: 'species-view__qa-text' },
  rb = { key: 5, class: 'species-view__error', role: 'alert' },
  ib = {
    __name: 'SpeciesView',
    props: {
      species: { type: Object, default: null },
      status: { type: Object, required: !0 },
      meta: { type: Object, default: () => ({}) },
      validation: {
        type: Object,
        default: () => ({ messages: [], discarded: [], corrected: null }),
      },
      requestId: { type: [String, null], default: null },
      loading: { type: Boolean, default: !1 },
      error: { type: [String, Object, null], default: null },
      traitCatalog: { type: Object, default: () => ({ traits: [], labels: {}, synergyMap: {} }) },
      traitCompliance: {
        type: Object,
        default: () => ({ badges: [], summary: {}, generatedAt: null }),
      },
      traitDiagnosticsLoading: { type: Boolean, default: !1 },
      traitDiagnosticsError: { type: [String, Object, null], default: null },
      traitDiagnosticsMeta: { type: Object, default: () => ({}) },
    },
    setup(e) {
      const t = e,
        {
          species: n,
          status: a,
          meta: s,
          validation: r,
          requestId: i,
          error: l,
          traitCatalog: d,
          traitCompliance: c,
          traitDiagnosticsLoading: f,
          traitDiagnosticsError: p,
          traitDiagnosticsMeta: g,
        } = Ln(t),
        { t: v, locale: y } = ea(),
        N = T(() => a.value.curated || 0),
        O = T(() => a.value.total || 0),
        P = T(() => a.value.shortlist || []),
        V = T(() => (O.value ? Math.min(100, Math.round((N.value / O.value) * 100)) : 0)),
        k = T(() => {
          var F;
          return ((F = s.value) == null ? void 0 : F.telemetry) || {};
        }),
        E = T(() => {
          var de, Te, ne, ge;
          const F = [];
          (O.value || N.value) &&
            F.push({
              id: 'curation',
              label: v('views.species.sidebar.telemetry.curated.label'),
              current: N.value,
              total: O.value,
              description: v('views.species.sidebar.telemetry.curated.description'),
            });
          const G = Number.isFinite((de = k.value) == null ? void 0 : de.coverage)
            ? Number(k.value.coverage)
            : V.value;
          return (
            Number.isFinite(G) &&
              F.push({
                id: 'coverage',
                label: v('views.species.sidebar.telemetry.coverage.label'),
                percent: G,
                value: `${Math.round(G)}%`,
                description:
                  ((Te = k.value) == null ? void 0 : Te.coverage_label) ||
                  v('views.species.sidebar.telemetry.coverage.descriptionFallback'),
              }),
            (Array.isArray((ne = k.value) == null ? void 0 : ne.phases)
              ? k.value.phases
              : Array.isArray((ge = k.value) == null ? void 0 : ge.stages)
                ? k.value.stages
                : []
            ).forEach((oe, j) => {
              const W = Number.isFinite(oe == null ? void 0 : oe.percent)
                ? Number(oe.percent)
                : Number.isFinite(oe == null ? void 0 : oe.coverage)
                  ? Number(oe.coverage)
                  : Number.isFinite(oe == null ? void 0 : oe.value)
                    ? Number(oe.value)
                    : 0;
              F.push({
                id: `phase-${(oe == null ? void 0 : oe.id) || j}`,
                label:
                  (oe == null ? void 0 : oe.label) ||
                  (oe == null ? void 0 : oe.name) ||
                  v('views.species.sidebar.telemetry.phaseFallback', { index: j + 1 }),
                percent: W,
                value: `${Math.round(Math.max(0, W))}%`,
                description:
                  (oe == null ? void 0 : oe.summary) ||
                  (oe == null ? void 0 : oe.description) ||
                  '',
              });
            }),
            F
          );
        }),
        A = T(() => {
          const F = s.value || {},
            G = i.value || F.request_id || F.requestId,
            H = F.biome_id || F.biomeId || '—',
            de = v('views.species.sidebar.request.fallbackStates.unknown'),
            Te =
              F.fallback_used === void 0
                ? de
                : F.fallback_used
                  ? v('views.species.sidebar.request.fallbackStates.enabled')
                  : v('views.species.sidebar.request.fallbackStates.disabled');
          return !G && H === '—' && Te === de ? null : { id: G || '—', biome: H, fallback: Te };
        }),
        I = T(() => {
          var G;
          return (
            Array.isArray((G = r.value) == null ? void 0 : G.messages) ? r.value.messages : []
          ).filter(Boolean);
        }),
        C = T(() => {
          var ne, ge;
          const F = I.value,
            G = F.filter((oe) => (oe.level || oe.severity) === 'warning').length,
            H = F.filter((oe) => (oe.level || oe.severity) === 'error').length,
            de = Array.isArray((ne = r.value) == null ? void 0 : ne.discarded)
              ? r.value.discarded.length
              : 0,
            Te = (ge = r.value) != null && ge.corrected ? 1 : 0;
          return { total: F.length, warnings: G, errors: H, discarded: de, corrected: Te };
        }),
        D = T(() => I.value.slice(0, 3)),
        M = T(() =>
          C.value.errors
            ? 'critical'
            : C.value.warnings
              ? 'warning'
              : C.value.total
                ? 'success'
                : 'neutral',
        ),
        ce = T(() =>
          l.value
            ? typeof l.value == 'string'
              ? l.value
              : l.value && typeof l.value.message == 'string'
                ? l.value.message
                : String(l.value)
            : '',
        ),
        ve = T(() => {
          var G;
          return (
            Array.isArray((G = c.value) == null ? void 0 : G.badges) ? c.value.badges : []
          ).filter(Boolean);
        }),
        Z = T(() => {
          var de, Te;
          const F =
            ((de = c.value) == null ? void 0 : de.generatedAt) ||
            ((Te = g.value) == null ? void 0 : Te.fetched_at);
          if (!F) return '';
          const G = new Date(F);
          if (Number.isNaN(G.getTime())) return F;
          const H = y.value === 'it' ? 'it-IT' : 'en-US';
          return new Intl.DateTimeFormat(H, {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(G);
        }),
        Ae = T(() =>
          p.value
            ? typeof p.value == 'string'
              ? p.value
              : typeof p.value.message == 'string'
                ? p.value.message
                : String(p.value)
            : '',
        ),
        Ye = T(() => {
          var F;
          return ((F = d.value) == null ? void 0 : F.labels) || {};
        }),
        De = T(() => {
          var F;
          return ((F = d.value) == null ? void 0 : F.synergyMap) || {};
        }),
        Be = T(() => {
          const F = [];
          return (
            Object.entries(De.value || {}).forEach(([G, H]) => {
              const de = Array.isArray(H)
                ? H
                : Array.isArray(H == null ? void 0 : H.traits)
                  ? H.traits
                  : Array.isArray(H == null ? void 0 : H.related)
                    ? H.related
                    : [];
              F.push({
                id: G,
                label: Ye.value[G] || G,
                summary: Array.isArray(H == null ? void 0 : H.summary)
                  ? H.summary.join(', ')
                  : (H == null ? void 0 : H.summary) || '',
                items: de,
              });
            }),
            F.slice(0, 6)
          );
        });
      function B(F) {
        return Ye.value[F] || F;
      }
      const K = T(() => [
          { id: 'overview', label: v('views.species.sidebar.tabs.overview'), icon: '📊' },
          { id: 'synergy', label: v('views.species.sidebar.tabs.synergy'), icon: '🧬' },
          { id: 'qa', label: v('views.species.sidebar.tabs.qa'), icon: '🧪' },
        ]),
        ue = Pe('overview');
      return (F, G) => (
        h(),
        _('section', Cv, [
          o('header', Ov, [
            o('h2', null, b(le(v)('views.species.header.title')), 1),
            o('p', null, b(le(v)('views.species.header.body')), 1),
          ]),
          o('div', Lv, [
            Ne(
              uv,
              {
                species: le(n),
                meta: le(s),
                validation: le(r),
                'trait-catalog': le(d),
                'trait-compliance': le(c),
              },
              null,
              8,
              ['species', 'meta', 'validation', 'trait-catalog', 'trait-compliance'],
            ),
            Ne(
              Bn,
              {
                modelValue: ue.value,
                'onUpdate:modelValue': G[0] || (G[0] = (H) => (ue.value = H)),
                class: 'species-view__card',
                icon: '🛰',
                title: le(v)('views.species.sidebar.title'),
                tabs: K.value,
              },
              {
                'tab-overview': Ze(() => [
                  E.value.length
                    ? (h(),
                      _('div', Rv, [
                        (h(!0),
                        _(
                          te,
                          null,
                          se(
                            E.value,
                            (H) => (
                              h(),
                              nt(
                                xv,
                                {
                                  key: H.id,
                                  label: H.label,
                                  current: H.current,
                                  total: H.total,
                                  percent: H.percent,
                                  value: H.value,
                                  description: H.description,
                                },
                                null,
                                8,
                                ['label', 'current', 'total', 'percent', 'value', 'description'],
                              )
                            ),
                          ),
                          128,
                        )),
                      ]))
                    : (h(), _('p', Pv, b(le(v)('views.species.sidebar.emptyTelemetry')), 1)),
                  A.value || P.value.length
                    ? (h(),
                      _('div', Mv, [
                        A.value
                          ? (h(),
                            _('dl', Dv, [
                              o('div', null, [
                                o('dt', null, b(le(v)('views.species.sidebar.request.id')), 1),
                                o('dd', null, b(A.value.id), 1),
                              ]),
                              o('div', null, [
                                o('dt', null, b(le(v)('views.species.sidebar.request.biome')), 1),
                                o('dd', null, b(A.value.biome), 1),
                              ]),
                              o('div', null, [
                                o(
                                  'dt',
                                  null,
                                  b(le(v)('views.species.sidebar.request.fallback')),
                                  1,
                                ),
                                o('dd', null, b(A.value.fallback), 1),
                              ]),
                            ]))
                          : Y('', !0),
                        P.value.length
                          ? (h(),
                            _('div', Fv, [
                              o('h4', null, b(le(v)('views.species.sidebar.shortlist')), 1),
                              o('ul', null, [
                                (h(!0),
                                _(
                                  te,
                                  null,
                                  se(P.value, (H) => (h(), _('li', { key: H }, b(H), 1))),
                                  128,
                                )),
                              ]),
                            ]))
                          : Y('', !0),
                      ]))
                    : Y('', !0),
                  ce.value ? (h(), _('p', qv, b(ce.value), 1)) : Y('', !0),
                ]),
                'tab-synergy': Ze(() => [
                  Be.value.length
                    ? (h(),
                      _('div', Uv, [
                        (h(!0),
                        _(
                          te,
                          null,
                          se(
                            Be.value,
                            (H) => (
                              h(),
                              _('div', { key: H.id, class: 'species-view__synergy-card' }, [
                                o('header', null, [
                                  Ne(dt, { label: H.label, variant: 'synergy' }, null, 8, [
                                    'label',
                                  ]),
                                  H.summary ? (h(), _('span', jv, b(H.summary), 1)) : Y('', !0),
                                ]),
                                H.items.length
                                  ? (h(),
                                    _('ul', zv, [
                                      (h(!0),
                                      _(
                                        te,
                                        null,
                                        se(
                                          H.items,
                                          (de) => (
                                            h(),
                                            _('li', { key: de }, [
                                              Ne(dt, { label: B(de), variant: 'trait' }, null, 8, [
                                                'label',
                                              ]),
                                            ])
                                          ),
                                        ),
                                        128,
                                      )),
                                    ]))
                                  : Y('', !0),
                              ])
                            ),
                          ),
                          128,
                        )),
                      ]))
                    : (h(), _('p', Vv, b(le(v)('views.species.sidebar.emptySynergy')), 1)),
                  ve.value.length
                    ? (h(),
                      _('div', Bv, [
                        o('h4', null, b(le(v)('views.species.sidebar.compliance.title')), 1),
                        o('ul', null, [
                          (h(!0),
                          _(
                            te,
                            null,
                            se(
                              ve.value,
                              (H) => (
                                h(),
                                _('li', { key: H.id }, [
                                  o(
                                    'span',
                                    { 'data-tone': H.tone || 'neutral' },
                                    b(H.label),
                                    9,
                                    Wv,
                                  ),
                                  o('strong', null, b(H.value), 1),
                                ])
                              ),
                            ),
                            128,
                          )),
                        ]),
                        Z.value
                          ? (h(),
                            _(
                              'p',
                              Hv,
                              b(
                                le(v)('views.species.sidebar.compliance.updated', {
                                  timestamp: Z.value,
                                }),
                              ),
                              1,
                            ))
                          : Y('', !0),
                      ]))
                    : Y('', !0),
                ]),
                'tab-qa': Ze(() => [
                  o('div', Gv, [
                    o('header', null, [
                      o('h4', null, b(le(v)('views.species.sidebar.qa.title')), 1),
                      o(
                        'span',
                        { 'data-tone': M.value },
                        b(le(v)('views.species.sidebar.qa.messages', { count: C.value.total })),
                        9,
                        Zv,
                      ),
                    ]),
                    C.value.total
                      ? (h(), _('p', Yv, b(le(v)('views.species.sidebar.qa.intro')), 1))
                      : (h(), _('p', Xv, b(le(v)('views.species.sidebar.qa.empty')), 1)),
                    C.value.total
                      ? (h(),
                        _('ul', Kv, [
                          (h(!0),
                          _(
                            te,
                            null,
                            se(
                              D.value,
                              (H) => (
                                h(),
                                _('li', { key: H.code || H.message }, [
                                  o(
                                    'span',
                                    { 'data-level': H.level || H.severity || 'info' },
                                    b(H.level || H.severity || 'info'),
                                    9,
                                    Qv,
                                  ),
                                  o('span', null, b(H.message), 1),
                                ])
                              ),
                            ),
                            128,
                          )),
                        ]))
                      : Y('', !0),
                    C.value.total
                      ? (h(),
                        _('ul', Jv, [
                          C.value.errors
                            ? (h(),
                              _('li', eb, [
                                o(
                                  'strong',
                                  null,
                                  b(le(v)('views.species.sidebar.qa.counters.errors')),
                                  1,
                                ),
                                o('span', null, b(C.value.errors), 1),
                              ]))
                            : Y('', !0),
                          C.value.warnings
                            ? (h(),
                              _('li', tb, [
                                o(
                                  'strong',
                                  null,
                                  b(le(v)('views.species.sidebar.qa.counters.warnings')),
                                  1,
                                ),
                                o('span', null, b(C.value.warnings), 1),
                              ]))
                            : Y('', !0),
                          C.value.corrected
                            ? (h(),
                              _('li', nb, [
                                o(
                                  'strong',
                                  null,
                                  b(le(v)('views.species.sidebar.qa.counters.corrected')),
                                  1,
                                ),
                                o('span', null, b(C.value.corrected), 1),
                              ]))
                            : Y('', !0),
                          C.value.discarded
                            ? (h(),
                              _('li', ab, [
                                o(
                                  'strong',
                                  null,
                                  b(le(v)('views.species.sidebar.qa.counters.discarded')),
                                  1,
                                ),
                                o('span', null, b(C.value.discarded), 1),
                              ]))
                            : Y('', !0),
                        ]))
                      : Y('', !0),
                    le(f)
                      ? (h(), _('p', sb, b(le(v)('views.species.sidebar.qa.syncing')), 1))
                      : Ae.value
                        ? (h(), _('p', rb, b(Ae.value), 1))
                        : Y('', !0),
                  ]),
                ]),
                _: 1,
              },
              8,
              ['modelValue', 'title', 'tabs'],
            ),
          ]),
        ])
      );
    },
  },
  lb = Ue(ib, [['__scopeId', 'data-v-23c4d0e3']]),
  ob = { class: 'synthesis-map' },
  cb = { class: 'synthesis-map__header' },
  ub = { class: 'synthesis-map__canvas-wrapper' },
  db = { class: 'synthesis-map__canvas', viewBox: '0 0 360 240', role: 'img' },
  fb = { class: 'synthesis-map__connections' },
  mb = ['x1', 'y1', 'x2', 'y2', 'stroke-width'],
  pb = { class: 'synthesis-map__nodes' },
  gb = ['transform'],
  hb = { class: 'synthesis-map__node-label', y: '32' },
  _b = { class: 'synthesis-map__node-metric', y: '-26' },
  vb = { class: 'synthesis-map__legend' },
  bb = ['onClick'],
  yb = ['onClick'],
  kb = {
    __name: 'BiomeSynthesisMap',
    props: {
      nodes: { type: Array, default: () => [] },
      connections: { type: Array, default: () => [] },
    },
    setup(e) {
      const t = e,
        n = T(() => {
          const l = new Map();
          return (
            t.nodes.forEach((d) => {
              l.set(d.id, d);
            }),
            l
          );
        }),
        a = (l) => `${Math.round(l * 100)}%`,
        s = (l) => {
          const d = n.value.get(l);
          return d ? d.position || { x: 0, y: 0 } : { x: 0, y: 0 };
        },
        r = (l) =>
          ({
            staging: 'Smistamento squadre',
            ambush: 'Punto di agguato',
            lure: 'Innesco diversivo',
            safe: 'Nodo di recupero',
          })[l] || 'Nodo operativo',
        i = (l) => {
          var f, p;
          const d = ((f = n.value.get(l.from)) == null ? void 0 : f.label) || l.from,
            c = ((p = n.value.get(l.to)) == null ? void 0 : p.label) || l.to;
          return `${d} → ${c}`;
        };
      return (l, d) => (
        h(),
        _('section', ob, [
          o('header', cb, [
            d[1] ||
              (d[1] = o(
                'div',
                null,
                [
                  o('h3', null, 'Schema modulare'),
                  o('p', null, 'Visualizza i nodi generati e le connessioni tattiche previste.'),
                ],
                -1,
              )),
            o(
              'button',
              {
                type: 'button',
                class: 'synthesis-map__action',
                onClick: d[0] || (d[0] = (c) => l.$emit('regenerate:layout')),
              },
              ' Rigenera layout ',
            ),
          ]),
          o('div', ub, [
            (h(),
            _('svg', db, [
              d[2] ||
                (d[2] = o(
                  'defs',
                  null,
                  [
                    o(
                      'pattern',
                      {
                        id: 'tile-grid',
                        width: '24',
                        height: '24',
                        patternUnits: 'userSpaceOnUse',
                      },
                      [
                        o('path', {
                          d: 'M24 0 H0 V24',
                          fill: 'none',
                          stroke: 'rgba(255,255,255,0.05)',
                          'stroke-width': '1',
                        }),
                      ],
                    ),
                  ],
                  -1,
                )),
              d[3] ||
                (d[3] = o(
                  'rect',
                  { x: '0', y: '0', width: '360', height: '240', fill: 'url(#tile-grid)' },
                  null,
                  -1,
                )),
              o('g', fb, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    e.connections,
                    (c) => (
                      h(),
                      _(
                        'line',
                        {
                          key: c.id,
                          x1: s(c.from).x,
                          y1: s(c.from).y,
                          x2: s(c.to).x,
                          y2: s(c.to).y,
                          'stroke-width': 1.5 + c.weight * 0.6,
                          class: ft([
                            'synthesis-map__connection',
                            `synthesis-map__connection--w${c.weight}`,
                          ]),
                        },
                        null,
                        10,
                        mb,
                      )
                    ),
                  ),
                  128,
                )),
              ]),
              o('g', pb, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    e.nodes,
                    (c) => (
                      h(),
                      _(
                        'g',
                        {
                          key: c.id,
                          class: 'synthesis-map__node',
                          transform: `translate(${s(c.id).x} ${s(c.id).y})`,
                        },
                        [
                          o(
                            'circle',
                            {
                              r: 18,
                              class: ft([
                                'synthesis-map__node-circle',
                                `synthesis-map__node-circle--${c.type}`,
                              ]),
                            },
                            null,
                            2,
                          ),
                          o('text', hb, b(c.label), 1),
                          o('text', _b, b(a(c.intensity)), 1),
                        ],
                        8,
                        gb,
                      )
                    ),
                  ),
                  128,
                )),
              ]),
            ])),
          ]),
          o('div', vb, [
            o('section', null, [
              d[4] || (d[4] = o('h4', null, 'Nodi', -1)),
              o('ul', null, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    e.nodes,
                    (c) => (
                      h(),
                      _('li', { key: c.id }, [
                        o('div', null, [
                          o('strong', null, b(c.label), 1),
                          o('span', null, b(r(c.type)), 1),
                        ]),
                        o(
                          'button',
                          { type: 'button', onClick: (f) => l.$emit('regenerate:node', c.id) },
                          'Rigenera',
                          8,
                          bb,
                        ),
                      ])
                    ),
                  ),
                  128,
                )),
              ]),
            ]),
            o('section', null, [
              d[5] || (d[5] = o('h4', null, 'Connessioni', -1)),
              o('ul', null, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    e.connections,
                    (c) => (
                      h(),
                      _('li', { key: c.id }, [
                        o('div', null, [
                          o('strong', null, b(i(c)), 1),
                          o('span', null, 'Intensità ' + b(c.weight), 1),
                        ]),
                        o(
                          'button',
                          {
                            type: 'button',
                            onClick: (f) => l.$emit('regenerate:connection', c.id),
                          },
                          'Rigenera',
                          8,
                          yb,
                        ),
                      ])
                    ),
                  ),
                  128,
                )),
              ]),
            ]),
          ]),
        ])
      );
    },
  },
  wb = Ue(kb, [['__scopeId', 'data-v-e788bbd6']]),
  Eb = { class: 'glossary-tooltip' },
  Sb = { key: 0, class: 'glossary-tooltip__bubble' },
  Tb = {
    __name: 'GlossaryTooltip',
    props: { description: { type: String, default: '' } },
    setup(e) {
      const t = e;
      return (n, a) => (
        h(),
        _('span', Eb, [
          st(n.$slots, 'default', {}, void 0, !0),
          t.description ? (h(), _('span', Sb, b(t.description), 1)) : Y('', !0),
        ])
      );
    },
  },
  Vo = Ue(Tb, [['__scopeId', 'data-v-53fc6d81']]),
  Ab = { class: 'biome-setup' },
  Ib = { class: 'biome-setup__chips' },
  $b = { class: 'biome-setup__filters' },
  Nb = ['data-active', 'aria-pressed', 'onClick'],
  xb = { key: 0, class: 'biome-setup__panel' },
  Cb = ['value'],
  Ob = ['value'],
  Lb = { class: 'biome-setup__roles' },
  Rb = ['value'],
  Pb = { class: 'biome-setup__seed' },
  Mb = { class: 'biome-setup__actions' },
  Db = ['disabled'],
  Fb = { key: 1, class: 'biome-setup__graph' },
  qb = { key: 2, class: 'biome-setup__validators' },
  Ub = { class: 'biome-setup__validator-title' },
  jb = {
    __name: 'BiomeSetupView',
    props: {
      config: { type: Object, default: () => ({}) },
      graph: { type: Object, default: () => ({ nodes: [], connections: [] }) },
      validators: { type: Array, default: () => [] },
    },
    emits: ['synthesize'],
    setup(e, { emit: t }) {
      const n = e,
        a = t,
        s = ct({ hazard: '', climate: '', requiredRoles: [], graphicSeed: '' }),
        r = ct({ nodes: [], connections: [] }),
        i = Pe('setup'),
        l = [
          { id: 'setup', label: 'Setup', icon: '🛠' },
          { id: 'graph', label: 'Synth map', icon: '🛰' },
          { id: 'validators', label: 'Validatori', icon: '🛡' },
        ],
        d = T(() => {
          var B;
          return ((B = n.config) == null ? void 0 : B.hazardOptions) || [];
        }),
        c = T(() => {
          var B;
          return ((B = n.config) == null ? void 0 : B.climateOptions) || [];
        }),
        f = T(() => {
          var B;
          return ((B = n.config) == null ? void 0 : B.roleCatalog) || [];
        }),
        p = T(() => {
          var F, G, H, de;
          const B = new Map();
          return (
            [
              (F = n.config) == null ? void 0 : F.traitGlossary,
              (G = n.config) == null ? void 0 : G.glossary,
            ].forEach((Te) => {
              !Te ||
                typeof Te != 'object' ||
                Object.entries(Te).forEach(([ne, ge]) => {
                  if (!ne) return;
                  const oe = ge || {};
                  B.set(ne, {
                    id: ne,
                    label: oe.label || oe.name || ne,
                    description: oe.description || oe.summary || '',
                    roles: Array.isArray(oe.roles)
                      ? oe.roles
                      : Array.isArray(oe.requiredRoles)
                        ? oe.requiredRoles
                        : [],
                  });
                });
            }),
            [
              (H = n.config) == null ? void 0 : H.affinities,
              (de = n.config) == null ? void 0 : de.affinityCatalog,
            ].forEach((Te) => {
              Array.isArray(Te) &&
                Te.forEach((ne) => {
                  const ge = typeof ne == 'string' ? ne : ne.id || ne.key || ne.slug || ne.name;
                  ge &&
                    (B.has(ge) ||
                      B.set(ge, {
                        id: ge,
                        label: typeof ne == 'string' ? ne : ne.label || ne.name || ge,
                        description:
                          typeof ne == 'string' ? '' : ne.description || ne.summary || '',
                        roles: Array.isArray(ne.roles)
                          ? ne.roles
                          : Array.isArray(ne.requiredRoles)
                            ? ne.requiredRoles
                            : [],
                      }));
                });
            }),
            Array.from(B.values())
          );
        }),
        g = Pe([]),
        v = T(() => {
          var ue, F;
          const B = new Map();
          p.value.forEach((G) => {
            Array.isArray(G.roles) && G.roles.length && B.set(G.id, G.roles);
          });
          const K =
            ((ue = n.config) == null ? void 0 : ue.traitRoleMap) ||
            ((F = n.config) == null ? void 0 : F.traitRoles) ||
            {};
          return (
            K &&
              typeof K == 'object' &&
              Object.entries(K).forEach(([G, H]) => {
                if (!G) return;
                const de = Array.isArray(H) ? H : [];
                if (!B.has(G)) B.set(G, de);
                else {
                  const Te = new Set(B.get(G));
                  (de.forEach((ne) => Te.add(ne)), B.set(G, Array.from(Te)));
                }
              }),
            B
          );
        }),
        y = T(() => {
          const B = Array.isArray(f.value) ? f.value : [];
          if (!g.value.length) return B;
          const K = v.value,
            ue = new Set();
          if (
            (g.value.forEach((H) => {
              (K.get(H) || []).forEach((de) => ue.add(de));
            }),
            !ue.size)
          )
            return B;
          const F = B.filter((H) => ue.has(H)),
            G = s.requiredRoles.filter((H) => !F.includes(H));
          return [...F, ...G];
        }),
        N = T(() => s.hazard && s.climate && s.requiredRoles.length > 0 && s.graphicSeed),
        O = T(() => {
          const B = [];
          return (
            s.hazard && B.push({ id: 'hazard', label: 'Hazard', value: s.hazard, tone: 'warning' }),
            s.climate &&
              B.push({ id: 'climate', label: 'Clima', value: s.climate, tone: 'neutral' }),
            B.push({
              id: 'roles',
              label: 'Ruoli',
              value: s.requiredRoles.length || 0,
              tone: 'success',
            }),
            g.value.length &&
              B.push({
                id: 'filters',
                label: 'Filtri tratti',
                value: g.value.length,
                tone: 'neutral',
              }),
            r.nodes.length &&
              B.push({ id: 'nodes', label: 'Nodi mappa', value: r.nodes.length, tone: 'neutral' }),
            B
          );
        }),
        P = T(() =>
          n.validators.flatMap((B) =>
            (B.validators || []).map((K) => ({
              id: `${B.id}-${K.id}`,
              biome: B.name,
              status: K.status,
              label: K.label,
              message: K.message,
            })),
          ),
        ),
        V = () => {
          var B, K, ue, F;
          ((s.hazard = ((B = n.config) == null ? void 0 : B.hazard) || ''),
            (s.climate = ((K = n.config) == null ? void 0 : K.climate) || ''),
            (s.graphicSeed = ((ue = n.config) == null ? void 0 : ue.graphicSeed) || ''),
            (s.requiredRoles = [...(((F = n.config) == null ? void 0 : F.requiredRoles) || [])]));
        },
        k = () => ({ x: 60 + Math.random() * 240, y: 60 + Math.random() * 140 }),
        E = (B) => ({ ...B, position: B.position || k() }),
        A = (B) => ({ ...B }),
        I = () => {
          var B, K;
          ((r.nodes = (((B = n.graph) == null ? void 0 : B.nodes) || []).map((ue) => E(ue))),
            (r.connections = (((K = n.graph) == null ? void 0 : K.connections) || []).map((ue) =>
              A(ue),
            )));
        },
        C = (B) => {
          const K = Number.isFinite(B.intensity) ? B.intensity : 0.55,
            ue = Math.max(0.35, Math.min(0.95, K + (Math.random() * 0.4 - 0.2)));
          B.intensity = Number(ue.toFixed(2));
        },
        D = (B) => {
          if (!B) return;
          const K = g.value.indexOf(B);
          if (K === -1) g.value = [...g.value, B];
          else {
            const ue = [...g.value];
            (ue.splice(K, 1), (g.value = ue));
          }
        },
        M = (B) => g.value.includes(B),
        ce = () => {
          g.value = [];
        },
        ve = (B) => {
          const K = r.nodes.find((ue) => ue.id === B);
          K && ((K.position = k()), C(K));
        },
        Z = (B) => {
          const K = r.connections.find((F) => F.id === B);
          if (!K) return;
          const ue = Math.round(Math.random() * 2 - 1);
          K.weight = Math.max(1, K.weight + ue);
        },
        Ae = () => {
          r.nodes.forEach((B) => {
            ((B.position = k()), C(B));
          });
        },
        Ye = () => {
          var K;
          const B = Math.random().toString(16).slice(2, 8).toUpperCase();
          s.graphicSeed = `${((K = s.hazard) == null ? void 0 : K.split(' ')[0]) || 'BIOME'}-${B}`;
        },
        De = () => {
          N.value &&
            a('synthesize', {
              hazard: s.hazard,
              climate: s.climate,
              requiredRoles: [...s.requiredRoles],
              graphicSeed: s.graphicSeed,
              graph: {
                nodes: r.nodes.map((B) => ({
                  id: B.id,
                  position: B.position,
                  intensity: B.intensity,
                })),
                connections: r.connections.map((B) => ({ id: B.id, weight: B.weight })),
              },
            });
        };
      (tt(
        () => {
          var B, K, ue;
          return [
            (B = n.config) == null ? void 0 : B.hazard,
            (K = n.config) == null ? void 0 : K.climate,
            (ue = n.config) == null ? void 0 : ue.graphicSeed,
          ];
        },
        V,
        { immediate: !0 },
      ),
        tt(
          () => {
            var B;
            return (
              ((B = n.config) == null ? void 0 : B.requiredRoles) && [...n.config.requiredRoles]
            );
          },
          () => {
            var B;
            s.requiredRoles = [...(((B = n.config) == null ? void 0 : B.requiredRoles) || [])];
          },
          { immediate: !0 },
        ),
        tt(
          () => {
            var B, K, ue, F;
            return [
              (K = (B = n.graph) == null ? void 0 : B.nodes) == null ? void 0 : K.length,
              (F = (ue = n.graph) == null ? void 0 : ue.connections) == null ? void 0 : F.length,
            ];
          },
          I,
          { immediate: !0 },
        ));
      function Be(B) {
        return B
          ? B === 'passed'
            ? '✔'
            : B === 'warning'
              ? '⚠'
              : B === 'failed'
                ? '✖'
                : '◈'
          : '◈';
      }
      return (B, K) => (
        h(),
        _('section', Ab, [
          Ne(
            Ir,
            {
              tabs: l,
              modelValue: i.value,
              'onUpdate:modelValue': K[4] || (K[4] = (ue) => (i.value = ue)),
              'status-indicators': O.value,
            },
            {
              cards: Ze(() => [
                Ne(
                  Bn,
                  { icon: '🪐', title: 'Profilo ambientale' },
                  {
                    default: Ze(() => [
                      o('div', Ib, [
                        s.hazard
                          ? (h(),
                            nt(dt, { key: 0, label: s.hazard, variant: 'hazard' }, null, 8, [
                              'label',
                            ]))
                          : Y('', !0),
                        s.climate
                          ? (h(),
                            nt(dt, { key: 1, label: s.climate, variant: 'climate' }, null, 8, [
                              'label',
                            ]))
                          : Y('', !0),
                        (h(!0),
                        _(
                          te,
                          null,
                          se(
                            s.requiredRoles,
                            (ue) => (
                              h(),
                              nt(dt, { key: ue, label: ue, variant: 'role', icon: '⚙' }, null, 8, [
                                'label',
                              ])
                            ),
                          ),
                          128,
                        )),
                      ]),
                    ]),
                    _: 1,
                  },
                ),
                p.value.length
                  ? (h(),
                    nt(
                      Bn,
                      { key: 0, icon: '🧬', title: 'Filtri tratti' },
                      {
                        default: Ze(() => [
                          o('div', $b, [
                            (h(!0),
                            _(
                              te,
                              null,
                              se(
                                p.value,
                                (ue) => (
                                  h(),
                                  _(
                                    'button',
                                    {
                                      key: ue.id,
                                      type: 'button',
                                      class: 'biome-setup__filter',
                                      'data-active': M(ue.id),
                                      'aria-pressed': M(ue.id),
                                      onClick: (F) => D(ue.id),
                                    },
                                    [
                                      Ne(
                                        Vo,
                                        { description: ue.description },
                                        {
                                          default: Ze(() => [
                                            Ne(dt, { label: ue.label, variant: 'trait' }, null, 8, [
                                              'label',
                                            ]),
                                          ]),
                                          _: 2,
                                        },
                                        1032,
                                        ['description'],
                                      ),
                                    ],
                                    8,
                                    Nb,
                                  )
                                ),
                              ),
                              128,
                            )),
                          ]),
                          g.value.length
                            ? (h(),
                              _(
                                'button',
                                {
                                  key: 0,
                                  type: 'button',
                                  class: 'biome-setup__reset',
                                  onClick: ce,
                                },
                                ' Reset filtri ',
                              ))
                            : Y('', !0),
                        ]),
                        _: 1,
                      },
                    ))
                  : Y('', !0),
              ]),
              default: Ze(({ activeTab: ue }) => [
                ue === 'setup'
                  ? (h(),
                    _('div', xb, [
                      o(
                        'form',
                        { class: 'biome-setup__form', onSubmit: sr(De, ['prevent']) },
                        [
                          o('fieldset', null, [
                            K[7] || (K[7] = o('legend', null, 'Perimetro ambientale', -1)),
                            o('label', null, [
                              K[5] || (K[5] = o('span', null, 'Hazard dominante', -1)),
                              Ft(
                                o(
                                  'select',
                                  { 'onUpdate:modelValue': K[0] || (K[0] = (F) => (s.hazard = F)) },
                                  [
                                    (h(!0),
                                    _(
                                      te,
                                      null,
                                      se(
                                        d.value,
                                        (F) => (
                                          h(),
                                          _('option', { key: F, value: F }, b(F), 9, Cb)
                                        ),
                                      ),
                                      128,
                                    )),
                                  ],
                                  512,
                                ),
                                [[Wn, s.hazard]],
                              ),
                            ]),
                            o('label', null, [
                              K[6] || (K[6] = o('span', null, 'Clima operativo', -1)),
                              Ft(
                                o(
                                  'select',
                                  {
                                    'onUpdate:modelValue': K[1] || (K[1] = (F) => (s.climate = F)),
                                  },
                                  [
                                    (h(!0),
                                    _(
                                      te,
                                      null,
                                      se(
                                        c.value,
                                        (F) => (
                                          h(),
                                          _('option', { key: F, value: F }, b(F), 9, Ob)
                                        ),
                                      ),
                                      128,
                                    )),
                                  ],
                                  512,
                                ),
                                [[Wn, s.climate]],
                              ),
                            ]),
                          ]),
                          o('fieldset', null, [
                            K[8] || (K[8] = o('legend', null, 'Ruoli richiesti', -1)),
                            o('div', Lb, [
                              (h(!0),
                              _(
                                te,
                                null,
                                se(
                                  y.value,
                                  (F) => (
                                    h(),
                                    _('label', { key: F }, [
                                      Ft(
                                        o(
                                          'input',
                                          {
                                            type: 'checkbox',
                                            value: F,
                                            'onUpdate:modelValue':
                                              K[2] || (K[2] = (G) => (s.requiredRoles = G)),
                                          },
                                          null,
                                          8,
                                          Rb,
                                        ),
                                        [[hc, s.requiredRoles]],
                                      ),
                                      Ne(dt, { label: F, variant: 'role' }, null, 8, ['label']),
                                    ])
                                  ),
                                ),
                                128,
                              )),
                            ]),
                          ]),
                          o('fieldset', null, [
                            K[9] || (K[9] = o('legend', null, 'Seed grafico', -1)),
                            o('div', Pb, [
                              Ft(
                                o(
                                  'input',
                                  {
                                    'onUpdate:modelValue':
                                      K[3] || (K[3] = (F) => (s.graphicSeed = F)),
                                    type: 'text',
                                    placeholder: 'Inserisci seed procedurale',
                                  },
                                  null,
                                  512,
                                ),
                                [[Os, s.graphicSeed]],
                              ),
                              o('button', { type: 'button', onClick: Ye }, 'Random'),
                            ]),
                          ]),
                          o('footer', Mb, [
                            o(
                              'button',
                              { type: 'submit', disabled: !N.value },
                              'Invoca biomeSynthesizer',
                              8,
                              Db,
                            ),
                            K[10] ||
                              (K[10] = o(
                                'p',
                                null,
                                'Il seed e i ruoli selezionati verranno passati come contesto obbligatorio per i nodi rigenerati.',
                                -1,
                              )),
                          ]),
                        ],
                        32,
                      ),
                    ]))
                  : ue === 'graph'
                    ? (h(),
                      _('div', Fb, [
                        Ne(
                          wb,
                          {
                            nodes: r.nodes,
                            connections: r.connections,
                            'onRegenerate:layout': Ae,
                            'onRegenerate:node': ve,
                            'onRegenerate:connection': Z,
                          },
                          null,
                          8,
                          ['nodes', 'connections'],
                        ),
                      ]))
                    : (h(),
                      _('div', qb, [
                        K[11] ||
                          (K[11] = o(
                            'header',
                            null,
                            [
                              o('h3', null, 'Feedback dai validator runtime'),
                              o('p', null, 'Monitoraggio in tempo reale delle anomalie per bioma.'),
                            ],
                            -1,
                          )),
                        o('ul', null, [
                          (h(!0),
                          _(
                            te,
                            null,
                            se(
                              P.value,
                              (F) => (
                                h(),
                                _(
                                  'li',
                                  { key: F.id, class: ft(`status-${F.status}`) },
                                  [
                                    o('div', Ub, [
                                      Ne(
                                        dt,
                                        {
                                          label: F.biome,
                                          variant: 'validator',
                                          icon: Be(F.status),
                                        },
                                        null,
                                        8,
                                        ['label', 'icon'],
                                      ),
                                      o('span', null, b(F.label), 1),
                                    ]),
                                    o('p', null, b(F.message), 1),
                                  ],
                                  2,
                                )
                              ),
                            ),
                            128,
                          )),
                        ]),
                      ])),
              ]),
              _: 1,
            },
            8,
            ['modelValue', 'status-indicators'],
          ),
        ])
      );
    },
  },
  zb = Ue(jb, [['__scopeId', 'data-v-d3a076c9']]),
  Vb = ['data-tone'],
  Ot = {
    __name: 'EvoGeneDeckTelemetryBadge',
    props: {
      label: { type: String, required: !0 },
      value: { type: [String, Number], default: '—' },
      tone: { type: String, default: 'neutral' },
    },
    setup(e) {
      const n = `evogene-deck-telemetry-${_c()}`,
        a = `${n}-label`,
        s = `${n}-value`;
      return (r, i) => (
        h(),
        _(
          'span',
          {
            class: 'evogene-deck-telemetry',
            'data-tone': e.tone,
            role: 'group',
            'aria-labelledby': a,
            'aria-describedby': s,
          },
          [
            o('span', { id: a, class: 'evogene-deck-telemetry__label' }, b(e.label), 1),
            o('span', { id: s, class: 'evogene-deck-telemetry__value' }, [
              st(r.$slots, 'default', {}, () => [_n(b(e.value), 1)]),
            ]),
          ],
          8,
          Vb,
        )
      );
    },
  },
  Bb = ['data-tone'],
  Wb = { class: 'evogene-deck-biome-card__header' },
  Hb = { class: 'evogene-deck-biome-card__title' },
  Gb = { key: 0, class: 'evogene-deck-biome-card__subtitle' },
  Zb = { class: 'evogene-deck-biome-card__telemetry' },
  Yb = { key: 0, class: 'evogene-deck-biome-card__section' },
  Xb = { class: 'evogene-deck-biome-card__chips' },
  Kb = { key: 1, class: 'evogene-deck-biome-card__section' },
  Qb = { class: 'evogene-deck-biome-card__list' },
  Jb = { key: 2, class: 'evogene-deck-biome-card__section' },
  ey = { class: 'evogene-deck-biome-card__footer' },
  ty = { key: 0 },
  ny = {
    __name: 'EvoGeneDeckBiomeCard',
    props: { biome: { type: Object, required: !0 } },
    setup(e) {
      const t = e,
        n = T(() => {
          var r, i;
          return (
            ((r = t.biome) == null ? void 0 : r.lanes) ||
            ((i = t.biome) == null ? void 0 : i.paths) ||
            []
          );
        }),
        a = T(() => {
          var r, i;
          return (
            ((r = t.biome) == null ? void 0 : r.operations) ||
            ((i = t.biome) == null ? void 0 : i.opportunities) ||
            []
          );
        }),
        s = T(() => {
          var d, c;
          const r = Number((d = t.biome) == null ? void 0 : d.total) || 0,
            i = Number((c = t.biome) == null ? void 0 : c.readiness) || 0;
          if (!r) return 'warning';
          const l = Math.round((i / r) * 100);
          return l >= 80 ? 'success' : l < 50 ? 'critical' : 'warning';
        });
      return (r, i) => (
        h(),
        _(
          'article',
          { class: 'evogene-deck-biome-card', 'data-tone': s.value },
          [
            o('header', Wb, [
              o('div', null, [
                i[0] ||
                  (i[0] = o(
                    'p',
                    { class: 'evogene-deck-biome-card__kicker' },
                    'Bioma operativo',
                    -1,
                  )),
                o('h3', Hb, b(e.biome.name), 1),
                e.biome.hazard ? (h(), _('p', Gb, b(e.biome.hazard), 1)) : Y('', !0),
              ]),
              o('div', Zb, [
                Ne(
                  Ot,
                  {
                    label: 'Readiness',
                    value: `${e.biome.readiness || 0}/${e.biome.total || 0}`,
                    tone: s.value,
                  },
                  null,
                  8,
                  ['value', 'tone'],
                ),
                e.biome.risk
                  ? (h(),
                    nt(
                      Ot,
                      { key: 0, label: 'Rischio', value: e.biome.risk, tone: 'warning' },
                      null,
                      8,
                      ['value'],
                    ))
                  : Y('', !0),
              ]),
            ]),
            n.value.length
              ? (h(),
                _('section', Yb, [
                  i[1] || (i[1] = o('h4', null, 'Corridoi', -1)),
                  o('ul', Xb, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(n.value, (l) => (h(), _('li', { key: l }, b(l), 1))),
                      128,
                    )),
                  ]),
                ]))
              : Y('', !0),
            a.value.length
              ? (h(),
                _('section', Kb, [
                  i[2] || (i[2] = o('h4', null, 'Operazioni', -1)),
                  o('ul', Qb, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(a.value, (l) => (h(), _('li', { key: l }, b(l), 1))),
                      128,
                    )),
                  ]),
                ]))
              : Y('', !0),
            e.biome.infiltration
              ? (h(),
                _('section', Jb, [
                  i[3] || (i[3] = o('h4', null, 'Infiltrazione', -1)),
                  o('p', null, b(e.biome.infiltration), 1),
                ]))
              : Y('', !0),
            o('footer', ey, [
              e.biome.storyHook ? (h(), _('p', ty, b(e.biome.storyHook), 1)) : Y('', !0),
              st(r.$slots, 'footer', {}, void 0, !0),
            ]),
          ],
          8,
          Bb,
        )
      );
    },
  },
  ay = Ue(ny, [['__scopeId', 'data-v-2fd17d69']]),
  sy = { class: 'biomes-view' },
  ry = { class: 'biomes-view__telemetry' },
  iy = { class: 'biomes-view__filters' },
  ly = ['data-active', 'aria-pressed', 'onClick'],
  oy = { class: 'biomes-view__hazards' },
  cy = { key: 0, class: 'biomes-view__grid' },
  uy = { class: 'biomes-view__metrics' },
  dy = { key: 0, class: 'biomes-view__validators' },
  fy = { key: 1, class: 'biomes-view__validator-feed' },
  my = {
    __name: 'BiomesView',
    props: { biomes: { type: Array, default: () => [] } },
    setup(e) {
      const t = e,
        { biomes: n } = Ln(t),
        a = Pe('grid'),
        { t: s } = ea(),
        r = T(() => [
          { id: 'grid', label: s('views.biomes.tabs.grid'), icon: '🌌' },
          { id: 'validators', label: s('views.biomes.tabs.validators'), icon: '🛡' },
        ]),
        i = T(() => {
          const A = new Map();
          return (
            (Array.isArray(n.value) ? n.value : []).forEach((C) => {
              [
                ...(Array.isArray(C.traits) ? C.traits : []),
                ...(Array.isArray(C.affinities) ? C.affinities : []),
              ].forEach((M) => {
                const ce = typeof M == 'string' ? M : M.id || M.key || M.slug || M.name;
                ce &&
                  (A.has(ce) ||
                    A.set(ce, {
                      id: ce,
                      label: typeof M == 'string' ? M : M.label || M.name || ce,
                      description:
                        typeof M == 'string' ? '' : M.description || M.summary || M.detail || '',
                    }));
              });
            }),
            Array.from(A.values())
          );
        }),
        l = Pe([]),
        d = (A) => {
          const I = [
            ...(Array.isArray(A.traits) ? A.traits : []),
            ...(Array.isArray(A.affinities) ? A.affinities : []),
          ];
          return new Set(
            I.map((C) => (typeof C == 'string' ? C : C.id || C.key || C.slug || C.name)).filter(
              Boolean,
            ),
          );
        },
        c = T(() => {
          const A = new Set(l.value);
          return A.size
            ? (n.value || []).filter((I) => {
                const C = d(I);
                return Array.from(A).every((D) => C.has(D));
              })
            : Array.isArray(n.value)
              ? n.value
              : [];
        }),
        f = T(() => {
          const A = Array.isArray(c.value) ? c.value : [],
            I = A.reduce((M, ce) => M + (Number(ce.readiness) || 0), 0),
            C = A.reduce((M, ce) => M + (Number(ce.total) || 0), 0),
            D = A.reduce((M, ce) => M + (Number(ce.risk) || 0), 0);
          return {
            count: A.length,
            readiness: I,
            capacity: C,
            riskAverage: A.length ? Math.round((D / A.length) * 10) / 10 : 0,
          };
        }),
        p = T(() => {
          const A = [];
          if (
            ((f.value.count || l.value.length) &&
              A.push({
                id: 'count',
                label: s('views.biomes.metrics.activeBiomes'),
                value: f.value.count,
                tone: 'neutral',
              }),
            f.value.capacity)
          ) {
            const I = Math.min(100, Math.round((f.value.readiness / f.value.capacity) * 100));
            let C = 'warning';
            (I >= 80 ? (C = 'success') : I < 50 && (C = 'critical'),
              A.push({
                id: 'readiness',
                label: s('views.biomes.metrics.readinessCoverage'),
                value: `${I}%`,
                tone: C,
              }));
          }
          return (
            A.push({
              id: 'risk',
              label: s('views.biomes.metrics.riskAverage'),
              value: f.value.riskAverage || '0',
              tone: 'warning',
            }),
            l.value.length &&
              A.push({
                id: 'filters',
                label: s('views.biomes.metrics.activeFilters'),
                value: l.value.length,
                tone: 'neutral',
              }),
            A
          );
        }),
        g = T(() => {
          const A = new Set(),
            I = [];
          return (
            (c.value || []).forEach((C) => {
              const D = C.hazard || s('views.biomes.fallbacks.hazard');
              A.has(D) ||
                (A.add(D),
                I.push({ key: `${C.id}-hazard`, label: D, variant: 'hazard', icon: '⚠' }),
                C.climate &&
                  I.push({
                    key: `${C.id}-climate`,
                    label: C.climate,
                    variant: 'climate',
                    icon: '☁',
                  }));
            }),
            I.slice(0, 4)
          );
        }),
        v = T(() =>
          (c.value || []).flatMap((A) =>
            (A.validators || []).map((I) => ({
              id: `${A.id}-${I.id}`,
              biome: A.name,
              status: I.status || 'info',
              label: I.label,
              message: I.message,
            })),
          ),
        );
      function y(A) {
        if (!A) return;
        const I = l.value.indexOf(A);
        if (I === -1) l.value = [...l.value, A];
        else {
          const C = [...l.value];
          (C.splice(I, 1), (l.value = C));
        }
      }
      function N(A) {
        return l.value.includes(A);
      }
      function O() {
        l.value = [];
      }
      function P(A) {
        const I = Number.isFinite(A.total) ? A.total : 0,
          C = Number.isFinite(A.readiness) ? A.readiness : 0;
        return I ? Math.min(100, Math.round((C / I) * 100)) : 0;
      }
      function V(A) {
        const I = P(A);
        return `${A.readiness || 0} / ${A.total || 0} · ${I}%`;
      }
      function k(A) {
        const I = P(A);
        return I >= 80 ? 'success' : I < 50 ? 'critical' : 'warning';
      }
      function E(A) {
        return A
          ? A === 'passed'
            ? '✔'
            : A === 'warning'
              ? '⚠'
              : A === 'failed'
                ? '✖'
                : '◈'
          : '◈';
      }
      return (A, I) => (
        h(),
        _('section', sy, [
          Ne(
            Ir,
            {
              tabs: r.value,
              modelValue: a.value,
              'onUpdate:modelValue': I[0] || (I[0] = (C) => (a.value = C)),
              'status-indicators': p.value,
            },
            {
              cards: Ze(() => [
                Ne(
                  Bn,
                  { icon: '🛰', title: le(s)('views.biomes.cards.orchestrator') },
                  {
                    default: Ze(() => [
                      o('div', ry, [
                        (h(!0),
                        _(
                          te,
                          null,
                          se(
                            p.value,
                            (C) => (
                              h(),
                              nt(
                                Ot,
                                {
                                  key: C.id,
                                  label: C.label,
                                  value: C.value,
                                  tone: C.tone || 'neutral',
                                },
                                null,
                                8,
                                ['label', 'value', 'tone'],
                              )
                            ),
                          ),
                          128,
                        )),
                      ]),
                    ]),
                    _: 1,
                  },
                  8,
                  ['title'],
                ),
                i.value.length
                  ? (h(),
                    nt(
                      Bn,
                      { key: 0, icon: '🧬', title: le(s)('views.biomes.cards.traits') },
                      {
                        default: Ze(() => [
                          o('div', iy, [
                            (h(!0),
                            _(
                              te,
                              null,
                              se(
                                i.value,
                                (C) => (
                                  h(),
                                  _(
                                    'button',
                                    {
                                      key: C.id,
                                      type: 'button',
                                      class: 'biomes-view__filter',
                                      'data-active': N(C.id),
                                      'aria-pressed': N(C.id),
                                      onClick: (D) => y(C.id),
                                    },
                                    [
                                      Ne(
                                        Vo,
                                        { description: C.description },
                                        {
                                          default: Ze(() => [
                                            Ne(dt, { label: C.label, variant: 'trait' }, null, 8, [
                                              'label',
                                            ]),
                                          ]),
                                          _: 2,
                                        },
                                        1032,
                                        ['description'],
                                      ),
                                    ],
                                    8,
                                    ly,
                                  )
                                ),
                              ),
                              128,
                            )),
                          ]),
                          l.value.length
                            ? (h(),
                              _(
                                'button',
                                { key: 0, type: 'button', class: 'biomes-view__reset', onClick: O },
                                b(le(s)('views.biomes.actions.resetFilters')),
                                1,
                              ))
                            : Y('', !0),
                        ]),
                        _: 1,
                      },
                      8,
                      ['title'],
                    ))
                  : Y('', !0),
                g.value.length
                  ? (h(),
                    nt(
                      Bn,
                      { key: 1, icon: '⚠', title: le(s)('views.biomes.cards.hazards') },
                      {
                        default: Ze(() => [
                          o('div', oy, [
                            (h(!0),
                            _(
                              te,
                              null,
                              se(
                                g.value,
                                (C) => (
                                  h(),
                                  nt(
                                    dt,
                                    {
                                      key: C.key,
                                      label: C.label,
                                      variant: C.variant,
                                      icon: C.icon,
                                    },
                                    null,
                                    8,
                                    ['label', 'variant', 'icon'],
                                  )
                                ),
                              ),
                              128,
                            )),
                          ]),
                        ]),
                        _: 1,
                      },
                      8,
                      ['title'],
                    ))
                  : Y('', !0),
              ]),
              default: Ze(({ activeTab: C }) => [
                C === 'grid'
                  ? (h(),
                    _('div', cy, [
                      (h(!0),
                      _(
                        te,
                        null,
                        se(
                          c.value,
                          (D) => (
                            h(),
                            nt(
                              ay,
                              { key: D.id, biome: D },
                              {
                                footer: Ze(() => [
                                  o('div', uy, [
                                    Ne(
                                      Ot,
                                      {
                                        label: le(s)('views.biomes.metrics.readiness'),
                                        value: V(D),
                                        tone: k(D),
                                      },
                                      null,
                                      8,
                                      ['label', 'value', 'tone'],
                                    ),
                                    Ne(
                                      dt,
                                      {
                                        label: le(s)('views.biomes.metrics.riskLabel', {
                                          value: D.risk,
                                        }),
                                        variant: 'hazard',
                                        icon: '⚠',
                                      },
                                      null,
                                      8,
                                      ['label'],
                                    ),
                                  ]),
                                  (D.validators || []).length
                                    ? (h(),
                                      _('ul', dy, [
                                        (h(!0),
                                        _(
                                          te,
                                          null,
                                          se(
                                            D.validators,
                                            (M) => (
                                              h(),
                                              _(
                                                'li',
                                                {
                                                  key: M.id,
                                                  class: ft(`validator validator--${M.status}`),
                                                },
                                                [
                                                  Ne(
                                                    dt,
                                                    {
                                                      label: M.label,
                                                      variant: 'validator',
                                                      icon: E(M.status),
                                                    },
                                                    null,
                                                    8,
                                                    ['label', 'icon'],
                                                  ),
                                                  o('span', null, b(M.message), 1),
                                                ],
                                                2,
                                              )
                                            ),
                                          ),
                                          128,
                                        )),
                                      ]))
                                    : Y('', !0),
                                ]),
                                _: 2,
                              },
                              1032,
                              ['biome'],
                            )
                          ),
                        ),
                        128,
                      )),
                    ]))
                  : (h(),
                    _('div', fy, [
                      o('header', null, [
                        o('h3', null, b(le(s)('views.biomes.validator.feedTitle')), 1),
                        o('p', null, b(le(s)('views.biomes.validator.feedDescription')), 1),
                      ]),
                      o('ul', null, [
                        (h(!0),
                        _(
                          te,
                          null,
                          se(
                            v.value,
                            (D) => (
                              h(),
                              _(
                                'li',
                                { key: D.id, class: ft(`validator validator--${D.status}`) },
                                [
                                  o('div', null, [
                                    o('strong', null, b(D.biome), 1),
                                    o('span', null, b(D.label), 1),
                                  ]),
                                  o('p', null, b(D.message), 1),
                                ],
                                2,
                              )
                            ),
                          ),
                          128,
                        )),
                      ]),
                    ])),
              ]),
              _: 1,
            },
            8,
            ['tabs', 'modelValue', 'status-indicators'],
          ),
        ])
      );
    },
  },
  py = Ue(my, [['__scopeId', 'data-v-07f80ede']]),
  gy = { key: 0, class: 'encounter-panel' },
  hy = { class: 'encounter-panel__header' },
  _y = { class: 'encounter-panel__title-block' },
  vy = { class: 'encounter-panel__title' },
  by = { class: 'encounter-panel__summary' },
  yy = { class: 'encounter-panel__meta' },
  ky = { class: 'encounter-panel__badge' },
  wy = { class: 'encounter-panel__biome' },
  Ey = { key: 0, class: 'encounter-panel__variant-selector' },
  Sy = ['value'],
  Ty = { class: 'encounter-panel__description' },
  Ay = { class: 'encounter-panel__slots' },
  Iy = { class: 'encounter-panel__slot-list' },
  $y = { class: 'encounter-panel__slot-qty' },
  Ny = { class: 'encounter-panel__specimen-list' },
  xy = { class: 'encounter-panel__specimen-name' },
  Cy = { class: 'encounter-panel__specimen-role' },
  Oy = { key: 1, class: 'encounter-panel__parameters' },
  Ly = { key: 2, class: 'encounter-panel__warnings' },
  Ry = { key: 1, class: 'encounter-panel encounter-panel--empty' },
  Py = {
    __name: 'EncounterPanel',
    props: {
      encounter: { type: Object, default: null },
      initialVariant: { type: Number, default: 0 },
    },
    setup(e) {
      const t = e,
        n = Pe(t.initialVariant);
      (tt(
        () => t.encounter,
        () => {
          n.value = t.initialVariant;
        },
      ),
        tt(
          () => t.initialVariant,
          (c) => {
            n.value = c;
          },
        ));
      const a = T(() => {
          var c, f;
          return (
            (((f = (c = t.encounter) == null ? void 0 : c.variants) == null ? void 0 : f.length) ||
              0) > 1
          );
        }),
        s = T(() =>
          t.encounter
            ? (t.encounter.variants || [t.encounter.seed || t.encounter]).map((f) => ({
                ...f,
                metrics: f.metrics || { threat: { tier: 'T?' } },
                parametersList: Object.entries(f.parameters || {}).map(([p, g]) => {
                  var v;
                  return {
                    id: p,
                    label: ((v = t.encounter.parameterLabels) == null ? void 0 : v[p]) || p,
                    value: g,
                  };
                }),
                warnings: f.warnings || [],
              }))
            : [],
        ),
        r = T(() => {
          const c = Math.min(Math.max(n.value, 0), s.value.length - 1);
          return (
            s.value[c] || {
              summary: '',
              description: '',
              slots: [],
              metrics: { threat: { tier: 'T?' } },
              parametersList: [],
              warnings: [],
            }
          );
        }),
        i = T(() => {
          var c, f;
          return t.encounter
            ? {
                templateName: t.encounter.templateName || t.encounter.template_id || 'Encounter',
                biomeName:
                  t.encounter.biomeName ||
                  ((c = t.encounter.biome) == null ? void 0 : c.name) ||
                  ((f = t.encounter.biome) == null ? void 0 : f.id) ||
                  'Biome sconosciuto',
                variants: s.value,
              }
            : null;
        });
      function l(c, f) {
        const p = c.parametersList.map((g) => `${g.label}: ${g.value.label}`).join(' · ');
        return p ? `${f + 1}. ${p}` : `${f + 1}. Configurazione`;
      }
      function d(c) {
        return c.slot ? `${c.code} (${c.slot})` : c.code;
      }
      return (c, f) =>
        i.value
          ? (h(),
            _('section', gy, [
              o('header', hy, [
                o('div', _y, [
                  o('h2', vy, b(i.value.templateName), 1),
                  o('p', by, b(r.value.summary), 1),
                ]),
                o('div', yy, [
                  o('span', ky, b(r.value.metrics.threat.tier), 1),
                  o('span', wy, b(i.value.biomeName), 1),
                ]),
              ]),
              a.value
                ? (h(),
                  _('div', Ey, [
                    f[1] ||
                      (f[1] = o(
                        'label',
                        { class: 'encounter-panel__variant-label', for: 'encounter-variant' },
                        'Scenario',
                        -1,
                      )),
                    Ft(
                      o(
                        'select',
                        {
                          id: 'encounter-variant',
                          class: 'encounter-panel__variant-select',
                          'onUpdate:modelValue': f[0] || (f[0] = (p) => (n.value = p)),
                          'data-testid': 'variant-select',
                        },
                        [
                          (h(!0),
                          _(
                            te,
                            null,
                            se(
                              i.value.variants,
                              (p, g) => (
                                h(),
                                _('option', { key: p.id, value: g }, b(l(p, g)), 9, Sy)
                              ),
                            ),
                            128,
                          )),
                        ],
                        512,
                      ),
                      [[Wn, n.value]],
                    ),
                  ]))
                : Y('', !0),
              o('article', Ty, [o('p', null, b(r.value.description), 1)]),
              o('section', Ay, [
                f[2] || (f[2] = o('h3', null, 'Composizione', -1)),
                o('ul', Iy, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(
                      r.value.slots,
                      (p) => (
                        h(),
                        _('li', { key: p.id, class: 'encounter-panel__slot' }, [
                          o('header', null, [
                            o('h4', null, [
                              _n(b(p.title) + ' ', 1),
                              o('span', $y, '× ' + b(p.quantity), 1),
                            ]),
                          ]),
                          o('ul', Ny, [
                            (h(!0),
                            _(
                              te,
                              null,
                              se(
                                p.species,
                                (g) => (
                                  h(),
                                  _('li', { key: g.id }, [
                                    o('span', xy, b(g.display_name), 1),
                                    o('small', Cy, b(g.role_trofico), 1),
                                  ])
                                ),
                              ),
                              128,
                            )),
                          ]),
                        ])
                      ),
                    ),
                    128,
                  )),
                ]),
              ]),
              r.value.parametersList.length
                ? (h(),
                  _('section', Oy, [
                    f[3] || (f[3] = o('h3', null, 'Parametri', -1)),
                    o('dl', null, [
                      (h(!0),
                      _(
                        te,
                        null,
                        se(
                          r.value.parametersList,
                          (p) => (
                            h(),
                            _('div', { key: p.id }, [
                              o('dt', null, b(p.label), 1),
                              o('dd', null, b(p.value.label), 1),
                            ])
                          ),
                        ),
                        128,
                      )),
                    ]),
                  ]))
                : Y('', !0),
              r.value.warnings.length
                ? (h(),
                  _('section', Ly, [
                    f[4] || (f[4] = o('h3', null, 'Avvisi', -1)),
                    o('ul', null, [
                      (h(!0),
                      _(
                        te,
                        null,
                        se(
                          r.value.warnings,
                          (p) => (h(), _('li', { key: p.code + p.slot }, b(d(p)), 1)),
                        ),
                        128,
                      )),
                    ]),
                  ]))
                : Y('', !0),
            ]))
          : (h(),
            _('section', Ry, [
              ...(f[5] || (f[5] = [o('p', null, 'Nessun encounter generato.', -1)])),
            ]));
    },
  },
  My = Ue(Py, [['__scopeId', 'data-v-ed33f428']]),
  Dy = { class: 'encounter-editor' },
  Fy = { class: 'encounter-editor__header' },
  qy = { class: 'encounter-editor__steps', 'aria-label': 'Editor encounter' },
  Uy = ['onClick'],
  jy = { class: 'encounter-editor__step-index' },
  zy = { class: 'encounter-editor__step-label' },
  Vy = { class: 'encounter-editor__content' },
  By = { key: 0, class: 'encounter-editor__panel' },
  Wy = { class: 'variant-list' },
  Hy = ['onClick'],
  Gy = { class: 'variant-card__badge' },
  Zy = { class: 'variant-card__footer' },
  Yy = ['onClick'],
  Xy = { key: 1, class: 'encounter-editor__panel' },
  Ky = { key: 0, class: 'parameter-grid' },
  Qy = ['for'],
  Jy = ['id', 'onUpdate:modelValue', 'onChange'],
  ek = ['value'],
  tk = { key: 1 },
  nk = { key: 2, class: 'encounter-editor__panel' },
  ak = { key: 0, class: 'slot-table' },
  sk = { class: 'slot-table__info' },
  rk = { class: 'slot-table__controls' },
  ik = ['for'],
  lk = ['id', 'value', 'onInput'],
  ok = { key: 1 },
  ck = { class: 'encounter-editor__footer' },
  uk = ['disabled'],
  dk = ['disabled'],
  fk = {
    __name: 'EncounterEditor',
    props: {
      encounter: { type: Object, required: !0 },
      variants: { type: Array, default: () => [] },
      selectedVariantId: { type: String, default: null },
      metricsByVariant: { type: Object, default: () => ({}) },
      comparisonSelection: { type: Array, default: () => [] },
    },
    emits: ['select-variant', 'update-parameter', 'update-slot', 'toggle-comparison'],
    setup(e, { emit: t }) {
      const n = t,
        a = e,
        s = [
          { id: 'variant', label: 'Variante' },
          { id: 'parameters', label: 'Parametri' },
          { id: 'slots', label: 'Slot' },
        ],
        r = Pe(0);
      tt(
        () => a.selectedVariantId,
        () => {
          !a.selectedVariantId && a.variants.length && n('select-variant', a.variants[0].id);
        },
        { immediate: !0 },
      );
      const i = T(
          () => a.variants.find((N) => N.id === a.selectedVariantId) || a.variants[0] || null,
        ),
        l = ct({});
      tt(
        i,
        (N) => {
          if (N) {
            for (const O of Object.keys(l)) delete l[O];
            for (const [O, P] of Object.entries(N.parameters || {})) l[O] = P.value;
          }
        },
        { immediate: !0 },
      );
      const d = T(() => {
        const N = new Map();
        for (const P of a.variants)
          for (const [V, k] of Object.entries(P.parameters || {}))
            (N.has(V) || N.set(V, new Map()),
              N.get(V).set(k.value, { value: k.value, label: k.label, summary: k.summary || '' }));
        const O = {};
        for (const [P, V] of N.entries()) O[P] = Array.from(V.values());
        return O;
      });
      function c(N) {
        var O;
        return ((O = a.encounter.parameterLabels) == null ? void 0 : O[N]) || N;
      }
      function f(N) {
        n('select-variant', N);
      }
      function p(N) {
        var P;
        if (!i.value) return;
        const O = (P = d.value[N]) == null ? void 0 : P.find((V) => V.value === l[N]);
        O && n('update-parameter', { variantId: i.value.id, parameterId: N, value: O });
      }
      function g(N, O) {
        if (!i.value) return;
        const P = Number.parseInt(O, 10);
        Number.isNaN(P) ||
          P < 0 ||
          n('update-slot', { variantId: i.value.id, slotId: N, quantity: P });
      }
      function v() {
        r.value = Math.max(0, r.value - 1);
      }
      function y() {
        r.value = Math.min(s.length - 1, r.value + 1);
      }
      return (N, O) => {
        var P, V;
        return (
          h(),
          _('section', Dy, [
            o('header', Fy, [
              O[0] || (O[0] = o('h3', null, 'Editor step-by-step', -1)),
              o('nav', qy, [
                (h(),
                _(
                  te,
                  null,
                  se(s, (k, E) =>
                    o(
                      'button',
                      {
                        key: k.id,
                        type: 'button',
                        class: ft([
                          'encounter-editor__step',
                          { 'encounter-editor__step--active': E === r.value },
                        ]),
                        onClick: (A) => (r.value = E),
                      },
                      [o('span', jy, b(E + 1), 1), o('span', zy, b(k.label), 1)],
                      10,
                      Uy,
                    ),
                  ),
                  64,
                )),
              ]),
            ]),
            o('div', Vy, [
              ((P = s[r.value]) == null ? void 0 : P.id) === 'variant'
                ? (h(),
                  _('section', By, [
                    O[1] || (O[1] = o('h4', null, 'Seleziona una variante', -1)),
                    O[2] ||
                      (O[2] = o(
                        'p',
                        null,
                        'Scegli la variante da configurare o aggiungila al confronto laterale.',
                        -1,
                      )),
                    o('ul', Wy, [
                      (h(!0),
                      _(
                        te,
                        null,
                        se(e.variants, (k) => {
                          var E, A;
                          return (
                            h(),
                            _('li', { key: k.id }, [
                              o(
                                'article',
                                {
                                  class: ft([
                                    'variant-card',
                                    { 'variant-card--active': k.id === e.selectedVariantId },
                                  ]),
                                  onClick: (I) => f(k.id),
                                },
                                [
                                  o('header', null, [
                                    o('h5', null, b(k.summary), 1),
                                    o(
                                      'span',
                                      Gy,
                                      b(
                                        ((A =
                                          (E = e.metricsByVariant[k.id]) == null
                                            ? void 0
                                            : E.threat) == null
                                          ? void 0
                                          : A.tier) || 'T?',
                                      ),
                                      1,
                                    ),
                                  ]),
                                  o('p', null, b(k.description), 1),
                                  o('footer', Zy, [
                                    o('span', null, b(k.slots.length) + ' slot', 1),
                                    o(
                                      'button',
                                      {
                                        type: 'button',
                                        class: 'variant-card__action',
                                        onClick: sr(
                                          (I) => N.emit('toggle-comparison', k.id),
                                          ['stop'],
                                        ),
                                      },
                                      b(
                                        e.comparisonSelection.includes(k.id)
                                          ? 'Rimuovi dal confronto'
                                          : 'Confronta',
                                      ),
                                      9,
                                      Yy,
                                    ),
                                  ]),
                                ],
                                10,
                                Hy,
                              ),
                            ])
                          );
                        }),
                        128,
                      )),
                    ]),
                  ]))
                : ((V = s[r.value]) == null ? void 0 : V.id) === 'parameters'
                  ? (h(),
                    _('section', Xy, [
                      O[3] || (O[3] = o('h4', null, 'Configura parametri', -1)),
                      O[4] ||
                        (O[4] = o(
                          'p',
                          null,
                          "Modifica densità, cadenza e altri parametri per vedere l'impatto immediato.",
                          -1,
                        )),
                      i.value
                        ? (h(),
                          _('div', Ky, [
                            (h(!0),
                            _(
                              te,
                              null,
                              se(d.value, (k, E) => {
                                var A;
                                return (
                                  h(),
                                  _('div', { key: E, class: 'parameter-grid__item' }, [
                                    o('label', { for: `parameter-${E}` }, b(c(E)), 9, Qy),
                                    Ft(
                                      o(
                                        'select',
                                        {
                                          id: `parameter-${E}`,
                                          'onUpdate:modelValue': (I) => (l[E] = I),
                                          onChange: (I) => p(E),
                                        },
                                        [
                                          (h(!0),
                                          _(
                                            te,
                                            null,
                                            se(
                                              k,
                                              (I) => (
                                                h(),
                                                _(
                                                  'option',
                                                  { key: I.value, value: I.value },
                                                  b(I.label),
                                                  9,
                                                  ek,
                                                )
                                              ),
                                            ),
                                            128,
                                          )),
                                        ],
                                        40,
                                        Jy,
                                      ),
                                      [[Wn, l[E]]],
                                    ),
                                    o(
                                      'small',
                                      null,
                                      b(
                                        (A = k.find((I) => I.value === l[E])) == null
                                          ? void 0
                                          : A.summary,
                                      ),
                                      1,
                                    ),
                                  ])
                                );
                              }),
                              128,
                            )),
                          ]))
                        : (h(), _('p', tk, 'Nessuna variante selezionata.')),
                    ]))
                  : (h(),
                    _('section', nk, [
                      O[5] || (O[5] = o('h4', null, 'Gestisci slot e quantità', -1)),
                      O[6] ||
                        (O[6] = o(
                          'p',
                          null,
                          'Regola la composizione tattica prima di passare alla visualizzazione finale.',
                          -1,
                        )),
                      i.value
                        ? (h(),
                          _('div', ak, [
                            (h(!0),
                            _(
                              te,
                              null,
                              se(
                                i.value.slots,
                                (k) => (
                                  h(),
                                  _('div', { key: k.id, class: 'slot-table__row' }, [
                                    o('div', sk, [
                                      o('h5', null, b(k.title), 1),
                                      o(
                                        'span',
                                        null,
                                        b(k.species.length) + ' specie selezionate',
                                        1,
                                      ),
                                    ]),
                                    o('div', rk, [
                                      o('label', { for: `slot-${k.id}` }, 'Quantità', 8, ik),
                                      o(
                                        'input',
                                        {
                                          id: `slot-${k.id}`,
                                          type: 'number',
                                          min: '0',
                                          value: k.quantity,
                                          onInput: (E) => g(k.id, E.target.value),
                                        },
                                        null,
                                        40,
                                        lk,
                                      ),
                                    ]),
                                  ])
                                ),
                              ),
                              128,
                            )),
                          ]))
                        : (h(), _('p', ok, 'Nessuna variante selezionata.')),
                    ])),
            ]),
            o('footer', ck, [
              o(
                'button',
                { type: 'button', disabled: r.value === 0, onClick: v },
                'Indietro',
                8,
                uk,
              ),
              o(
                'button',
                { type: 'button', disabled: r.value >= s.length - 1, onClick: y },
                'Avanti',
                8,
                dk,
              ),
            ]),
          ])
        );
      };
    },
  },
  mk = Ue(fk, [['__scopeId', 'data-v-49627cc6']]),
  pk = { key: 0, class: 'metrics-panel' },
  gk = { class: 'metrics-panel__header' },
  hk = { class: 'metrics-panel__badge' },
  _k = { class: 'metrics-panel__list' },
  vk = { class: 'metrics-panel__rarity' },
  bk = { key: 0, class: 'metrics-panel__suggestions' },
  yk = {
    __name: 'EncounterMetricsPanel',
    props: {
      metrics: { type: Object, required: !0 },
      suggestions: { type: Array, default: () => [] },
    },
    setup(e) {
      return (t, n) =>
        e.metrics
          ? (h(),
            _('section', pk, [
              o('header', gk, [
                n[0] || (n[0] = o('h3', null, 'Metriche live', -1)),
                o('span', hk, b(e.metrics.threat.tier), 1),
              ]),
              o('dl', _k, [
                o('div', null, [
                  n[1] || (n[1] = o('dt', null, 'Punteggio minaccia', -1)),
                  o('dd', null, b(e.metrics.threat.score.toFixed(2)), 1),
                ]),
                o('div', null, [
                  n[2] || (n[2] = o('dt', null, 'Riepilogo rarità', -1)),
                  o('dd', null, [
                    o('ul', vk, [
                      (h(!0),
                      _(
                        te,
                        null,
                        se(
                          e.metrics.rarityMix.counts,
                          (a, s) => (
                            h(),
                            _('li', { key: s }, [
                              o('strong', null, b(s) + ':', 1),
                              o('span', null, b(a), 1),
                              o(
                                'small',
                                null,
                                '(' + b(e.metrics.rarityMix.distribution[s]) + '%)',
                                1,
                              ),
                            ])
                          ),
                        ),
                        128,
                      )),
                    ]),
                  ]),
                ]),
                o('div', null, [
                  n[3] || (n[3] = o('dt', null, 'Unità totali', -1)),
                  o('dd', null, b(e.metrics.rarityMix.total), 1),
                ]),
              ]),
              e.suggestions.length
                ? (h(),
                  _('section', bk, [
                    n[4] || (n[4] = o('h4', null, 'Suggerimenti', -1)),
                    o('ul', null, [
                      (h(!0),
                      _(
                        te,
                        null,
                        se(e.suggestions, (a) => (h(), _('li', { key: a }, b(a), 1))),
                        128,
                      )),
                    ]),
                  ]))
                : Y('', !0),
            ]))
          : Y('', !0);
    },
  },
  kk = Ue(yk, [['__scopeId', 'data-v-9cbbd50e']]),
  wk = { class: 'variant-comparison' },
  Ek = { class: 'variant-comparison__selector' },
  Sk = ['value', 'checked', 'onChange'],
  Tk = { key: 0, class: 'variant-comparison__grid' },
  Ak = { class: 'comparison-card__badge' },
  Ik = { class: 'comparison-card__description' },
  $k = { class: 'comparison-card__metrics' },
  Nk = { class: 'comparison-card__parameters' },
  xk = { class: 'comparison-card__actions' },
  Ck = ['onClick'],
  Ok = ['onClick'],
  Lk = { key: 1, class: 'variant-comparison__empty' },
  Rk = {
    __name: 'VariantComparison',
    props: {
      variants: { type: Array, default: () => [] },
      metricsByVariant: { type: Object, default: () => ({}) },
      selectedIds: { type: Array, default: () => [] },
      parameterLabels: { type: Object, default: () => ({}) },
    },
    emits: ['toggle', 'export'],
    setup(e, { emit: t }) {
      const n = t,
        a = e,
        s = T(() => a.variants.filter((c) => a.selectedIds.includes(c.id)));
      function r(c) {
        n('toggle', c);
      }
      function i(c, f) {
        n('export', { variantId: c, target: f });
      }
      function l(c) {
        var g;
        if (!((g = c == null ? void 0 : c.rarityMix) != null && g.dominant)) return '—';
        const f = c.rarityMix.dominant,
          p = c.rarityMix.distribution[f];
        return p ? `${f} (${p}%)` : f;
      }
      function d(c) {
        var f;
        return ((f = a.parameterLabels) == null ? void 0 : f[c]) || c;
      }
      return (c, f) => (
        h(),
        _('section', wk, [
          f[4] ||
            (f[4] = o(
              'header',
              null,
              [
                o('h3', null, 'Confronto varianti'),
                o(
                  'p',
                  null,
                  'Seleziona fino a tre varianti per confrontarle fianco a fianco ed esportarle.',
                ),
              ],
              -1,
            )),
          o('ul', Ek, [
            (h(!0),
            _(
              te,
              null,
              se(e.variants, (p) => {
                var g, v;
                return (
                  h(),
                  _('li', { key: p.id }, [
                    o('label', null, [
                      o(
                        'input',
                        {
                          type: 'checkbox',
                          value: p.id,
                          checked: e.selectedIds.includes(p.id),
                          onChange: (y) => r(p.id),
                        },
                        null,
                        40,
                        Sk,
                      ),
                      o('span', null, b(p.summary), 1),
                      o(
                        'small',
                        null,
                        b(
                          ((v = (g = e.metricsByVariant[p.id]) == null ? void 0 : g.threat) == null
                            ? void 0
                            : v.tier) || 'T?',
                        ),
                        1,
                      ),
                    ]),
                  ])
                );
              }),
              128,
            )),
          ]),
          s.value.length
            ? (h(),
              _('div', Tk, [
                (h(!0),
                _(
                  te,
                  null,
                  se(s.value, (p) => {
                    var g, v, y, N;
                    return (
                      h(),
                      _('article', { key: p.id, class: 'comparison-card' }, [
                        o('header', null, [
                          o('h4', null, b(p.summary), 1),
                          o(
                            'span',
                            Ak,
                            b(
                              ((v = (g = e.metricsByVariant[p.id]) == null ? void 0 : g.threat) ==
                              null
                                ? void 0
                                : v.tier) || 'T?',
                            ),
                            1,
                          ),
                        ]),
                        o('p', Ik, b(p.description), 1),
                        o('section', $k, [
                          f[2] || (f[2] = o('h5', null, 'Metriche', -1)),
                          o('ul', null, [
                            o('li', null, [
                              f[0] || (f[0] = o('strong', null, 'Minaccia:', -1)),
                              o(
                                'span',
                                null,
                                b(
                                  (N =
                                    (y = e.metricsByVariant[p.id]) == null ? void 0 : y.threat) ==
                                    null
                                    ? void 0
                                    : N.score.toFixed(2),
                                ),
                                1,
                              ),
                            ]),
                            o('li', null, [
                              f[1] || (f[1] = o('strong', null, 'Rarità dominante:', -1)),
                              o('span', null, b(l(e.metricsByVariant[p.id])), 1),
                            ]),
                          ]),
                        ]),
                        o('section', Nk, [
                          f[3] || (f[3] = o('h5', null, 'Parametri', -1)),
                          o('ul', null, [
                            (h(!0),
                            _(
                              te,
                              null,
                              se(
                                p.parameters,
                                (O, P) => (
                                  h(),
                                  _('li', { key: P }, [
                                    _n(b(d(P)) + ': ', 1),
                                    o('strong', null, b(O.label), 1),
                                  ])
                                ),
                              ),
                              128,
                            )),
                          ]),
                        ]),
                        o('footer', xk, [
                          o(
                            'button',
                            { type: 'button', onClick: (O) => i(p.id, 'pack') },
                            'Esporta nel pack',
                            8,
                            Ck,
                          ),
                          o(
                            'button',
                            { type: 'button', onClick: (O) => i(p.id, 'builder') },
                            'Invia a Encounter Builder',
                            8,
                            Ok,
                          ),
                        ]),
                      ])
                    );
                  }),
                  128,
                )),
              ]))
            : (h(), _('p', Lk, 'Seleziona almeno una variante da confrontare.')),
        ])
      );
    },
  },
  Pk = Ue(Rk, [['__scopeId', 'data-v-046d9858']]),
  bl = Object.freeze([
    {
      id: 'dune-patrol',
      name: 'Pattuglia Termomagnetica',
      category: 'skirmish',
      tags: ['patrol', 'mobile'],
      biomes: ['badlands', 'deserto_caldo'],
      summary: 'Pattuglia {{parameters.intensity.label}} tra le dune di {{biome.name}}',
      description:
        'Il comandante {{slots.leader.primary.display_name}} coordina {{slots.outrider.names || "nessun esploratore"}} con supporto {{slots.support.names || "limitato"}}.',
      parameters: [
        {
          id: 'intensity',
          type: 'enum',
          default: 'standard',
          label: 'Intensità tattica',
          values: [
            { value: 'low', label: 'cauta', summary: 'Riduce pattugliamenti di contatto.' },
            {
              value: 'standard',
              label: 'standard',
              summary: 'Comportamento di pattuglia regolare.',
            },
            {
              value: 'high',
              label: 'aggressiva',
              summary: 'Ricerca attiva di bersagli ad alto rischio.',
            },
          ],
        },
      ],
      slots: [
        {
          id: 'leader',
          title: 'Predatore alfa',
          quantity: 1,
          filters: {
            roles: ['predatore_apice_badlands', 'predatore_apice_deserto_caldo'],
            tags: ['predatore'],
          },
        },
        {
          id: 'outrider',
          title: 'Esploratori sinaptici',
          quantity: { min: 1, max: 2 },
          filters: {
            roles: ['predatore_specialista_badlands', 'predatore_specialista_deserto_caldo'],
            tags: ['ricognizione', 'trappola'],
          },
          variants: {
            intensity: {
              low: { quantity: { min: 1, max: 1 } },
              high: { quantity: { min: 2, max: 3 } },
            },
          },
        },
        {
          id: 'support',
          title: 'Supporto bio-ingegneristico',
          quantity: { min: 0, max: 2 },
          optional: !0,
          filters: {
            roles: ['ingegnere_ecologico_badlands', 'ingegnere_ecologico_deserto_caldo'],
            tags: ['supporto', 'catalizzatore'],
          },
          variants: { intensity: { high: { quantity: { min: 1, max: 2 } } } },
        },
      ],
      dynamics: {
        threat: {
          base: 2.5,
          slotWeight: { default: 0.9, leader: 1.4 },
          parameterMultipliers: { intensity: { low: 0.85, standard: 1, high: 1.25 } },
        },
        pacing: { base: 'dinamica' },
      },
    },
    {
      id: 'glacier-ambush',
      name: 'Agguato dei Ponti di Ghiaccio',
      category: 'skirmish',
      tags: ['imboscata', 'furtiva'],
      biomes: ['cryosteppe'],
      summary: 'Emboscata {{parameters.trigger.label}} nella {{biome.name}}',
      description:
        'Le unità di presa {{slots.vanguard.names}} chiudono i flussi mentre {{slots.sapper.names || "nessun sabotatore"}} preparano il terreno.',
      parameters: [
        {
          id: 'trigger',
          type: 'enum',
          default: 'standard',
          label: 'Trigger',
          values: [
            { value: 'standard', label: 'a contatto' },
            { value: 'delayed', label: 'a ritardo' },
          ],
        },
      ],
      slots: [
        {
          id: 'vanguard',
          title: 'Linea di chiusura',
          quantity: { min: 2, max: 3 },
          filters: {
            roles: ['predatore_assalitore_cryosteppe', 'guardiano_cryosteppe'],
            tags: ['controllo'],
          },
        },
        {
          id: 'sapper',
          title: 'Sabotatori ambientali',
          quantity: { min: 0, max: 2 },
          optional: !0,
          filters: {
            roles: ['ingegnere_ecologico_cryosteppe', 'supporto_cryosteppe'],
            tags: ['area_effect'],
          },
          variants: { trigger: { delayed: { quantity: { min: 1, max: 2 } } } },
        },
        {
          id: 'overwatch',
          title: 'Contenimento a distanza',
          quantity: { min: 1, max: 1 },
          filters: { roles: ['predatore_ranged_cryosteppe'], tags: ['precisione'] },
        },
      ],
      dynamics: {
        threat: {
          base: 2,
          slotWeight: { default: 0.8, overwatch: 1.3 },
          parameterMultipliers: { trigger: { delayed: 1.1, standard: 1 } },
        },
        pacing: { base: 'tesa' },
      },
    },
    {
      id: 'temperate-bloom',
      name: 'Sinfonia Micotica',
      category: 'story',
      tags: ['evento', 'ambientale'],
      biomes: ['foresta_temperata'],
      summary: 'Evento {{parameters.expression.label}} nella {{biome.name}}',
      description:
        'Le colonie {{slots.conductor.names}} orchestrano un bloom che attira {{slots.sentinel.names}} e può mutare in {{slots.emergent.names || "esiti imprevedibili"}}.',
      parameters: [
        {
          id: 'expression',
          type: 'enum',
          default: 'placida',
          label: 'Espressione del bloom',
          values: [
            {
              value: 'placida',
              label: 'placida',
              description: 'Integrazione simbiotica con il bosco.',
            },
            {
              value: 'sinergica',
              label: 'sinergica',
              description: 'Richiede manutenzione biotica costante.',
            },
          ],
        },
      ],
      slots: [
        {
          id: 'conductor',
          title: 'Colonie direttrici',
          quantity: { min: 1, max: 2 },
          filters: { roles: ['ingegnere_ecologico_foresta_temperata'], tags: ['micelio', 'rete'] },
        },
        {
          id: 'sentinel',
          title: 'Sentinelle',
          quantity: { min: 1, max: 2 },
          filters: {
            roles: ['guardiano_foresta_temperata', 'predatore_specialista_foresta_temperata'],
            tags: ['difesa'],
          },
        },
        {
          id: 'emergent',
          title: 'Forme emergenti',
          quantity: { min: 0, max: 1 },
          optional: !0,
          filters: { roles: ['anomalia_ecologica_foresta_temperata'] },
          variants: { expression: { sinergica: { quantity: { min: 1, max: 2 } } } },
        },
      ],
      dynamics: {
        threat: {
          base: 1.2,
          slotWeight: { default: 0.6, sentinel: 0.9 },
          parameterMultipliers: { expression: { placida: 0.9, sinergica: 1.1 } },
        },
        pacing: { base: 'rituale' },
      },
    },
  ]);
function Bo(e) {
  if (typeof e == 'number') return e;
  if (typeof e == 'string') {
    const t = e.match(/(\d+(?:\.\d+)?)/);
    if (t) return parseFloat(t[1]);
  }
  return 1;
}
function Mk(e, t, n) {
  var l;
  const a = ((l = e.dynamics) == null ? void 0 : l.threat) || {},
    s = a.slotWeight || {};
  let r = a.base ?? 0;
  for (const d of n) {
    const c = s[d.slot.id] ?? s.default ?? 1,
      f = d.species.reduce((p, g) => {
        var y, N;
        const v = Bo(
          ((y = g.statistics) == null ? void 0 : y.threat_tier) ||
            ((N = g.balance) == null ? void 0 : N.threat_tier),
        );
        return p + v;
      }, 0);
    r += f * c;
  }
  if (a.parameterMultipliers)
    for (const [d, c] of Object.entries(a.parameterMultipliers)) {
      const f = t[d];
      f && typeof c[f.value] == 'number' && (r *= c[f.value]);
    }
  const i = Math.max(1, Math.round(r));
  return { score: Number(r.toFixed(2)), tier: `T${i}` };
}
function Dk(e, t) {
  var s, r;
  if (e) return e;
  const n =
      (r = (s = t == null ? void 0 : t.metrics) == null ? void 0 : s.threat) == null
        ? void 0
        : r.tier,
    a = n ? Bo(n) : 0;
  return {
    id: (t == null ? void 0 : t.id) || 'custom',
    name: (t == null ? void 0 : t.summary) || 'Variante',
    dynamics: { threat: { base: a, slotWeight: {} } },
  };
}
function Fk(e) {
  return e
    ? (e.slots || []).map((t) => {
        var n;
        return {
          slot: { id: t.id, title: t.title },
          quantity: t.quantity ?? ((n = t.species) == null ? void 0 : n.length) ?? 0,
          species: (t.species || []).map((a) => {
            var s, r, i;
            return {
              ...a,
              statistics: {
                ...(a.statistics || {}),
                threat_tier:
                  ((s = a.statistics) == null ? void 0 : s.threat_tier) ||
                  a.threat_tier ||
                  ((r = a.balance) == null ? void 0 : r.threat_tier) ||
                  null,
                rarity: ((i = a.statistics) == null ? void 0 : i.rarity) || a.rarity || null,
              },
              balance: a.balance || null,
            };
          }),
        };
      })
    : [];
}
function qk(e) {
  const t = {},
    n = Object.entries((e == null ? void 0 : e.parameters) || {});
  for (const [a, s] of n) s && typeof s == 'object' && (t[a] = s);
  return t;
}
function Uk(e) {
  var i;
  const t = {};
  let n = 0;
  for (const l of e)
    for (const d of l.species) {
      const c = ((i = d.statistics) == null ? void 0 : i.rarity) || 'Sconosciuta';
      ((t[c] = (t[c] || 0) + 1), (n += 1));
    }
  const a = {};
  let s = null,
    r = 0;
  for (const [l, d] of Object.entries(t)) {
    const c = n === 0 ? 0 : Number(((d / n) * 100).toFixed(1));
    ((a[l] = c), d > r && ((r = d), (s = l)));
  }
  return { total: n, counts: t, distribution: a, dominant: s || null };
}
function jk(e, t) {
  if (!t)
    return {
      threat: { tier: 'T?', score: 0 },
      rarityMix: { total: 0, counts: {}, distribution: {}, dominant: null },
    };
  const n = Dk(e, t),
    a = Fk(t),
    s = qk(t),
    r = Mk(n, s, a),
    i = Uk(a);
  return { threat: r, rarityMix: i };
}
function zk(e) {
  var i, l, d, c;
  if (!e) return [];
  const t = [],
    n = ((i = e.threat) == null ? void 0 : i.score) ?? 0,
    a = ((l = e.threat) == null ? void 0 : l.tier) ?? 'T?',
    s = ((d = e.rarityMix) == null ? void 0 : d.total) ?? 0,
    r = (c = e.rarityMix) == null ? void 0 : c.dominant;
  return (
    n >= 9
      ? t.push(
          "Riduci la presenza di unità d'élite o abbassa la cadenza per riportare la minaccia sotto controllo.",
        )
      : n <= 4 &&
        s > 0 &&
        t.push(
          "Aggiungi un rinforzo pesante o aumenta l'intensità dei parametri per evitare un incontro troppo facile.",
        ),
    r &&
      r.toLowerCase().includes('comune') &&
      t.push(
        'Inserisci una creatura rara per aumentare la varietà tattica e la ricompensa percepita.',
      ),
    !t.length &&
      a !== 'T?' &&
      t.push('La configurazione è bilanciata: valuta solo piccoli ritocchi narrativi o di pacing.'),
    t
  );
}
const Vk = { class: 'encounter-workspace' },
  Bk = { class: 'encounter-workspace__header' },
  Wk = { class: 'encounter-workspace__summary' },
  Hk = { class: 'encounter-workspace__grid' },
  Gk = { key: 1, class: 'encounter-workspace__preview' },
  Zk = {
    __name: 'EncounterView',
    props: { encounter: { type: Object, required: !0 }, summary: { type: Object, required: !0 } },
    setup(e) {
      const t = e,
        n = Pe(null),
        a = Pe([]),
        s = Pe(null),
        r = T(() =>
          t.encounter
            ? t.encounter.templateId
              ? bl.find((k) => k.id === t.encounter.templateId) || null
              : bl.find((k) => k.name === t.encounter.templateName) || null
            : null,
        ),
        i = Pe(null);
      tt(
        () => t.encounter,
        (k) => {
          var A, I;
          if (!k) {
            ((i.value = null), (n.value = null), (a.value = []));
            return;
          }
          const E =
            ((A = k.variants) == null
              ? void 0
              : A.map((C) => ({
                  id: C.id,
                  summary: C.summary,
                  description: C.description,
                  parameters: ct({ ...C.parameters }),
                  slots: C.slots.map((D) =>
                    ct({
                      id: D.id,
                      title: D.title,
                      quantity: D.quantity,
                      species: D.species.map((M) => ({ ...M })),
                    }),
                  ),
                  warnings: [...(C.warnings || [])],
                  metrics: { ...(C.metrics || {}) },
                }))) || [];
          ((i.value = ct({
            templateName: k.templateName,
            biomeName: k.biomeName,
            parameterLabels: k.parameterLabels || {},
            variants: E,
          })),
            (n.value = ((I = E[0]) == null ? void 0 : I.id) || null),
            (a.value = E.slice(0, 2).map((C) => C.id)));
        },
        { immediate: !0 },
      );
      const l = T(() => {
          const k = {};
          if (!i.value) return k;
          for (const E of i.value.variants) k[E.id] = jk(r.value, E);
          return k;
        }),
        d = T(() =>
          i.value
            ? {
                templateName: i.value.templateName,
                biomeName: i.value.biomeName,
                parameterLabels: i.value.parameterLabels,
                variants: i.value.variants.map((k) => {
                  var E, A;
                  return {
                    ...k,
                    metrics: {
                      ...k.metrics,
                      threat: ((E = l.value[k.id]) == null ? void 0 : E.threat) ||
                        ((A = k.metrics) == null ? void 0 : A.threat) || { tier: 'T?' },
                    },
                  };
                }),
              }
            : null,
        ),
        c = T(() => (i.value ? i.value.variants.findIndex((k) => k.id === n.value) : 0)),
        f = T(() => (i.value && i.value.variants.find((k) => k.id === n.value)) || null),
        p = T(() =>
          f.value
            ? l.value[f.value.id]
            : {
                threat: { tier: 'T?', score: 0 },
                rarityMix: { total: 0, counts: {}, distribution: {}, dominant: null },
              },
        ),
        g = T(() => zk(p.value)),
        v = T(() => (s.value ? `Esportato ${s.value.variant} → ${s.value.target}` : ''));
      function y(k) {
        n.value = k;
      }
      function N({ variantId: k, parameterId: E, value: A }) {
        if (!i.value) return;
        const I = i.value.variants.find((C) => C.id === k);
        I && (I.parameters[E] = { ...I.parameters[E], ...A });
      }
      function O({ variantId: k, slotId: E, quantity: A }) {
        if (!i.value) return;
        const I = i.value.variants.find((D) => D.id === k);
        if (!I) return;
        const C = I.slots.find((D) => D.id === E);
        C && (C.quantity = A);
      }
      function P(k) {
        const E = new Set(a.value);
        (E.has(k) ? E.delete(k) : E.add(k), (a.value = Array.from(E).slice(0, 3)));
      }
      function V({ variantId: k, target: E }) {
        if (!i.value) return;
        const A = i.value.variants.find((I) => I.id === k);
        A &&
          (s.value = {
            variant: A.summary,
            target: E === 'pack' ? 'Pack' : 'Encounter Builder',
            timestamp: new Date(),
          });
      }
      return (k, E) => (
        h(),
        _('section', Vk, [
          o('header', Bk, [
            E[0] ||
              (E[0] = o(
                'div',
                null,
                [
                  o('h2', null, 'Editor encounter'),
                  o(
                    'p',
                    null,
                    'Configura template, parametri e slot prima della visualizzazione finale.',
                  ),
                ],
                -1,
              )),
            o('div', Wk, [
              Ne(Ot, { label: 'Seed', value: e.summary.seeds }, null, 8, ['value']),
              Ne(Ot, { label: 'Varianti', value: e.summary.variants }, null, 8, ['value']),
              Ne(
                Ot,
                {
                  label: 'Warning',
                  value: e.summary.warnings,
                  tone: e.summary.warnings ? 'warning' : 'success',
                },
                null,
                8,
                ['value', 'tone'],
              ),
              v.value
                ? (h(),
                  nt(
                    Ot,
                    { key: 0, label: 'Ultimo export', tone: 'success' },
                    { default: Ze(() => [_n(b(v.value), 1)]), _: 1 },
                  ))
                : Y('', !0),
            ]),
          ]),
          o('div', Hk, [
            i.value
              ? (h(),
                nt(
                  mk,
                  {
                    key: 0,
                    encounter: i.value,
                    variants: i.value.variants,
                    'selected-variant-id': n.value,
                    'metrics-by-variant': l.value,
                    'comparison-selection': a.value,
                    onSelectVariant: y,
                    onUpdateParameter: N,
                    onUpdateSlot: O,
                    onToggleComparison: P,
                  },
                  null,
                  8,
                  [
                    'encounter',
                    'variants',
                    'selected-variant-id',
                    'metrics-by-variant',
                    'comparison-selection',
                  ],
                ))
              : Y('', !0),
            d.value
              ? (h(),
                _('div', Gk, [
                  Ne(My, { encounter: d.value, 'initial-variant': c.value }, null, 8, [
                    'encounter',
                    'initial-variant',
                  ]),
                  Ne(kk, { metrics: p.value, suggestions: g.value }, null, 8, [
                    'metrics',
                    'suggestions',
                  ]),
                ]))
              : Y('', !0),
          ]),
          i.value
            ? (h(),
              nt(
                Pk,
                {
                  key: 0,
                  variants: i.value.variants,
                  'metrics-by-variant': l.value,
                  'selected-ids': a.value,
                  'parameter-labels': i.value.parameterLabels,
                  onToggle: P,
                  onExport: V,
                },
                null,
                8,
                ['variants', 'metrics-by-variant', 'selected-ids', 'parameter-labels'],
              ))
            : Y('', !0),
        ])
      );
    },
  },
  Yk = Ue(Zk, [['__scopeId', 'data-v-40a0208f']]),
  Xk = { class: 'flow-view' },
  Kk = { class: 'flow-view__grid' },
  Qk = { class: 'flow-card' },
  Jk = { class: 'flow-card__body' },
  ew = { class: 'flow-card' },
  tw = { class: 'publishing-workflow' },
  nw = { class: 'publishing-workflow__steps' },
  aw = { class: 'publishing-step__status' },
  sw = { class: 'publishing-step__meta' },
  rw = { class: 'publishing-step__meta' },
  iw = { class: 'publishing-updates' },
  lw = { class: 'publishing-timeline' },
  ow = { class: 'publishing-notifications' },
  cw = { key: 0 },
  uw = {
    __name: 'PublishingView',
    props: { publishing: { type: Object, required: !0 } },
    setup(e) {
      const t = e,
        { publishing: n } = Ln(t),
        a = T(() => {
          var d, c, f, p, g, v, y, N, O, P, V, k;
          const l = n.value.workflow || {};
          return [
            {
              id: 'preview',
              title: 'Anteprima',
              status: ((d = l.preview) == null ? void 0 : d.status) || 'pending',
              owner: ((c = l.preview) == null ? void 0 : c.owner) || '—',
              eta: ((f = l.preview) == null ? void 0 : f.eta) || '—',
              notes: ((p = l.preview) == null ? void 0 : p.notes) || '—',
            },
            {
              id: 'approval',
              title: 'Approvazione',
              status: ((g = l.approval) == null ? void 0 : g.status) || 'pending',
              owner: ((v = l.approval) == null ? void 0 : v.owner) || '—',
              eta: ((y = l.approval) == null ? void 0 : y.eta) || '—',
              notes: ((N = l.approval) == null ? void 0 : N.notes) || '—',
            },
            {
              id: 'deploy',
              title: 'Deploy sul sito',
              status: ((O = l.deploy) == null ? void 0 : O.status) || 'pending',
              owner: ((P = l.deploy) == null ? void 0 : P.owner) || '—',
              eta: ((V = l.deploy) == null ? void 0 : V.eta) || '—',
              notes: ((k = l.deploy) == null ? void 0 : k.notes) || '—',
            },
          ];
        }),
        s = T(() => (Array.isArray(n.value.history) ? n.value.history : [])),
        r = T(() => (Array.isArray(n.value.notifications) ? n.value.notifications : []));
      function i(l) {
        return l === 'ready'
          ? 'Pronto'
          : l === 'scheduled'
            ? 'Programmato'
            : l === 'in-progress'
              ? 'In corso'
              : l === 'done'
                ? 'Completato'
                : 'In attesa';
      }
      return (l, d) => (
        h(),
        _('section', Xk, [
          d[6] ||
            (d[6] = o(
              'header',
              { class: 'flow-view__header' },
              [
                o('h2', null, 'Publishing & Deliverable'),
                o('p', null, 'Stato di confezionamento dei materiali e canali di uscita.'),
              ],
              -1,
            )),
          o('div', Kk, [
            o('article', Qk, [
              d[0] || (d[0] = o('h3', { class: 'flow-card__title' }, 'Artefatti', -1)),
              o(
                'p',
                Jk,
                b(le(n).artifactsReady) +
                  ' asset pronti su ' +
                  b(le(n).totalArtifacts) +
                  ' previsti. ',
                1,
              ),
            ]),
            o('article', ew, [
              d[1] || (d[1] = o('h3', { class: 'flow-card__title' }, 'Canali', -1)),
              o('ul', null, [
                (h(!0),
                _(
                  te,
                  null,
                  se(le(n).channels, (c) => (h(), _('li', { key: c }, b(c), 1))),
                  128,
                )),
              ]),
            ]),
            d[2] ||
              (d[2] = o(
                'article',
                { class: 'flow-card flow-card--action' },
                [
                  o('h3', { class: 'flow-card__title' }, 'Prossime azioni'),
                  o(
                    'p',
                    { class: 'flow-card__body' },
                    'Coordinare il QA narrativo e validare la sincronizzazione media.',
                  ),
                ],
                -1,
              )),
          ]),
          o('section', tw, [
            d[3] ||
              (d[3] = o(
                'header',
                null,
                [
                  o('h3', null, 'Workflow di pubblicazione'),
                  o(
                    'p',
                    null,
                    'Anteprima, approvazione e deploy con stato aggiornato e referenti di riferimento.',
                  ),
                ],
                -1,
              )),
            o('div', nw, [
              (h(!0),
              _(
                te,
                null,
                se(
                  a.value,
                  (c) => (
                    h(),
                    _(
                      'article',
                      { key: c.id, class: ft(['publishing-step', `publishing-step--${c.status}`]) },
                      [
                        o('header', null, [
                          o('h4', null, b(c.title), 1),
                          o('span', aw, b(i(c.status)), 1),
                        ]),
                        o('p', null, b(c.notes), 1),
                        o('footer', null, [
                          o('span', sw, 'Owner · ' + b(c.owner), 1),
                          o('span', rw, 'ETA · ' + b(c.eta), 1),
                        ]),
                      ],
                      2,
                    )
                  ),
                ),
                128,
              )),
            ]),
          ]),
          o('div', iw, [
            o('section', lw, [
              d[4] ||
                (d[4] = o(
                  'header',
                  null,
                  [
                    o('h3', null, 'Cronologia release'),
                    o('p', null, 'Eventi recenti e milestone approvate per il pacchetto corrente.'),
                  ],
                  -1,
                )),
              o('ul', null, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    s.value,
                    (c) => (
                      h(),
                      _('li', { key: c.id }, [
                        o('div', null, [
                          o('strong', null, b(c.label), 1),
                          o('p', null, b(c.details), 1),
                        ]),
                        o('footer', null, [
                          o('span', null, b(c.author), 1),
                          o('time', null, b(c.timestamp), 1),
                        ]),
                      ])
                    ),
                  ),
                  128,
                )),
              ]),
            ]),
            o('section', ow, [
              d[5] ||
                (d[5] = o(
                  'header',
                  null,
                  [
                    o('h3', null, 'Notifiche team'),
                    o('p', null, 'Avvisi inviati a stakeholder e canali di comunicazione.'),
                  ],
                  -1,
                )),
              o('ul', null, [
                (h(!0),
                _(
                  te,
                  null,
                  se(r.value, (c) => {
                    var f;
                    return (
                      h(),
                      _('li', { key: c.id }, [
                        o('div', null, [
                          o('strong', null, b(c.channel), 1),
                          o('p', null, b(c.message), 1),
                        ]),
                        o('footer', null, [
                          (f = c.recipients) != null && f.length
                            ? (h(), _('span', cw, b(c.recipients.join(', ')), 1))
                            : Y('', !0),
                          o('time', null, b(c.time), 1),
                        ]),
                      ])
                    );
                  }),
                  128,
                )),
              ]),
            ]),
          ]),
        ])
      );
    },
  },
  dw = Ue(uw, [['__scopeId', 'data-v-215c8693']]),
  Wo = et({
    id: je().optional(),
    message: je()
      .optional()
      .transform((e) => (typeof e == 'string' && e.trim() ? e.trim() : ''))
      .default(''),
    level: Wi(['info', 'success', 'warning', 'error']).optional(),
    severity: Wi(['info', 'warning', 'error']).optional(),
    scope: je().optional(),
    hint: je().optional(),
    path: Nt(sm([je(), nm()])).optional(),
    data: Cn($e()).optional(),
  }).passthrough(),
  fw = et({
    ok: am().optional(),
    status: je().optional(),
    messages: Nt(Wo).default([]),
    corrected: Nt($e()).default([]),
    discarded: Nt($e()).default([]),
    meta: Cn($e()).optional(),
  }).passthrough(),
  mw = et({
    result: fw.optional(),
    messages: Nt(Wo).optional(),
    corrected: Nt($e()).optional(),
    discarded: Nt($e()).optional(),
    meta: Cn($e()).optional(),
  })
    .passthrough()
    .transform((e) => {
      const t = e.result ?? {},
        n = t.messages ?? e.messages ?? [],
        a = t.corrected ?? e.corrected ?? [],
        s = t.discarded ?? e.discarded ?? [],
        r = { ...(t.meta ?? {}), ...(e.meta ?? {}) };
      return { ...t, messages: n, corrected: a, discarded: s, meta: r };
    });
function pw(e) {
  return mw.parse(e);
}
const yl = {
  species: 'runtimeValidatorSpecies',
  biome: 'runtimeValidatorBiome',
  foodweb: 'runtimeValidatorFoodweb',
};
function gw(e, t, n) {
  if (t) {
    if (Object.prototype.hasOwnProperty.call(t, 'fallback')) {
      const a = t.fallback;
      if (a === null) return null;
      if (typeof a == 'string' && a.trim()) return a.trim();
    }
    if (t.fallbacks && Object.prototype.hasOwnProperty.call(t.fallbacks, e)) {
      const a = t.fallbacks[e];
      if (a === null) return null;
      if (typeof a == 'string' && a.trim()) return a.trim();
    }
  }
  return n ?? null;
}
function hw(e) {
  return e && Object.prototype.hasOwnProperty.call(e, 'allowFallback') ? !!e.allowFallback : yn();
}
async function $r(e, t, n = {}) {
  const a = yl[e] ?? yl.species,
    s = Sn(a, {
      endpoint: Object.prototype.hasOwnProperty.call(n, 'endpoint') ? n.endpoint : void 0,
      fallback: void 0,
    }),
    r = Gt(n.endpoint ?? s.endpoint),
    i = gw(e, n, s.fallback),
    l = i ? dn(i) : null,
    d = await un(r, {
      requestInit: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: e, payload: t }),
      },
      fallbackUrl: l,
      allowFallback: hw(n),
      errorMessage: 'Errore validazione runtime',
      fallbackErrorMessage: 'Validator runtime locale non disponibile',
    }),
    c = (() => {
      try {
        return pw(d.data);
      } catch (p) {
        throw p instanceof gt
          ? an(p, 'Risposta runtime non valida', { code: 'runtime.validation.invalid' })
          : nn(p, 'Risposta runtime non valida', { code: 'runtime.validation.invalid' });
      }
    })(),
    f = {
      ...(c.meta ?? {}),
      endpoint_source: d.source,
      endpoint_url: d.source === 'fallback' && l ? l : r,
    };
  return (
    d.source === 'fallback' &&
      (f.fallback_error = d.error ? d.error.message : 'Richiesta remota non disponibile'),
    { ...c, meta: f }
  );
}
async function _w(e, t = {}, n = {}) {
  const a = { entries: Array.isArray(e) ? e : [], biomeId: t.biomeId ?? null };
  return $r('species', a, n);
}
async function vw(e, t = {}, n = {}) {
  const a = { biome: e ?? null, defaultHazard: t.defaultHazard ?? null };
  return $r('biome', a, n);
}
async function bw(e, t = {}) {
  return $r('foodweb', { foodweb: e ?? null }, t);
}
function yw(e, t) {
  if (e && Object.prototype.hasOwnProperty.call(e, 'fallback')) {
    if (e.fallback === null) return null;
    if (typeof e.fallback == 'string' && e.fallback.trim()) return e.fallback.trim();
  }
  return t;
}
function kw(e) {
  return e && Object.prototype.hasOwnProperty.call(e, 'allowFallback') ? !!e.allowFallback : yn();
}
async function ww(e, t = {}) {
  if (!e || typeof e != 'object') throw new Error("Suggerimento non valido per l'applicazione");
  const n = Sn('qualitySuggestionsApply', {
      endpoint: Object.prototype.hasOwnProperty.call(t, 'endpoint') ? t.endpoint : void 0,
      fallback: Object.prototype.hasOwnProperty.call(t, 'fallback') ? t.fallback : void 0,
    }),
    a = Gt(t.endpoint || n.endpoint),
    s = yw(t, n.fallback),
    r = s ? dn(s) : null,
    i = await un(a, {
      requestInit: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion: e }),
      },
      fallbackUrl: r,
      allowFallback: kw(t),
      errorMessage: 'Errore applicazione suggerimento',
      fallbackErrorMessage: 'Suggerimenti locali non disponibili',
    }),
    { data: l, error: d } = i,
    c = i.source,
    f = l && typeof l == 'object' ? { ...l } : l;
  if (f && typeof f == 'object') {
    const p = { ...(f.meta || {}) };
    ((p.endpoint_source = c),
      (p.endpoint_url = c === 'fallback' && r ? r : a),
      c === 'fallback' && (p.fallback_error = d ? d.message : 'Richiesta remota non disponibile'),
      (f.meta = p));
  }
  return f;
}
const Ew = { class: 'flow-view quality-release' },
  Sw = { class: 'quality-release__status' },
  Tw = { class: 'quality-release__card' },
  Aw = { class: 'quality-release__primary' },
  Iw = { class: 'quality-release__meta' },
  $w = { class: 'quality-release__meta' },
  Nw = { class: 'quality-release__card' },
  xw = { class: 'quality-release__primary' },
  Cw = { class: 'quality-release__meta' },
  Ow = { class: 'quality-release__notifications' },
  Lw = { class: 'quality-release__console' },
  Rw = { class: 'release-console' },
  Pw = { class: 'release-console__panel release-console__panel--form' },
  Mw = { class: 'release-console__field' },
  Dw = ['value', 'disabled'],
  Fw = { class: 'release-console__field' },
  qw = { class: 'release-console__field' },
  Uw = { class: 'release-console__field' },
  jw = { key: 0, class: 'release-console__error' },
  zw = { class: 'release-console__panel release-console__panel--schedule' },
  Vw = { class: 'release-console__list' },
  Bw = ['data-status'],
  Ww = ['disabled', 'onClick'],
  Hw = ['disabled', 'onClick'],
  Gw = { key: 0, class: 'release-console__empty' },
  Zw = { class: 'release-console__panel release-console__panel--streams' },
  Yw = { class: 'release-console__list' },
  Xw = ['data-status'],
  Kw = { class: 'release-console__stream-meta' },
  Qw = ['disabled', 'onClick'],
  Jw = ['onClick'],
  e1 = ['disabled', 'onClick'],
  t1 = { key: 0, class: 'release-console__empty' },
  n1 = { class: 'release-console__panel release-console__panel--notifications' },
  a1 = { class: 'release-console__list' },
  s1 = { class: 'release-console__message' },
  r1 = { class: 'release-console__stream-meta' },
  i1 = ['onClick'],
  l1 = { key: 0, class: 'release-console__empty' },
  o1 = { key: 0, class: 'release-console__watchers' },
  c1 = { key: 0, class: 'quality-release__notes' },
  u1 = { class: 'quality-release__validators' },
  d1 = { class: 'quality-release__checks' },
  f1 = { class: 'quality-check' },
  m1 = { class: 'quality-check__badge' },
  p1 = { class: 'quality-check__summary' },
  g1 = { key: 0, class: 'quality-check__error' },
  h1 = ['disabled'],
  _1 = { class: 'quality-check' },
  v1 = { class: 'quality-check__badge' },
  b1 = { class: 'quality-check__summary' },
  y1 = { key: 0, class: 'quality-check__error' },
  k1 = ['disabled'],
  w1 = { class: 'quality-check' },
  E1 = { class: 'quality-check__badge' },
  S1 = { class: 'quality-check__summary' },
  T1 = { key: 0, class: 'quality-check__error' },
  A1 = ['disabled'],
  I1 = { key: 1, class: 'quality-release__suggestions' },
  $1 = { class: 'quality-suggestions' },
  N1 = { class: 'quality-suggestion__actions' },
  x1 = ['disabled', 'onClick'],
  C1 = { key: 0, class: 'quality-suggestion__error' },
  O1 = { class: 'quality-release__logs' },
  L1 = { class: 'quality-logs__toolbar' },
  R1 = { class: 'quality-logs__filters' },
  P1 = ['onClick'],
  M1 = { class: 'quality-logs__actions' },
  D1 = ['disabled'],
  F1 = ['disabled'],
  q1 = { class: 'quality-logs' },
  U1 = { class: 'quality-log__meta' },
  j1 = { class: 'quality-log__scope' },
  z1 = { class: 'quality-log__time' },
  V1 = { class: 'quality-log__message' },
  B1 = { key: 0, class: 'quality-log quality-log--empty' },
  W1 = {
    __name: 'QualityReleaseView',
    props: {
      snapshot: { type: Object, required: !0 },
      context: { type: Object, required: !0 },
      orchestratorLogs: { type: Array, default: () => [] },
    },
    setup(e) {
      const t = e,
        { snapshot: n, context: a, orchestratorLogs: s } = Ln(t),
        r = ct({ running: !1, result: null, error: null, lastRun: null }),
        i = ct({ running: !1, result: null, error: null, lastRun: null }),
        l = ct({ running: !1, result: null, error: null, lastRun: null }),
        d = Pe([]),
        c = Pe([]),
        f = ct({});
      let p = 0;
      const g = fo(),
        v = ct({ packages: [], schedule: [], streams: [], watchers: [], notifications: [] }),
        y = ct({ packageId: '', environment: 'staging', window: '', notes: '', error: null });
      function N(u, m) {
        u.splice(0, u.length, ...m);
      }
      function O(u) {
        return u === 'production' ? 'Produzione' : u === 'staging' ? 'Staging' : u || '—';
      }
      function P(u) {
        const m =
            (u == null ? void 0 : u.id) ||
            (u == null ? void 0 : u.packageId) ||
            `pkg-${Math.random().toString(36).slice(2, 8)}`,
          x = (u == null ? void 0 : u.environment) || 'staging';
        return {
          id: m,
          name: (u == null ? void 0 : u.name) || (u == null ? void 0 : u.label) || m,
          environment: x,
          environmentLabel: O(x),
          status: (u == null ? void 0 : u.status) || 'ready',
          approvals: Array.isArray(u == null ? void 0 : u.approvals) ? [...u.approvals] : [],
          lastValidation: (u == null ? void 0 : u.lastValidation) || null,
        };
      }
      function V(u) {
        const m =
            (u == null ? void 0 : u.packageId) ||
            (u == null ? void 0 : u.id) ||
            `pkg-${Math.random().toString(36).slice(2, 8)}`,
          x = (u == null ? void 0 : u.environment) || 'staging',
          q = Array.isArray(u == null ? void 0 : u.approvals) ? [...u.approvals] : [];
        return {
          id:
            (u == null ? void 0 : u.id) ||
            `schedule-${m}-${Math.random().toString(36).slice(2, 8)}`,
          packageId: m,
          packageName:
            (u == null ? void 0 : u.packageName) || (u == null ? void 0 : u.packageLabel) || m,
          environment: x,
          window: (u == null ? void 0 : u.window) || '—',
          approvals: q,
          status: (u == null ? void 0 : u.status) || 'scheduled',
          notes: (u == null ? void 0 : u.notes) || '',
          lastUpdated:
            (u == null ? void 0 : u.lastUpdated) || (u == null ? void 0 : u.createdAt) || null,
        };
      }
      function k(u) {
        return {
          id: (u == null ? void 0 : u.id) || `stream-${Math.random().toString(36).slice(2, 8)}`,
          label: (u == null ? void 0 : u.label) || 'Stream QA',
          scope: (u == null ? void 0 : u.scope) || 'publishing',
          status: (u == null ? void 0 : u.status) || 'idle',
          pending: typeof (u == null ? void 0 : u.pending) == 'number' ? u.pending : 0,
          lastEvent: (u == null ? void 0 : u.lastEvent) || null,
        };
      }
      function E(u) {
        return {
          id: (u == null ? void 0 : u.id) || `notif-${Math.random().toString(36).slice(2, 8)}`,
          channel: (u == null ? void 0 : u.channel) || 'Canale interno',
          message: (u == null ? void 0 : u.message) || 'Aggiornamento pacchetto disponibile.',
          lastTriggeredAt: (u == null ? void 0 : u.lastTriggeredAt) || null,
        };
      }
      function A() {
        var $, me;
        const u = (($ = a.value) == null ? void 0 : $.releaseConsole) || {},
          m = Array.isArray(u.packages) ? u.packages.map(P) : [],
          x = Array.isArray(u.schedule) ? u.schedule.map(V) : [],
          q = Array.isArray(u.streams) ? u.streams.map(k) : [],
          z = Array.isArray(u.watchers) ? u.watchers.map((re) => ({ ...re })) : [],
          S = Array.isArray(u.notifications) ? u.notifications.map(E) : [];
        (N(v.packages, m),
          N(v.schedule, x),
          N(v.streams, q),
          N(v.watchers, z),
          N(v.notifications, S),
          m.some((re) => re.id === y.packageId) ||
            (y.packageId = ((me = m[0]) == null ? void 0 : me.id) || ''));
      }
      (A(),
        tt(
          () => {
            var u;
            return (u = a.value) == null ? void 0 : u.releaseConsole;
          },
          () => {
            A();
          },
          { deep: !0 },
        ));
      const I = T(() => {
          var x, q;
          const u = (x = a.value) == null ? void 0 : x.releaseNotesHtml;
          if (typeof u == 'string' && u.trim()) return u;
          const m = (q = n.value) == null ? void 0 : q.releaseNotesHtml;
          return typeof m == 'string' && m.trim() ? m : '';
        }),
        C = T(() => v.packages),
        D = T(() => {
          const u = [...v.schedule];
          return (
            u.sort((m, x) => {
              const q = Date.parse(m.window || '') || 0,
                z = Date.parse(x.window || '') || 0;
              return q && z ? q - z : q ? -1 : z ? 1 : m.window.localeCompare(x.window);
            }),
            u
          );
        }),
        M = T(() => v.streams),
        ce = T(() => v.notifications),
        ve = T(() => v.watchers),
        Z = T(() => {
          const u = a.value.orchestrator || {};
          return {
            stage: u.stage || '—',
            releaseWindow: u.releaseWindow || '—',
            coordinator: u.coordinator || '—',
            focusAreas: Array.isArray(u.focusAreas) ? u.focusAreas : [],
          };
        }),
        Ae = T(() => {
          const u = n.value && n.value.owners;
          return Array.isArray(u) ? u : [];
        }),
        Ye = T(() =>
          (Array.isArray(a.value.suggestions) ? a.value.suggestions : []).map((m) => {
            const x = f[m.id] || {};
            return {
              ...m,
              applied: c.value.includes(m.id),
              running: !!x.running,
              error: x.error || null,
            };
          }),
        ),
        De = T(() => {
          const u = Array.isArray(a.value.logs) ? a.value.logs : [],
            m = Array.isArray(s.value) ? s.value : [];
          return [...u, ...m].map((q) => ({
            id: q.id,
            scope: q.scope || 'general',
            level: q.level || 'info',
            message: q.message || '',
            timestamp: q.timestamp || new Date().toISOString(),
          }));
        }),
        Be = T(() => [...De.value, ...d.value]),
        B = T(() => [
          { value: 'all', label: 'Tutti' },
          { value: 'species', label: 'Specie' },
          { value: 'biome', label: 'Biomi' },
          { value: 'foodweb', label: 'Foodweb' },
          { value: 'publishing', label: 'Publishing' },
        ]),
        K = Pe('all'),
        ue = T(() => {
          const u = Be.value;
          return K.value === 'all' ? u : u.filter((m) => m.scope === K.value);
        });
      function F(u, m = []) {
        if (!m.length) return;
        const x = Date.now(),
          q = m.map((S) => {
            const $ = typeof S == 'string' ? S : S.message || S.text || '',
              me = S.level || S.severity || (S.type === 'error' ? 'error' : 'info'),
              re = S.timestamp || new Date().toISOString(),
              Se = S.scope || u;
            return { id: `${u}-${x}-${p++}`, scope: Se, level: me, message: $, timestamp: re };
          });
        d.value = [...d.value, ...q];
        const z = u === 'publishing' ? `quality.${u}` : `validator.${u}`;
        q.forEach((S, $) => {
          const me = m[$],
            re = typeof me == 'string' ? { message: S.message, level: S.level } : me;
          vt(z, {
            id: S.id,
            scope: S.scope,
            level: S.level,
            message: S.message,
            timestamp: S.timestamp,
            data: re,
            source: 'quality-console',
          });
        });
      }
      function G(u, m) {
        const x = [];
        if (Array.isArray(m == null ? void 0 : m.messages))
          for (const q of m.messages) q && x.push(q);
        return (
          Array.isArray(m == null ? void 0 : m.discarded) &&
            m.discarded.length &&
            x.push({ level: 'warning', message: `Elementi scartati: ${m.discarded.length}` }),
          Array.isArray(m == null ? void 0 : m.corrected) &&
            m.corrected.length &&
            x.push({ level: 'success', message: `Correzioni applicate: ${m.corrected.length}` }),
          x.map((q) => ({ ...q, scope: u }))
        );
      }
      function H(u, m) {
        const x = (m == null ? void 0 : m.passed) ?? 0,
          q = (m == null ? void 0 : m.total) ?? 0;
        if (!u) return `${x} di ${q} check già superati.`;
        const z = Array.isArray(u.corrected) ? u.corrected.length : 0,
          S = Array.isArray(u.discarded) ? u.discarded.length : 0;
        return `Correzioni ${z} · Scartati ${S}`;
      }
      function de(u) {
        var x, q;
        const m = (q = (x = n.value) == null ? void 0 : x.checks) == null ? void 0 : q[u];
        return m ? `${m.passed || 0} / ${m.total || 0}` : '0 / 0';
      }
      function Te(u) {
        return u.applied
          ? 'Completato'
          : u.action === 'regenerate'
            ? 'Rigenera mirato'
            : 'Applica fix';
      }
      function ne(u) {
        return u === 'species'
          ? 'Specie'
          : u === 'biome' || u === 'biomes'
            ? 'Biomi'
            : u === 'foodweb'
              ? 'Foodweb'
              : u === 'publishing'
                ? 'Publishing'
                : 'Generale';
      }
      function ge(u) {
        if (!u) return '—';
        const m = new Date(u);
        return Number.isNaN(m.getTime())
          ? u
          : new Intl.DateTimeFormat('it-IT', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }).format(m);
      }
      function oe(u) {
        return u === 'scheduled'
          ? 'Programmato'
          : u === 'awaiting-approval'
            ? 'In approvazione'
            : u === 'approved'
              ? 'Approvato'
              : u === 'deployed'
                ? 'Promosso'
                : '—';
      }
      function j(u) {
        return u === 'monitoring'
          ? 'Monitoraggio attivo'
          : u === 'cleared'
            ? 'Pulito'
            : u === 'idle'
              ? 'In attesa'
              : u || '—';
      }
      function W() {
        if (((y.error = null), !y.packageId)) {
          y.error = 'Seleziona un pacchetto Nebula da pubblicare.';
          return;
        }
        if (!y.window || !y.window.trim()) {
          y.error = 'Indica una finestra di rilascio.';
          return;
        }
        const u = v.packages.find((x) => x.id === y.packageId);
        if (!u) {
          y.error = 'Pacchetto selezionato non valido.';
          return;
        }
        const m = {
          id: `schedule-${Date.now()}`,
          packageId: u.id,
          packageName: u.name,
          environment: y.environment,
          window: y.window.trim(),
          approvals: [...u.approvals],
          status: u.status === 'ready' ? 'awaiting-approval' : 'scheduled',
          notes: y.notes.trim(),
          lastUpdated: new Date().toISOString(),
        };
        (v.schedule.unshift(m),
          (y.window = ''),
          (y.notes = ''),
          F('publishing', [
            {
              level: 'info',
              message: `Programmata finestra ${O(m.environment)} per ${m.packageName} (${m.window}).`,
            },
          ]));
      }
      function ae(u) {
        const m = v.schedule.find((x) => x.id === u.id);
        !m ||
          m.status === 'approved' ||
          m.status === 'deployed' ||
          ((m.status = 'approved'),
          (m.lastUpdated = new Date().toISOString()),
          F('publishing', [
            {
              level: 'success',
              message: `Pacchetto ${m.packageName} approvato per ${O(m.environment)}.`,
            },
          ]));
      }
      function he(u) {
        const m = v.schedule.find((x) => x.id === u.id);
        !m ||
          m.status !== 'approved' ||
          ((m.status = 'deployed'),
          (m.lastUpdated = new Date().toISOString()),
          F('publishing', [
            { level: 'success', message: `Promosso ${m.packageName} su ${O(m.environment)}.` },
          ]));
      }
      function R(u) {
        const m = v.streams.find((x) => x.id === u.id);
        !m ||
          m.status === 'monitoring' ||
          ((m.status = 'monitoring'),
          (m.lastEvent = new Date().toISOString()),
          F('publishing', [{ level: 'info', message: `Monitoraggio attivo per ${m.label}.` }]));
      }
      function X(u) {
        const m = v.streams.find((q) => q.id === u.id);
        if (!m) return;
        const x = Math.max(0, (m.pending || 0) - 1);
        ((m.pending = x),
          (m.lastEvent = new Date().toISOString()),
          F('publishing', [
            {
              level: x === 0 ? 'success' : 'info',
              message:
                x === 0
                  ? `${m.label} senza elementi pendenti.`
                  : `${m.label} aggiornato, elementi rimanenti ${x}.`,
            },
          ]));
      }
      function U(u) {
        const m = v.streams.find((x) => x.id === u.id);
        m &&
          ((m.status = 'cleared'),
          (m.pending = 0),
          (m.lastEvent = new Date().toISOString()),
          F('publishing', [
            { level: 'success', message: `${m.label} contrassegnato come risolto.` },
          ]));
      }
      function ie(u) {
        const m = v.notifications.find((q) => q.id === u.id),
          x = new Date().toISOString();
        (m && (m.lastTriggeredAt = x),
          F('publishing', [
            { level: 'success', message: `Notifica inviata su ${u.channel}: ${u.message}` },
          ]));
      }
      async function we() {
        ((r.running = !0),
          (r.error = null),
          vt('validator.species.requested', {
            scope: 'species',
            level: 'info',
            message: 'Validazione specie avviata',
            source: 'quality-console',
          }));
        try {
          const u = await _w(a.value.speciesBatch.entries, {
            biomeId: a.value.speciesBatch.biomeId,
          });
          ((r.result = u), (r.lastRun = new Date().toISOString()), F('species', G('species', u)));
          const m = Array.isArray(u == null ? void 0 : u.messages)
              ? u.messages.filter((q) => (q.level || q.severity) === 'warning').length
              : 0,
            x = Array.isArray(u == null ? void 0 : u.messages)
              ? u.messages.filter((q) => (q.level || q.severity) === 'error').length
              : 0;
          vt('validator.species.success', {
            scope: 'species',
            level: x > 0 ? 'error' : m > 0 ? 'warning' : 'success',
            message:
              x > 0
                ? `Validazione completata con ${x} errori e ${m} warning`
                : m > 0
                  ? `Validazione completata con ${m} warning`
                  : 'Validazione specie completata',
            data: {
              warnings: m,
              errors: x,
              corrected: Array.isArray(u == null ? void 0 : u.corrected) ? u.corrected.length : 0,
              discarded: Array.isArray(u == null ? void 0 : u.discarded) ? u.discarded.length : 0,
            },
            source: 'quality-console',
          });
        } catch (u) {
          ((r.error = (u == null ? void 0 : u.message) || 'Errore validazione specie'),
            F('species', [{ level: 'error', message: r.error }]),
            vt('validator.species.failed', {
              scope: 'species',
              level: 'error',
              message: r.error,
              data: { error: (u == null ? void 0 : u.message) || r.error },
              source: 'quality-console',
            }));
        } finally {
          r.running = !1;
        }
      }
      async function Le() {
        ((i.running = !0),
          (i.error = null),
          vt('validator.biome.requested', {
            scope: 'biome',
            level: 'info',
            message: 'Sanitizzazione bioma avviata',
            source: 'quality-console',
          }));
        try {
          const u = await vw(a.value.biomeCheck.biome, {
            defaultHazard: a.value.biomeCheck.defaultHazard,
          });
          ((i.result = u), (i.lastRun = new Date().toISOString()), F('biome', G('biome', u)));
          const m = Array.isArray(u == null ? void 0 : u.messages)
              ? u.messages.filter((q) => (q.level || q.severity) === 'warning').length
              : 0,
            x = Array.isArray(u == null ? void 0 : u.messages)
              ? u.messages.filter((q) => (q.level || q.severity) === 'error').length
              : 0;
          vt('validator.biome.success', {
            scope: 'biome',
            level: x > 0 ? 'error' : m > 0 ? 'warning' : 'success',
            message:
              x > 0
                ? `Sanitizzazione completata con ${x} errori`
                : m > 0
                  ? `Sanitizzazione completata con ${m} warning`
                  : 'Sanitizzazione bioma completata',
            data: {
              warnings: m,
              errors: x,
              corrected: Array.isArray(u == null ? void 0 : u.corrected) ? u.corrected.length : 0,
              discarded: Array.isArray(u == null ? void 0 : u.discarded) ? u.discarded.length : 0,
            },
            source: 'quality-console',
          });
        } catch (u) {
          ((i.error = (u == null ? void 0 : u.message) || 'Errore sanitizzazione bioma'),
            F('biome', [{ level: 'error', message: i.error }]),
            vt('validator.biome.failed', {
              scope: 'biome',
              level: 'error',
              message: i.error,
              data: { error: (u == null ? void 0 : u.message) || i.error },
              source: 'quality-console',
            }));
        } finally {
          i.running = !1;
        }
      }
      async function Q() {
        ((l.running = !0),
          (l.error = null),
          vt('validator.foodweb.requested', {
            scope: 'foodweb',
            level: 'info',
            message: 'Validazione foodweb avviata',
            source: 'quality-console',
          }));
        try {
          const u = await bw(a.value.foodwebCheck.foodweb);
          ((l.result = u), (l.lastRun = new Date().toISOString()), F('foodweb', G('foodweb', u)));
          const m = Array.isArray(u == null ? void 0 : u.messages)
              ? u.messages.filter((q) => (q.level || q.severity) === 'warning').length
              : 0,
            x = Array.isArray(u == null ? void 0 : u.messages)
              ? u.messages.filter((q) => (q.level || q.severity) === 'error').length
              : 0;
          vt('validator.foodweb.success', {
            scope: 'foodweb',
            level: x > 0 ? 'error' : m > 0 ? 'warning' : 'success',
            message:
              x > 0
                ? `Validazione foodweb con ${x} errori`
                : m > 0
                  ? `Validazione foodweb con ${m} warning`
                  : 'Validazione foodweb completata',
            data: {
              warnings: m,
              errors: x,
              corrected: Array.isArray(u == null ? void 0 : u.corrected) ? u.corrected.length : 0,
              discarded: Array.isArray(u == null ? void 0 : u.discarded) ? u.discarded.length : 0,
            },
            source: 'quality-console',
          });
        } catch (u) {
          ((l.error = (u == null ? void 0 : u.message) || 'Errore validazione foodweb'),
            F('foodweb', [{ level: 'error', message: l.error }]),
            vt('validator.foodweb.failed', {
              scope: 'foodweb',
              level: 'error',
              message: l.error,
              data: { error: (u == null ? void 0 : u.message) || l.error },
              source: 'quality-console',
            }));
        } finally {
          l.running = !1;
        }
      }
      async function ke(u) {
        if (!u || u.running || u.applied) return;
        const m = u.id;
        ((f[m] = { running: !0, error: null }),
          vt('quality.suggestion.requested', {
            scope: u.scope || 'publishing',
            level: 'info',
            message: `Suggerimento in esecuzione: ${u.title}`,
            data: { id: u.id, action: u.action },
            source: 'quality-console',
          }));
        try {
          const x = await ww({ id: u.id, scope: u.scope, action: u.action, payload: u.payload }),
            q = Array.isArray(x == null ? void 0 : x.logs) ? x.logs : [];
          (F(u.scope, q),
            F(u.scope, [
              {
                level: u.action === 'regenerate' ? 'info' : 'success',
                message: `Suggerimento applicato: ${u.title}`,
              },
            ]),
            c.value.includes(m) || (c.value = [...c.value, m]),
            (f[m] = { running: !1, error: null }),
            vt('quality.suggestion.success', {
              scope: u.scope || 'publishing',
              level: 'success',
              message: `Suggerimento completato: ${u.title}`,
              data: { id: u.id, action: u.action },
              source: 'quality-console',
            }));
        } catch (x) {
          const q = (x == null ? void 0 : x.message) || 'Errore applicazione suggerimento';
          ((f[m] = { running: !1, error: q }),
            F(u.scope, [{ level: 'error', message: q }]),
            vt('quality.suggestion.failed', {
              scope: u.scope || 'publishing',
              level: 'error',
              message: q,
              data: { id: u.id, action: u.action },
              source: 'quality-console',
            }));
        }
      }
      function w(u = 'json') {
        if (!ue.value.length) return;
        const m = K.value,
          x = m === 'all' ? 'all-scopes' : m,
          q = u === 'csv' ? 'csv' : 'json',
          z = g.exportLogs({
            filename: `qa-flow-logs-${x}.${q}`,
            filter: m === 'all' ? void 0 : ($) => $.scope === m,
            format: u,
          }),
          S =
            m === 'all'
              ? 'Esportazione log QA per tutti gli scope'
              : `Esportazione log QA per scope ${m}`;
        vt('quality.logs.exported', {
          scope: m,
          level: 'info',
          message: `${S} (${z.format.toUpperCase()})`,
          data: { format: z.format, filename: z.filename, count: z.entries.length },
          source: 'quality-console',
        });
      }
      return (u, m) => {
        var q, z, S;
        const x = vc('SafeContent');
        return (
          h(),
          _('section', Ew, [
            m[31] ||
              (m[31] = o(
                'header',
                { class: 'flow-view__header' },
                [
                  o('h2', null, 'Quality & Release'),
                  o(
                    'p',
                    null,
                    ' Coordinamento tra orchestrator e runtime validator per assicurare che i branch siano pronti alla pubblicazione. ',
                  ),
                ],
                -1,
              )),
            o('div', Sw, [
              o('article', Tw, [
                m[6] || (m[6] = o('h3', null, 'Finestra di release', -1)),
                o('p', Aw, b(Z.value.releaseWindow), 1),
                o('p', Iw, 'Stato orchestrator: ' + b(Z.value.stage), 1),
                o('p', $w, 'Coordinatore: ' + b(Z.value.coordinator), 1),
                o('ul', null, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(Z.value.focusAreas, ($) => (h(), _('li', { key: $ }, b($), 1))),
                    128,
                  )),
                ]),
              ]),
              o('article', Nw, [
                m[7] || (m[7] = o('h3', null, 'Referenti QA', -1)),
                o('p', xw, b(Ae.value.join(', ')), 1),
                o('p', Cw, 'Ultimo batch: ' + b(ge(le(n).lastRun)), 1),
                o('ul', Ow, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(
                      le(a).notifications,
                      ($) => (
                        h(),
                        _('li', { key: $.id }, [
                          o('strong', null, b($.channel), 1),
                          o('span', null, b($.message), 1),
                          o('small', null, b($.time), 1),
                        ])
                      ),
                    ),
                    128,
                  )),
                ]),
              ]),
            ]),
            o('section', Lw, [
              m[22] ||
                (m[22] = o(
                  'header',
                  { class: 'quality-release__section-header' },
                  [
                    o('h3', null, 'Console editoriale'),
                    o(
                      'p',
                      null,
                      ' Programma rilasci per il dataset Nebula, monitora gli stream di validazione e coordina le notifiche al team prima della promozione. ',
                    ),
                  ],
                  -1,
                )),
              o('div', Rw, [
                o('section', Pw, [
                  m[14] || (m[14] = o('h4', null, 'Programmazione rilascio', -1)),
                  o(
                    'form',
                    { class: 'release-console__form', onSubmit: sr(W, ['prevent']) },
                    [
                      o('div', Mw, [
                        m[8] || (m[8] = o('label', { for: 'release-package' }, 'Pacchetto', -1)),
                        Ft(
                          o(
                            'select',
                            {
                              id: 'release-package',
                              'onUpdate:modelValue': m[0] || (m[0] = ($) => (y.packageId = $)),
                            },
                            [
                              (h(!0),
                              _(
                                te,
                                null,
                                se(
                                  C.value,
                                  ($) => (
                                    h(),
                                    _(
                                      'option',
                                      { key: $.id, value: $.id, disabled: $.status === 'blocked' },
                                      b($.name) + ' · ' + b($.environmentLabel),
                                      9,
                                      Dw,
                                    )
                                  ),
                                ),
                                128,
                              )),
                            ],
                            512,
                          ),
                          [[Wn, y.packageId]],
                        ),
                      ]),
                      o('div', Fw, [
                        m[10] ||
                          (m[10] = o('label', { for: 'release-environment' }, 'Ambiente', -1)),
                        Ft(
                          o(
                            'select',
                            {
                              id: 'release-environment',
                              'onUpdate:modelValue': m[1] || (m[1] = ($) => (y.environment = $)),
                            },
                            [
                              ...(m[9] ||
                                (m[9] = [
                                  o('option', { value: 'staging' }, 'Staging', -1),
                                  o('option', { value: 'production' }, 'Produzione', -1),
                                ])),
                            ],
                            512,
                          ),
                          [[Wn, y.environment]],
                        ),
                      ]),
                      o('div', qw, [
                        m[11] || (m[11] = o('label', { for: 'release-window' }, 'Finestra', -1)),
                        Ft(
                          o(
                            'input',
                            {
                              id: 'release-window',
                              'onUpdate:modelValue': m[2] || (m[2] = ($) => (y.window = $)),
                              type: 'text',
                              placeholder: '19/05 · 10:00',
                            },
                            null,
                            512,
                          ),
                          [[Os, y.window]],
                        ),
                      ]),
                      o('div', Uw, [
                        m[12] ||
                          (m[12] = o('label', { for: 'release-notes' }, 'Note operative', -1)),
                        Ft(
                          o(
                            'textarea',
                            {
                              id: 'release-notes',
                              'onUpdate:modelValue': m[3] || (m[3] = ($) => (y.notes = $)),
                              rows: '2',
                              placeholder: 'Snapshot 42A con fix aurorali',
                            },
                            null,
                            512,
                          ),
                          [[Os, y.notes]],
                        ),
                      ]),
                      y.error ? (h(), _('p', jw, b(y.error), 1)) : Y('', !0),
                      m[13] ||
                        (m[13] = o(
                          'button',
                          { type: 'submit', class: 'release-console__submit' },
                          'Programma rilascio',
                          -1,
                        )),
                    ],
                    32,
                  ),
                ]),
                o('section', zw, [
                  m[18] || (m[18] = o('h4', null, 'Rilasci programmati', -1)),
                  o('ul', Vw, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(
                        D.value,
                        ($) => (
                          h(),
                          _('li', { key: $.id }, [
                            o('header', null, [
                              o('strong', null, b($.packageName), 1),
                              o(
                                'span',
                                { class: 'release-console__status', 'data-status': $.status },
                                b(oe($.status)),
                                9,
                                Bw,
                              ),
                            ]),
                            o('dl', null, [
                              o('div', null, [
                                m[15] || (m[15] = o('dt', null, 'Finestra', -1)),
                                o('dd', null, b($.window), 1),
                              ]),
                              o('div', null, [
                                m[16] || (m[16] = o('dt', null, 'Ambiente', -1)),
                                o('dd', null, b(O($.environment)), 1),
                              ]),
                              o('div', null, [
                                m[17] || (m[17] = o('dt', null, 'Gate', -1)),
                                o('dd', null, b($.approvals.join(', ') || '—'), 1),
                              ]),
                            ]),
                            o('footer', null, [
                              o(
                                'button',
                                {
                                  type: 'button',
                                  class: 'release-console__action',
                                  disabled:
                                    $.status !== 'scheduled' && $.status !== 'awaiting-approval',
                                  onClick: (me) => ae($),
                                },
                                ' Conferma approvazione ',
                                8,
                                Ww,
                              ),
                              o(
                                'button',
                                {
                                  type: 'button',
                                  class: 'release-console__action',
                                  disabled: $.status !== 'approved',
                                  onClick: (me) => he($),
                                },
                                ' Promuovi in produzione ',
                                8,
                                Hw,
                              ),
                            ]),
                          ])
                        ),
                      ),
                      128,
                    )),
                    D.value.length ? Y('', !0) : (h(), _('li', Gw, 'Nessun rilascio pianificato.')),
                  ]),
                ]),
                o('section', Zw, [
                  m[19] || (m[19] = o('h4', null, 'Stream di validazione', -1)),
                  o('ul', Yw, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(
                        M.value,
                        ($) => (
                          h(),
                          _('li', { key: $.id }, [
                            o('header', null, [
                              o('strong', null, b($.label), 1),
                              o(
                                'span',
                                { class: 'release-console__status', 'data-status': $.status },
                                b(j($.status)),
                                9,
                                Xw,
                              ),
                            ]),
                            o(
                              'p',
                              Kw,
                              ' Ultimo evento · ' +
                                b(ge($.lastEvent)) +
                                ' · Pending ' +
                                b($.pending),
                              1,
                            ),
                            o('footer', null, [
                              o(
                                'button',
                                {
                                  type: 'button',
                                  class: 'release-console__action',
                                  disabled: $.status === 'monitoring',
                                  onClick: (me) => R($),
                                },
                                ' Avvia monitoraggio ',
                                8,
                                Qw,
                              ),
                              o(
                                'button',
                                {
                                  type: 'button',
                                  class: 'release-console__action',
                                  onClick: (me) => X($),
                                },
                                ' Aggiorna stato ',
                                8,
                                Jw,
                              ),
                              o(
                                'button',
                                {
                                  type: 'button',
                                  class: 'release-console__action',
                                  disabled: $.status === 'cleared',
                                  onClick: (me) => U($),
                                },
                                ' Segna risolto ',
                                8,
                                e1,
                              ),
                            ]),
                          ])
                        ),
                      ),
                      128,
                    )),
                    M.value.length
                      ? Y('', !0)
                      : (h(), _('li', t1, ' Nessuno stream di validazione attivo. ')),
                  ]),
                ]),
                o('section', n1, [
                  m[21] || (m[21] = o('h4', null, 'Notifiche team', -1)),
                  o('ul', a1, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(
                        ce.value,
                        ($) => (
                          h(),
                          _('li', { key: $.id }, [
                            o('header', null, [o('strong', null, b($.channel), 1)]),
                            o('p', s1, b($.message), 1),
                            o('p', r1, ' Ultimo invio · ' + b(ge($.lastTriggeredAt)), 1),
                            o('footer', null, [
                              o(
                                'button',
                                {
                                  type: 'button',
                                  class: 'release-console__action',
                                  onClick: (me) => ie($),
                                },
                                ' Invia aggiornamento ',
                                8,
                                i1,
                              ),
                            ]),
                          ])
                        ),
                      ),
                      128,
                    )),
                    ce.value.length
                      ? Y('', !0)
                      : (h(), _('li', l1, ' Nessuna notifica configurata. ')),
                  ]),
                  ve.value.length
                    ? (h(),
                      _('div', o1, [
                        m[20] || (m[20] = o('h5', null, 'Referenti', -1)),
                        o('ul', null, [
                          (h(!0),
                          _(
                            te,
                            null,
                            se(
                              ve.value,
                              ($) => (
                                h(),
                                _('li', { key: $.id }, b($.name) + ' · ' + b($.channel), 1)
                              ),
                            ),
                            128,
                          )),
                        ]),
                      ]))
                    : Y('', !0),
                ]),
              ]),
              m[23] ||
                (m[23] = o(
                  'aside',
                  { class: 'release-console__guide' },
                  [
                    o('h4', null, 'Guida rapida alla release Nebula'),
                    o('ol', null, [
                      o(
                        'li',
                        null,
                        'Verifica che il pacchetto abbia superato la validazione automatica dal workflow publishing.',
                      ),
                      o(
                        'li',
                        null,
                        'Usa la sezione “Programmazione rilascio” per schedulare staging e raccogliere le approvazioni obbligatorie.',
                      ),
                      o(
                        'li',
                        null,
                        'Attiva il monitoraggio degli stream QA e invia la notifica al team quando il gate di approvazione è verde.',
                      ),
                    ]),
                    o('p', null, [
                      _n(' Tutte le azioni sono sincronizzate con lo stato persistente in '),
                      o('code', null, 'services/publishing/workflowState.json'),
                      _n(' e vengono riportate nei log sottostanti. '),
                    ]),
                  ],
                  -1,
                )),
            ]),
            I.value
              ? (h(),
                _('section', c1, [
                  m[24] ||
                    (m[24] = o(
                      'header',
                      { class: 'quality-release__section-header' },
                      [
                        o('h3', null, 'Release notes Nebula'),
                        o('p', null, 'Note di accompagnamento sincronizzate dal runtime snapshot.'),
                      ],
                      -1,
                    )),
                  Ne(
                    x,
                    { class: 'quality-release__notes-body', source: I.value, kind: 'html' },
                    null,
                    8,
                    ['source'],
                  ),
                ]))
              : Y('', !0),
            o('section', u1, [
              m[28] ||
                (m[28] = o(
                  'header',
                  { class: 'quality-release__section-header' },
                  [
                    o('h3', null, 'Runtime checks'),
                    o(
                      'p',
                      null,
                      "Avvia validazioni mirate utilizzando il runtime validator collegato all'orchestrator.",
                    ),
                  ],
                  -1,
                )),
              o('div', d1, [
                o('article', f1, [
                  o('header', null, [
                    m[25] || (m[25] = o('h4', null, 'Specie', -1)),
                    o('span', m1, b(de('species')), 1),
                  ]),
                  o('p', p1, b(H(r.result, (q = le(n).checks) == null ? void 0 : q.species)), 1),
                  r.error ? (h(), _('p', g1, b(r.error), 1)) : Y('', !0),
                  o('footer', null, [
                    o(
                      'button',
                      {
                        type: 'button',
                        class: 'quality-check__action',
                        disabled: r.running,
                        onClick: we,
                      },
                      b(r.running ? 'In corso…' : 'Esegui batch specie'),
                      9,
                      h1,
                    ),
                  ]),
                ]),
                o('article', _1, [
                  o('header', null, [
                    m[26] || (m[26] = o('h4', null, 'Biomi', -1)),
                    o('span', v1, b(de('biomes')), 1),
                  ]),
                  o('p', b1, b(H(i.result, (z = le(n).checks) == null ? void 0 : z.biomes)), 1),
                  i.error ? (h(), _('p', y1, b(i.error), 1)) : Y('', !0),
                  o('footer', null, [
                    o(
                      'button',
                      {
                        type: 'button',
                        class: 'quality-check__action',
                        disabled: i.running,
                        onClick: Le,
                      },
                      b(i.running ? 'In corso…' : 'Sanitizza bioma'),
                      9,
                      k1,
                    ),
                  ]),
                ]),
                o('article', w1, [
                  o('header', null, [
                    m[27] || (m[27] = o('h4', null, 'Foodweb', -1)),
                    o('span', E1, b(de('foodweb')), 1),
                  ]),
                  o('p', S1, b(H(l.result, (S = le(n).checks) == null ? void 0 : S.foodweb)), 1),
                  l.error ? (h(), _('p', T1, b(l.error), 1)) : Y('', !0),
                  o('footer', null, [
                    o(
                      'button',
                      {
                        type: 'button',
                        class: 'quality-check__action',
                        disabled: l.running,
                        onClick: Q,
                      },
                      b(l.running ? 'In corso…' : 'Valida foodweb'),
                      9,
                      A1,
                    ),
                  ]),
                ]),
              ]),
            ]),
            Ye.value.length
              ? (h(),
                _('section', I1, [
                  m[29] ||
                    (m[29] = o(
                      'header',
                      { class: 'quality-release__section-header' },
                      [
                        o('h3', null, 'Suggerimenti di correzione'),
                        o(
                          'p',
                          null,
                          'Applica fix automatici o rigenera selezioni specifiche sulla base dei risultati runtime.',
                        ),
                      ],
                      -1,
                    )),
                  o('ul', $1, [
                    (h(!0),
                    _(
                      te,
                      null,
                      se(
                        Ye.value,
                        ($) => (
                          h(),
                          _(
                            'li',
                            {
                              key: $.id,
                              class: ft(['quality-suggestion', `quality-suggestion--${$.scope}`]),
                            },
                            [
                              o('div', null, [
                                o('h4', null, b($.title), 1),
                                o('p', null, b($.description), 1),
                              ]),
                              o('div', N1, [
                                o(
                                  'button',
                                  {
                                    type: 'button',
                                    class: 'quality-suggestion__action',
                                    disabled: $.applied || $.running,
                                    onClick: (me) => ke($),
                                  },
                                  b($.running ? 'In corso…' : Te($)),
                                  9,
                                  x1,
                                ),
                                $.error ? (h(), _('p', C1, b($.error), 1)) : Y('', !0),
                              ]),
                            ],
                            2,
                          )
                        ),
                      ),
                      128,
                    )),
                  ]),
                ]))
              : Y('', !0),
            o('section', O1, [
              m[30] ||
                (m[30] = o(
                  'header',
                  { class: 'quality-release__section-header' },
                  [
                    o('h3', null, 'Log runtime'),
                    o(
                      'p',
                      null,
                      'Traccia degli eventi emessi dal runtime validator e dalle azioni correttive.',
                    ),
                  ],
                  -1,
                )),
              o('div', L1, [
                o('div', R1, [
                  (h(!0),
                  _(
                    te,
                    null,
                    se(
                      B.value,
                      ($) => (
                        h(),
                        _(
                          'button',
                          {
                            key: $.value,
                            type: 'button',
                            class: ft([
                              'quality-logs__filter',
                              { 'quality-logs__filter--active': $.value === K.value },
                            ]),
                            onClick: (me) => (K.value = $.value),
                          },
                          b($.label),
                          11,
                          P1,
                        )
                      ),
                    ),
                    128,
                  )),
                ]),
                o('div', M1, [
                  o(
                    'button',
                    {
                      type: 'button',
                      class: 'quality-logs__export',
                      disabled: !ue.value.length,
                      onClick: m[4] || (m[4] = ($) => w('json')),
                    },
                    ' Esporta JSON QA ',
                    8,
                    D1,
                  ),
                  o(
                    'button',
                    {
                      type: 'button',
                      class: 'quality-logs__export',
                      disabled: !ue.value.length,
                      onClick: m[5] || (m[5] = ($) => w('csv')),
                    },
                    ' Esporta CSV QA ',
                    8,
                    F1,
                  ),
                ]),
              ]),
              o('ul', q1, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    ue.value,
                    ($) => (
                      h(),
                      _(
                        'li',
                        { key: $.id, class: ft(['quality-log', `quality-log--${$.level}`]) },
                        [
                          o('div', U1, [
                            o('span', j1, b(ne($.scope)), 1),
                            o('time', z1, b(ge($.timestamp)), 1),
                          ]),
                          o('p', V1, b($.message), 1),
                        ],
                        2,
                      )
                    ),
                  ),
                  128,
                )),
                ue.value.length
                  ? Y('', !0)
                  : (h(), _('li', B1, ' Nessun log per il filtro selezionato. ')),
              ]),
            ]),
          ])
        );
      };
    },
  },
  H1 = Ue(W1, [['__scopeId', 'data-v-d9ff3109']]),
  G1 = { class: 'evogene-deck-shell' },
  Z1 = { class: 'evogene-deck-shell__frame' },
  Y1 = { class: 'evogene-deck-shell__inner' },
  X1 = {
    class: 'evogene-deck-shell__lights',
    role: 'group',
    'aria-label': 'Indicatori di stato EvoGene Deck',
  },
  K1 = ['data-state', 'data-label', 'aria-label'],
  Q1 = { class: 'evogene-deck-shell__content' },
  J1 = { class: 'evogene-deck-shell__header' },
  eE = { key: 0, class: 'evogene-deck-shell__status' },
  tE = { class: 'evogene-deck-shell__main' },
  nE = { key: 1, class: 'evogene-deck-shell__footer' },
  aE = {
    class: 'evogene-deck-shell__logs',
    'aria-live': 'polite',
    'aria-label': 'Registro missione',
  },
  sE = { class: 'evogene-deck-logs' },
  rE = { class: 'evogene-deck-logs__header' },
  iE = { class: 'evogene-deck-logs__count' },
  lE = { class: 'evogene-deck-logs__feed' },
  oE = ['data-level'],
  cE = { class: 'evogene-deck-logs__timestamp' },
  uE = { class: 'evogene-deck-logs__message' },
  dE = { key: 0, class: 'evogene-deck-logs__entry evogene-deck-logs__entry--empty' },
  fE = {
    __name: 'EvoGeneDeckShell',
    props: {
      lights: { type: Array, default: () => [] },
      logs: { type: Array, default: () => [] },
      logLimit: { type: Number, default: 10 },
    },
    setup(e) {
      const t = e,
        n = {
          ready: 'operativo',
          success: 'operativo',
          loading: 'in caricamento',
          pending: 'in attesa',
          idle: 'in attesa',
          warning: 'attenzione',
          caution: 'attenzione',
          error: 'errore',
          critical: 'errore critico',
          blocked: 'bloccato',
          offline: 'offline',
        },
        a = T(() =>
          t.lights.map((i, l) => {
            const d = String(i.state ?? 'idle').toLowerCase(),
              c = i.label ?? String(i.id ?? l + 1),
              f = n[d] ?? d;
            return { id: i.id ?? l, label: c, state: d, ariaLabel: `${c}: ${f}` };
          }),
        ),
        s = T(() =>
          t.logs.slice(0, t.logLimit).map((i, l) => ({
            id: i.id ?? `${i.level || 'info'}-${l}`,
            level: i.level || 'info',
            scope: i.scope || 'Flow',
            message: i.message || i.event || 'Evento registrato',
            time: r(i.timestamp),
          })),
        );
      function r(i) {
        if (!i) return '—';
        try {
          const l = new Date(i);
          if (Number.isNaN(l.getTime())) throw new Error('Invalid timestamp');
          return l.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        } catch {
          return String(i).slice(0, 8);
        }
      }
      return (i, l) => (
        h(),
        _('div', G1, [
          o('div', Z1, [
            o('div', Y1, [
              o('div', X1, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    a.value,
                    (d) => (
                      h(),
                      _(
                        'span',
                        {
                          key: d.id,
                          class: 'evogene-deck-light',
                          'data-state': d.state,
                          'data-label': d.label,
                          role: 'status',
                          'aria-label': d.ariaLabel,
                        },
                        null,
                        8,
                        K1,
                      )
                    ),
                  ),
                  128,
                )),
              ]),
              o('div', Q1, [
                o('header', J1, [st(i.$slots, 'header', {}, void 0, !0)]),
                i.$slots.status
                  ? (h(), _('section', eE, [st(i.$slots, 'status', {}, void 0, !0)]))
                  : Y('', !0),
                o('main', tE, [st(i.$slots, 'default', {}, void 0, !0)]),
                i.$slots.footer
                  ? (h(), _('footer', nE, [st(i.$slots, 'footer', {}, void 0, !0)]))
                  : Y('', !0),
              ]),
              o('aside', aE, [
                st(
                  i.$slots,
                  'sidebar',
                  {},
                  () => [
                    o('div', sE, [
                      o('header', rE, [
                        l[0] ||
                          (l[0] = o(
                            'span',
                            { class: 'evogene-deck-logs__title' },
                            'Mission Log',
                            -1,
                          )),
                        o('span', iE, b(s.value.length), 1),
                      ]),
                      o('ol', lE, [
                        (h(!0),
                        _(
                          te,
                          null,
                          se(
                            s.value,
                            (d) => (
                              h(),
                              _(
                                'li',
                                {
                                  key: d.id,
                                  class: 'evogene-deck-logs__entry',
                                  'data-level': d.level,
                                },
                                [
                                  o('span', cE, b(d.time), 1),
                                  o('p', uE, [
                                    o('strong', null, b(d.scope), 1),
                                    o('span', null, b(d.message), 1),
                                  ]),
                                ],
                                8,
                                oE,
                              )
                            ),
                          ),
                          128,
                        )),
                        s.value.length
                          ? Y('', !0)
                          : (h(),
                            _('li', dE, [
                              ...(l[1] ||
                                (l[1] = [
                                  o('span', { class: 'evogene-deck-logs__timestamp' }, '—', -1),
                                  o(
                                    'p',
                                    { class: 'evogene-deck-logs__message' },
                                    [
                                      o('strong', null, 'Nessun log'),
                                      o('span', null, "In attesa dei segnali dell'orchestratore…"),
                                    ],
                                    -1,
                                  ),
                                ])),
                            ])),
                      ]),
                    ]),
                  ],
                  !0,
                ),
              ]),
            ]),
          ]),
        ])
      );
    },
  },
  mE = Ue(fE, [['__scopeId', 'data-v-1ea137ba']]),
  pE = { class: 'flow-telemetry', 'aria-live': 'polite' },
  gE = { class: 'flow-telemetry__header' },
  hE = ['data-status'],
  _E = { key: 0, class: 'flow-telemetry__status-hint' },
  vE = { key: 1, class: 'flow-telemetry__status-hint' },
  bE = { class: 'flow-telemetry__badges' },
  yE = { class: 'flow-telemetry__request' },
  kE = { class: 'flow-telemetry__toolbar' },
  wE = ['disabled'],
  EE = ['disabled'],
  SE = ['disabled'],
  TE = { class: 'flow-telemetry__logs' },
  AE = ['data-level'],
  IE = { class: 'flow-telemetry__time' },
  $E = { class: 'flow-telemetry__message' },
  NE = { key: 0, class: 'flow-telemetry__log flow-telemetry__log--empty' },
  xE = es({
    __name: 'FlowShellTelemetryPanel',
    props: { logs: {}, metrics: {}, stream: {} },
    emits: ['export-json', 'export-csv', 'refresh-stream'],
    setup(e, { emit: t }) {
      const n = e,
        a = T(() => {
          const p = (n.stream.status || '').toLowerCase();
          return p === 'open'
            ? 'success'
            : p === 'connecting'
              ? 'warning'
              : p === 'errored'
                ? 'critical'
                : p === 'unsupported' || p === 'closed'
                  ? 'muted'
                  : 'neutral';
        }),
        s = T(() => {
          const p = (n.stream.status || '').toLowerCase();
          return p === 'open'
            ? 'Stream live'
            : p === 'connecting'
              ? 'Connessione…'
              : p === 'errored'
                ? 'Stream interrotto'
                : p === 'unsupported'
                  ? 'Stream non supportato'
                  : p === 'closed'
                    ? 'Stream chiuso'
                    : 'In attesa stream';
        }),
        r = T(() => (Number(n.metrics.validatorWarnings) > 0 ? 'warning' : 'success')),
        i = T(() => (Number(n.metrics.fallbackCount) > 0 ? 'warning' : 'neutral')),
        l = T(() => n.logs.length > 0),
        d = T(() => {
          const p = n.stream.error;
          return p ? (p instanceof Error ? p.message : String(p)) : '';
        }),
        c = T(() => {
          if (!n.stream.lastEventAt || n.stream.lastEventAt <= 0) return '';
          try {
            return `Ultimo evento ${new Date(n.stream.lastEventAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
          } catch {
            return '';
          }
        }),
        f = T(() => {
          const p = (n.stream.status || '').toLowerCase();
          return p === 'errored' || p === 'closed';
        });
      return (p, g) => (
        h(),
        _('section', pE, [
          o('header', gE, [
            g[3] ||
              (g[3] = o(
                'div',
                null,
                [
                  o('h2', { class: 'flow-telemetry__title' }, 'QA Telemetry'),
                  o(
                    'p',
                    { class: 'flow-telemetry__subtitle' },
                    'Stream orchestratore & metriche snapshot',
                  ),
                ],
                -1,
              )),
            o(
              'span',
              { class: 'flow-telemetry__status', 'data-status': a.value },
              [
                o('strong', null, b(s.value), 1),
                c.value
                  ? (h(), _('small', _E, b(c.value), 1))
                  : d.value
                    ? (h(), _('small', vE, b(d.value), 1))
                    : Y('', !0),
              ],
              8,
              hE,
            ),
          ]),
          o('div', bE, [
            Ne(
              Ot,
              {
                label: 'Validator warnings',
                value: e.metrics.validatorWarnings ?? 0,
                tone: r.value,
              },
              null,
              8,
              ['value', 'tone'],
            ),
            Ne(
              Ot,
              { label: 'Fallback attivi', value: e.metrics.fallbackCount ?? 0, tone: i.value },
              null,
              8,
              ['value', 'tone'],
            ),
            Ne(
              Ot,
              { label: 'Request ID', tone: e.metrics.requestId ? 'neutral' : 'muted' },
              { default: Ze(() => [o('code', yE, b(e.metrics.requestId || '—'), 1)]), _: 1 },
              8,
              ['tone'],
            ),
          ]),
          o('div', kE, [
            o(
              'button',
              {
                type: 'button',
                class: 'flow-telemetry__export',
                disabled: !l.value,
                onClick: g[0] || (g[0] = (v) => p.$emit('export-json')),
              },
              ' Esporta JSON QA ',
              8,
              wE,
            ),
            o(
              'button',
              {
                type: 'button',
                class: 'flow-telemetry__export',
                disabled: !l.value,
                onClick: g[1] || (g[1] = (v) => p.$emit('export-csv')),
              },
              ' Esporta CSV QA ',
              8,
              EE,
            ),
            o(
              'button',
              {
                type: 'button',
                class: 'flow-telemetry__refresh',
                disabled: !f.value,
                onClick: g[2] || (g[2] = (v) => p.$emit('refresh-stream')),
              },
              ' Riconnetti stream ',
              8,
              SE,
            ),
          ]),
          o('ol', TE, [
            (h(!0),
            _(
              te,
              null,
              se(
                e.logs,
                (v) => (
                  h(),
                  _(
                    'li',
                    { key: v.id, class: 'flow-telemetry__log', 'data-level': v.level || 'info' },
                    [
                      o('span', IE, b(v.time), 1),
                      o('div', $E, [
                        o('strong', null, b(v.scope), 1),
                        o('span', null, b(v.message), 1),
                      ]),
                    ],
                    8,
                    AE,
                  )
                ),
              ),
              128,
            )),
            e.logs.length
              ? Y('', !0)
              : (h(),
                _('li', NE, [
                  ...(g[4] ||
                    (g[4] = [
                      o('span', { class: 'flow-telemetry__time' }, '—', -1),
                      o(
                        'div',
                        { class: 'flow-telemetry__message' },
                        [
                          o('strong', null, 'Nessun log QA'),
                          o('span', null, 'In attesa di aggiornamenti dal runtime validator.'),
                        ],
                        -1,
                      ),
                    ])),
                ])),
          ]),
        ])
      );
    },
  }),
  CE = Ue(xE, [['__scopeId', 'data-v-c2061e4d']]),
  OE = { class: 'flow-shell__header-grid' },
  LE = { class: 'evogene-deck-status-grid' },
  RE = ['data-state'],
  PE = { class: 'evogene-deck-status-card__header' },
  ME = { class: 'evogene-deck-status-card__label' },
  DE = { key: 0, class: 'evogene-deck-status-card__spinner', 'aria-hidden': 'true' },
  FE = { class: 'evogene-deck-status-card__message' },
  qE = { key: 0 },
  UE = { key: 1 },
  jE = { key: 2 },
  zE = { key: 0, class: 'evogene-deck-status-card__actions' },
  VE = ['disabled', 'onClick'],
  BE = { key: 0, class: 'flow-shell__placeholder' },
  WE = { key: 1, class: 'flow-shell__placeholder flow-shell__placeholder--error' },
  HE = ['disabled'],
  GE = { class: 'evogene-deck-step-indicator' },
  ZE = ['disabled'],
  YE = {
    __name: 'FlowShellView',
    setup(e) {
      const t = Jd(),
        n = t.steps,
        a = t.breadcrumb,
        s = t.currentStep,
        r = t.summary,
        i = Nf(),
        l = fo(),
        d = Sp({ logger: i }),
        c = Fp({ logger: i }),
        f = Vp({ logger: i });
      async function p({ force: R = !1 } = {}) {
        var U;
        const X = ((U = d.snapshot.value) == null ? void 0 : U.initialSpeciesRequest) || {};
        if (Array.isArray(X == null ? void 0 : X.trait_ids) && X.trait_ids.length)
          try {
            await c.runSpecies(X, { force: R });
          } catch {}
      }
      ts(async () => {
        try {
          (await d.fetchSnapshot(), await p());
        } catch {}
        try {
          await f.load();
        } catch {}
      });
      let g = '';
      (tt(
        () => {
          var R;
          return (R = d.snapshot.value) == null ? void 0 : R.initialSpeciesRequest;
        },
        (R) => {
          if (!R || !Array.isArray(R.trait_ids) || !R.trait_ids.length) {
            g = '';
            return;
          }
          const X = JSON.stringify({
            trait_ids: [...R.trait_ids].sort(),
            fallback_trait_ids: Array.isArray(R.fallback_trait_ids)
              ? [...R.fallback_trait_ids].sort()
              : [],
            biome_id: R.biome_id || null,
            seed: R.seed ?? null,
          });
          X !== g && ((g = X), p());
        },
        { deep: !0 },
      ),
        tt(
          () => d.metrics.value,
          (R) => {
            R &&
              Object.entries(R).forEach(([X, U]) => {
                U && typeof U == 'object' && t.updateMetrics(X, U);
              });
          },
          { immediate: !0, deep: !0 },
        ));
      const v = {
          overview: vl,
          species: lb,
          biomeSetup: zb,
          biomes: py,
          encounter: Yk,
          qualityRelease: H1,
          publishing: dw,
        },
        y = T(() => v[s.value.id] || vl),
        N = T(() => {
          var X, U, ie;
          const R = s.value.id;
          return R === 'overview'
            ? {
                overview: d.overview.value,
                timeline: d.timeline.value,
                qualityRelease: d.qualityRelease.value,
              }
            : R === 'species'
              ? {
                  species: c.blueprint.value,
                  status: d.speciesStatus.value,
                  meta: c.meta.value,
                  validation: c.validation.value,
                  requestId: c.requestId.value,
                  loading: c.loading.value,
                  error: c.error.value,
                  traitCatalog: f.traitCatalog.value,
                  traitCompliance: f.traitCompliance.value,
                  traitDiagnosticsLoading: f.loading.value,
                  traitDiagnosticsError: f.error.value,
                  traitDiagnosticsMeta: f.meta.value,
                }
              : R === 'biomeSetup'
                ? {
                    config: ((X = d.biomeSetup.value) == null ? void 0 : X.config) || {},
                    graph: ((U = d.biomeSetup.value) == null ? void 0 : U.graph) || {},
                    validators:
                      ((ie = d.biomeSetup.value) == null ? void 0 : ie.validators) ||
                      d.biomes.value,
                  }
                : R === 'biomes'
                  ? { biomes: d.biomes.value }
                  : R === 'encounter'
                    ? { encounter: d.encounter.value, summary: d.encounterSummary.value }
                    : R === 'qualityRelease'
                      ? {
                          snapshot: d.qualityRelease.value,
                          context: d.qualityContext.value,
                          orchestratorLogs: B.value,
                        }
                      : R === 'publishing'
                        ? { publishing: d.publishing.value }
                        : {};
        }),
        O = T(() => s.value.index > 0),
        P = T(() => s.value.index < n.length - 1),
        V = T(() => d.loading.value && !d.hasSnapshot.value),
        k = T(() => d.refreshing.value);
      function E(R) {
        return R
          ? typeof R == 'string'
            ? R
            : typeof R.message == 'string' && R.message.trim()
              ? R.message
              : 'errors.generic'
          : '';
      }
      function A(R) {
        return R
          ? typeof R == 'string'
            ? R === 'errors.network.offline'
            : (R == null ? void 0 : R.message) === 'errors.network.offline' ||
              (typeof (R == null ? void 0 : R.status) == 'number' && R.status === 0) ||
              (typeof (R == null ? void 0 : R.code) == 'string' &&
                R.code.toUpperCase() === 'ERR_NETWORK')
          : !1;
      }
      function I(R) {
        if (!R) return '—';
        try {
          return new Date(R).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        } catch {
          return '—';
        }
      }
      const C = T(() => E(d.error.value)),
        D = async () => {
          try {
            (await d.fetchSnapshot({ force: !0, refresh: !0 }), await p({ force: !0 }));
          } catch {}
        },
        M = async () => {
          try {
            c.canRetry() ? await c.retry({ force: !0 }) : await p({ force: !0 });
          } catch {}
        },
        ce = async () => {
          try {
            await f.reload();
          } catch {}
        },
        ve = T(() => {
          var u;
          const R = d.source.value === 'fallback',
            X = A(d.error.value),
            U = {
              id: 'snapshot',
              label: 'Snapshot',
              loading: d.loading.value,
              loadingMessage: k.value ? 'Aggiornamento…' : 'Caricamento…',
              error: d.error.value,
              errorMessage: E(d.error.value),
              message: X
                ? 'Connessione assente'
                : R
                  ? 'Snapshot fallback attivo'
                  : `Aggiornato ${I(d.lastUpdatedAt.value)}`,
              fallbackLabel: R ? d.fallbackLabel.value || 'fallback' : X ? 'offline' : null,
              canRetry: !!(d.error.value || R || X),
              onRetry: D,
              state: d.error.value ? 'error' : d.loading.value ? 'loading' : 'ready',
            },
            ie = c.fallbackActive.value,
            we = A(c.error.value),
            Le = {
              id: 'species',
              label: 'Specie',
              loading: c.loading.value,
              loadingMessage: 'Generazione…',
              error: c.error.value,
              errorMessage: E(c.error.value),
              message: we
                ? 'Connessione assente'
                : ((u = c.blueprint.value) == null ? void 0 : u.name) ||
                  (c.requestId.value ? `Richiesta ${c.requestId.value}` : 'In attesa richiesta'),
              fallbackLabel: ie ? 'fallback' : we ? 'offline' : null,
              canRetry: !!(c.error.value || ie || we || c.canRetry()),
              onRetry: M,
              state: c.error.value
                ? 'error'
                : c.loading.value
                  ? 'loading'
                  : c.blueprint.value
                    ? 'ready'
                    : 'idle',
            },
            Q = f.source.value === 'fallback',
            ke = A(f.error.value),
            w = {
              id: 'traitDiagnostics',
              label: 'Trait diagnostics',
              loading: f.loading.value,
              loadingMessage: 'Aggiornamento…',
              error: f.error.value,
              errorMessage: E(f.error.value),
              message: ke
                ? 'Connessione assente'
                : Q
                  ? 'Trait diagnostics fallback attivo'
                  : `Aggiornati ${I(f.lastUpdatedAt.value)}`,
              fallbackLabel: Q ? f.fallbackLabel.value || 'fallback' : ke ? 'offline' : null,
              canRetry: !!(f.error.value || Q || ke),
              onRetry: ce,
              state: f.error.value ? 'error' : f.loading.value ? 'loading' : 'ready',
            };
          return [U, Le, w];
        }),
        Z = (R) => t.goTo(R),
        Ae = () => t.next(),
        Ye = () => t.previous(),
        De = T(() => ve.value.map((R) => ({ id: R.id, label: R.label, state: R.state })));
      function Be(R) {
        if (!R) return '—';
        try {
          const X = new Date(R);
          if (Number.isNaN(X.getTime())) throw new Error('Invalid timestamp');
          return X.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        } catch {
          return String(R).slice(0, 8);
        }
      }
      const B = T(() => l.list()),
        K = T(() =>
          B.value.map((R, X) => {
            const U =
                R.meta && typeof R.meta == 'object' && R.meta !== null ? R.meta.timestamp : void 0,
              ie = typeof U == 'string' && U.length ? U : null,
              we = R.timestamp || ie || new Date().toISOString();
            return {
              id: R.id ?? `${R.event || 'log'}-${X}`,
              level: R.level || 'info',
              scope: R.scope || R.event || 'quality',
              message: R.message || R.event || 'Evento registrato',
              timestamp: we,
              time: Be(we),
            };
          }),
        ),
        ue = K,
        F = T(() => ({
          status: l.streamStatus.value,
          error: l.streamError.value,
          lastEventAt: l.streamLastEventAt.value,
          attempts: l.streamAttempts.value,
        }));
      function G(R) {
        var U, ie, we, Le;
        return [
          (U = R == null ? void 0 : R.qualityRelease) == null ? void 0 : U.logs,
          (ie = R == null ? void 0 : R.qualityReleaseContext) == null ? void 0 : ie.logs,
          (we = R == null ? void 0 : R.qualityRelease) == null ? void 0 : we.events,
          (Le = R == null ? void 0 : R.qualityReleaseContext) == null ? void 0 : Le.events,
        ]
          .filter((Q) => Array.isArray(Q))
          .flat()
          .filter((Q) => Q && typeof Q == 'object');
      }
      function H(R) {
        return G(R).filter(
          (X) => String((X == null ? void 0 : X.level) || '').toLowerCase() === 'warning',
        ).length;
      }
      function de(R) {
        var Q, ke, w;
        let X = 0;
        const U =
          (Q = R == null ? void 0 : R.initialSpeciesRequest) == null
            ? void 0
            : Q.fallback_trait_ids;
        Array.isArray(U) && U.length && (X += 1);
        const ie =
          (w =
            (ke = R == null ? void 0 : R.qualityReleaseContext) == null
              ? void 0
              : ke.speciesBatch) == null
            ? void 0
            : w.entries;
        Array.isArray(ie) &&
          ie.forEach((u) => {
            Array.isArray(u == null ? void 0 : u.fallback_trait_ids) &&
              u.fallback_trait_ids.length &&
              (X += 1);
          });
        const we = [];
        (Array.isArray(R == null ? void 0 : R.suggestions) &&
          R.suggestions.forEach((u) => {
            var x;
            const m = (x = u == null ? void 0 : u.payload) == null ? void 0 : x.entries;
            Array.isArray(m) && m.forEach((q) => we.push(q));
          }),
          we.forEach((u) => {
            if (u && typeof u == 'object') {
              const m = u.fallback_trait_ids;
              Array.isArray(m) && m.length && (X += 1);
            }
          }));
        const Le = G(R).filter((u) =>
          String((u == null ? void 0 : u.message) || '')
            .toLowerCase()
            .includes('fallback'),
        ).length;
        return X + Le;
      }
      function Te(R) {
        var U, ie, we, Le;
        if ((U = R == null ? void 0 : R.initialSpeciesRequest) != null && U.request_id)
          return R.initialSpeciesRequest.request_id;
        const X =
          (we =
            (ie = R == null ? void 0 : R.qualityReleaseContext) == null
              ? void 0
              : ie.speciesBatch) == null
            ? void 0
            : we.entries;
        if (Array.isArray(X)) {
          const Q = X.find((ke) => (ke == null ? void 0 : ke.request_id));
          if (Q != null && Q.request_id) return Q.request_id;
        }
        if (Array.isArray(R == null ? void 0 : R.suggestions))
          for (const Q of R.suggestions) {
            const ke = (Le = Q == null ? void 0 : Q.payload) == null ? void 0 : Le.entries;
            if (Array.isArray(ke)) {
              const w = ke.find((u) => (u == null ? void 0 : u.request_id));
              if (w != null && w.request_id) return w.request_id;
            }
          }
        return null;
      }
      const ne = T(() => {
          var ke;
          const R = d.snapshot.value,
            X = ((ke = R == null ? void 0 : R.qualityRelease) == null ? void 0 : ke.metrics) || {},
            U = Number(X.validatorWarnings ?? X.validator_warnings ?? X.warnings ?? Number.NaN),
            ie = Number(X.fallbackCount ?? X.fallback_count ?? X.fallbacks ?? Number.NaN),
            we = Number.isFinite(U) ? U : H(R),
            Le = Number.isFinite(ie) ? ie : de(R),
            Q = X.lastRequestId ?? X.requestId ?? Te(R) ?? c.requestId.value ?? null;
          return { validatorWarnings: we, fallbackCount: Le, requestId: Q };
        }),
        ge = T(() => [
          {
            id: 'validator-warnings',
            label: 'Validator warnings',
            value: ne.value.validatorWarnings,
          },
          { id: 'fallback-count', label: 'Fallback attivi', value: ne.value.fallbackCount },
          { id: 'request-id', label: 'Request ID', value: ne.value.requestId || '—' },
        ]);
      let oe = '';
      tt(
        ge,
        (R) => {
          const X = JSON.stringify(R);
          X !== oe && ((oe = X), l.logQaBadgeSummary(R, { scope: 'quality' }));
        },
        { deep: !0, immediate: !0 },
      );
      const j = T(() => {
        var X;
        const R = ((X = d.snapshot.value) == null ? void 0 : X.qualityRelease) || {};
        if (typeof R.logStreamUrl == 'string' && R.logStreamUrl.trim())
          return R.logStreamUrl.trim();
        if (R.logStream && typeof R.logStream.url == 'string') {
          const U = R.logStream.url.trim();
          if (U) return U;
        }
        return l.defaultStreamUrl;
      });
      tt(
        () => j.value,
        (R) => {
          if (typeof window > 'u') return;
          if (!R) {
            l.disconnectStream();
            return;
          }
          (l.streamUrl.value === R && l.streamStatus.value === 'open') ||
            l.connectStream({ url: R, scope: 'quality' });
        },
        { immediate: !0 },
      );
      function W(R) {
        R === 'csv' ? l.exportLogsAsCsv() : l.exportLogsAsJson();
      }
      function ae() {
        l.reconnectStream();
      }
      function he(R) {
        if (!R) return 'neutral';
        const X = String(R).toLowerCase();
        return X.includes('fallback')
          ? 'warning'
          : X.includes('offline')
            ? 'critical'
            : X.includes('demo')
              ? 'success'
              : 'neutral';
      }
      return (R, X) => (
        h(),
        nt(
          mE,
          { lights: De.value, logs: le(ue) },
          {
            header: Ze(() => [
              o('div', OE, [
                Ne(Pd, { steps: le(a), current: le(s), onNavigate: Z }, null, 8, [
                  'steps',
                  'current',
                ]),
                Ne(Qd, { steps: le(n), summary: le(r), onNavigate: Z }, null, 8, [
                  'steps',
                  'summary',
                ]),
              ]),
            ]),
            status: Ze(() => [
              o('div', LE, [
                (h(!0),
                _(
                  te,
                  null,
                  se(
                    ve.value,
                    (U) => (
                      h(),
                      _(
                        'article',
                        { key: U.id, class: 'evogene-deck-status-card', 'data-state': U.state },
                        [
                          o('header', PE, [
                            o('span', ME, b(U.label), 1),
                            U.loading ? (h(), _('span', DE)) : Y('', !0),
                            U.fallbackLabel
                              ? (h(),
                                nt(
                                  Ot,
                                  {
                                    key: 1,
                                    label: 'Modalità',
                                    value: U.fallbackLabel,
                                    tone: he(U.fallbackLabel),
                                  },
                                  null,
                                  8,
                                  ['value', 'tone'],
                                ))
                              : Y('', !0),
                          ]),
                          o('p', FE, [
                            U.loading
                              ? (h(), _('span', qE, b(U.loadingMessage || 'Caricamento…'), 1))
                              : U.error
                                ? (h(), _('span', UE, b(U.errorMessage), 1))
                                : (h(), _('span', jE, b(U.message), 1)),
                          ]),
                          U.canRetry
                            ? (h(),
                              _('footer', zE, [
                                o(
                                  'button',
                                  {
                                    type: 'button',
                                    class: 'evogene-deck-status-card__retry',
                                    disabled: U.loading,
                                    onClick: U.onRetry,
                                  },
                                  ' Riprova ',
                                  8,
                                  VE,
                                ),
                              ]))
                            : Y('', !0),
                        ],
                        8,
                        RE,
                      )
                    ),
                  ),
                  128,
                )),
              ]),
            ]),
            default: Ze(() => [
              V.value
                ? (h(), _('div', BE, 'Caricamento orchestratore…'))
                : C.value
                  ? (h(), _('div', WE, b(C.value), 1))
                  : (h(), nt(bc(y.value), yc(kc({ key: 2 }, N.value)), null, 16)),
            ]),
            footer: Ze(() => [
              o(
                'button',
                { type: 'button', class: 'evogene-deck-button', disabled: !O.value, onClick: Ye },
                ' ← Indietro ',
                8,
                HE,
              ),
              o('span', GE, b(le(s).index + 1) + ' / ' + b(le(n).length), 1),
              o(
                'button',
                { type: 'button', class: 'evogene-deck-button', disabled: !P.value, onClick: Ae },
                ' Avanti → ',
                8,
                ZE,
              ),
            ]),
            sidebar: Ze(() => [
              Ne(
                CE,
                {
                  logs: K.value,
                  metrics: ne.value,
                  stream: F.value,
                  onExportJson: X[0] || (X[0] = (U) => W('json')),
                  onExportCsv: X[1] || (X[1] = (U) => W('csv')),
                  onRefreshStream: ae,
                },
                null,
                8,
                ['logs', 'metrics', 'stream'],
              ),
            ]),
            _: 1,
          },
          8,
          ['lights', 'logs'],
        )
      );
    },
  },
  XE = Ue(YE, [['__scopeId', 'data-v-c69bb73a']]),
  eS = Object.freeze(
    Object.defineProperty({ __proto__: null, default: XE }, Symbol.toStringTag, {
      value: 'Module',
    }),
  );
export { eS as F, Sg as N, ea as a, JE as c, Cg as u };
