import { u as Ls, N as rl } from './flow-Denzei7K.js';
/**
 * @vue/shared v3.5.22
 * (c) 2018-present Yuxi (Evan) You and Vue contributors
 * @license MIT
 **/ function Bs(e) {
  const t = Object.create(null);
  for (const n of e.split(',')) t[n] = 1;
  return (n) => n in t;
}
const ce = {},
  jt = [],
  ot = () => {},
  mr = () => !1,
  Kn = (e) =>
    e.charCodeAt(0) === 111 &&
    e.charCodeAt(1) === 110 &&
    (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97),
  Vs = (e) => e.startsWith('onUpdate:'),
  Pe = Object.assign,
  Fs = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  },
  ol = Object.prototype.hasOwnProperty,
  le = (e, t) => ol.call(e, t),
  W = Array.isArray,
  Ht = (e) => wn(e) === '[object Map]',
  Xt = (e) => wn(e) === '[object Set]',
  di = (e) => wn(e) === '[object Date]',
  Q = (e) => typeof e == 'function',
  ye = (e) => typeof e == 'string',
  Je = (e) => typeof e == 'symbol',
  fe = (e) => e !== null && typeof e == 'object',
  gr = (e) => (fe(e) || Q(e)) && Q(e.then) && Q(e.catch),
  _r = Object.prototype.toString,
  wn = (e) => _r.call(e),
  ll = (e) => wn(e).slice(8, -1),
  vr = (e) => wn(e) === '[object Object]',
  zs = (e) => ye(e) && e !== 'NaN' && e[0] !== '-' && '' + parseInt(e, 10) === e,
  ln = Bs(
    ',key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted',
  ),
  qn = (e) => {
    const t = Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  },
  al = /-\w/g,
  We = qn((e) => e.replace(al, (t) => t.slice(1).toUpperCase())),
  cl = /\B([A-Z])/g,
  kt = qn((e) => e.replace(cl, '-$1').toLowerCase()),
  Qn = qn((e) => e.charAt(0).toUpperCase() + e.slice(1)),
  rs = qn((e) => (e ? `on${Qn(e)}` : '')),
  xt = (e, t) => !Object.is(e, t),
  Pn = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  },
  br = (e, t, n, s = !1) => {
    Object.defineProperty(e, t, { configurable: !0, enumerable: !1, writable: s, value: n });
  },
  Mn = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  };
let pi;
const Jn = () =>
  pi ||
  (pi =
    typeof globalThis < 'u'
      ? globalThis
      : typeof self < 'u'
        ? self
        : typeof window < 'u'
          ? window
          : typeof global < 'u'
            ? global
            : {});
function qt(e) {
  if (W(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const s = e[n],
        i = ye(s) ? pl(s) : qt(s);
      if (i) for (const r in i) t[r] = i[r];
    }
    return t;
  } else if (ye(e) || fe(e)) return e;
}
const ul = /;(?![^(]*\))/g,
  fl = /:([^]+)/,
  dl = /\/\*[^]*?\*\//g;
function pl(e) {
  const t = {};
  return (
    e
      .replace(dl, '')
      .split(ul)
      .forEach((n) => {
        if (n) {
          const s = n.split(fl);
          s.length > 1 && (t[s[0].trim()] = s[1].trim());
        }
      }),
    t
  );
}
function mt(e) {
  let t = '';
  if (ye(e)) t = e;
  else if (W(e))
    for (let n = 0; n < e.length; n++) {
      const s = mt(e[n]);
      s && (t += s + ' ');
    }
  else if (fe(e)) for (const n in e) e[n] && (t += n + ' ');
  return t.trim();
}
function ih(e) {
  if (!e) return null;
  let { class: t, style: n } = e;
  return (t && !ye(t) && (e.class = mt(t)), n && (e.style = qt(n)), e);
}
const hl = 'itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly',
  ml = Bs(hl);
function yr(e) {
  return !!e || e === '';
}
function gl(e, t) {
  if (e.length !== t.length) return !1;
  let n = !0;
  for (let s = 0; n && s < e.length; s++) n = En(e[s], t[s]);
  return n;
}
function En(e, t) {
  if (e === t) return !0;
  let n = di(e),
    s = di(t);
  if (n || s) return n && s ? e.getTime() === t.getTime() : !1;
  if (((n = Je(e)), (s = Je(t)), n || s)) return e === t;
  if (((n = W(e)), (s = W(t)), n || s)) return n && s ? gl(e, t) : !1;
  if (((n = fe(e)), (s = fe(t)), n || s)) {
    if (!n || !s) return !1;
    const i = Object.keys(e).length,
      r = Object.keys(t).length;
    if (i !== r) return !1;
    for (const l in e) {
      const o = e.hasOwnProperty(l),
        a = t.hasOwnProperty(l);
      if ((o && !a) || (!o && a) || !En(e[l], t[l])) return !1;
    }
  }
  return String(e) === String(t);
}
function js(e, t) {
  return e.findIndex((n) => En(n, t));
}
const Ar = (e) => !!(e && e.__v_isRef === !0),
  b = (e) =>
    ye(e)
      ? e
      : e == null
        ? ''
        : W(e) || (fe(e) && (e.toString === _r || !Q(e.toString)))
          ? Ar(e)
            ? b(e.value)
            : JSON.stringify(e, Sr, 2)
          : String(e),
  Sr = (e, t) =>
    Ar(t)
      ? Sr(e, t.value)
      : Ht(t)
        ? {
            [`Map(${t.size})`]: [...t.entries()].reduce(
              (n, [s, i], r) => ((n[os(s, r) + ' =>'] = i), n),
              {},
            ),
          }
        : Xt(t)
          ? { [`Set(${t.size})`]: [...t.values()].map((n) => os(n)) }
          : Je(t)
            ? os(t)
            : fe(t) && !W(t) && !vr(t)
              ? String(t)
              : t,
  os = (e, t = '') => {
    var n;
    return Je(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
/**
 * @vue/reactivity v3.5.22
 * (c) 2018-present Yuxi (Evan) You and Vue contributors
 * @license MIT
 **/ let Ce;
class wr {
  constructor(t = !1) {
    ((this.detached = t),
      (this._active = !0),
      (this._on = 0),
      (this.effects = []),
      (this.cleanups = []),
      (this._isPaused = !1),
      (this.parent = Ce),
      !t && Ce && (this.index = (Ce.scopes || (Ce.scopes = [])).push(this) - 1));
  }
  get active() {
    return this._active;
  }
  pause() {
    if (this._active) {
      this._isPaused = !0;
      let t, n;
      if (this.scopes) for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].pause();
      for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].pause();
    }
  }
  resume() {
    if (this._active && this._isPaused) {
      this._isPaused = !1;
      let t, n;
      if (this.scopes) for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].resume();
      for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].resume();
    }
  }
  run(t) {
    if (this._active) {
      const n = Ce;
      try {
        return ((Ce = this), t());
      } finally {
        Ce = n;
      }
    }
  }
  on() {
    ++this._on === 1 && ((this.prevScope = Ce), (Ce = this));
  }
  off() {
    this._on > 0 && --this._on === 0 && ((Ce = this.prevScope), (this.prevScope = void 0));
  }
  stop(t) {
    if (this._active) {
      this._active = !1;
      let n, s;
      for (n = 0, s = this.effects.length; n < s; n++) this.effects[n].stop();
      for (this.effects.length = 0, n = 0, s = this.cleanups.length; n < s; n++) this.cleanups[n]();
      if (((this.cleanups.length = 0), this.scopes)) {
        for (n = 0, s = this.scopes.length; n < s; n++) this.scopes[n].stop(!0);
        this.scopes.length = 0;
      }
      if (!this.detached && this.parent && !t) {
        const i = this.parent.scopes.pop();
        i && i !== this && ((this.parent.scopes[this.index] = i), (i.index = this.index));
      }
      this.parent = void 0;
    }
  }
}
function rh(e) {
  return new wr(e);
}
function _l() {
  return Ce;
}
function oh(e, t = !1) {
  Ce && Ce.cleanups.push(e);
}
let he;
const ls = new WeakSet();
class Er {
  constructor(t) {
    ((this.fn = t),
      (this.deps = void 0),
      (this.depsTail = void 0),
      (this.flags = 5),
      (this.next = void 0),
      (this.cleanup = void 0),
      (this.scheduler = void 0),
      Ce && Ce.active && Ce.effects.push(this));
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && ((this.flags &= -65), ls.has(this) && (ls.delete(this), this.trigger()));
  }
  notify() {
    (this.flags & 2 && !(this.flags & 32)) || this.flags & 8 || xr(this);
  }
  run() {
    if (!(this.flags & 1)) return this.fn();
    ((this.flags |= 2), hi(this), Cr(this));
    const t = he,
      n = qe;
    ((he = this), (qe = !0));
    try {
      return this.fn();
    } finally {
      (Rr(this), (he = t), (qe = n), (this.flags &= -3));
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep) Gs(t);
      ((this.deps = this.depsTail = void 0),
        hi(this),
        this.onStop && this.onStop(),
        (this.flags &= -2));
    }
  }
  trigger() {
    this.flags & 64 ? ls.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  runIfDirty() {
    As(this) && this.run();
  }
  get dirty() {
    return As(this);
  }
}
let Tr = 0,
  an,
  cn;
function xr(e, t = !1) {
  if (((e.flags |= 8), t)) {
    ((e.next = cn), (cn = e));
    return;
  }
  ((e.next = an), (an = e));
}
function Hs() {
  Tr++;
}
function Us() {
  if (--Tr > 0) return;
  if (cn) {
    let t = cn;
    for (cn = void 0; t; ) {
      const n = t.next;
      ((t.next = void 0), (t.flags &= -9), (t = n));
    }
  }
  let e;
  for (; an; ) {
    let t = an;
    for (an = void 0; t; ) {
      const n = t.next;
      if (((t.next = void 0), (t.flags &= -9), t.flags & 1))
        try {
          t.trigger();
        } catch (s) {
          e || (e = s);
        }
      t = n;
    }
  }
  if (e) throw e;
}
function Cr(e) {
  for (let t = e.deps; t; t = t.nextDep)
    ((t.version = -1), (t.prevActiveLink = t.dep.activeLink), (t.dep.activeLink = t));
}
function Rr(e) {
  let t,
    n = e.depsTail,
    s = n;
  for (; s; ) {
    const i = s.prevDep;
    (s.version === -1 ? (s === n && (n = i), Gs(s), vl(s)) : (t = s),
      (s.dep.activeLink = s.prevActiveLink),
      (s.prevActiveLink = void 0),
      (s = i));
  }
  ((e.deps = t), (e.depsTail = n));
}
function As(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (
      t.dep.version !== t.version ||
      (t.dep.computed && (Or(t.dep.computed) || t.dep.version !== t.version))
    )
      return !0;
  return !!e._dirty;
}
function Or(e) {
  if (
    (e.flags & 4 && !(e.flags & 16)) ||
    ((e.flags &= -17), e.globalVersion === mn) ||
    ((e.globalVersion = mn), !e.isSSR && e.flags & 128 && ((!e.deps && !e._dirty) || !As(e)))
  )
    return;
  e.flags |= 2;
  const t = e.dep,
    n = he,
    s = qe;
  ((he = e), (qe = !0));
  try {
    Cr(e);
    const i = e.fn(e._value);
    (t.version === 0 || xt(i, e._value)) && ((e.flags |= 128), (e._value = i), t.version++);
  } catch (i) {
    throw (t.version++, i);
  } finally {
    ((he = n), (qe = s), Rr(e), (e.flags &= -3));
  }
}
function Gs(e, t = !1) {
  const { dep: n, prevSub: s, nextSub: i } = e;
  if (
    (s && ((s.nextSub = i), (e.prevSub = void 0)),
    i && ((i.prevSub = s), (e.nextSub = void 0)),
    n.subs === e && ((n.subs = s), !s && n.computed))
  ) {
    n.computed.flags &= -5;
    for (let r = n.computed.deps; r; r = r.nextDep) Gs(r, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function vl(e) {
  const { prevDep: t, nextDep: n } = e;
  (t && ((t.nextDep = n), (e.prevDep = void 0)), n && ((n.prevDep = t), (e.nextDep = void 0)));
}
let qe = !0;
const Pr = [];
function gt() {
  (Pr.push(qe), (qe = !1));
}
function _t() {
  const e = Pr.pop();
  qe = e === void 0 ? !0 : e;
}
function hi(e) {
  const { cleanup: t } = e;
  if (((e.cleanup = void 0), t)) {
    const n = he;
    he = void 0;
    try {
      t();
    } finally {
      he = n;
    }
  }
}
let mn = 0;
class bl {
  constructor(t, n) {
    ((this.sub = t),
      (this.dep = n),
      (this.version = n.version),
      (this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0));
  }
}
class Ws {
  constructor(t) {
    ((this.computed = t),
      (this.version = 0),
      (this.activeLink = void 0),
      (this.subs = void 0),
      (this.map = void 0),
      (this.key = void 0),
      (this.sc = 0),
      (this.__v_skip = !0));
  }
  track(t) {
    if (!he || !qe || he === this.computed) return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== he)
      ((n = this.activeLink = new bl(he, this)),
        he.deps
          ? ((n.prevDep = he.depsTail), (he.depsTail.nextDep = n), (he.depsTail = n))
          : (he.deps = he.depsTail = n),
        Ir(n));
    else if (n.version === -1 && ((n.version = this.version), n.nextDep)) {
      const s = n.nextDep;
      ((s.prevDep = n.prevDep),
        n.prevDep && (n.prevDep.nextDep = s),
        (n.prevDep = he.depsTail),
        (n.nextDep = void 0),
        (he.depsTail.nextDep = n),
        (he.depsTail = n),
        he.deps === n && (he.deps = s));
    }
    return n;
  }
  trigger(t) {
    (this.version++, mn++, this.notify(t));
  }
  notify(t) {
    Hs();
    try {
      for (let n = this.subs; n; n = n.prevSub) n.sub.notify() && n.sub.dep.notify();
    } finally {
      Us();
    }
  }
}
function Ir(e) {
  if ((e.dep.sc++, e.sub.flags & 4)) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let s = t.deps; s; s = s.nextDep) Ir(s);
    }
    const n = e.dep.subs;
    (n !== e && ((e.prevSub = n), n && (n.nextSub = e)), (e.dep.subs = e));
  }
}
const kn = new WeakMap(),
  Mt = Symbol(''),
  Ss = Symbol(''),
  gn = Symbol('');
function Re(e, t, n) {
  if (qe && he) {
    let s = kn.get(e);
    s || kn.set(e, (s = new Map()));
    let i = s.get(n);
    (i || (s.set(n, (i = new Ws())), (i.map = s), (i.key = n)), i.track());
  }
}
function dt(e, t, n, s, i, r) {
  const l = kn.get(e);
  if (!l) {
    mn++;
    return;
  }
  const o = (a) => {
    a && a.trigger();
  };
  if ((Hs(), t === 'clear')) l.forEach(o);
  else {
    const a = W(e),
      u = a && zs(n);
    if (a && n === 'length') {
      const f = Number(s);
      l.forEach((p, g) => {
        (g === 'length' || g === gn || (!Je(g) && g >= f)) && o(p);
      });
    } else
      switch (((n !== void 0 || l.has(void 0)) && o(l.get(n)), u && o(l.get(gn)), t)) {
        case 'add':
          a ? u && o(l.get('length')) : (o(l.get(Mt)), Ht(e) && o(l.get(Ss)));
          break;
        case 'delete':
          a || (o(l.get(Mt)), Ht(e) && o(l.get(Ss)));
          break;
        case 'set':
          Ht(e) && o(l.get(Mt));
          break;
      }
  }
  Us();
}
function yl(e, t) {
  const n = kn.get(e);
  return n && n.get(t);
}
function Vt(e) {
  const t = ne(e);
  return t === e ? t : (Re(t, 'iterate', gn), Ge(e) ? t : t.map(we));
}
function Zn(e) {
  return (Re((e = ne(e)), 'iterate', gn), e);
}
const Al = {
  __proto__: null,
  [Symbol.iterator]() {
    return as(this, Symbol.iterator, we);
  },
  concat(...e) {
    return Vt(this).concat(...e.map((t) => (W(t) ? Vt(t) : t)));
  },
  entries() {
    return as(this, 'entries', (e) => ((e[1] = we(e[1])), e));
  },
  every(e, t) {
    return ct(this, 'every', e, t, void 0, arguments);
  },
  filter(e, t) {
    return ct(this, 'filter', e, t, (n) => n.map(we), arguments);
  },
  find(e, t) {
    return ct(this, 'find', e, t, we, arguments);
  },
  findIndex(e, t) {
    return ct(this, 'findIndex', e, t, void 0, arguments);
  },
  findLast(e, t) {
    return ct(this, 'findLast', e, t, we, arguments);
  },
  findLastIndex(e, t) {
    return ct(this, 'findLastIndex', e, t, void 0, arguments);
  },
  forEach(e, t) {
    return ct(this, 'forEach', e, t, void 0, arguments);
  },
  includes(...e) {
    return cs(this, 'includes', e);
  },
  indexOf(...e) {
    return cs(this, 'indexOf', e);
  },
  join(e) {
    return Vt(this).join(e);
  },
  lastIndexOf(...e) {
    return cs(this, 'lastIndexOf', e);
  },
  map(e, t) {
    return ct(this, 'map', e, t, void 0, arguments);
  },
  pop() {
    return tn(this, 'pop');
  },
  push(...e) {
    return tn(this, 'push', e);
  },
  reduce(e, ...t) {
    return mi(this, 'reduce', e, t);
  },
  reduceRight(e, ...t) {
    return mi(this, 'reduceRight', e, t);
  },
  shift() {
    return tn(this, 'shift');
  },
  some(e, t) {
    return ct(this, 'some', e, t, void 0, arguments);
  },
  splice(...e) {
    return tn(this, 'splice', e);
  },
  toReversed() {
    return Vt(this).toReversed();
  },
  toSorted(e) {
    return Vt(this).toSorted(e);
  },
  toSpliced(...e) {
    return Vt(this).toSpliced(...e);
  },
  unshift(...e) {
    return tn(this, 'unshift', e);
  },
  values() {
    return as(this, 'values', we);
  },
};
function as(e, t, n) {
  const s = Zn(e),
    i = s[t]();
  return (
    s !== e &&
      !Ge(e) &&
      ((i._next = i.next),
      (i.next = () => {
        const r = i._next();
        return (r.done || (r.value = n(r.value)), r);
      })),
    i
  );
}
const Sl = Array.prototype;
function ct(e, t, n, s, i, r) {
  const l = Zn(e),
    o = l !== e && !Ge(e),
    a = l[t];
  if (a !== Sl[t]) {
    const p = a.apply(e, r);
    return o ? we(p) : p;
  }
  let u = n;
  l !== e &&
    (o
      ? (u = function (p, g) {
          return n.call(this, we(p), g, e);
        })
      : n.length > 2 &&
        (u = function (p, g) {
          return n.call(this, p, g, e);
        }));
  const f = a.call(l, u, s);
  return o && i ? i(f) : f;
}
function mi(e, t, n, s) {
  const i = Zn(e);
  let r = n;
  return (
    i !== e &&
      (Ge(e)
        ? n.length > 3 &&
          (r = function (l, o, a) {
            return n.call(this, l, o, a, e);
          })
        : (r = function (l, o, a) {
            return n.call(this, l, we(o), a, e);
          })),
    i[t](r, ...s)
  );
}
function cs(e, t, n) {
  const s = ne(e);
  Re(s, 'iterate', gn);
  const i = s[t](...n);
  return (i === -1 || i === !1) && Qs(n[0]) ? ((n[0] = ne(n[0])), s[t](...n)) : i;
}
function tn(e, t, n = []) {
  (gt(), Hs());
  const s = ne(e)[t].apply(e, n);
  return (Us(), _t(), s);
}
const wl = Bs('__proto__,__v_isRef,__isVue'),
  Nr = new Set(
    Object.getOwnPropertyNames(Symbol)
      .filter((e) => e !== 'arguments' && e !== 'caller')
      .map((e) => Symbol[e])
      .filter(Je),
  );
function El(e) {
  Je(e) || (e = String(e));
  const t = ne(this);
  return (Re(t, 'has', e), t.hasOwnProperty(e));
}
class Dr {
  constructor(t = !1, n = !1) {
    ((this._isReadonly = t), (this._isShallow = n));
  }
  get(t, n, s) {
    if (n === '__v_skip') return t.__v_skip;
    const i = this._isReadonly,
      r = this._isShallow;
    if (n === '__v_isReactive') return !i;
    if (n === '__v_isReadonly') return i;
    if (n === '__v_isShallow') return r;
    if (n === '__v_raw')
      return s === (i ? (r ? Ml : Lr) : r ? $r : kr).get(t) ||
        Object.getPrototypeOf(t) === Object.getPrototypeOf(s)
        ? t
        : void 0;
    const l = W(t);
    if (!i) {
      let a;
      if (l && (a = Al[n])) return a;
      if (n === 'hasOwnProperty') return El;
    }
    const o = Reflect.get(t, n, Te(t) ? t : s);
    if ((Je(n) ? Nr.has(n) : wl(n)) || (i || Re(t, 'get', n), r)) return o;
    if (Te(o)) {
      const a = l && zs(n) ? o : o.value;
      return i && fe(a) ? $n(a) : a;
    }
    return fe(o) ? (i ? $n(o) : $t(o)) : o;
  }
}
class Mr extends Dr {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, s, i) {
    let r = t[n];
    if (!this._isShallow) {
      const a = Ct(r);
      if ((!Ge(s) && !Ct(s) && ((r = ne(r)), (s = ne(s))), !W(t) && Te(r) && !Te(s)))
        return (a || (r.value = s), !0);
    }
    const l = W(t) && zs(n) ? Number(n) < t.length : le(t, n),
      o = Reflect.set(t, n, s, Te(t) ? t : i);
    return (t === ne(i) && (l ? xt(s, r) && dt(t, 'set', n, s) : dt(t, 'add', n, s)), o);
  }
  deleteProperty(t, n) {
    const s = le(t, n);
    t[n];
    const i = Reflect.deleteProperty(t, n);
    return (i && s && dt(t, 'delete', n, void 0), i);
  }
  has(t, n) {
    const s = Reflect.has(t, n);
    return ((!Je(n) || !Nr.has(n)) && Re(t, 'has', n), s);
  }
  ownKeys(t) {
    return (Re(t, 'iterate', W(t) ? 'length' : Mt), Reflect.ownKeys(t));
  }
}
class Tl extends Dr {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return !0;
  }
  deleteProperty(t, n) {
    return !0;
  }
}
const xl = new Mr(),
  Cl = new Tl(),
  Rl = new Mr(!0);
const ws = (e) => e,
  Cn = (e) => Reflect.getPrototypeOf(e);
function Ol(e, t, n) {
  return function (...s) {
    const i = this.__v_raw,
      r = ne(i),
      l = Ht(r),
      o = e === 'entries' || (e === Symbol.iterator && l),
      a = e === 'keys' && l,
      u = i[e](...s),
      f = n ? ws : t ? Ln : we;
    return (
      !t && Re(r, 'iterate', a ? Ss : Mt),
      {
        next() {
          const { value: p, done: g } = u.next();
          return g ? { value: p, done: g } : { value: o ? [f(p[0]), f(p[1])] : f(p), done: g };
        },
        [Symbol.iterator]() {
          return this;
        },
      }
    );
  };
}
function Rn(e) {
  return function (...t) {
    return e === 'delete' ? !1 : e === 'clear' ? void 0 : this;
  };
}
function Pl(e, t) {
  const n = {
    get(i) {
      const r = this.__v_raw,
        l = ne(r),
        o = ne(i);
      e || (xt(i, o) && Re(l, 'get', i), Re(l, 'get', o));
      const { has: a } = Cn(l),
        u = t ? ws : e ? Ln : we;
      if (a.call(l, i)) return u(r.get(i));
      if (a.call(l, o)) return u(r.get(o));
      r !== l && r.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return (!e && Re(ne(i), 'iterate', Mt), i.size);
    },
    has(i) {
      const r = this.__v_raw,
        l = ne(r),
        o = ne(i);
      return (
        e || (xt(i, o) && Re(l, 'has', i), Re(l, 'has', o)),
        i === o ? r.has(i) : r.has(i) || r.has(o)
      );
    },
    forEach(i, r) {
      const l = this,
        o = l.__v_raw,
        a = ne(o),
        u = t ? ws : e ? Ln : we;
      return (!e && Re(a, 'iterate', Mt), o.forEach((f, p) => i.call(r, u(f), u(p), l)));
    },
  };
  return (
    Pe(
      n,
      e
        ? { add: Rn('add'), set: Rn('set'), delete: Rn('delete'), clear: Rn('clear') }
        : {
            add(i) {
              !t && !Ge(i) && !Ct(i) && (i = ne(i));
              const r = ne(this);
              return (Cn(r).has.call(r, i) || (r.add(i), dt(r, 'add', i, i)), this);
            },
            set(i, r) {
              !t && !Ge(r) && !Ct(r) && (r = ne(r));
              const l = ne(this),
                { has: o, get: a } = Cn(l);
              let u = o.call(l, i);
              u || ((i = ne(i)), (u = o.call(l, i)));
              const f = a.call(l, i);
              return (l.set(i, r), u ? xt(r, f) && dt(l, 'set', i, r) : dt(l, 'add', i, r), this);
            },
            delete(i) {
              const r = ne(this),
                { has: l, get: o } = Cn(r);
              let a = l.call(r, i);
              (a || ((i = ne(i)), (a = l.call(r, i))), o && o.call(r, i));
              const u = r.delete(i);
              return (a && dt(r, 'delete', i, void 0), u);
            },
            clear() {
              const i = ne(this),
                r = i.size !== 0,
                l = i.clear();
              return (r && dt(i, 'clear', void 0, void 0), l);
            },
          },
    ),
    ['keys', 'values', 'entries', Symbol.iterator].forEach((i) => {
      n[i] = Ol(i, e, t);
    }),
    n
  );
}
function Ks(e, t) {
  const n = Pl(e, t);
  return (s, i, r) =>
    i === '__v_isReactive'
      ? !e
      : i === '__v_isReadonly'
        ? e
        : i === '__v_raw'
          ? s
          : Reflect.get(le(n, i) && i in s ? n : s, i, r);
}
const Il = { get: Ks(!1, !1) },
  Nl = { get: Ks(!1, !0) },
  Dl = { get: Ks(!0, !1) };
const kr = new WeakMap(),
  $r = new WeakMap(),
  Lr = new WeakMap(),
  Ml = new WeakMap();
function kl(e) {
  switch (e) {
    case 'Object':
    case 'Array':
      return 1;
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return 2;
    default:
      return 0;
  }
}
function $l(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : kl(ll(e));
}
function $t(e) {
  return Ct(e) ? e : qs(e, !1, xl, Il, kr);
}
function Br(e) {
  return qs(e, !1, Rl, Nl, $r);
}
function $n(e) {
  return qs(e, !0, Cl, Dl, Lr);
}
function qs(e, t, n, s, i) {
  if (!fe(e) || (e.__v_raw && !(t && e.__v_isReactive))) return e;
  const r = $l(e);
  if (r === 0) return e;
  const l = i.get(e);
  if (l) return l;
  const o = new Proxy(e, r === 2 ? s : n);
  return (i.set(e, o), o);
}
function Ut(e) {
  return Ct(e) ? Ut(e.__v_raw) : !!(e && e.__v_isReactive);
}
function Ct(e) {
  return !!(e && e.__v_isReadonly);
}
function Ge(e) {
  return !!(e && e.__v_isShallow);
}
function Qs(e) {
  return e ? !!e.__v_raw : !1;
}
function ne(e) {
  const t = e && e.__v_raw;
  return t ? ne(t) : e;
}
function Ll(e) {
  return (!le(e, '__v_skip') && Object.isExtensible(e) && br(e, '__v_skip', !0), e);
}
const we = (e) => (fe(e) ? $t(e) : e),
  Ln = (e) => (fe(e) ? $n(e) : e);
function Te(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function Bl(e) {
  return Vr(e, !1);
}
function Vl(e) {
  return Vr(e, !0);
}
function Vr(e, t) {
  return Te(e) ? e : new Fl(e, t);
}
class Fl {
  constructor(t, n) {
    ((this.dep = new Ws()),
      (this.__v_isRef = !0),
      (this.__v_isShallow = !1),
      (this._rawValue = n ? t : ne(t)),
      (this._value = n ? t : we(t)),
      (this.__v_isShallow = n));
  }
  get value() {
    return (this.dep.track(), this._value);
  }
  set value(t) {
    const n = this._rawValue,
      s = this.__v_isShallow || Ge(t) || Ct(t);
    ((t = s ? t : ne(t)),
      xt(t, n) && ((this._rawValue = t), (this._value = s ? t : we(t)), this.dep.trigger()));
  }
}
function ge(e) {
  return Te(e) ? e.value : e;
}
const zl = {
  get: (e, t, n) => (t === '__v_raw' ? e : ge(Reflect.get(e, t, n))),
  set: (e, t, n, s) => {
    const i = e[t];
    return Te(i) && !Te(n) ? ((i.value = n), !0) : Reflect.set(e, t, n, s);
  },
};
function Fr(e) {
  return Ut(e) ? e : new Proxy(e, zl);
}
function lh(e) {
  const t = W(e) ? new Array(e.length) : {};
  for (const n in e) t[n] = Hl(e, n);
  return t;
}
class jl {
  constructor(t, n, s) {
    ((this._object = t),
      (this._key = n),
      (this._defaultValue = s),
      (this.__v_isRef = !0),
      (this._value = void 0));
  }
  get value() {
    const t = this._object[this._key];
    return (this._value = t === void 0 ? this._defaultValue : t);
  }
  set value(t) {
    this._object[this._key] = t;
  }
  get dep() {
    return yl(ne(this._object), this._key);
  }
}
function Hl(e, t, n) {
  const s = e[t];
  return Te(s) ? s : new jl(e, t, n);
}
class Ul {
  constructor(t, n, s) {
    ((this.fn = t),
      (this.setter = n),
      (this._value = void 0),
      (this.dep = new Ws(this)),
      (this.__v_isRef = !0),
      (this.deps = void 0),
      (this.depsTail = void 0),
      (this.flags = 16),
      (this.globalVersion = mn - 1),
      (this.next = void 0),
      (this.effect = this),
      (this.__v_isReadonly = !n),
      (this.isSSR = s));
  }
  notify() {
    if (((this.flags |= 16), !(this.flags & 8) && he !== this)) return (xr(this, !0), !0);
  }
  get value() {
    const t = this.dep.track();
    return (Or(this), t && (t.version = this.dep.version), this._value);
  }
  set value(t) {
    this.setter && this.setter(t);
  }
}
function Gl(e, t, n = !1) {
  let s, i;
  return (Q(e) ? (s = e) : ((s = e.get), (i = e.set)), new Ul(s, i, n));
}
const On = {},
  Bn = new WeakMap();
let It;
function Wl(e, t = !1, n = It) {
  if (n) {
    let s = Bn.get(n);
    (s || Bn.set(n, (s = [])), s.push(e));
  }
}
function Kl(e, t, n = ce) {
  const { immediate: s, deep: i, once: r, scheduler: l, augmentJob: o, call: a } = n,
    u = (D) => (i ? D : Ge(D) || i === !1 || i === 0 ? pt(D, 1) : pt(D));
  let f,
    p,
    g,
    m,
    v = !1,
    w = !1;
  if (
    (Te(e)
      ? ((p = () => e.value), (v = Ge(e)))
      : Ut(e)
        ? ((p = () => u(e)), (v = !0))
        : W(e)
          ? ((w = !0),
            (v = e.some((D) => Ut(D) || Ge(D))),
            (p = () =>
              e.map((D) => {
                if (Te(D)) return D.value;
                if (Ut(D)) return u(D);
                if (Q(D)) return a ? a(D, 2) : D();
              })))
          : Q(e)
            ? t
              ? (p = a ? () => a(e, 2) : e)
              : (p = () => {
                  if (g) {
                    gt();
                    try {
                      g();
                    } finally {
                      _t();
                    }
                  }
                  const D = It;
                  It = f;
                  try {
                    return a ? a(e, 3, [m]) : e(m);
                  } finally {
                    It = D;
                  }
                })
            : (p = ot),
    t && i)
  ) {
    const D = p,
      j = i === !0 ? 1 / 0 : i;
    p = () => pt(D(), j);
  }
  const I = _l(),
    P = () => {
      (f.stop(), I && I.active && Fs(I.effects, f));
    };
  if (r && t) {
    const D = t;
    t = (...j) => {
      (D(...j), P());
    };
  }
  let M = w ? new Array(e.length).fill(On) : On;
  const F = (D) => {
    if (!(!(f.flags & 1) || (!f.dirty && !D)))
      if (t) {
        const j = f.run();
        if (i || v || (w ? j.some((Z, G) => xt(Z, M[G])) : xt(j, M))) {
          g && g();
          const Z = It;
          It = f;
          try {
            const G = [j, M === On ? void 0 : w && M[0] === On ? [] : M, m];
            ((M = j), a ? a(t, 3, G) : t(...G));
          } finally {
            It = Z;
          }
        }
      } else f.run();
  };
  return (
    o && o(F),
    (f = new Er(p)),
    (f.scheduler = l ? () => l(F, !1) : F),
    (m = (D) => Wl(D, !1, f)),
    (g = f.onStop =
      () => {
        const D = Bn.get(f);
        if (D) {
          if (a) a(D, 4);
          else for (const j of D) j();
          Bn.delete(f);
        }
      }),
    t ? (s ? F(!0) : (M = f.run())) : l ? l(F.bind(null, !0), !0) : f.run(),
    (P.pause = f.pause.bind(f)),
    (P.resume = f.resume.bind(f)),
    (P.stop = P),
    P
  );
}
function pt(e, t = 1 / 0, n) {
  if (t <= 0 || !fe(e) || e.__v_skip || ((n = n || new Map()), (n.get(e) || 0) >= t)) return e;
  if ((n.set(e, t), t--, Te(e))) pt(e.value, t, n);
  else if (W(e)) for (let s = 0; s < e.length; s++) pt(e[s], t, n);
  else if (Xt(e) || Ht(e))
    e.forEach((s) => {
      pt(s, t, n);
    });
  else if (vr(e)) {
    for (const s in e) pt(e[s], t, n);
    for (const s of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, s) && pt(e[s], t, n);
  }
  return e;
}
/**
 * @vue/runtime-core v3.5.22
 * (c) 2018-present Yuxi (Evan) You and Vue contributors
 * @license MIT
 **/ function Tn(e, t, n, s) {
  try {
    return s ? e(...s) : e();
  } catch (i) {
    Yn(i, t, n);
  }
}
function lt(e, t, n, s) {
  if (Q(e)) {
    const i = Tn(e, t, n, s);
    return (
      i &&
        gr(i) &&
        i.catch((r) => {
          Yn(r, t, n);
        }),
      i
    );
  }
  if (W(e)) {
    const i = [];
    for (let r = 0; r < e.length; r++) i.push(lt(e[r], t, n, s));
    return i;
  }
}
function Yn(e, t, n, s = !0) {
  const i = t ? t.vnode : null,
    { errorHandler: r, throwUnhandledErrorInProduction: l } = (t && t.appContext.config) || ce;
  if (t) {
    let o = t.parent;
    const a = t.proxy,
      u = `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; o; ) {
      const f = o.ec;
      if (f) {
        for (let p = 0; p < f.length; p++) if (f[p](e, a, u) === !1) return;
      }
      o = o.parent;
    }
    if (r) {
      (gt(), Tn(r, null, 10, [e, a, u]), _t());
      return;
    }
  }
  ql(e, n, i, s, l);
}
function ql(e, t, n, s = !0, i = !1) {
  if (i) throw e;
  console.error(e);
}
const De = [];
let st = -1;
const Gt = [];
let St = null,
  Ft = 0;
const zr = Promise.resolve();
let Vn = null;
function Js(e) {
  const t = Vn || zr;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function Ql(e) {
  let t = st + 1,
    n = De.length;
  for (; t < n; ) {
    const s = (t + n) >>> 1,
      i = De[s],
      r = _n(i);
    r < e || (r === e && i.flags & 2) ? (t = s + 1) : (n = s);
  }
  return t;
}
function Zs(e) {
  if (!(e.flags & 1)) {
    const t = _n(e),
      n = De[De.length - 1];
    (!n || (!(e.flags & 2) && t >= _n(n)) ? De.push(e) : De.splice(Ql(t), 0, e),
      (e.flags |= 1),
      jr());
  }
}
function jr() {
  Vn || (Vn = zr.then(Ur));
}
function Jl(e) {
  (W(e)
    ? Gt.push(...e)
    : St && e.id === -1
      ? St.splice(Ft + 1, 0, e)
      : e.flags & 1 || (Gt.push(e), (e.flags |= 1)),
    jr());
}
function gi(e, t, n = st + 1) {
  for (; n < De.length; n++) {
    const s = De[n];
    if (s && s.flags & 2) {
      if (e && s.id !== e.uid) continue;
      (De.splice(n, 1), n--, s.flags & 4 && (s.flags &= -2), s(), s.flags & 4 || (s.flags &= -2));
    }
  }
}
function Hr(e) {
  if (Gt.length) {
    const t = [...new Set(Gt)].sort((n, s) => _n(n) - _n(s));
    if (((Gt.length = 0), St)) {
      St.push(...t);
      return;
    }
    for (St = t, Ft = 0; Ft < St.length; Ft++) {
      const n = St[Ft];
      (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), (n.flags &= -2));
    }
    ((St = null), (Ft = 0));
  }
}
const _n = (e) => (e.id == null ? (e.flags & 2 ? -1 : 1 / 0) : e.id);
function Ur(e) {
  try {
    for (st = 0; st < De.length; st++) {
      const t = De[st];
      t &&
        !(t.flags & 8) &&
        (t.flags & 4 && (t.flags &= -2), Tn(t, t.i, t.i ? 15 : 14), t.flags & 4 || (t.flags &= -2));
    }
  } finally {
    for (; st < De.length; st++) {
      const t = De[st];
      t && (t.flags &= -2);
    }
    ((st = -1), (De.length = 0), Hr(), (Vn = null), (De.length || Gt.length) && Ur());
  }
}
let Ee = null,
  Gr = null;
function Fn(e) {
  const t = Ee;
  return ((Ee = e), (Gr = (e && e.type.__scopeId) || null), t);
}
function Es(e, t = Ee, n) {
  if (!t || e._n) return e;
  const s = (...i) => {
    s._d && Hn(-1);
    const r = Fn(t);
    let l;
    try {
      l = e(...i);
    } finally {
      (Fn(r), s._d && Hn(1));
    }
    return l;
  };
  return ((s._n = !0), (s._c = !0), (s._d = !0), s);
}
function ah(e, t) {
  if (Ee === null) return e;
  const n = ns(Ee),
    s = e.dirs || (e.dirs = []);
  for (let i = 0; i < t.length; i++) {
    let [r, l, o, a = ce] = t[i];
    r &&
      (Q(r) && (r = { mounted: r, updated: r }),
      r.deep && pt(l),
      s.push({ dir: r, instance: n, value: l, oldValue: void 0, arg: o, modifiers: a }));
  }
  return e;
}
function Ot(e, t, n, s) {
  const i = e.dirs,
    r = t && t.dirs;
  for (let l = 0; l < i.length; l++) {
    const o = i[l];
    r && (o.oldValue = r[l].value);
    let a = o.dir[s];
    a && (gt(), lt(a, n, 8, [e.el, o, e, t]), _t());
  }
}
const Zl = Symbol('_vte'),
  Yl = (e) => e.__isTeleport,
  Xl = Symbol('_leaveCb');
function Ys(e, t) {
  e.shapeFlag & 6 && e.component
    ? ((e.transition = t), Ys(e.component.subTree, t))
    : e.shapeFlag & 128
      ? ((e.ssContent.transition = t.clone(e.ssContent)),
        (e.ssFallback.transition = t.clone(e.ssFallback)))
      : (e.transition = t);
}
function Xs(e, t) {
  return Q(e) ? Pe({ name: e.name }, t, { setup: e }) : e;
}
function ch() {
  const e = si();
  return e ? (e.appContext.config.idPrefix || 'v') + '-' + e.ids[0] + e.ids[1]++ : '';
}
function Wr(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + '-', 0, 0];
}
const zn = new WeakMap();
function un(e, t, n, s, i = !1) {
  if (W(e)) {
    e.forEach((v, w) => un(v, t && (W(t) ? t[w] : t), n, s, i));
    return;
  }
  if (Wt(s) && !i) {
    s.shapeFlag & 512 &&
      s.type.__asyncResolved &&
      s.component.subTree.component &&
      un(e, t, n, s.component.subTree);
    return;
  }
  const r = s.shapeFlag & 4 ? ns(s.component) : s.el,
    l = i ? null : r,
    { i: o, r: a } = e,
    u = t && t.r,
    f = o.refs === ce ? (o.refs = {}) : o.refs,
    p = o.setupState,
    g = ne(p),
    m = p === ce ? mr : (v) => le(g, v);
  if (u != null && u !== a) {
    if ((_i(t), ye(u))) ((f[u] = null), m(u) && (p[u] = null));
    else if (Te(u)) {
      u.value = null;
      const v = t;
      v.k && (f[v.k] = null);
    }
  }
  if (Q(a)) Tn(a, o, 12, [l, f]);
  else {
    const v = ye(a),
      w = Te(a);
    if (v || w) {
      const I = () => {
        if (e.f) {
          const P = v ? (m(a) ? p[a] : f[a]) : a.value;
          if (i) W(P) && Fs(P, r);
          else if (W(P)) P.includes(r) || P.push(r);
          else if (v) ((f[a] = [r]), m(a) && (p[a] = f[a]));
          else {
            const M = [r];
            ((a.value = M), e.k && (f[e.k] = M));
          }
        } else v ? ((f[a] = l), m(a) && (p[a] = l)) : w && ((a.value = l), e.k && (f[e.k] = l));
      };
      if (l) {
        const P = () => {
          (I(), zn.delete(e));
        };
        ((P.id = -1), zn.set(e, P), Ve(P, n));
      } else (_i(e), I());
    }
  }
}
function _i(e) {
  const t = zn.get(e);
  t && ((t.flags |= 8), zn.delete(e));
}
Jn().requestIdleCallback;
Jn().cancelIdleCallback;
const Wt = (e) => !!e.type.__asyncLoader,
  Kr = (e) => e.type.__isKeepAlive;
function ea(e, t) {
  qr(e, 'a', t);
}
function ta(e, t) {
  qr(e, 'da', t);
}
function qr(e, t, n = Oe) {
  const s =
    e.__wdc ||
    (e.__wdc = () => {
      let i = n;
      for (; i; ) {
        if (i.isDeactivated) return;
        i = i.parent;
      }
      return e();
    });
  if ((Xn(t, s, n), n)) {
    let i = n.parent;
    for (; i && i.parent; ) (Kr(i.parent.vnode) && na(s, t, n, i), (i = i.parent));
  }
}
function na(e, t, n, s) {
  const i = Xn(t, e, s, !0);
  Jr(() => {
    Fs(s[t], i);
  }, n);
}
function Xn(e, t, n = Oe, s = !1) {
  if (n) {
    const i = n[e] || (n[e] = []),
      r =
        t.__weh ||
        (t.__weh = (...l) => {
          gt();
          const o = xn(n),
            a = lt(t, n, e, l);
          return (o(), _t(), a);
        });
    return (s ? i.unshift(r) : i.push(r), r);
  }
}
const bt =
    (e) =>
    (t, n = Oe) => {
      (!yn || e === 'sp') && Xn(e, (...s) => t(...s), n);
    },
  sa = bt('bm'),
  Qr = bt('m'),
  ia = bt('bu'),
  ra = bt('u'),
  oa = bt('bum'),
  Jr = bt('um'),
  la = bt('sp'),
  aa = bt('rtg'),
  ca = bt('rtc');
function ua(e, t = Oe) {
  Xn('ec', e, t);
}
const Zr = 'components';
function uh(e, t) {
  return Xr(Zr, e, !0, t) || e;
}
const Yr = Symbol.for('v-ndc');
function fa(e) {
  return ye(e) ? Xr(Zr, e, !1) || e : e || Yr;
}
function Xr(e, t, n = !0, s = !1) {
  const i = Ee || Oe;
  if (i) {
    const r = i.type;
    {
      const o = Ya(r, !1);
      if (o && (o === t || o === We(t) || o === Qn(We(t)))) return r;
    }
    const l = vi(i[e] || r[e], t) || vi(i.appContext[e], t);
    return !l && s ? r : l;
  }
}
function vi(e, t) {
  return e && (e[t] || e[We(t)] || e[Qn(We(t))]);
}
function ve(e, t, n, s) {
  let i;
  const r = n,
    l = W(e);
  if (l || ye(e)) {
    const o = l && Ut(e);
    let a = !1,
      u = !1;
    (o && ((a = !Ge(e)), (u = Ct(e)), (e = Zn(e))), (i = new Array(e.length)));
    for (let f = 0, p = e.length; f < p; f++)
      i[f] = t(a ? (u ? Ln(we(e[f])) : we(e[f])) : e[f], f, void 0, r);
  } else if (typeof e == 'number') {
    i = new Array(e);
    for (let o = 0; o < e; o++) i[o] = t(o + 1, o, void 0, r);
  } else if (fe(e))
    if (e[Symbol.iterator]) i = Array.from(e, (o, a) => t(o, a, void 0, r));
    else {
      const o = Object.keys(e);
      i = new Array(o.length);
      for (let a = 0, u = o.length; a < u; a++) {
        const f = o[a];
        i[a] = t(e[f], f, a, r);
      }
    }
  else i = [];
  return i;
}
function eo(e, t, n = {}, s, i) {
  if (Ee.ce || (Ee.parent && Wt(Ee.parent) && Ee.parent.ce)) {
    const u = Object.keys(n).length > 0;
    return (
      t !== 'default' && (n.name = t),
      T(),
      rt(Y, null, [se('slot', n, s && s())], u ? -2 : 64)
    );
  }
  let r = e[t];
  (r && r._c && (r._d = !1), T());
  const l = r && to(r(n)),
    o = n.key || (l && l.key),
    a = rt(
      Y,
      { key: (o && !Je(o) ? o : `_${t}`) + (!l && s ? '_fb' : '') },
      l || (s ? s() : []),
      l && e._ === 1 ? 64 : -2,
    );
  return (!i && a.scopeId && (a.slotScopeIds = [a.scopeId + '-s']), r && r._c && (r._d = !0), a);
}
function to(e) {
  return e.some((t) => (bn(t) ? !(t.type === vt || (t.type === Y && !to(t.children))) : !0))
    ? e
    : null;
}
const Ts = (e) => (e ? (wo(e) ? ns(e) : Ts(e.parent)) : null),
  fn = Pe(Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => Ts(e.parent),
    $root: (e) => Ts(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => so(e),
    $forceUpdate: (e) =>
      e.f ||
      (e.f = () => {
        Zs(e.update);
      }),
    $nextTick: (e) => e.n || (e.n = Js.bind(e.proxy)),
    $watch: (e) => Da.bind(e),
  }),
  us = (e, t) => e !== ce && !e.__isScriptSetup && le(e, t),
  da = {
    get({ _: e }, t) {
      if (t === '__v_skip') return !0;
      const {
        ctx: n,
        setupState: s,
        data: i,
        props: r,
        accessCache: l,
        type: o,
        appContext: a,
      } = e;
      let u;
      if (t[0] !== '$') {
        const m = l[t];
        if (m !== void 0)
          switch (m) {
            case 1:
              return s[t];
            case 2:
              return i[t];
            case 4:
              return n[t];
            case 3:
              return r[t];
          }
        else {
          if (us(s, t)) return ((l[t] = 1), s[t]);
          if (i !== ce && le(i, t)) return ((l[t] = 2), i[t]);
          if ((u = e.propsOptions[0]) && le(u, t)) return ((l[t] = 3), r[t]);
          if (n !== ce && le(n, t)) return ((l[t] = 4), n[t]);
          xs && (l[t] = 0);
        }
      }
      const f = fn[t];
      let p, g;
      if (f) return (t === '$attrs' && Re(e.attrs, 'get', ''), f(e));
      if ((p = o.__cssModules) && (p = p[t])) return p;
      if (n !== ce && le(n, t)) return ((l[t] = 4), n[t]);
      if (((g = a.config.globalProperties), le(g, t))) return g[t];
    },
    set({ _: e }, t, n) {
      const { data: s, setupState: i, ctx: r } = e;
      return us(i, t)
        ? ((i[t] = n), !0)
        : s !== ce && le(s, t)
          ? ((s[t] = n), !0)
          : le(e.props, t) || (t[0] === '$' && t.slice(1) in e)
            ? !1
            : ((r[t] = n), !0);
    },
    has(
      {
        _: {
          data: e,
          setupState: t,
          accessCache: n,
          ctx: s,
          appContext: i,
          propsOptions: r,
          type: l,
        },
      },
      o,
    ) {
      let a, u;
      return !!(
        n[o] ||
        (e !== ce && o[0] !== '$' && le(e, o)) ||
        us(t, o) ||
        ((a = r[0]) && le(a, o)) ||
        le(s, o) ||
        le(fn, o) ||
        le(i.config.globalProperties, o) ||
        ((u = l.__cssModules) && u[o])
      );
    },
    defineProperty(e, t, n) {
      return (
        n.get != null ? (e._.accessCache[t] = 0) : le(n, 'value') && this.set(e, t, n.value, null),
        Reflect.defineProperty(e, t, n)
      );
    },
  };
function fh() {
  return pa().slots;
}
function pa(e) {
  const t = si();
  return t.setupContext || (t.setupContext = To(t));
}
function bi(e) {
  return W(e) ? e.reduce((t, n) => ((t[n] = null), t), {}) : e;
}
let xs = !0;
function ha(e) {
  const t = so(e),
    n = e.proxy,
    s = e.ctx;
  ((xs = !1), t.beforeCreate && yi(t.beforeCreate, e, 'bc'));
  const {
    data: i,
    computed: r,
    methods: l,
    watch: o,
    provide: a,
    inject: u,
    created: f,
    beforeMount: p,
    mounted: g,
    beforeUpdate: m,
    updated: v,
    activated: w,
    deactivated: I,
    beforeDestroy: P,
    beforeUnmount: M,
    destroyed: F,
    unmounted: D,
    render: j,
    renderTracked: Z,
    renderTriggered: G,
    errorCaptured: te,
    serverPrefetch: de,
    expose: Ae,
    inheritAttrs: xe,
    components: V,
    directives: B,
    filters: J,
  } = t;
  if ((u && ma(u, s, null), l))
    for (const ie in l) {
      const re = l[ie];
      Q(re) && (s[ie] = re.bind(n));
    }
  if (i) {
    const ie = i.call(n, n);
    fe(ie) && (e.data = $t(ie));
  }
  if (((xs = !0), r))
    for (const ie in r) {
      const re = r[ie],
        at = Q(re) ? re.bind(n, n) : Q(re.get) ? re.get.bind(n, n) : ot,
        yt = !Q(re) && Q(re.set) ? re.set.bind(n) : ot,
        Ye = x({ get: at, set: yt });
      Object.defineProperty(s, ie, {
        enumerable: !0,
        configurable: !0,
        get: () => Ye.value,
        set: (Me) => (Ye.value = Me),
      });
    }
  if (o) for (const ie in o) no(o[ie], s, n, ie);
  if (a) {
    const ie = Q(a) ? a.call(n) : a;
    Reflect.ownKeys(ie).forEach((re) => {
      dn(re, ie[re]);
    });
  }
  f && yi(f, e, 'c');
  function me(ie, re) {
    W(re) ? re.forEach((at) => ie(at.bind(n))) : re && ie(re.bind(n));
  }
  if (
    (me(sa, p),
    me(Qr, g),
    me(ia, m),
    me(ra, v),
    me(ea, w),
    me(ta, I),
    me(ua, te),
    me(ca, Z),
    me(aa, G),
    me(oa, M),
    me(Jr, D),
    me(la, de),
    W(Ae))
  )
    if (Ae.length) {
      const ie = e.exposed || (e.exposed = {});
      Ae.forEach((re) => {
        Object.defineProperty(ie, re, {
          get: () => n[re],
          set: (at) => (n[re] = at),
          enumerable: !0,
        });
      });
    } else e.exposed || (e.exposed = {});
  (j && e.render === ot && (e.render = j),
    xe != null && (e.inheritAttrs = xe),
    V && (e.components = V),
    B && (e.directives = B),
    de && Wr(e));
}
function ma(e, t, n = ot) {
  W(e) && (e = Cs(e));
  for (const s in e) {
    const i = e[s];
    let r;
    (fe(i)
      ? 'default' in i
        ? (r = Qe(i.from || s, i.default, !0))
        : (r = Qe(i.from || s))
      : (r = Qe(i)),
      Te(r)
        ? Object.defineProperty(t, s, {
            enumerable: !0,
            configurable: !0,
            get: () => r.value,
            set: (l) => (r.value = l),
          })
        : (t[s] = r));
  }
}
function yi(e, t, n) {
  lt(W(e) ? e.map((s) => s.bind(t.proxy)) : e.bind(t.proxy), t, n);
}
function no(e, t, n, s) {
  let i = s.includes('.') ? _o(n, s) : () => n[s];
  if (ye(e)) {
    const r = t[e];
    Q(r) && In(i, r);
  } else if (Q(e)) In(i, e.bind(n));
  else if (fe(e))
    if (W(e)) e.forEach((r) => no(r, t, n, s));
    else {
      const r = Q(e.handler) ? e.handler.bind(n) : t[e.handler];
      Q(r) && In(i, r, e);
    }
}
function so(e) {
  const t = e.type,
    { mixins: n, extends: s } = t,
    {
      mixins: i,
      optionsCache: r,
      config: { optionMergeStrategies: l },
    } = e.appContext,
    o = r.get(t);
  let a;
  return (
    o
      ? (a = o)
      : !i.length && !n && !s
        ? (a = t)
        : ((a = {}), i.length && i.forEach((u) => jn(a, u, l, !0)), jn(a, t, l)),
    fe(t) && r.set(t, a),
    a
  );
}
function jn(e, t, n, s = !1) {
  const { mixins: i, extends: r } = t;
  (r && jn(e, r, n, !0), i && i.forEach((l) => jn(e, l, n, !0)));
  for (const l in t)
    if (!(s && l === 'expose')) {
      const o = ga[l] || (n && n[l]);
      e[l] = o ? o(e[l], t[l]) : t[l];
    }
  return e;
}
const ga = {
  data: Ai,
  props: Si,
  emits: Si,
  methods: on,
  computed: on,
  beforeCreate: Ie,
  created: Ie,
  beforeMount: Ie,
  mounted: Ie,
  beforeUpdate: Ie,
  updated: Ie,
  beforeDestroy: Ie,
  beforeUnmount: Ie,
  destroyed: Ie,
  unmounted: Ie,
  activated: Ie,
  deactivated: Ie,
  errorCaptured: Ie,
  serverPrefetch: Ie,
  components: on,
  directives: on,
  watch: va,
  provide: Ai,
  inject: _a,
};
function Ai(e, t) {
  return t
    ? e
      ? function () {
          return Pe(Q(e) ? e.call(this, this) : e, Q(t) ? t.call(this, this) : t);
        }
      : t
    : e;
}
function _a(e, t) {
  return on(Cs(e), Cs(t));
}
function Cs(e) {
  if (W(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
    return t;
  }
  return e;
}
function Ie(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function on(e, t) {
  return e ? Pe(Object.create(null), e, t) : t;
}
function Si(e, t) {
  return e
    ? W(e) && W(t)
      ? [...new Set([...e, ...t])]
      : Pe(Object.create(null), bi(e), bi(t ?? {}))
    : t;
}
function va(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = Pe(Object.create(null), e);
  for (const s in t) n[s] = Ie(e[s], t[s]);
  return n;
}
function io() {
  return {
    app: null,
    config: {
      isNativeTag: mr,
      performance: !1,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: void 0,
      warnHandler: void 0,
      compilerOptions: {},
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap(),
  };
}
let ba = 0;
function ya(e, t) {
  return function (s, i = null) {
    (Q(s) || (s = Pe({}, s)), i != null && !fe(i) && (i = null));
    const r = io(),
      l = new WeakSet(),
      o = [];
    let a = !1;
    const u = (r.app = {
      _uid: ba++,
      _component: s,
      _props: i,
      _container: null,
      _context: r,
      _instance: null,
      version: ec,
      get config() {
        return r.config;
      },
      set config(f) {},
      use(f, ...p) {
        return (
          l.has(f) ||
            (f && Q(f.install) ? (l.add(f), f.install(u, ...p)) : Q(f) && (l.add(f), f(u, ...p))),
          u
        );
      },
      mixin(f) {
        return (r.mixins.includes(f) || r.mixins.push(f), u);
      },
      component(f, p) {
        return p ? ((r.components[f] = p), u) : r.components[f];
      },
      directive(f, p) {
        return p ? ((r.directives[f] = p), u) : r.directives[f];
      },
      mount(f, p, g) {
        if (!a) {
          const m = u._ceVNode || se(s, i);
          return (
            (m.appContext = r),
            g === !0 ? (g = 'svg') : g === !1 && (g = void 0),
            e(m, f, g),
            (a = !0),
            (u._container = f),
            (f.__vue_app__ = u),
            ns(m.component)
          );
        }
      },
      onUnmount(f) {
        o.push(f);
      },
      unmount() {
        a && (lt(o, u._instance, 16), e(null, u._container), delete u._container.__vue_app__);
      },
      provide(f, p) {
        return ((r.provides[f] = p), u);
      },
      runWithContext(f) {
        const p = Kt;
        Kt = u;
        try {
          return f();
        } finally {
          Kt = p;
        }
      },
    });
    return u;
  };
}
let Kt = null;
function dn(e, t) {
  if (Oe) {
    let n = Oe.provides;
    const s = Oe.parent && Oe.parent.provides;
    (s === n && (n = Oe.provides = Object.create(s)), (n[e] = t));
  }
}
function Qe(e, t, n = !1) {
  const s = si();
  if (s || Kt) {
    let i = Kt
      ? Kt._context.provides
      : s
        ? s.parent == null || s.ce
          ? s.vnode.appContext && s.vnode.appContext.provides
          : s.parent.provides
        : void 0;
    if (i && e in i) return i[e];
    if (arguments.length > 1) return n && Q(t) ? t.call(s && s.proxy) : t;
  }
}
const ro = {},
  oo = () => Object.create(ro),
  lo = (e) => Object.getPrototypeOf(e) === ro;
function Aa(e, t, n, s = !1) {
  const i = {},
    r = oo();
  ((e.propsDefaults = Object.create(null)), ao(e, t, i, r));
  for (const l in e.propsOptions[0]) l in i || (i[l] = void 0);
  (n ? (e.props = s ? i : Br(i)) : e.type.props ? (e.props = i) : (e.props = r), (e.attrs = r));
}
function Sa(e, t, n, s) {
  const {
      props: i,
      attrs: r,
      vnode: { patchFlag: l },
    } = e,
    o = ne(i),
    [a] = e.propsOptions;
  let u = !1;
  if ((s || l > 0) && !(l & 16)) {
    if (l & 8) {
      const f = e.vnode.dynamicProps;
      for (let p = 0; p < f.length; p++) {
        let g = f[p];
        if (es(e.emitsOptions, g)) continue;
        const m = t[g];
        if (a)
          if (le(r, g)) m !== r[g] && ((r[g] = m), (u = !0));
          else {
            const v = We(g);
            i[v] = Rs(a, o, v, m, e, !1);
          }
        else m !== r[g] && ((r[g] = m), (u = !0));
      }
    }
  } else {
    ao(e, t, i, r) && (u = !0);
    let f;
    for (const p in o)
      (!t || (!le(t, p) && ((f = kt(p)) === p || !le(t, f)))) &&
        (a
          ? n && (n[p] !== void 0 || n[f] !== void 0) && (i[p] = Rs(a, o, p, void 0, e, !0))
          : delete i[p]);
    if (r !== o) for (const p in r) (!t || !le(t, p)) && (delete r[p], (u = !0));
  }
  u && dt(e.attrs, 'set', '');
}
function ao(e, t, n, s) {
  const [i, r] = e.propsOptions;
  let l = !1,
    o;
  if (t)
    for (let a in t) {
      if (ln(a)) continue;
      const u = t[a];
      let f;
      i && le(i, (f = We(a)))
        ? !r || !r.includes(f)
          ? (n[f] = u)
          : ((o || (o = {}))[f] = u)
        : es(e.emitsOptions, a) || ((!(a in s) || u !== s[a]) && ((s[a] = u), (l = !0)));
    }
  if (r) {
    const a = ne(n),
      u = o || ce;
    for (let f = 0; f < r.length; f++) {
      const p = r[f];
      n[p] = Rs(i, a, p, u[p], e, !le(u, p));
    }
  }
  return l;
}
function Rs(e, t, n, s, i, r) {
  const l = e[n];
  if (l != null) {
    const o = le(l, 'default');
    if (o && s === void 0) {
      const a = l.default;
      if (l.type !== Function && !l.skipFactory && Q(a)) {
        const { propsDefaults: u } = i;
        if (n in u) s = u[n];
        else {
          const f = xn(i);
          ((s = u[n] = a.call(null, t)), f());
        }
      } else s = a;
      i.ce && i.ce._setProp(n, s);
    }
    l[0] && (r && !o ? (s = !1) : l[1] && (s === '' || s === kt(n)) && (s = !0));
  }
  return s;
}
const wa = new WeakMap();
function co(e, t, n = !1) {
  const s = n ? wa : t.propsCache,
    i = s.get(e);
  if (i) return i;
  const r = e.props,
    l = {},
    o = [];
  let a = !1;
  if (!Q(e)) {
    const f = (p) => {
      a = !0;
      const [g, m] = co(p, t, !0);
      (Pe(l, g), m && o.push(...m));
    };
    (!n && t.mixins.length && t.mixins.forEach(f),
      e.extends && f(e.extends),
      e.mixins && e.mixins.forEach(f));
  }
  if (!r && !a) return (fe(e) && s.set(e, jt), jt);
  if (W(r))
    for (let f = 0; f < r.length; f++) {
      const p = We(r[f]);
      wi(p) && (l[p] = ce);
    }
  else if (r)
    for (const f in r) {
      const p = We(f);
      if (wi(p)) {
        const g = r[f],
          m = (l[p] = W(g) || Q(g) ? { type: g } : Pe({}, g)),
          v = m.type;
        let w = !1,
          I = !0;
        if (W(v))
          for (let P = 0; P < v.length; ++P) {
            const M = v[P],
              F = Q(M) && M.name;
            if (F === 'Boolean') {
              w = !0;
              break;
            } else F === 'String' && (I = !1);
          }
        else w = Q(v) && v.name === 'Boolean';
        ((m[0] = w), (m[1] = I), (w || le(m, 'default')) && o.push(p));
      }
    }
  const u = [l, o];
  return (fe(e) && s.set(e, u), u);
}
function wi(e) {
  return e[0] !== '$' && !ln(e);
}
const ei = (e) => e === '_' || e === '_ctx' || e === '$stable',
  ti = (e) => (W(e) ? e.map(it) : [it(e)]),
  Ea = (e, t, n) => {
    if (t._n) return t;
    const s = Es((...i) => ti(t(...i)), n);
    return ((s._c = !1), s);
  },
  uo = (e, t, n) => {
    const s = e._ctx;
    for (const i in e) {
      if (ei(i)) continue;
      const r = e[i];
      if (Q(r)) t[i] = Ea(i, r, s);
      else if (r != null) {
        const l = ti(r);
        t[i] = () => l;
      }
    }
  },
  fo = (e, t) => {
    const n = ti(t);
    e.slots.default = () => n;
  },
  po = (e, t, n) => {
    for (const s in t) (n || !ei(s)) && (e[s] = t[s]);
  },
  Ta = (e, t, n) => {
    const s = (e.slots = oo());
    if (e.vnode.shapeFlag & 32) {
      const i = t._;
      i ? (po(s, t, n), n && br(s, '_', i, !0)) : uo(t, s);
    } else t && fo(e, t);
  },
  xa = (e, t, n) => {
    const { vnode: s, slots: i } = e;
    let r = !0,
      l = ce;
    if (s.shapeFlag & 32) {
      const o = t._;
      (o ? (n && o === 1 ? (r = !1) : po(i, t, n)) : ((r = !t.$stable), uo(t, i)), (l = t));
    } else t && (fo(e, t), (l = { default: 1 }));
    if (r) for (const o in i) !ei(o) && l[o] == null && delete i[o];
  },
  Ve = za;
function Ca(e) {
  return Ra(e);
}
function Ra(e, t) {
  const n = Jn();
  n.__VUE__ = !0;
  const {
      insert: s,
      remove: i,
      patchProp: r,
      createElement: l,
      createText: o,
      createComment: a,
      setText: u,
      setElementText: f,
      parentNode: p,
      nextSibling: g,
      setScopeId: m = ot,
      insertStaticContent: v,
    } = e,
    w = (d, h, _, A = null, E = null, y = null, k = void 0, N = null, O = !!h.dynamicChildren) => {
      if (d === h) return;
      (d && !nn(d, h) && ((A = S(d)), Me(d, E, y, !0), (d = null)),
        h.patchFlag === -2 && ((O = !1), (h.dynamicChildren = null)));
      const { type: C, ref: K, shapeFlag: L } = h;
      switch (C) {
        case ts:
          I(d, h, _, A);
          break;
        case vt:
          P(d, h, _, A);
          break;
        case ds:
          d == null && M(h, _, A, k);
          break;
        case Y:
          V(d, h, _, A, E, y, k, N, O);
          break;
        default:
          L & 1
            ? j(d, h, _, A, E, y, k, N, O)
            : L & 6
              ? B(d, h, _, A, E, y, k, N, O)
              : (L & 64 || L & 128) && C.process(d, h, _, A, E, y, k, N, O, H);
      }
      K != null && E
        ? un(K, d && d.ref, y, h || d, !h)
        : K == null && d && d.ref != null && un(d.ref, null, y, d, !0);
    },
    I = (d, h, _, A) => {
      if (d == null) s((h.el = o(h.children)), _, A);
      else {
        const E = (h.el = d.el);
        h.children !== d.children && u(E, h.children);
      }
    },
    P = (d, h, _, A) => {
      d == null ? s((h.el = a(h.children || '')), _, A) : (h.el = d.el);
    },
    M = (d, h, _, A) => {
      [d.el, d.anchor] = v(d.children, h, _, A, d.el, d.anchor);
    },
    F = ({ el: d, anchor: h }, _, A) => {
      let E;
      for (; d && d !== h; ) ((E = g(d)), s(d, _, A), (d = E));
      s(h, _, A);
    },
    D = ({ el: d, anchor: h }) => {
      let _;
      for (; d && d !== h; ) ((_ = g(d)), i(d), (d = _));
      i(h);
    },
    j = (d, h, _, A, E, y, k, N, O) => {
      (h.type === 'svg' ? (k = 'svg') : h.type === 'math' && (k = 'mathml'),
        d == null ? Z(h, _, A, E, y, k, N, O) : de(d, h, E, y, k, N, O));
    },
    Z = (d, h, _, A, E, y, k, N) => {
      let O, C;
      const { props: K, shapeFlag: L, transition: U, dirs: q } = d;
      if (
        ((O = d.el = l(d.type, y, K && K.is, K)),
        L & 8 ? f(O, d.children) : L & 16 && te(d.children, O, null, A, E, fs(d, y), k, N),
        q && Ot(d, null, A, 'created'),
        G(O, d, d.scopeId, k, A),
        K)
      ) {
        for (const pe in K) pe !== 'value' && !ln(pe) && r(O, pe, null, K[pe], y, A);
        ('value' in K && r(O, 'value', null, K.value, y),
          (C = K.onVnodeBeforeMount) && nt(C, A, d));
      }
      q && Ot(d, null, A, 'beforeMount');
      const ee = Oa(E, U);
      (ee && U.beforeEnter(O),
        s(O, h, _),
        ((C = K && K.onVnodeMounted) || ee || q) &&
          Ve(() => {
            (C && nt(C, A, d), ee && U.enter(O), q && Ot(d, null, A, 'mounted'));
          }, E));
    },
    G = (d, h, _, A, E) => {
      if ((_ && m(d, _), A)) for (let y = 0; y < A.length; y++) m(d, A[y]);
      if (E) {
        let y = E.subTree;
        if (h === y || (bo(y.type) && (y.ssContent === h || y.ssFallback === h))) {
          const k = E.vnode;
          G(d, k, k.scopeId, k.slotScopeIds, E.parent);
        }
      }
    },
    te = (d, h, _, A, E, y, k, N, O = 0) => {
      for (let C = O; C < d.length; C++) {
        const K = (d[C] = N ? wt(d[C]) : it(d[C]));
        w(null, K, h, _, A, E, y, k, N);
      }
    },
    de = (d, h, _, A, E, y, k) => {
      const N = (h.el = d.el);
      let { patchFlag: O, dynamicChildren: C, dirs: K } = h;
      O |= d.patchFlag & 16;
      const L = d.props || ce,
        U = h.props || ce;
      let q;
      if (
        (_ && Pt(_, !1),
        (q = U.onVnodeBeforeUpdate) && nt(q, _, h, d),
        K && Ot(h, d, _, 'beforeUpdate'),
        _ && Pt(_, !0),
        ((L.innerHTML && U.innerHTML == null) || (L.textContent && U.textContent == null)) &&
          f(N, ''),
        C
          ? Ae(d.dynamicChildren, C, N, _, A, fs(h, E), y)
          : k || re(d, h, N, null, _, A, fs(h, E), y, !1),
        O > 0)
      ) {
        if (O & 16) xe(N, L, U, _, E);
        else if (
          (O & 2 && L.class !== U.class && r(N, 'class', null, U.class, E),
          O & 4 && r(N, 'style', L.style, U.style, E),
          O & 8)
        ) {
          const ee = h.dynamicProps;
          for (let pe = 0; pe < ee.length; pe++) {
            const ae = ee[pe],
              ke = L[ae],
              $e = U[ae];
            ($e !== ke || ae === 'value') && r(N, ae, ke, $e, E, _);
          }
        }
        O & 1 && d.children !== h.children && f(N, h.children);
      } else !k && C == null && xe(N, L, U, _, E);
      ((q = U.onVnodeUpdated) || K) &&
        Ve(() => {
          (q && nt(q, _, h, d), K && Ot(h, d, _, 'updated'));
        }, A);
    },
    Ae = (d, h, _, A, E, y, k) => {
      for (let N = 0; N < h.length; N++) {
        const O = d[N],
          C = h[N],
          K = O.el && (O.type === Y || !nn(O, C) || O.shapeFlag & 198) ? p(O.el) : _;
        w(O, C, K, null, A, E, y, k, !0);
      }
    },
    xe = (d, h, _, A, E) => {
      if (h !== _) {
        if (h !== ce) for (const y in h) !ln(y) && !(y in _) && r(d, y, h[y], null, E, A);
        for (const y in _) {
          if (ln(y)) continue;
          const k = _[y],
            N = h[y];
          k !== N && y !== 'value' && r(d, y, N, k, E, A);
        }
        'value' in _ && r(d, 'value', h.value, _.value, E);
      }
    },
    V = (d, h, _, A, E, y, k, N, O) => {
      const C = (h.el = d ? d.el : o('')),
        K = (h.anchor = d ? d.anchor : o(''));
      let { patchFlag: L, dynamicChildren: U, slotScopeIds: q } = h;
      (q && (N = N ? N.concat(q) : q),
        d == null
          ? (s(C, _, A), s(K, _, A), te(h.children || [], _, K, E, y, k, N, O))
          : L > 0 && L & 64 && U && d.dynamicChildren
            ? (Ae(d.dynamicChildren, U, _, E, y, k, N),
              (h.key != null || (E && h === E.subTree)) && ho(d, h, !0))
            : re(d, h, _, K, E, y, k, N, O));
    },
    B = (d, h, _, A, E, y, k, N, O) => {
      ((h.slotScopeIds = N),
        d == null
          ? h.shapeFlag & 512
            ? E.ctx.activate(h, _, A, k, O)
            : J(h, _, A, E, y, k, O)
          : Le(d, h, O));
    },
    J = (d, h, _, A, E, y, k) => {
      const N = (d.component = qa(d, A, E));
      if ((Kr(d) && (N.ctx.renderer = H), Qa(N, !1, k), N.asyncDep)) {
        if ((E && E.registerDep(N, me, k), !d.el)) {
          const O = (N.subTree = se(vt));
          (P(null, O, h, _), (d.placeholder = O.el));
        }
      } else me(N, d, h, _, E, y, k);
    },
    Le = (d, h, _) => {
      const A = (h.component = d.component);
      if (Va(d, h, _))
        if (A.asyncDep && !A.asyncResolved) {
          ie(A, h, _);
          return;
        } else ((A.next = h), A.update());
      else ((h.el = d.el), (A.vnode = h));
    },
    me = (d, h, _, A, E, y, k) => {
      const N = () => {
        if (d.isMounted) {
          let { next: L, bu: U, u: q, parent: ee, vnode: pe } = d;
          {
            const et = mo(d);
            if (et) {
              (L && ((L.el = pe.el), ie(d, L, k)),
                et.asyncDep.then(() => {
                  d.isUnmounted || N();
                }));
              return;
            }
          }
          let ae = L,
            ke;
          (Pt(d, !1),
            L ? ((L.el = pe.el), ie(d, L, k)) : (L = pe),
            U && Pn(U),
            (ke = L.props && L.props.onVnodeBeforeUpdate) && nt(ke, ee, L, pe),
            Pt(d, !0));
          const $e = Ti(d),
            Xe = d.subTree;
          ((d.subTree = $e),
            w(Xe, $e, p(Xe.el), S(Xe), d, E, y),
            (L.el = $e.el),
            ae === null && Fa(d, $e.el),
            q && Ve(q, E),
            (ke = L.props && L.props.onVnodeUpdated) && Ve(() => nt(ke, ee, L, pe), E));
        } else {
          let L;
          const { el: U, props: q } = h,
            { bm: ee, m: pe, parent: ae, root: ke, type: $e } = d,
            Xe = Wt(h);
          (Pt(d, !1),
            ee && Pn(ee),
            !Xe && (L = q && q.onVnodeBeforeMount) && nt(L, ae, h),
            Pt(d, !0));
          {
            ke.ce && ke.ce._def.shadowRoot !== !1 && ke.ce._injectChildStyle($e);
            const et = (d.subTree = Ti(d));
            (w(null, et, _, A, d, E, y), (h.el = et.el));
          }
          if ((pe && Ve(pe, E), !Xe && (L = q && q.onVnodeMounted))) {
            const et = h;
            Ve(() => nt(L, ae, et), E);
          }
          ((h.shapeFlag & 256 || (ae && Wt(ae.vnode) && ae.vnode.shapeFlag & 256)) &&
            d.a &&
            Ve(d.a, E),
            (d.isMounted = !0),
            (h = _ = A = null));
        }
      };
      d.scope.on();
      const O = (d.effect = new Er(N));
      d.scope.off();
      const C = (d.update = O.run.bind(O)),
        K = (d.job = O.runIfDirty.bind(O));
      ((K.i = d), (K.id = d.uid), (O.scheduler = () => Zs(K)), Pt(d, !0), C());
    },
    ie = (d, h, _) => {
      h.component = d;
      const A = d.vnode.props;
      ((d.vnode = h),
        (d.next = null),
        Sa(d, h.props, A, _),
        xa(d, h.children, _),
        gt(),
        gi(d),
        _t());
    },
    re = (d, h, _, A, E, y, k, N, O = !1) => {
      const C = d && d.children,
        K = d ? d.shapeFlag : 0,
        L = h.children,
        { patchFlag: U, shapeFlag: q } = h;
      if (U > 0) {
        if (U & 128) {
          yt(C, L, _, A, E, y, k, N, O);
          return;
        } else if (U & 256) {
          at(C, L, _, A, E, y, k, N, O);
          return;
        }
      }
      q & 8
        ? (K & 16 && je(C, E, y), L !== C && f(_, L))
        : K & 16
          ? q & 16
            ? yt(C, L, _, A, E, y, k, N, O)
            : je(C, E, y, !0)
          : (K & 8 && f(_, ''), q & 16 && te(L, _, A, E, y, k, N, O));
    },
    at = (d, h, _, A, E, y, k, N, O) => {
      ((d = d || jt), (h = h || jt));
      const C = d.length,
        K = h.length,
        L = Math.min(C, K);
      let U;
      for (U = 0; U < L; U++) {
        const q = (h[U] = O ? wt(h[U]) : it(h[U]));
        w(d[U], q, _, null, E, y, k, N, O);
      }
      C > K ? je(d, E, y, !0, !1, L) : te(h, _, A, E, y, k, N, O, L);
    },
    yt = (d, h, _, A, E, y, k, N, O) => {
      let C = 0;
      const K = h.length;
      let L = d.length - 1,
        U = K - 1;
      for (; C <= L && C <= U; ) {
        const q = d[C],
          ee = (h[C] = O ? wt(h[C]) : it(h[C]));
        if (nn(q, ee)) w(q, ee, _, null, E, y, k, N, O);
        else break;
        C++;
      }
      for (; C <= L && C <= U; ) {
        const q = d[L],
          ee = (h[U] = O ? wt(h[U]) : it(h[U]));
        if (nn(q, ee)) w(q, ee, _, null, E, y, k, N, O);
        else break;
        (L--, U--);
      }
      if (C > L) {
        if (C <= U) {
          const q = U + 1,
            ee = q < K ? h[q].el : A;
          for (; C <= U; ) (w(null, (h[C] = O ? wt(h[C]) : it(h[C])), _, ee, E, y, k, N, O), C++);
        }
      } else if (C > U) for (; C <= L; ) (Me(d[C], E, y, !0), C++);
      else {
        const q = C,
          ee = C,
          pe = new Map();
        for (C = ee; C <= U; C++) {
          const Be = (h[C] = O ? wt(h[C]) : it(h[C]));
          Be.key != null && pe.set(Be.key, C);
        }
        let ae,
          ke = 0;
        const $e = U - ee + 1;
        let Xe = !1,
          et = 0;
        const en = new Array($e);
        for (C = 0; C < $e; C++) en[C] = 0;
        for (C = q; C <= L; C++) {
          const Be = d[C];
          if (ke >= $e) {
            Me(Be, E, y, !0);
            continue;
          }
          let tt;
          if (Be.key != null) tt = pe.get(Be.key);
          else
            for (ae = ee; ae <= U; ae++)
              if (en[ae - ee] === 0 && nn(Be, h[ae])) {
                tt = ae;
                break;
              }
          tt === void 0
            ? Me(Be, E, y, !0)
            : ((en[tt - ee] = C + 1),
              tt >= et ? (et = tt) : (Xe = !0),
              w(Be, h[tt], _, null, E, y, k, N, O),
              ke++);
        }
        const ci = Xe ? Pa(en) : jt;
        for (ae = ci.length - 1, C = $e - 1; C >= 0; C--) {
          const Be = ee + C,
            tt = h[Be],
            ui = h[Be + 1],
            fi = Be + 1 < K ? ui.el || ui.placeholder : A;
          en[C] === 0
            ? w(null, tt, _, fi, E, y, k, N, O)
            : Xe && (ae < 0 || C !== ci[ae] ? Ye(tt, _, fi, 2) : ae--);
        }
      }
    },
    Ye = (d, h, _, A, E = null) => {
      const { el: y, type: k, transition: N, children: O, shapeFlag: C } = d;
      if (C & 6) {
        Ye(d.component.subTree, h, _, A);
        return;
      }
      if (C & 128) {
        d.suspense.move(h, _, A);
        return;
      }
      if (C & 64) {
        k.move(d, h, _, H);
        return;
      }
      if (k === Y) {
        s(y, h, _);
        for (let L = 0; L < O.length; L++) Ye(O[L], h, _, A);
        s(d.anchor, h, _);
        return;
      }
      if (k === ds) {
        F(d, h, _);
        return;
      }
      if (A !== 2 && C & 1 && N)
        if (A === 0) (N.beforeEnter(y), s(y, h, _), Ve(() => N.enter(y), E));
        else {
          const { leave: L, delayLeave: U, afterLeave: q } = N,
            ee = () => {
              d.ctx.isUnmounted ? i(y) : s(y, h, _);
            },
            pe = () => {
              (y._isLeaving && y[Xl](!0),
                L(y, () => {
                  (ee(), q && q());
                }));
            };
          U ? U(y, ee, pe) : pe();
        }
      else s(y, h, _);
    },
    Me = (d, h, _, A = !1, E = !1) => {
      const {
        type: y,
        props: k,
        ref: N,
        children: O,
        dynamicChildren: C,
        shapeFlag: K,
        patchFlag: L,
        dirs: U,
        cacheIndex: q,
      } = d;
      if (
        (L === -2 && (E = !1),
        N != null && (gt(), un(N, null, _, d, !0), _t()),
        q != null && (h.renderCache[q] = void 0),
        K & 256)
      ) {
        h.ctx.deactivate(d);
        return;
      }
      const ee = K & 1 && U,
        pe = !Wt(d);
      let ae;
      if ((pe && (ae = k && k.onVnodeBeforeUnmount) && nt(ae, h, d), K & 6)) Rt(d.component, _, A);
      else {
        if (K & 128) {
          d.suspense.unmount(_, A);
          return;
        }
        (ee && Ot(d, null, h, 'beforeUnmount'),
          K & 64
            ? d.type.remove(d, h, _, H, A)
            : C && !C.hasOnce && (y !== Y || (L > 0 && L & 64))
              ? je(C, h, _, !1, !0)
              : ((y === Y && L & 384) || (!E && K & 16)) && je(O, h, _),
          A && Lt(d));
      }
      ((pe && (ae = k && k.onVnodeUnmounted)) || ee) &&
        Ve(() => {
          (ae && nt(ae, h, d), ee && Ot(d, null, h, 'unmounted'));
        }, _);
    },
    Lt = (d) => {
      const { type: h, el: _, anchor: A, transition: E } = d;
      if (h === Y) {
        Bt(_, A);
        return;
      }
      if (h === ds) {
        D(d);
        return;
      }
      const y = () => {
        (i(_), E && !E.persisted && E.afterLeave && E.afterLeave());
      };
      if (d.shapeFlag & 1 && E && !E.persisted) {
        const { leave: k, delayLeave: N } = E,
          O = () => k(_, y);
        N ? N(d.el, y, O) : O();
      } else y();
    },
    Bt = (d, h) => {
      let _;
      for (; d !== h; ) ((_ = g(d)), i(d), (d = _));
      i(h);
    },
    Rt = (d, h, _) => {
      const { bum: A, scope: E, job: y, subTree: k, um: N, m: O, a: C } = d;
      (Ei(O),
        Ei(C),
        A && Pn(A),
        E.stop(),
        y && ((y.flags |= 8), Me(k, d, h, _)),
        N && Ve(N, h),
        Ve(() => {
          d.isUnmounted = !0;
        }, h));
    },
    je = (d, h, _, A = !1, E = !1, y = 0) => {
      for (let k = y; k < d.length; k++) Me(d[k], h, _, A, E);
    },
    S = (d) => {
      if (d.shapeFlag & 6) return S(d.component.subTree);
      if (d.shapeFlag & 128) return d.suspense.next();
      const h = g(d.anchor || d.el),
        _ = h && h[Zl];
      return _ ? g(_) : h;
    };
  let z = !1;
  const $ = (d, h, _) => {
      (d == null
        ? h._vnode && Me(h._vnode, null, null, !0)
        : w(h._vnode || null, d, h, null, null, null, _),
        (h._vnode = d),
        z || ((z = !0), gi(), Hr(), (z = !1)));
    },
    H = { p: w, um: Me, m: Ye, r: Lt, mt: J, mc: te, pc: re, pbc: Ae, n: S, o: e };
  return { render: $, hydrate: void 0, createApp: ya($) };
}
function fs({ type: e, props: t }, n) {
  return (n === 'svg' && e === 'foreignObject') ||
    (n === 'mathml' && e === 'annotation-xml' && t && t.encoding && t.encoding.includes('html'))
    ? void 0
    : n;
}
function Pt({ effect: e, job: t }, n) {
  n ? ((e.flags |= 32), (t.flags |= 4)) : ((e.flags &= -33), (t.flags &= -5));
}
function Oa(e, t) {
  return (!e || (e && !e.pendingBranch)) && t && !t.persisted;
}
function ho(e, t, n = !1) {
  const s = e.children,
    i = t.children;
  if (W(s) && W(i))
    for (let r = 0; r < s.length; r++) {
      const l = s[r];
      let o = i[r];
      (o.shapeFlag & 1 &&
        !o.dynamicChildren &&
        ((o.patchFlag <= 0 || o.patchFlag === 32) && ((o = i[r] = wt(i[r])), (o.el = l.el)),
        !n && o.patchFlag !== -2 && ho(l, o)),
        o.type === ts && o.patchFlag !== -1 && (o.el = l.el),
        o.type === vt && !o.el && (o.el = l.el));
    }
}
function Pa(e) {
  const t = e.slice(),
    n = [0];
  let s, i, r, l, o;
  const a = e.length;
  for (s = 0; s < a; s++) {
    const u = e[s];
    if (u !== 0) {
      if (((i = n[n.length - 1]), e[i] < u)) {
        ((t[s] = i), n.push(s));
        continue;
      }
      for (r = 0, l = n.length - 1; r < l; )
        ((o = (r + l) >> 1), e[n[o]] < u ? (r = o + 1) : (l = o));
      u < e[n[r]] && (r > 0 && (t[s] = n[r - 1]), (n[r] = s));
    }
  }
  for (r = n.length, l = n[r - 1]; r-- > 0; ) ((n[r] = l), (l = t[l]));
  return n;
}
function mo(e) {
  const t = e.subTree.component;
  if (t) return t.asyncDep && !t.asyncResolved ? t : mo(t);
}
function Ei(e) {
  if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
const Ia = Symbol.for('v-scx'),
  Na = () => Qe(Ia);
function In(e, t, n) {
  return go(e, t, n);
}
function go(e, t, n = ce) {
  const { immediate: s, deep: i, flush: r, once: l } = n,
    o = Pe({}, n),
    a = (t && s) || (!t && r !== 'post');
  let u;
  if (yn) {
    if (r === 'sync') {
      const m = Na();
      u = m.__watcherHandles || (m.__watcherHandles = []);
    } else if (!a) {
      const m = () => {};
      return ((m.stop = ot), (m.resume = ot), (m.pause = ot), m);
    }
  }
  const f = Oe;
  o.call = (m, v, w) => lt(m, f, v, w);
  let p = !1;
  (r === 'post'
    ? (o.scheduler = (m) => {
        Ve(m, f && f.suspense);
      })
    : r !== 'sync' &&
      ((p = !0),
      (o.scheduler = (m, v) => {
        v ? m() : Zs(m);
      })),
    (o.augmentJob = (m) => {
      (t && (m.flags |= 4), p && ((m.flags |= 2), f && ((m.id = f.uid), (m.i = f))));
    }));
  const g = Kl(e, t, o);
  return (yn && (u ? u.push(g) : a && g()), g);
}
function Da(e, t, n) {
  const s = this.proxy,
    i = ye(e) ? (e.includes('.') ? _o(s, e) : () => s[e]) : e.bind(s, s);
  let r;
  Q(t) ? (r = t) : ((r = t.handler), (n = t));
  const l = xn(this),
    o = go(i, r.bind(s), n);
  return (l(), o);
}
function _o(e, t) {
  const n = t.split('.');
  return () => {
    let s = e;
    for (let i = 0; i < n.length && s; i++) s = s[n[i]];
    return s;
  };
}
const Ma = (e, t) =>
  t === 'modelValue' || t === 'model-value'
    ? e.modelModifiers
    : e[`${t}Modifiers`] || e[`${We(t)}Modifiers`] || e[`${kt(t)}Modifiers`];
function ka(e, t, ...n) {
  if (e.isUnmounted) return;
  const s = e.vnode.props || ce;
  let i = n;
  const r = t.startsWith('update:'),
    l = r && Ma(s, t.slice(7));
  l && (l.trim && (i = n.map((f) => (ye(f) ? f.trim() : f))), l.number && (i = n.map(Mn)));
  let o,
    a = s[(o = rs(t))] || s[(o = rs(We(t)))];
  (!a && r && (a = s[(o = rs(kt(t)))]), a && lt(a, e, 6, i));
  const u = s[o + 'Once'];
  if (u) {
    if (!e.emitted) e.emitted = {};
    else if (e.emitted[o]) return;
    ((e.emitted[o] = !0), lt(u, e, 6, i));
  }
}
const $a = new WeakMap();
function vo(e, t, n = !1) {
  const s = n ? $a : t.emitsCache,
    i = s.get(e);
  if (i !== void 0) return i;
  const r = e.emits;
  let l = {},
    o = !1;
  if (!Q(e)) {
    const a = (u) => {
      const f = vo(u, t, !0);
      f && ((o = !0), Pe(l, f));
    };
    (!n && t.mixins.length && t.mixins.forEach(a),
      e.extends && a(e.extends),
      e.mixins && e.mixins.forEach(a));
  }
  return !r && !o
    ? (fe(e) && s.set(e, null), null)
    : (W(r) ? r.forEach((a) => (l[a] = null)) : Pe(l, r), fe(e) && s.set(e, l), l);
}
function es(e, t) {
  return !e || !Kn(t)
    ? !1
    : ((t = t.slice(2).replace(/Once$/, '')),
      le(e, t[0].toLowerCase() + t.slice(1)) || le(e, kt(t)) || le(e, t));
}
function Ti(e) {
  const {
      type: t,
      vnode: n,
      proxy: s,
      withProxy: i,
      propsOptions: [r],
      slots: l,
      attrs: o,
      emit: a,
      render: u,
      renderCache: f,
      props: p,
      data: g,
      setupState: m,
      ctx: v,
      inheritAttrs: w,
    } = e,
    I = Fn(e);
  let P, M;
  try {
    if (n.shapeFlag & 4) {
      const D = i || s,
        j = D;
      ((P = it(u.call(j, D, f, p, m, g, v))), (M = o));
    } else {
      const D = t;
      ((P = it(D.length > 1 ? D(p, { attrs: o, slots: l, emit: a }) : D(p, null))),
        (M = t.props ? o : La(o)));
    }
  } catch (D) {
    ((pn.length = 0), Yn(D, e, 1), (P = se(vt)));
  }
  let F = P;
  if (M && w !== !1) {
    const D = Object.keys(M),
      { shapeFlag: j } = F;
    D.length && j & 7 && (r && D.some(Vs) && (M = Ba(M, r)), (F = Qt(F, M, !1, !0)));
  }
  return (
    n.dirs && ((F = Qt(F, null, !1, !0)), (F.dirs = F.dirs ? F.dirs.concat(n.dirs) : n.dirs)),
    n.transition && Ys(F, n.transition),
    (P = F),
    Fn(I),
    P
  );
}
const La = (e) => {
    let t;
    for (const n in e) (n === 'class' || n === 'style' || Kn(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  },
  Ba = (e, t) => {
    const n = {};
    for (const s in e) (!Vs(s) || !(s.slice(9) in t)) && (n[s] = e[s]);
    return n;
  };
function Va(e, t, n) {
  const { props: s, children: i, component: r } = e,
    { props: l, children: o, patchFlag: a } = t,
    u = r.emitsOptions;
  if (t.dirs || t.transition) return !0;
  if (n && a >= 0) {
    if (a & 1024) return !0;
    if (a & 16) return s ? xi(s, l, u) : !!l;
    if (a & 8) {
      const f = t.dynamicProps;
      for (let p = 0; p < f.length; p++) {
        const g = f[p];
        if (l[g] !== s[g] && !es(u, g)) return !0;
      }
    }
  } else
    return (i || o) && (!o || !o.$stable) ? !0 : s === l ? !1 : s ? (l ? xi(s, l, u) : !0) : !!l;
  return !1;
}
function xi(e, t, n) {
  const s = Object.keys(t);
  if (s.length !== Object.keys(e).length) return !0;
  for (let i = 0; i < s.length; i++) {
    const r = s[i];
    if (t[r] !== e[r] && !es(n, r)) return !0;
  }
  return !1;
}
function Fa({ vnode: e, parent: t }, n) {
  for (; t; ) {
    const s = t.subTree;
    if ((s.suspense && s.suspense.activeBranch === e && (s.el = e.el), s === e))
      (((e = t.vnode).el = n), (t = t.parent));
    else break;
  }
}
const bo = (e) => e.__isSuspense;
function za(e, t) {
  t && t.pendingBranch ? (W(e) ? t.effects.push(...e) : t.effects.push(e)) : Jl(e);
}
const Y = Symbol.for('v-fgt'),
  ts = Symbol.for('v-txt'),
  vt = Symbol.for('v-cmt'),
  ds = Symbol.for('v-stc'),
  pn = [];
let Fe = null;
function T(e = !1) {
  pn.push((Fe = e ? null : []));
}
function ja() {
  (pn.pop(), (Fe = pn[pn.length - 1] || null));
}
let vn = 1;
function Hn(e, t = !1) {
  ((vn += e), e < 0 && Fe && t && (Fe.hasOnce = !0));
}
function yo(e) {
  return ((e.dynamicChildren = vn > 0 ? Fe || jt : null), ja(), vn > 0 && Fe && Fe.push(e), e);
}
function R(e, t, n, s, i, r) {
  return yo(c(e, t, n, s, i, r, !0));
}
function rt(e, t, n, s, i) {
  return yo(se(e, t, n, s, i, !0));
}
function bn(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function nn(e, t) {
  return e.type === t.type && e.key === t.key;
}
const Ao = ({ key: e }) => e ?? null,
  Nn = ({ ref: e, ref_key: t, ref_for: n }) => (
    typeof e == 'number' && (e = '' + e),
    e != null ? (ye(e) || Te(e) || Q(e) ? { i: Ee, r: e, k: t, f: !!n } : e) : null
  );
function c(e, t = null, n = null, s = 0, i = null, r = e === Y ? 0 : 1, l = !1, o = !1) {
  const a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && Ao(t),
    ref: t && Nn(t),
    scopeId: Gr,
    slotScopeIds: null,
    children: n,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetStart: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag: r,
    patchFlag: s,
    dynamicProps: i,
    dynamicChildren: null,
    appContext: null,
    ctx: Ee,
  };
  return (
    o ? (ni(a, n), r & 128 && e.normalize(a)) : n && (a.shapeFlag |= ye(n) ? 8 : 16),
    vn > 0 && !l && Fe && (a.patchFlag > 0 || r & 6) && a.patchFlag !== 32 && Fe.push(a),
    a
  );
}
const se = Ha;
function Ha(e, t = null, n = null, s = 0, i = null, r = !1) {
  if (((!e || e === Yr) && (e = vt), bn(e))) {
    const o = Qt(e, t, !0);
    return (
      n && ni(o, n),
      vn > 0 && !r && Fe && (o.shapeFlag & 6 ? (Fe[Fe.indexOf(e)] = o) : Fe.push(o)),
      (o.patchFlag = -2),
      o
    );
  }
  if ((Xa(e) && (e = e.__vccOpts), t)) {
    t = Ua(t);
    let { class: o, style: a } = t;
    (o && !ye(o) && (t.class = mt(o)),
      fe(a) && (Qs(a) && !W(a) && (a = Pe({}, a)), (t.style = qt(a))));
  }
  const l = ye(e) ? 1 : bo(e) ? 128 : Yl(e) ? 64 : fe(e) ? 4 : Q(e) ? 2 : 0;
  return c(e, t, n, s, i, l, r, !0);
}
function Ua(e) {
  return e ? (Qs(e) || lo(e) ? Pe({}, e) : e) : null;
}
function Qt(e, t, n = !1, s = !1) {
  const { props: i, ref: r, patchFlag: l, children: o, transition: a } = e,
    u = t ? Ga(i || {}, t) : i,
    f = {
      __v_isVNode: !0,
      __v_skip: !0,
      type: e.type,
      props: u,
      key: u && Ao(u),
      ref: t && t.ref ? (n && r ? (W(r) ? r.concat(Nn(t)) : [r, Nn(t)]) : Nn(t)) : r,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: o,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Y ? (l === -1 ? 16 : l | 16) : l,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: a,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && Qt(e.ssContent),
      ssFallback: e.ssFallback && Qt(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce,
    };
  return (a && s && Ys(f, a.clone(f)), f);
}
function So(e = ' ', t = 0) {
  return se(ts, null, e, t);
}
function ue(e = '', t = !1) {
  return t ? (T(), rt(vt, null, e)) : se(vt, null, e);
}
function it(e) {
  return e == null || typeof e == 'boolean'
    ? se(vt)
    : W(e)
      ? se(Y, null, e.slice())
      : bn(e)
        ? wt(e)
        : se(ts, null, String(e));
}
function wt(e) {
  return (e.el === null && e.patchFlag !== -1) || e.memo ? e : Qt(e);
}
function ni(e, t) {
  let n = 0;
  const { shapeFlag: s } = e;
  if (t == null) t = null;
  else if (W(t)) n = 16;
  else if (typeof t == 'object')
    if (s & 65) {
      const i = t.default;
      i && (i._c && (i._d = !1), ni(e, i()), i._c && (i._d = !0));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !lo(t)
        ? (t._ctx = Ee)
        : i === 3 && Ee && (Ee.slots._ === 1 ? (t._ = 1) : ((t._ = 2), (e.patchFlag |= 1024)));
    }
  else
    Q(t)
      ? ((t = { default: t, _ctx: Ee }), (n = 32))
      : ((t = String(t)), s & 64 ? ((n = 16), (t = [So(t)])) : (n = 8));
  ((e.children = t), (e.shapeFlag |= n));
}
function Ga(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const s = e[n];
    for (const i in s)
      if (i === 'class') t.class !== s.class && (t.class = mt([t.class, s.class]));
      else if (i === 'style') t.style = qt([t.style, s.style]);
      else if (Kn(i)) {
        const r = t[i],
          l = s[i];
        l && r !== l && !(W(r) && r.includes(l)) && (t[i] = r ? [].concat(r, l) : l);
      } else i !== '' && (t[i] = s[i]);
  }
  return t;
}
function nt(e, t, n, s = null) {
  lt(e, t, 7, [n, s]);
}
const Wa = io();
let Ka = 0;
function qa(e, t, n) {
  const s = e.type,
    i = (t ? t.appContext : e.appContext) || Wa,
    r = {
      uid: Ka++,
      vnode: e,
      type: s,
      parent: t,
      appContext: i,
      root: null,
      next: null,
      subTree: null,
      effect: null,
      update: null,
      job: null,
      scope: new wr(!0),
      render: null,
      proxy: null,
      exposed: null,
      exposeProxy: null,
      withProxy: null,
      provides: t ? t.provides : Object.create(i.provides),
      ids: t ? t.ids : ['', 0, 0],
      accessCache: null,
      renderCache: [],
      components: null,
      directives: null,
      propsOptions: co(s, i),
      emitsOptions: vo(s, i),
      emit: null,
      emitted: null,
      propsDefaults: ce,
      inheritAttrs: s.inheritAttrs,
      ctx: ce,
      data: ce,
      props: ce,
      attrs: ce,
      slots: ce,
      refs: ce,
      setupState: ce,
      setupContext: null,
      suspense: n,
      suspenseId: n ? n.pendingId : 0,
      asyncDep: null,
      asyncResolved: !1,
      isMounted: !1,
      isUnmounted: !1,
      isDeactivated: !1,
      bc: null,
      c: null,
      bm: null,
      m: null,
      bu: null,
      u: null,
      um: null,
      bum: null,
      da: null,
      a: null,
      rtg: null,
      rtc: null,
      ec: null,
      sp: null,
    };
  return (
    (r.ctx = { _: r }),
    (r.root = t ? t.root : r),
    (r.emit = ka.bind(null, r)),
    e.ce && e.ce(r),
    r
  );
}
let Oe = null;
const si = () => Oe || Ee;
let Un, Os;
{
  const e = Jn(),
    t = (n, s) => {
      let i;
      return (
        (i = e[n]) || (i = e[n] = []),
        i.push(s),
        (r) => {
          i.length > 1 ? i.forEach((l) => l(r)) : i[0](r);
        }
      );
    };
  ((Un = t('__VUE_INSTANCE_SETTERS__', (n) => (Oe = n))),
    (Os = t('__VUE_SSR_SETTERS__', (n) => (yn = n))));
}
const xn = (e) => {
    const t = Oe;
    return (
      Un(e),
      e.scope.on(),
      () => {
        (e.scope.off(), Un(t));
      }
    );
  },
  Ci = () => {
    (Oe && Oe.scope.off(), Un(null));
  };
function wo(e) {
  return e.vnode.shapeFlag & 4;
}
let yn = !1;
function Qa(e, t = !1, n = !1) {
  t && Os(t);
  const { props: s, children: i } = e.vnode,
    r = wo(e);
  (Aa(e, s, r, t), Ta(e, i, n || t));
  const l = r ? Ja(e, t) : void 0;
  return (t && Os(!1), l);
}
function Ja(e, t) {
  const n = e.type;
  ((e.accessCache = Object.create(null)), (e.proxy = new Proxy(e.ctx, da)));
  const { setup: s } = n;
  if (s) {
    gt();
    const i = (e.setupContext = s.length > 1 ? To(e) : null),
      r = xn(e),
      l = Tn(s, e, 0, [e.props, i]),
      o = gr(l);
    if ((_t(), r(), (o || e.sp) && !Wt(e) && Wr(e), o)) {
      if ((l.then(Ci, Ci), t))
        return l
          .then((a) => {
            Ri(e, a);
          })
          .catch((a) => {
            Yn(a, e, 0);
          });
      e.asyncDep = l;
    } else Ri(e, l);
  } else Eo(e);
}
function Ri(e, t, n) {
  (Q(t)
    ? e.type.__ssrInlineRender
      ? (e.ssrRender = t)
      : (e.render = t)
    : fe(t) && (e.setupState = Fr(t)),
    Eo(e));
}
function Eo(e, t, n) {
  const s = e.type;
  e.render || (e.render = s.render || ot);
  {
    const i = xn(e);
    gt();
    try {
      ha(e);
    } finally {
      (_t(), i());
    }
  }
}
const Za = {
  get(e, t) {
    return (Re(e, 'get', ''), e[t]);
  },
};
function To(e) {
  const t = (n) => {
    e.exposed = n || {};
  };
  return { attrs: new Proxy(e.attrs, Za), slots: e.slots, emit: e.emit, expose: t };
}
function ns(e) {
  return e.exposed
    ? e.exposeProxy ||
        (e.exposeProxy = new Proxy(Fr(Ll(e.exposed)), {
          get(t, n) {
            if (n in t) return t[n];
            if (n in fn) return fn[n](e);
          },
          has(t, n) {
            return n in t || n in fn;
          },
        }))
    : e.proxy;
}
function Ya(e, t = !0) {
  return Q(e) ? e.displayName || e.name : e.name || (t && e.__name);
}
function Xa(e) {
  return Q(e) && '__vccOpts' in e;
}
const x = (e, t) => Gl(e, t, yn);
function xo(e, t, n) {
  try {
    Hn(-1);
    const s = arguments.length;
    return s === 2
      ? fe(t) && !W(t)
        ? bn(t)
          ? se(e, null, [t])
          : se(e, t)
        : se(e, null, t)
      : (s > 3 ? (n = Array.prototype.slice.call(arguments, 2)) : s === 3 && bn(n) && (n = [n]),
        se(e, t, n));
  } finally {
    Hn(1);
  }
}
const ec = '3.5.22';
/**
 * @vue/runtime-dom v3.5.22
 * (c) 2018-present Yuxi (Evan) You and Vue contributors
 * @license MIT
 **/ let Ps;
const Oi = typeof window < 'u' && window.trustedTypes;
if (Oi)
  try {
    Ps = Oi.createPolicy('vue', { createHTML: (e) => e });
  } catch {}
const Co = Ps ? (e) => Ps.createHTML(e) : (e) => e,
  tc = 'http://www.w3.org/2000/svg',
  nc = 'http://www.w3.org/1998/Math/MathML',
  ft = typeof document < 'u' ? document : null,
  Pi = ft && ft.createElement('template'),
  sc = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, s) => {
      const i =
        t === 'svg'
          ? ft.createElementNS(tc, e)
          : t === 'mathml'
            ? ft.createElementNS(nc, e)
            : n
              ? ft.createElement(e, { is: n })
              : ft.createElement(e);
      return (
        e === 'select' && s && s.multiple != null && i.setAttribute('multiple', s.multiple),
        i
      );
    },
    createText: (e) => ft.createTextNode(e),
    createComment: (e) => ft.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => ft.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, '');
    },
    insertStaticContent(e, t, n, s, i, r) {
      const l = n ? n.previousSibling : t.lastChild;
      if (i && (i === r || i.nextSibling))
        for (; t.insertBefore(i.cloneNode(!0), n), !(i === r || !(i = i.nextSibling)); );
      else {
        Pi.innerHTML = Co(
          s === 'svg' ? `<svg>${e}</svg>` : s === 'mathml' ? `<math>${e}</math>` : e,
        );
        const o = Pi.content;
        if (s === 'svg' || s === 'mathml') {
          const a = o.firstChild;
          for (; a.firstChild; ) o.appendChild(a.firstChild);
          o.removeChild(a);
        }
        t.insertBefore(o, n);
      }
      return [l ? l.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild];
    },
  },
  ic = Symbol('_vtc');
function rc(e, t, n) {
  const s = e[ic];
  (s && (t = (t ? [t, ...s] : [...s]).join(' ')),
    t == null ? e.removeAttribute('class') : n ? e.setAttribute('class', t) : (e.className = t));
}
const Gn = Symbol('_vod'),
  Ro = Symbol('_vsh'),
  dh = {
    name: 'show',
    beforeMount(e, { value: t }, { transition: n }) {
      ((e[Gn] = e.style.display === 'none' ? '' : e.style.display),
        n && t ? n.beforeEnter(e) : sn(e, t));
    },
    mounted(e, { value: t }, { transition: n }) {
      n && t && n.enter(e);
    },
    updated(e, { value: t, oldValue: n }, { transition: s }) {
      !t != !n &&
        (s
          ? t
            ? (s.beforeEnter(e), sn(e, !0), s.enter(e))
            : s.leave(e, () => {
                sn(e, !1);
              })
          : sn(e, t));
    },
    beforeUnmount(e, { value: t }) {
      sn(e, t);
    },
  };
function sn(e, t) {
  ((e.style.display = t ? e[Gn] : 'none'), (e[Ro] = !t));
}
const oc = Symbol(''),
  lc = /(?:^|;)\s*display\s*:/;
function ac(e, t, n) {
  const s = e.style,
    i = ye(n);
  let r = !1;
  if (n && !i) {
    if (t)
      if (ye(t))
        for (const l of t.split(';')) {
          const o = l.slice(0, l.indexOf(':')).trim();
          n[o] == null && Dn(s, o, '');
        }
      else for (const l in t) n[l] == null && Dn(s, l, '');
    for (const l in n) (l === 'display' && (r = !0), Dn(s, l, n[l]));
  } else if (i) {
    if (t !== n) {
      const l = s[oc];
      (l && (n += ';' + l), (s.cssText = n), (r = lc.test(n)));
    }
  } else t && e.removeAttribute('style');
  Gn in e && ((e[Gn] = r ? s.display : ''), e[Ro] && (s.display = 'none'));
}
const Ii = /\s*!important$/;
function Dn(e, t, n) {
  if (W(n)) n.forEach((s) => Dn(e, t, s));
  else if ((n == null && (n = ''), t.startsWith('--'))) e.setProperty(t, n);
  else {
    const s = cc(e, t);
    Ii.test(n) ? e.setProperty(kt(s), n.replace(Ii, ''), 'important') : (e[s] = n);
  }
}
const Ni = ['Webkit', 'Moz', 'ms'],
  ps = {};
function cc(e, t) {
  const n = ps[t];
  if (n) return n;
  let s = We(t);
  if (s !== 'filter' && s in e) return (ps[t] = s);
  s = Qn(s);
  for (let i = 0; i < Ni.length; i++) {
    const r = Ni[i] + s;
    if (r in e) return (ps[t] = r);
  }
  return t;
}
const Di = 'http://www.w3.org/1999/xlink';
function Mi(e, t, n, s, i, r = ml(t)) {
  s && t.startsWith('xlink:')
    ? n == null
      ? e.removeAttributeNS(Di, t.slice(6, t.length))
      : e.setAttributeNS(Di, t, n)
    : n == null || (r && !yr(n))
      ? e.removeAttribute(t)
      : e.setAttribute(t, r ? '' : Je(n) ? String(n) : n);
}
function ki(e, t, n, s, i) {
  if (t === 'innerHTML' || t === 'textContent') {
    n != null && (e[t] = t === 'innerHTML' ? Co(n) : n);
    return;
  }
  const r = e.tagName;
  if (t === 'value' && r !== 'PROGRESS' && !r.includes('-')) {
    const o = r === 'OPTION' ? e.getAttribute('value') || '' : e.value,
      a = n == null ? (e.type === 'checkbox' ? 'on' : '') : String(n);
    ((o !== a || !('_value' in e)) && (e.value = a),
      n == null && e.removeAttribute(t),
      (e._value = n));
    return;
  }
  let l = !1;
  if (n === '' || n == null) {
    const o = typeof e[t];
    o === 'boolean'
      ? (n = yr(n))
      : n == null && o === 'string'
        ? ((n = ''), (l = !0))
        : o === 'number' && ((n = 0), (l = !0));
  }
  try {
    e[t] = n;
  } catch {}
  l && e.removeAttribute(i || t);
}
function Tt(e, t, n, s) {
  e.addEventListener(t, n, s);
}
function uc(e, t, n, s) {
  e.removeEventListener(t, n, s);
}
const $i = Symbol('_vei');
function fc(e, t, n, s, i = null) {
  const r = e[$i] || (e[$i] = {}),
    l = r[t];
  if (s && l) l.value = s;
  else {
    const [o, a] = dc(t);
    if (s) {
      const u = (r[t] = mc(s, i));
      Tt(e, o, u, a);
    } else l && (uc(e, o, l, a), (r[t] = void 0));
  }
}
const Li = /(?:Once|Passive|Capture)$/;
function dc(e) {
  let t;
  if (Li.test(e)) {
    t = {};
    let s;
    for (; (s = e.match(Li)); )
      ((e = e.slice(0, e.length - s[0].length)), (t[s[0].toLowerCase()] = !0));
  }
  return [e[2] === ':' ? e.slice(3) : kt(e.slice(2)), t];
}
let hs = 0;
const pc = Promise.resolve(),
  hc = () => hs || (pc.then(() => (hs = 0)), (hs = Date.now()));
function mc(e, t) {
  const n = (s) => {
    if (!s._vts) s._vts = Date.now();
    else if (s._vts <= n.attached) return;
    lt(gc(s, n.value), t, 5, [s]);
  };
  return ((n.value = e), (n.attached = hc()), n);
}
function gc(e, t) {
  if (W(t)) {
    const n = e.stopImmediatePropagation;
    return (
      (e.stopImmediatePropagation = () => {
        (n.call(e), (e._stopped = !0));
      }),
      t.map((s) => (i) => !i._stopped && s && s(i))
    );
  } else return t;
}
const Bi = (e) =>
    e.charCodeAt(0) === 111 &&
    e.charCodeAt(1) === 110 &&
    e.charCodeAt(2) > 96 &&
    e.charCodeAt(2) < 123,
  _c = (e, t, n, s, i, r) => {
    const l = i === 'svg';
    t === 'class'
      ? rc(e, s, l)
      : t === 'style'
        ? ac(e, n, s)
        : Kn(t)
          ? Vs(t) || fc(e, t, n, s, r)
          : (
                t[0] === '.'
                  ? ((t = t.slice(1)), !0)
                  : t[0] === '^'
                    ? ((t = t.slice(1)), !1)
                    : vc(e, t, s, l)
              )
            ? (ki(e, t, s),
              !e.tagName.includes('-') &&
                (t === 'value' || t === 'checked' || t === 'selected') &&
                Mi(e, t, s, l, r, t !== 'value'))
            : e._isVueCE && (/[A-Z]/.test(t) || !ye(s))
              ? ki(e, We(t), s, r, t)
              : (t === 'true-value'
                  ? (e._trueValue = s)
                  : t === 'false-value' && (e._falseValue = s),
                Mi(e, t, s, l));
  };
function vc(e, t, n, s) {
  if (s) return !!(t === 'innerHTML' || t === 'textContent' || (t in e && Bi(t) && Q(n)));
  if (
    t === 'spellcheck' ||
    t === 'draggable' ||
    t === 'translate' ||
    t === 'autocorrect' ||
    t === 'form' ||
    (t === 'list' && e.tagName === 'INPUT') ||
    (t === 'type' && e.tagName === 'TEXTAREA')
  )
    return !1;
  if (t === 'width' || t === 'height') {
    const i = e.tagName;
    if (i === 'IMG' || i === 'VIDEO' || i === 'CANVAS' || i === 'SOURCE') return !1;
  }
  return Bi(t) && ye(n) ? !1 : t in e;
}
const Jt = (e) => {
  const t = e.props['onUpdate:modelValue'] || !1;
  return W(t) ? (n) => Pn(t, n) : t;
};
function bc(e) {
  e.target.composing = !0;
}
function Vi(e) {
  const t = e.target;
  t.composing && ((t.composing = !1), t.dispatchEvent(new Event('input')));
}
const ht = Symbol('_assign'),
  ph = {
    created(e, { modifiers: { lazy: t, trim: n, number: s } }, i) {
      e[ht] = Jt(i);
      const r = s || (i.props && i.props.type === 'number');
      (Tt(e, t ? 'change' : 'input', (l) => {
        if (l.target.composing) return;
        let o = e.value;
        (n && (o = o.trim()), r && (o = Mn(o)), e[ht](o));
      }),
        n &&
          Tt(e, 'change', () => {
            e.value = e.value.trim();
          }),
        t || (Tt(e, 'compositionstart', bc), Tt(e, 'compositionend', Vi), Tt(e, 'change', Vi)));
    },
    mounted(e, { value: t }) {
      e.value = t ?? '';
    },
    beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: s, trim: i, number: r } }, l) {
      if (((e[ht] = Jt(l)), e.composing)) return;
      const o = (r || e.type === 'number') && !/^0\d/.test(e.value) ? Mn(e.value) : e.value,
        a = t ?? '';
      o !== a &&
        ((document.activeElement === e &&
          e.type !== 'range' &&
          ((s && t === n) || (i && e.value.trim() === a))) ||
          (e.value = a));
    },
  },
  hh = {
    deep: !0,
    created(e, t, n) {
      ((e[ht] = Jt(n)),
        Tt(e, 'change', () => {
          const s = e._modelValue,
            i = An(e),
            r = e.checked,
            l = e[ht];
          if (W(s)) {
            const o = js(s, i),
              a = o !== -1;
            if (r && !a) l(s.concat(i));
            else if (!r && a) {
              const u = [...s];
              (u.splice(o, 1), l(u));
            }
          } else if (Xt(s)) {
            const o = new Set(s);
            (r ? o.add(i) : o.delete(i), l(o));
          } else l(Oo(e, r));
        }));
    },
    mounted: Fi,
    beforeUpdate(e, t, n) {
      ((e[ht] = Jt(n)), Fi(e, t, n));
    },
  };
function Fi(e, { value: t, oldValue: n }, s) {
  e._modelValue = t;
  let i;
  if (W(t)) i = js(t, s.props.value) > -1;
  else if (Xt(t)) i = t.has(s.props.value);
  else {
    if (t === n) return;
    i = En(t, Oo(e, !0));
  }
  e.checked !== i && (e.checked = i);
}
const mh = {
  deep: !0,
  created(e, { value: t, modifiers: { number: n } }, s) {
    const i = Xt(t);
    (Tt(e, 'change', () => {
      const r = Array.prototype.filter
        .call(e.options, (l) => l.selected)
        .map((l) => (n ? Mn(An(l)) : An(l)));
      (e[ht](e.multiple ? (i ? new Set(r) : r) : r[0]),
        (e._assigning = !0),
        Js(() => {
          e._assigning = !1;
        }));
    }),
      (e[ht] = Jt(s)));
  },
  mounted(e, { value: t }) {
    zi(e, t);
  },
  beforeUpdate(e, t, n) {
    e[ht] = Jt(n);
  },
  updated(e, { value: t }) {
    e._assigning || zi(e, t);
  },
};
function zi(e, t) {
  const n = e.multiple,
    s = W(t);
  if (!(n && !s && !Xt(t))) {
    for (let i = 0, r = e.options.length; i < r; i++) {
      const l = e.options[i],
        o = An(l);
      if (n)
        if (s) {
          const a = typeof o;
          a === 'string' || a === 'number'
            ? (l.selected = t.some((u) => String(u) === String(o)))
            : (l.selected = js(t, o) > -1);
        } else l.selected = t.has(o);
      else if (En(An(l), t)) {
        e.selectedIndex !== i && (e.selectedIndex = i);
        return;
      }
    }
    !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
  }
}
function An(e) {
  return '_value' in e ? e._value : e.value;
}
function Oo(e, t) {
  const n = t ? '_trueValue' : '_falseValue';
  return n in e ? e[n] : t;
}
const yc = ['ctrl', 'shift', 'alt', 'meta'],
  Ac = {
    stop: (e) => e.stopPropagation(),
    prevent: (e) => e.preventDefault(),
    self: (e) => e.target !== e.currentTarget,
    ctrl: (e) => !e.ctrlKey,
    shift: (e) => !e.shiftKey,
    alt: (e) => !e.altKey,
    meta: (e) => !e.metaKey,
    left: (e) => 'button' in e && e.button !== 0,
    middle: (e) => 'button' in e && e.button !== 1,
    right: (e) => 'button' in e && e.button !== 2,
    exact: (e, t) => yc.some((n) => e[`${n}Key`] && !t.includes(n)),
  },
  gh = (e, t) => {
    const n = e._withMods || (e._withMods = {}),
      s = t.join('.');
    return (
      n[s] ||
      (n[s] = (i, ...r) => {
        for (let l = 0; l < t.length; l++) {
          const o = Ac[t[l]];
          if (o && o(i, t)) return;
        }
        return e(i, ...r);
      })
    );
  },
  Sc = Pe({ patchProp: _c }, sc);
let ji;
function wc() {
  return ji || (ji = Ca(Sc));
}
const _h = (...e) => {
  const t = wc().createApp(...e),
    { mount: n } = t;
  return (
    (t.mount = (s) => {
      const i = Tc(s);
      if (!i) return;
      const r = t._component;
      (!Q(r) && !r.render && !r.template && (r.template = i.innerHTML),
        i.nodeType === 1 && (i.textContent = ''));
      const l = n(i, !1, Ec(i));
      return (
        i instanceof Element && (i.removeAttribute('v-cloak'), i.setAttribute('data-v-app', '')),
        l
      );
    }),
    t
  );
};
function Ec(e) {
  if (e instanceof SVGElement) return 'svg';
  if (typeof MathMLElement == 'function' && e instanceof MathMLElement) return 'mathml';
}
function Tc(e) {
  return ye(e) ? document.querySelector(e) : e;
}
/*!
 * vue-router v4.6.3
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */ const zt = typeof document < 'u';
function Po(e) {
  return typeof e == 'object' || 'displayName' in e || 'props' in e || '__vccOpts' in e;
}
function xc(e) {
  return e.__esModule || e[Symbol.toStringTag] === 'Module' || (e.default && Po(e.default));
}
const oe = Object.assign;
function ms(e, t) {
  const n = {};
  for (const s in t) {
    const i = t[s];
    n[s] = Ze(i) ? i.map(e) : e(i);
  }
  return n;
}
const hn = () => {},
  Ze = Array.isArray;
function Hi(e, t) {
  const n = {};
  for (const s in e) n[s] = s in t ? t[s] : e[s];
  return n;
}
const Io = /#/g,
  Cc = /&/g,
  Rc = /\//g,
  Oc = /=/g,
  Pc = /\?/g,
  No = /\+/g,
  Ic = /%5B/g,
  Nc = /%5D/g,
  Do = /%5E/g,
  Dc = /%60/g,
  Mo = /%7B/g,
  Mc = /%7C/g,
  ko = /%7D/g,
  kc = /%20/g;
function ii(e) {
  return e == null
    ? ''
    : encodeURI('' + e)
        .replace(Mc, '|')
        .replace(Ic, '[')
        .replace(Nc, ']');
}
function $c(e) {
  return ii(e).replace(Mo, '{').replace(ko, '}').replace(Do, '^');
}
function Is(e) {
  return ii(e)
    .replace(No, '%2B')
    .replace(kc, '+')
    .replace(Io, '%23')
    .replace(Cc, '%26')
    .replace(Dc, '`')
    .replace(Mo, '{')
    .replace(ko, '}')
    .replace(Do, '^');
}
function Lc(e) {
  return Is(e).replace(Oc, '%3D');
}
function Bc(e) {
  return ii(e).replace(Io, '%23').replace(Pc, '%3F');
}
function Vc(e) {
  return Bc(e).replace(Rc, '%2F');
}
function Sn(e) {
  if (e == null) return null;
  try {
    return decodeURIComponent('' + e);
  } catch {}
  return '' + e;
}
const Fc = /\/$/,
  zc = (e) => e.replace(Fc, '');
function gs(e, t, n = '/') {
  let s,
    i = {},
    r = '',
    l = '';
  const o = t.indexOf('#');
  let a = t.indexOf('?');
  return (
    (a = o >= 0 && a > o ? -1 : a),
    a >= 0 && ((s = t.slice(0, a)), (r = t.slice(a, o > 0 ? o : t.length)), (i = e(r.slice(1)))),
    o >= 0 && ((s = s || t.slice(0, o)), (l = t.slice(o, t.length))),
    (s = Gc(s ?? t, n)),
    { fullPath: s + r + l, path: s, query: i, hash: Sn(l) }
  );
}
function jc(e, t) {
  const n = t.query ? e(t.query) : '';
  return t.path + (n && '?') + n + (t.hash || '');
}
function Ui(e, t) {
  return !t || !e.toLowerCase().startsWith(t.toLowerCase()) ? e : e.slice(t.length) || '/';
}
function Hc(e, t, n) {
  const s = t.matched.length - 1,
    i = n.matched.length - 1;
  return (
    s > -1 &&
    s === i &&
    Zt(t.matched[s], n.matched[i]) &&
    $o(t.params, n.params) &&
    e(t.query) === e(n.query) &&
    t.hash === n.hash
  );
}
function Zt(e, t) {
  return (e.aliasOf || e) === (t.aliasOf || t);
}
function $o(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length) return !1;
  for (const n in e) if (!Uc(e[n], t[n])) return !1;
  return !0;
}
function Uc(e, t) {
  return Ze(e) ? Gi(e, t) : Ze(t) ? Gi(t, e) : e === t;
}
function Gi(e, t) {
  return Ze(t)
    ? e.length === t.length && e.every((n, s) => n === t[s])
    : e.length === 1 && e[0] === t;
}
function Gc(e, t) {
  if (e.startsWith('/')) return e;
  if (!e) return t;
  const n = t.split('/'),
    s = e.split('/'),
    i = s[s.length - 1];
  (i === '..' || i === '.') && s.push('');
  let r = n.length - 1,
    l,
    o;
  for (l = 0; l < s.length; l++)
    if (((o = s[l]), o !== '.'))
      if (o === '..') r > 1 && r--;
      else break;
  return n.slice(0, r).join('/') + '/' + s.slice(l).join('/');
}
const At = {
  path: '/',
  name: void 0,
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {},
  redirectedFrom: void 0,
};
let Ns = (function (e) {
    return ((e.pop = 'pop'), (e.push = 'push'), e);
  })({}),
  _s = (function (e) {
    return ((e.back = 'back'), (e.forward = 'forward'), (e.unknown = ''), e);
  })({});
function Wc(e) {
  if (!e)
    if (zt) {
      const t = document.querySelector('base');
      ((e = (t && t.getAttribute('href')) || '/'), (e = e.replace(/^\w+:\/\/[^\/]+/, '')));
    } else e = '/';
  return (e[0] !== '/' && e[0] !== '#' && (e = '/' + e), zc(e));
}
const Kc = /^[^#]+#/;
function qc(e, t) {
  return e.replace(Kc, '#') + t;
}
function Qc(e, t) {
  const n = document.documentElement.getBoundingClientRect(),
    s = e.getBoundingClientRect();
  return {
    behavior: t.behavior,
    left: s.left - n.left - (t.left || 0),
    top: s.top - n.top - (t.top || 0),
  };
}
const ss = () => ({ left: window.scrollX, top: window.scrollY });
function Jc(e) {
  let t;
  if ('el' in e) {
    const n = e.el,
      s = typeof n == 'string' && n.startsWith('#'),
      i =
        typeof n == 'string'
          ? s
            ? document.getElementById(n.slice(1))
            : document.querySelector(n)
          : n;
    if (!i) return;
    t = Qc(i, e);
  } else t = e;
  'scrollBehavior' in document.documentElement.style
    ? window.scrollTo(t)
    : window.scrollTo(
        t.left != null ? t.left : window.scrollX,
        t.top != null ? t.top : window.scrollY,
      );
}
function Wi(e, t) {
  return (history.state ? history.state.position - t : -1) + e;
}
const Ds = new Map();
function Zc(e, t) {
  Ds.set(e, t);
}
function Yc(e) {
  const t = Ds.get(e);
  return (Ds.delete(e), t);
}
function Xc(e) {
  return typeof e == 'string' || (e && typeof e == 'object');
}
function Lo(e) {
  return typeof e == 'string' || typeof e == 'symbol';
}
let be = (function (e) {
  return (
    (e[(e.MATCHER_NOT_FOUND = 1)] = 'MATCHER_NOT_FOUND'),
    (e[(e.NAVIGATION_GUARD_REDIRECT = 2)] = 'NAVIGATION_GUARD_REDIRECT'),
    (e[(e.NAVIGATION_ABORTED = 4)] = 'NAVIGATION_ABORTED'),
    (e[(e.NAVIGATION_CANCELLED = 8)] = 'NAVIGATION_CANCELLED'),
    (e[(e.NAVIGATION_DUPLICATED = 16)] = 'NAVIGATION_DUPLICATED'),
    e
  );
})({});
const Bo = Symbol('');
(be.MATCHER_NOT_FOUND + '',
  be.NAVIGATION_GUARD_REDIRECT + '',
  be.NAVIGATION_ABORTED + '',
  be.NAVIGATION_CANCELLED + '',
  be.NAVIGATION_DUPLICATED + '');
function Yt(e, t) {
  return oe(new Error(), { type: e, [Bo]: !0 }, t);
}
function ut(e, t) {
  return e instanceof Error && Bo in e && (t == null || !!(e.type & t));
}
const eu = ['params', 'query', 'hash'];
function tu(e) {
  if (typeof e == 'string') return e;
  if (e.path != null) return e.path;
  const t = {};
  for (const n of eu) n in e && (t[n] = e[n]);
  return JSON.stringify(t, null, 2);
}
function nu(e) {
  const t = {};
  if (e === '' || e === '?') return t;
  const n = (e[0] === '?' ? e.slice(1) : e).split('&');
  for (let s = 0; s < n.length; ++s) {
    const i = n[s].replace(No, ' '),
      r = i.indexOf('='),
      l = Sn(r < 0 ? i : i.slice(0, r)),
      o = r < 0 ? null : Sn(i.slice(r + 1));
    if (l in t) {
      let a = t[l];
      (Ze(a) || (a = t[l] = [a]), a.push(o));
    } else t[l] = o;
  }
  return t;
}
function Ki(e) {
  let t = '';
  for (let n in e) {
    const s = e[n];
    if (((n = Lc(n)), s == null)) {
      s !== void 0 && (t += (t.length ? '&' : '') + n);
      continue;
    }
    (Ze(s) ? s.map((i) => i && Is(i)) : [s && Is(s)]).forEach((i) => {
      i !== void 0 && ((t += (t.length ? '&' : '') + n), i != null && (t += '=' + i));
    });
  }
  return t;
}
function su(e) {
  const t = {};
  for (const n in e) {
    const s = e[n];
    s !== void 0 &&
      (t[n] = Ze(s) ? s.map((i) => (i == null ? null : '' + i)) : s == null ? s : '' + s);
  }
  return t;
}
const iu = Symbol(''),
  qi = Symbol(''),
  is = Symbol(''),
  ri = Symbol(''),
  Ms = Symbol('');
function rn() {
  let e = [];
  function t(s) {
    return (
      e.push(s),
      () => {
        const i = e.indexOf(s);
        i > -1 && e.splice(i, 1);
      }
    );
  }
  function n() {
    e = [];
  }
  return { add: t, list: () => e.slice(), reset: n };
}
function Et(e, t, n, s, i, r = (l) => l()) {
  const l = s && (s.enterCallbacks[i] = s.enterCallbacks[i] || []);
  return () =>
    new Promise((o, a) => {
      const u = (g) => {
          g === !1
            ? a(Yt(be.NAVIGATION_ABORTED, { from: n, to: t }))
            : g instanceof Error
              ? a(g)
              : Xc(g)
                ? a(Yt(be.NAVIGATION_GUARD_REDIRECT, { from: t, to: g }))
                : (l && s.enterCallbacks[i] === l && typeof g == 'function' && l.push(g), o());
        },
        f = r(() => e.call(s && s.instances[i], t, n, u));
      let p = Promise.resolve(f);
      (e.length < 3 && (p = p.then(u)), p.catch((g) => a(g)));
    });
}
function vs(e, t, n, s, i = (r) => r()) {
  const r = [];
  for (const l of e)
    for (const o in l.components) {
      let a = l.components[o];
      if (!(t !== 'beforeRouteEnter' && !l.instances[o]))
        if (Po(a)) {
          const u = (a.__vccOpts || a)[t];
          u && r.push(Et(u, n, s, l, o, i));
        } else {
          let u = a();
          r.push(() =>
            u.then((f) => {
              if (!f) throw new Error(`Couldn't resolve component "${o}" at "${l.path}"`);
              const p = xc(f) ? f.default : f;
              ((l.mods[o] = f), (l.components[o] = p));
              const g = (p.__vccOpts || p)[t];
              return g && Et(g, n, s, l, o, i)();
            }),
          );
        }
    }
  return r;
}
function ru(e, t) {
  const n = [],
    s = [],
    i = [],
    r = Math.max(t.matched.length, e.matched.length);
  for (let l = 0; l < r; l++) {
    const o = t.matched[l];
    o && (e.matched.find((u) => Zt(u, o)) ? s.push(o) : n.push(o));
    const a = e.matched[l];
    a && (t.matched.find((u) => Zt(u, a)) || i.push(a));
  }
  return [n, s, i];
}
/*!
 * vue-router v4.6.3
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */ let ou = () => location.protocol + '//' + location.host;
function Vo(e, t) {
  const { pathname: n, search: s, hash: i } = t,
    r = e.indexOf('#');
  if (r > -1) {
    let l = i.includes(e.slice(r)) ? e.slice(r).length : 1,
      o = i.slice(l);
    return (o[0] !== '/' && (o = '/' + o), Ui(o, ''));
  }
  return Ui(n, e) + s + i;
}
function lu(e, t, n, s) {
  let i = [],
    r = [],
    l = null;
  const o = ({ state: g }) => {
    const m = Vo(e, location),
      v = n.value,
      w = t.value;
    let I = 0;
    if (g) {
      if (((n.value = m), (t.value = g), l && l === v)) {
        l = null;
        return;
      }
      I = w ? g.position - w.position : 0;
    } else s(m);
    i.forEach((P) => {
      P(n.value, v, {
        delta: I,
        type: Ns.pop,
        direction: I ? (I > 0 ? _s.forward : _s.back) : _s.unknown,
      });
    });
  };
  function a() {
    l = n.value;
  }
  function u(g) {
    i.push(g);
    const m = () => {
      const v = i.indexOf(g);
      v > -1 && i.splice(v, 1);
    };
    return (r.push(m), m);
  }
  function f() {
    if (document.visibilityState === 'hidden') {
      const { history: g } = window;
      if (!g.state) return;
      g.replaceState(oe({}, g.state, { scroll: ss() }), '');
    }
  }
  function p() {
    for (const g of r) g();
    ((r = []),
      window.removeEventListener('popstate', o),
      window.removeEventListener('pagehide', f),
      document.removeEventListener('visibilitychange', f));
  }
  return (
    window.addEventListener('popstate', o),
    window.addEventListener('pagehide', f),
    document.addEventListener('visibilitychange', f),
    { pauseListeners: a, listen: u, destroy: p }
  );
}
function Qi(e, t, n, s = !1, i = !1) {
  return {
    back: e,
    current: t,
    forward: n,
    replaced: s,
    position: window.history.length,
    scroll: i ? ss() : null,
  };
}
function au(e) {
  const { history: t, location: n } = window,
    s = { value: Vo(e, n) },
    i = { value: t.state };
  i.value ||
    r(
      s.value,
      {
        back: null,
        current: s.value,
        forward: null,
        position: t.length - 1,
        replaced: !0,
        scroll: null,
      },
      !0,
    );
  function r(a, u, f) {
    const p = e.indexOf('#'),
      g = p > -1 ? (n.host && document.querySelector('base') ? e : e.slice(p)) + a : ou() + e + a;
    try {
      (t[f ? 'replaceState' : 'pushState'](u, '', g), (i.value = u));
    } catch (m) {
      (console.error(m), n[f ? 'replace' : 'assign'](g));
    }
  }
  function l(a, u) {
    (r(
      a,
      oe({}, t.state, Qi(i.value.back, a, i.value.forward, !0), u, { position: i.value.position }),
      !0,
    ),
      (s.value = a));
  }
  function o(a, u) {
    const f = oe({}, i.value, t.state, { forward: a, scroll: ss() });
    (r(f.current, f, !0),
      r(a, oe({}, Qi(s.value, a, null), { position: f.position + 1 }, u), !1),
      (s.value = a));
  }
  return { location: s, state: i, push: o, replace: l };
}
function vh(e) {
  e = Wc(e);
  const t = au(e),
    n = lu(e, t.state, t.location, t.replace);
  function s(r, l = !0) {
    (l || n.pauseListeners(), history.go(r));
  }
  const i = oe({ location: '', base: e, go: s, createHref: qc.bind(null, e) }, t, n);
  return (
    Object.defineProperty(i, 'location', { enumerable: !0, get: () => t.location.value }),
    Object.defineProperty(i, 'state', { enumerable: !0, get: () => t.state.value }),
    i
  );
}
let Dt = (function (e) {
  return (
    (e[(e.Static = 0)] = 'Static'),
    (e[(e.Param = 1)] = 'Param'),
    (e[(e.Group = 2)] = 'Group'),
    e
  );
})({});
var Se = (function (e) {
  return (
    (e[(e.Static = 0)] = 'Static'),
    (e[(e.Param = 1)] = 'Param'),
    (e[(e.ParamRegExp = 2)] = 'ParamRegExp'),
    (e[(e.ParamRegExpEnd = 3)] = 'ParamRegExpEnd'),
    (e[(e.EscapeNext = 4)] = 'EscapeNext'),
    e
  );
})(Se || {});
const cu = { type: Dt.Static, value: '' },
  uu = /[a-zA-Z0-9_]/;
function fu(e) {
  if (!e) return [[]];
  if (e === '/') return [[cu]];
  if (!e.startsWith('/')) throw new Error(`Invalid path "${e}"`);
  function t(m) {
    throw new Error(`ERR (${n})/"${u}": ${m}`);
  }
  let n = Se.Static,
    s = n;
  const i = [];
  let r;
  function l() {
    (r && i.push(r), (r = []));
  }
  let o = 0,
    a,
    u = '',
    f = '';
  function p() {
    u &&
      (n === Se.Static
        ? r.push({ type: Dt.Static, value: u })
        : n === Se.Param || n === Se.ParamRegExp || n === Se.ParamRegExpEnd
          ? (r.length > 1 &&
              (a === '*' || a === '+') &&
              t(`A repeatable param (${u}) must be alone in its segment. eg: '/:ids+.`),
            r.push({
              type: Dt.Param,
              value: u,
              regexp: f,
              repeatable: a === '*' || a === '+',
              optional: a === '*' || a === '?',
            }))
          : t('Invalid state to consume buffer'),
      (u = ''));
  }
  function g() {
    u += a;
  }
  for (; o < e.length; ) {
    if (((a = e[o++]), a === '\\' && n !== Se.ParamRegExp)) {
      ((s = n), (n = Se.EscapeNext));
      continue;
    }
    switch (n) {
      case Se.Static:
        a === '/' ? (u && p(), l()) : a === ':' ? (p(), (n = Se.Param)) : g();
        break;
      case Se.EscapeNext:
        (g(), (n = s));
        break;
      case Se.Param:
        a === '('
          ? (n = Se.ParamRegExp)
          : uu.test(a)
            ? g()
            : (p(), (n = Se.Static), a !== '*' && a !== '?' && a !== '+' && o--);
        break;
      case Se.ParamRegExp:
        a === ')'
          ? f[f.length - 1] == '\\'
            ? (f = f.slice(0, -1) + a)
            : (n = Se.ParamRegExpEnd)
          : (f += a);
        break;
      case Se.ParamRegExpEnd:
        (p(), (n = Se.Static), a !== '*' && a !== '?' && a !== '+' && o--, (f = ''));
        break;
      default:
        t('Unknown state');
        break;
    }
  }
  return (n === Se.ParamRegExp && t(`Unfinished custom RegExp for param "${u}"`), p(), l(), i);
}
const Ji = '[^/]+?',
  du = { sensitive: !1, strict: !1, start: !0, end: !0 };
var Ne = (function (e) {
  return (
    (e[(e._multiplier = 10)] = '_multiplier'),
    (e[(e.Root = 90)] = 'Root'),
    (e[(e.Segment = 40)] = 'Segment'),
    (e[(e.SubSegment = 30)] = 'SubSegment'),
    (e[(e.Static = 40)] = 'Static'),
    (e[(e.Dynamic = 20)] = 'Dynamic'),
    (e[(e.BonusCustomRegExp = 10)] = 'BonusCustomRegExp'),
    (e[(e.BonusWildcard = -50)] = 'BonusWildcard'),
    (e[(e.BonusRepeatable = -20)] = 'BonusRepeatable'),
    (e[(e.BonusOptional = -8)] = 'BonusOptional'),
    (e[(e.BonusStrict = 0.7000000000000001)] = 'BonusStrict'),
    (e[(e.BonusCaseSensitive = 0.25)] = 'BonusCaseSensitive'),
    e
  );
})(Ne || {});
const pu = /[.+*?^${}()[\]/\\]/g;
function hu(e, t) {
  const n = oe({}, du, t),
    s = [];
  let i = n.start ? '^' : '';
  const r = [];
  for (const u of e) {
    const f = u.length ? [] : [Ne.Root];
    n.strict && !u.length && (i += '/');
    for (let p = 0; p < u.length; p++) {
      const g = u[p];
      let m = Ne.Segment + (n.sensitive ? Ne.BonusCaseSensitive : 0);
      if (g.type === Dt.Static)
        (p || (i += '/'), (i += g.value.replace(pu, '\\$&')), (m += Ne.Static));
      else if (g.type === Dt.Param) {
        const { value: v, repeatable: w, optional: I, regexp: P } = g;
        r.push({ name: v, repeatable: w, optional: I });
        const M = P || Ji;
        if (M !== Ji) {
          m += Ne.BonusCustomRegExp;
          try {
            `${M}`;
          } catch (D) {
            throw new Error(`Invalid custom RegExp for param "${v}" (${M}): ` + D.message);
          }
        }
        let F = w ? `((?:${M})(?:/(?:${M}))*)` : `(${M})`;
        (p || (F = I && u.length < 2 ? `(?:/${F})` : '/' + F),
          I && (F += '?'),
          (i += F),
          (m += Ne.Dynamic),
          I && (m += Ne.BonusOptional),
          w && (m += Ne.BonusRepeatable),
          M === '.*' && (m += Ne.BonusWildcard));
      }
      f.push(m);
    }
    s.push(f);
  }
  if (n.strict && n.end) {
    const u = s.length - 1;
    s[u][s[u].length - 1] += Ne.BonusStrict;
  }
  (n.strict || (i += '/?'), n.end ? (i += '$') : n.strict && !i.endsWith('/') && (i += '(?:/|$)'));
  const l = new RegExp(i, n.sensitive ? '' : 'i');
  function o(u) {
    const f = u.match(l),
      p = {};
    if (!f) return null;
    for (let g = 1; g < f.length; g++) {
      const m = f[g] || '',
        v = r[g - 1];
      p[v.name] = m && v.repeatable ? m.split('/') : m;
    }
    return p;
  }
  function a(u) {
    let f = '',
      p = !1;
    for (const g of e) {
      ((!p || !f.endsWith('/')) && (f += '/'), (p = !1));
      for (const m of g)
        if (m.type === Dt.Static) f += m.value;
        else if (m.type === Dt.Param) {
          const { value: v, repeatable: w, optional: I } = m,
            P = v in u ? u[v] : '';
          if (Ze(P) && !w)
            throw new Error(
              `Provided param "${v}" is an array but it is not repeatable (* or + modifiers)`,
            );
          const M = Ze(P) ? P.join('/') : P;
          if (!M)
            if (I) g.length < 2 && (f.endsWith('/') ? (f = f.slice(0, -1)) : (p = !0));
            else throw new Error(`Missing required param "${v}"`);
          f += M;
        }
    }
    return f || '/';
  }
  return { re: l, score: s, keys: r, parse: o, stringify: a };
}
function mu(e, t) {
  let n = 0;
  for (; n < e.length && n < t.length; ) {
    const s = t[n] - e[n];
    if (s) return s;
    n++;
  }
  return e.length < t.length
    ? e.length === 1 && e[0] === Ne.Static + Ne.Segment
      ? -1
      : 1
    : e.length > t.length
      ? t.length === 1 && t[0] === Ne.Static + Ne.Segment
        ? 1
        : -1
      : 0;
}
function Fo(e, t) {
  let n = 0;
  const s = e.score,
    i = t.score;
  for (; n < s.length && n < i.length; ) {
    const r = mu(s[n], i[n]);
    if (r) return r;
    n++;
  }
  if (Math.abs(i.length - s.length) === 1) {
    if (Zi(s)) return 1;
    if (Zi(i)) return -1;
  }
  return i.length - s.length;
}
function Zi(e) {
  const t = e[e.length - 1];
  return e.length > 0 && t[t.length - 1] < 0;
}
const gu = { strict: !1, end: !0, sensitive: !1 };
function _u(e, t, n) {
  const s = hu(fu(e.path), n),
    i = oe(s, { record: e, parent: t, children: [], alias: [] });
  return (t && !i.record.aliasOf == !t.record.aliasOf && t.children.push(i), i);
}
function vu(e, t) {
  const n = [],
    s = new Map();
  t = Hi(gu, t);
  function i(p) {
    return s.get(p);
  }
  function r(p, g, m) {
    const v = !m,
      w = Xi(p);
    w.aliasOf = m && m.record;
    const I = Hi(t, p),
      P = [w];
    if ('alias' in p) {
      const D = typeof p.alias == 'string' ? [p.alias] : p.alias;
      for (const j of D)
        P.push(
          Xi(
            oe({}, w, {
              components: m ? m.record.components : w.components,
              path: j,
              aliasOf: m ? m.record : w,
            }),
          ),
        );
    }
    let M, F;
    for (const D of P) {
      const { path: j } = D;
      if (g && j[0] !== '/') {
        const Z = g.record.path,
          G = Z[Z.length - 1] === '/' ? '' : '/';
        D.path = g.record.path + (j && G + j);
      }
      if (
        ((M = _u(D, g, I)),
        m
          ? m.alias.push(M)
          : ((F = F || M), F !== M && F.alias.push(M), v && p.name && !er(M) && l(p.name)),
        zo(M) && a(M),
        w.children)
      ) {
        const Z = w.children;
        for (let G = 0; G < Z.length; G++) r(Z[G], M, m && m.children[G]);
      }
      m = m || M;
    }
    return F
      ? () => {
          l(F);
        }
      : hn;
  }
  function l(p) {
    if (Lo(p)) {
      const g = s.get(p);
      g && (s.delete(p), n.splice(n.indexOf(g), 1), g.children.forEach(l), g.alias.forEach(l));
    } else {
      const g = n.indexOf(p);
      g > -1 &&
        (n.splice(g, 1),
        p.record.name && s.delete(p.record.name),
        p.children.forEach(l),
        p.alias.forEach(l));
    }
  }
  function o() {
    return n;
  }
  function a(p) {
    const g = Au(p, n);
    (n.splice(g, 0, p), p.record.name && !er(p) && s.set(p.record.name, p));
  }
  function u(p, g) {
    let m,
      v = {},
      w,
      I;
    if ('name' in p && p.name) {
      if (((m = s.get(p.name)), !m)) throw Yt(be.MATCHER_NOT_FOUND, { location: p });
      ((I = m.record.name),
        (v = oe(
          Yi(
            g.params,
            m.keys
              .filter((F) => !F.optional)
              .concat(m.parent ? m.parent.keys.filter((F) => F.optional) : [])
              .map((F) => F.name),
          ),
          p.params &&
            Yi(
              p.params,
              m.keys.map((F) => F.name),
            ),
        )),
        (w = m.stringify(v)));
    } else if (p.path != null)
      ((w = p.path),
        (m = n.find((F) => F.re.test(w))),
        m && ((v = m.parse(w)), (I = m.record.name)));
    else {
      if (((m = g.name ? s.get(g.name) : n.find((F) => F.re.test(g.path))), !m))
        throw Yt(be.MATCHER_NOT_FOUND, { location: p, currentLocation: g });
      ((I = m.record.name), (v = oe({}, g.params, p.params)), (w = m.stringify(v)));
    }
    const P = [];
    let M = m;
    for (; M; ) (P.unshift(M.record), (M = M.parent));
    return { name: I, path: w, params: v, matched: P, meta: yu(P) };
  }
  e.forEach((p) => r(p));
  function f() {
    ((n.length = 0), s.clear());
  }
  return {
    addRoute: r,
    resolve: u,
    removeRoute: l,
    clearRoutes: f,
    getRoutes: o,
    getRecordMatcher: i,
  };
}
function Yi(e, t) {
  const n = {};
  for (const s of t) s in e && (n[s] = e[s]);
  return n;
}
function Xi(e) {
  const t = {
    path: e.path,
    redirect: e.redirect,
    name: e.name,
    meta: e.meta || {},
    aliasOf: e.aliasOf,
    beforeEnter: e.beforeEnter,
    props: bu(e),
    children: e.children || [],
    instances: {},
    leaveGuards: new Set(),
    updateGuards: new Set(),
    enterCallbacks: {},
    components: 'components' in e ? e.components || null : e.component && { default: e.component },
  };
  return (Object.defineProperty(t, 'mods', { value: {} }), t);
}
function bu(e) {
  const t = {},
    n = e.props || !1;
  if ('component' in e) t.default = n;
  else for (const s in e.components) t[s] = typeof n == 'object' ? n[s] : n;
  return t;
}
function er(e) {
  for (; e; ) {
    if (e.record.aliasOf) return !0;
    e = e.parent;
  }
  return !1;
}
function yu(e) {
  return e.reduce((t, n) => oe(t, n.meta), {});
}
function Au(e, t) {
  let n = 0,
    s = t.length;
  for (; n !== s; ) {
    const r = (n + s) >> 1;
    Fo(e, t[r]) < 0 ? (s = r) : (n = r + 1);
  }
  const i = Su(e);
  return (i && (s = t.lastIndexOf(i, s - 1)), s);
}
function Su(e) {
  let t = e;
  for (; (t = t.parent); ) if (zo(t) && Fo(e, t) === 0) return t;
}
function zo({ record: e }) {
  return !!(e.name || (e.components && Object.keys(e.components).length) || e.redirect);
}
function tr(e) {
  const t = Qe(is),
    n = Qe(ri),
    s = x(() => {
      const a = ge(e.to);
      return t.resolve(a);
    }),
    i = x(() => {
      const { matched: a } = s.value,
        { length: u } = a,
        f = a[u - 1],
        p = n.matched;
      if (!f || !p.length) return -1;
      const g = p.findIndex(Zt.bind(null, f));
      if (g > -1) return g;
      const m = nr(a[u - 2]);
      return u > 1 && nr(f) === m && p[p.length - 1].path !== m
        ? p.findIndex(Zt.bind(null, a[u - 2]))
        : g;
    }),
    r = x(() => i.value > -1 && xu(n.params, s.value.params)),
    l = x(() => i.value > -1 && i.value === n.matched.length - 1 && $o(n.params, s.value.params));
  function o(a = {}) {
    if (Tu(a)) {
      const u = t[ge(e.replace) ? 'replace' : 'push'](ge(e.to)).catch(hn);
      return (
        e.viewTransition &&
          typeof document < 'u' &&
          'startViewTransition' in document &&
          document.startViewTransition(() => u),
        u
      );
    }
    return Promise.resolve();
  }
  return { route: s, href: x(() => s.value.href), isActive: r, isExactActive: l, navigate: o };
}
function wu(e) {
  return e.length === 1 ? e[0] : e;
}
const Eu = Xs({
    name: 'RouterLink',
    compatConfig: { MODE: 3 },
    props: {
      to: { type: [String, Object], required: !0 },
      replace: Boolean,
      activeClass: String,
      exactActiveClass: String,
      custom: Boolean,
      ariaCurrentValue: { type: String, default: 'page' },
      viewTransition: Boolean,
    },
    useLink: tr,
    setup(e, { slots: t }) {
      const n = $t(tr(e)),
        { options: s } = Qe(is),
        i = x(() => ({
          [sr(e.activeClass, s.linkActiveClass, 'router-link-active')]: n.isActive,
          [sr(e.exactActiveClass, s.linkExactActiveClass, 'router-link-exact-active')]:
            n.isExactActive,
        }));
      return () => {
        const r = t.default && wu(t.default(n));
        return e.custom
          ? r
          : xo(
              'a',
              {
                'aria-current': n.isExactActive ? e.ariaCurrentValue : null,
                href: n.href,
                onClick: n.navigate,
                class: i.value,
              },
              r,
            );
      };
    },
  }),
  jo = Eu;
function Tu(e) {
  if (
    !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) &&
    !e.defaultPrevented &&
    !(e.button !== void 0 && e.button !== 0)
  ) {
    if (e.currentTarget && e.currentTarget.getAttribute) {
      const t = e.currentTarget.getAttribute('target');
      if (/\b_blank\b/i.test(t)) return;
    }
    return (e.preventDefault && e.preventDefault(), !0);
  }
}
function xu(e, t) {
  for (const n in t) {
    const s = t[n],
      i = e[n];
    if (typeof s == 'string') {
      if (s !== i) return !1;
    } else if (!Ze(i) || i.length !== s.length || s.some((r, l) => r !== i[l])) return !1;
  }
  return !0;
}
function nr(e) {
  return e ? (e.aliasOf ? e.aliasOf.path : e.path) : '';
}
const sr = (e, t, n) => e ?? t ?? n,
  Cu = Xs({
    name: 'RouterView',
    inheritAttrs: !1,
    props: { name: { type: String, default: 'default' }, route: Object },
    compatConfig: { MODE: 3 },
    setup(e, { attrs: t, slots: n }) {
      const s = Qe(Ms),
        i = x(() => e.route || s.value),
        r = Qe(qi, 0),
        l = x(() => {
          let u = ge(r);
          const { matched: f } = i.value;
          let p;
          for (; (p = f[u]) && !p.components; ) u++;
          return u;
        }),
        o = x(() => i.value.matched[l.value]);
      (dn(
        qi,
        x(() => l.value + 1),
      ),
        dn(iu, o),
        dn(Ms, i));
      const a = Bl();
      return (
        In(
          () => [a.value, o.value, e.name],
          ([u, f, p], [g, m, v]) => {
            (f &&
              ((f.instances[p] = u),
              m &&
                m !== f &&
                u &&
                u === g &&
                (f.leaveGuards.size || (f.leaveGuards = m.leaveGuards),
                f.updateGuards.size || (f.updateGuards = m.updateGuards))),
              u &&
                f &&
                (!m || !Zt(f, m) || !g) &&
                (f.enterCallbacks[p] || []).forEach((w) => w(u)));
          },
          { flush: 'post' },
        ),
        () => {
          const u = i.value,
            f = e.name,
            p = o.value,
            g = p && p.components[f];
          if (!g) return ir(n.default, { Component: g, route: u });
          const m = p.props[f],
            v = m ? (m === !0 ? u.params : typeof m == 'function' ? m(u) : m) : null,
            I = xo(
              g,
              oe({}, v, t, {
                onVnodeUnmounted: (P) => {
                  P.component.isUnmounted && (p.instances[f] = null);
                },
                ref: a,
              }),
            );
          return ir(n.default, { Component: I, route: u }) || I;
        }
      );
    },
  });
function ir(e, t) {
  if (!e) return null;
  const n = e(t);
  return n.length === 1 ? n[0] : n;
}
const Ho = Cu;
function bh(e) {
  const t = vu(e.routes, e),
    n = e.parseQuery || nu,
    s = e.stringifyQuery || Ki,
    i = e.history,
    r = rn(),
    l = rn(),
    o = rn(),
    a = Vl(At);
  let u = At;
  zt &&
    e.scrollBehavior &&
    'scrollRestoration' in history &&
    (history.scrollRestoration = 'manual');
  const f = ms.bind(null, (S) => '' + S),
    p = ms.bind(null, Vc),
    g = ms.bind(null, Sn);
  function m(S, z) {
    let $, H;
    return (Lo(S) ? (($ = t.getRecordMatcher(S)), (H = z)) : (H = S), t.addRoute(H, $));
  }
  function v(S) {
    const z = t.getRecordMatcher(S);
    z && t.removeRoute(z);
  }
  function w() {
    return t.getRoutes().map((S) => S.record);
  }
  function I(S) {
    return !!t.getRecordMatcher(S);
  }
  function P(S, z) {
    if (((z = oe({}, z || a.value)), typeof S == 'string')) {
      const _ = gs(n, S, z.path),
        A = t.resolve({ path: _.path }, z),
        E = i.createHref(_.fullPath);
      return oe(_, A, { params: g(A.params), hash: Sn(_.hash), redirectedFrom: void 0, href: E });
    }
    let $;
    if (S.path != null) $ = oe({}, S, { path: gs(n, S.path, z.path).path });
    else {
      const _ = oe({}, S.params);
      for (const A in _) _[A] == null && delete _[A];
      (($ = oe({}, S, { params: p(_) })), (z.params = p(z.params)));
    }
    const H = t.resolve($, z),
      X = S.hash || '';
    H.params = f(g(H.params));
    const d = jc(s, oe({}, S, { hash: $c(X), path: H.path })),
      h = i.createHref(d);
    return oe({ fullPath: d, hash: X, query: s === Ki ? su(S.query) : S.query || {} }, H, {
      redirectedFrom: void 0,
      href: h,
    });
  }
  function M(S) {
    return typeof S == 'string' ? gs(n, S, a.value.path) : oe({}, S);
  }
  function F(S, z) {
    if (u !== S) return Yt(be.NAVIGATION_CANCELLED, { from: z, to: S });
  }
  function D(S) {
    return G(S);
  }
  function j(S) {
    return D(oe(M(S), { replace: !0 }));
  }
  function Z(S, z) {
    const $ = S.matched[S.matched.length - 1];
    if ($ && $.redirect) {
      const { redirect: H } = $;
      let X = typeof H == 'function' ? H(S, z) : H;
      return (
        typeof X == 'string' &&
          ((X = X.includes('?') || X.includes('#') ? (X = M(X)) : { path: X }), (X.params = {})),
        oe({ query: S.query, hash: S.hash, params: X.path != null ? {} : S.params }, X)
      );
    }
  }
  function G(S, z) {
    const $ = (u = P(S)),
      H = a.value,
      X = S.state,
      d = S.force,
      h = S.replace === !0,
      _ = Z($, H);
    if (_)
      return G(
        oe(M(_), { state: typeof _ == 'object' ? oe({}, X, _.state) : X, force: d, replace: h }),
        z || $,
      );
    const A = $;
    A.redirectedFrom = z;
    let E;
    return (
      !d &&
        Hc(s, H, $) &&
        ((E = Yt(be.NAVIGATION_DUPLICATED, { to: A, from: H })), Ye(H, H, !0, !1)),
      (E ? Promise.resolve(E) : Ae(A, H))
        .catch((y) => (ut(y) ? (ut(y, be.NAVIGATION_GUARD_REDIRECT) ? y : yt(y)) : re(y, A, H)))
        .then((y) => {
          if (y) {
            if (ut(y, be.NAVIGATION_GUARD_REDIRECT))
              return G(
                oe({ replace: h }, M(y.to), {
                  state: typeof y.to == 'object' ? oe({}, X, y.to.state) : X,
                  force: d,
                }),
                z || A,
              );
          } else y = V(A, H, !0, h, X);
          return (xe(A, H, y), y);
        })
    );
  }
  function te(S, z) {
    const $ = F(S, z);
    return $ ? Promise.reject($) : Promise.resolve();
  }
  function de(S) {
    const z = Bt.values().next().value;
    return z && typeof z.runWithContext == 'function' ? z.runWithContext(S) : S();
  }
  function Ae(S, z) {
    let $;
    const [H, X, d] = ru(S, z);
    $ = vs(H.reverse(), 'beforeRouteLeave', S, z);
    for (const _ of H)
      _.leaveGuards.forEach((A) => {
        $.push(Et(A, S, z));
      });
    const h = te.bind(null, S, z);
    return (
      $.push(h),
      je($)
        .then(() => {
          $ = [];
          for (const _ of r.list()) $.push(Et(_, S, z));
          return ($.push(h), je($));
        })
        .then(() => {
          $ = vs(X, 'beforeRouteUpdate', S, z);
          for (const _ of X)
            _.updateGuards.forEach((A) => {
              $.push(Et(A, S, z));
            });
          return ($.push(h), je($));
        })
        .then(() => {
          $ = [];
          for (const _ of d)
            if (_.beforeEnter)
              if (Ze(_.beforeEnter)) for (const A of _.beforeEnter) $.push(Et(A, S, z));
              else $.push(Et(_.beforeEnter, S, z));
          return ($.push(h), je($));
        })
        .then(
          () => (
            S.matched.forEach((_) => (_.enterCallbacks = {})),
            ($ = vs(d, 'beforeRouteEnter', S, z, de)),
            $.push(h),
            je($)
          ),
        )
        .then(() => {
          $ = [];
          for (const _ of l.list()) $.push(Et(_, S, z));
          return ($.push(h), je($));
        })
        .catch((_) => (ut(_, be.NAVIGATION_CANCELLED) ? _ : Promise.reject(_)))
    );
  }
  function xe(S, z, $) {
    o.list().forEach((H) => de(() => H(S, z, $)));
  }
  function V(S, z, $, H, X) {
    const d = F(S, z);
    if (d) return d;
    const h = z === At,
      _ = zt ? history.state : {};
    ($ &&
      (H || h
        ? i.replace(S.fullPath, oe({ scroll: h && _ && _.scroll }, X))
        : i.push(S.fullPath, X)),
      (a.value = S),
      Ye(S, z, $, h),
      yt());
  }
  let B;
  function J() {
    B ||
      (B = i.listen((S, z, $) => {
        if (!Rt.listening) return;
        const H = P(S),
          X = Z(H, Rt.currentRoute.value);
        if (X) {
          G(oe(X, { replace: !0, force: !0 }), H).catch(hn);
          return;
        }
        u = H;
        const d = a.value;
        (zt && Zc(Wi(d.fullPath, $.delta), ss()),
          Ae(H, d)
            .catch((h) =>
              ut(h, be.NAVIGATION_ABORTED | be.NAVIGATION_CANCELLED)
                ? h
                : ut(h, be.NAVIGATION_GUARD_REDIRECT)
                  ? (G(oe(M(h.to), { force: !0 }), H)
                      .then((_) => {
                        ut(_, be.NAVIGATION_ABORTED | be.NAVIGATION_DUPLICATED) &&
                          !$.delta &&
                          $.type === Ns.pop &&
                          i.go(-1, !1);
                      })
                      .catch(hn),
                    Promise.reject())
                  : ($.delta && i.go(-$.delta, !1), re(h, H, d)),
            )
            .then((h) => {
              ((h = h || V(H, d, !1)),
                h &&
                  ($.delta && !ut(h, be.NAVIGATION_CANCELLED)
                    ? i.go(-$.delta, !1)
                    : $.type === Ns.pop &&
                      ut(h, be.NAVIGATION_ABORTED | be.NAVIGATION_DUPLICATED) &&
                      i.go(-1, !1)),
                xe(H, d, h));
            })
            .catch(hn));
      }));
  }
  let Le = rn(),
    me = rn(),
    ie;
  function re(S, z, $) {
    yt(S);
    const H = me.list();
    return (H.length ? H.forEach((X) => X(S, z, $)) : console.error(S), Promise.reject(S));
  }
  function at() {
    return ie && a.value !== At
      ? Promise.resolve()
      : new Promise((S, z) => {
          Le.add([S, z]);
        });
  }
  function yt(S) {
    return (ie || ((ie = !S), J(), Le.list().forEach(([z, $]) => (S ? $(S) : z())), Le.reset()), S);
  }
  function Ye(S, z, $, H) {
    const { scrollBehavior: X } = e;
    if (!zt || !X) return Promise.resolve();
    const d =
      (!$ && Yc(Wi(S.fullPath, 0))) || ((H || !$) && history.state && history.state.scroll) || null;
    return Js()
      .then(() => X(S, z, d))
      .then((h) => h && Jc(h))
      .catch((h) => re(h, S, z));
  }
  const Me = (S) => i.go(S);
  let Lt;
  const Bt = new Set(),
    Rt = {
      currentRoute: a,
      listening: !0,
      addRoute: m,
      removeRoute: v,
      clearRoutes: t.clearRoutes,
      hasRoute: I,
      getRoutes: w,
      resolve: P,
      options: e,
      push: D,
      replace: j,
      go: Me,
      back: () => Me(-1),
      forward: () => Me(1),
      beforeEach: r.add,
      beforeResolve: l.add,
      afterEach: o.add,
      onError: me.add,
      isReady: at,
      install(S) {
        (S.component('RouterLink', jo),
          S.component('RouterView', Ho),
          (S.config.globalProperties.$router = Rt),
          Object.defineProperty(S.config.globalProperties, '$route', {
            enumerable: !0,
            get: () => ge(a),
          }),
          zt && !Lt && a.value === At && ((Lt = !0), D(i.location).catch((H) => {})));
        const z = {};
        for (const H in At) Object.defineProperty(z, H, { get: () => a.value[H], enumerable: !0 });
        (S.provide(is, Rt), S.provide(ri, Br(z)), S.provide(Ms, a));
        const $ = S.unmount;
        (Bt.add(S),
          (S.unmount = function () {
            (Bt.delete(S),
              Bt.size < 1 && ((u = At), B && B(), (B = null), (a.value = At), (Lt = !1), (ie = !1)),
              $());
          }));
      },
    };
  function je(S) {
    return S.reduce((z, $) => z.then(() => de($)), Promise.resolve());
  }
  return Rt;
}
function Ru() {
  return Qe(is);
}
function Ou(e) {
  return Qe(ri);
}
const ze = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [s, i] of t) n[s] = i;
    return n;
  },
  Pu = ['data-variant'],
  Iu = { key: 0, class: 'state-token__icon', 'aria-hidden': 'true' },
  Nu = { class: 'state-token__label' },
  Du = {
    __name: 'StateToken',
    props: {
      label: { type: String, required: !0 },
      variant: { type: String, default: 'info' },
      icon: { type: String, default: '' },
      compact: { type: Boolean, default: !1 },
    },
    setup(e) {
      const t = e,
        n = ['info', 'success', 'warning', 'danger', 'neutral'],
        s = x(() => (n.includes(t.variant) ? t.variant : 'info'));
      return (i, r) => (
        T(),
        R(
          'span',
          {
            class: mt([
              'state-token',
              [`state-token--${s.value}`, { 'state-token--compact': e.compact }],
            ]),
            role: 'status',
            'aria-live': 'polite',
            'data-variant': s.value,
          },
          [e.icon ? (T(), R('span', Iu, b(e.icon), 1)) : ue('', !0), c('span', Nu, b(e.label), 1)],
          10,
          Pu,
        )
      );
    },
  },
  ks = ze(Du, [['__scopeId', 'data-v-7304ee6e']]),
  Uo = 'Evo-Tactics Mission Console',
  Mu = 'info',
  Ke = $t({ title: Uo, description: '', demo: !1, breadcrumbs: [], tokens: [] });
function ku(e) {
  if (!e) return null;
  const t = e.id || e.label;
  return t ? { id: t, label: e.label ?? t, variant: e.variant || Mu, icon: e.icon ?? '' } : null;
}
function yh(e = {}) {
  ((Ke.title = e.title && e.title.trim() ? e.title : Uo),
    (Ke.description = e.description && e.description.trim() ? e.description : ''),
    (Ke.demo = !!e.demo),
    (Ke.breadcrumbs = Array.isArray(e.breadcrumbs) ? [...e.breadcrumbs] : []));
  const t = Array.isArray(e.tokens) ? e.tokens.map(ku).filter((n) => !!n) : [];
  Ke.tokens = t;
}
function $u() {
  return {
    navigation: $n(Ke),
    title: x(() => Ke.title),
    description: x(() => Ke.description),
    demo: x(() => Ke.demo),
    breadcrumbs: x(() => Ke.breadcrumbs),
    tokens: x(() => Ke.tokens),
  };
}
const Lu = 'modulepreload',
  Bu = function (e, t) {
    return new URL(e, t).href;
  },
  rr = {},
  Vu = function (t, n, s) {
    let i = Promise.resolve();
    if (n && n.length > 0) {
      const l = document.getElementsByTagName('link'),
        o = document.querySelector('meta[property=csp-nonce]'),
        a = (o == null ? void 0 : o.nonce) || (o == null ? void 0 : o.getAttribute('nonce'));
      i = Promise.allSettled(
        n.map((u) => {
          if (((u = Bu(u, s)), u in rr)) return;
          rr[u] = !0;
          const f = u.endsWith('.css'),
            p = f ? '[rel="stylesheet"]' : '';
          if (!!s)
            for (let v = l.length - 1; v >= 0; v--) {
              const w = l[v];
              if (w.href === u && (!f || w.rel === 'stylesheet')) return;
            }
          else if (document.querySelector(`link[href="${u}"]${p}`)) return;
          const m = document.createElement('link');
          if (
            ((m.rel = f ? 'stylesheet' : Lu),
            f || (m.as = 'script'),
            (m.crossOrigin = ''),
            (m.href = u),
            a && m.setAttribute('nonce', a),
            document.head.appendChild(m),
            f)
          )
            return new Promise((v, w) => {
              (m.addEventListener('load', v),
                m.addEventListener('error', () => w(new Error(`Unable to preload CSS for ${u}`))));
            });
        }),
      );
    }
    function r(l) {
      const o = new Event('vite:preloadError', { cancelable: !0 });
      if (((o.payload = l), window.dispatchEvent(o), !o.defaultPrevented)) throw l;
    }
    return i.then((l) => {
      for (const o of l || []) o.status === 'rejected' && r(o.reason);
      return t().catch(r);
    });
  },
  Go = { BASE_URL: './', DEV: !1, MODE: 'production', PROD: !0, SSR: !1 },
  Wo = typeof import.meta < 'u' && typeof Go == 'object';
function Ko(e) {
  if (!Wo) return;
  const n = Go[e];
  if (typeof n != 'string') return;
  const s = n.trim();
  return s || void 0;
}
function qo(e) {
  return !e || typeof e != 'string'
    ? !1
    : /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:\/\/|[a-zA-Z][a-zA-Z0-9+.-]*:)/.test(e) || e.startsWith('//');
}
function Qo(e, t = '') {
  if (!e || typeof e != 'string') return t;
  const n = e.trim();
  return n
    ? n === '/'
      ? '/'
      : n === './' || n === '.'
        ? './'
        : n === '../'
          ? '../'
          : n.endsWith('/')
            ? n
            : `${n}/`
    : t;
}
function Jo(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = e.endsWith('/'),
    s = t.startsWith('/');
  return n && s ? e + t.slice(1) : !n && !s ? `${e}/${t}` : e + t;
}
function Fu(e) {
  return !e || typeof e != 'string' ? !1 : !/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/)/.test(e.trim());
}
const Zo = Wo ? './' : '/',
  or = Ko('VITE_API_BASE'),
  Wn = Qo(Zo, '/'),
  lr = or ? Qo(or, '') : '',
  zu = Fu(Zo);
function Ah(e, t = {}) {
  if (!e || typeof e != 'string') {
    const l = t.apiBase ?? lr;
    return l || (t.baseUrl ?? Wn);
  }
  const n = e.trim();
  if (qo(n)) return n;
  const s = t.apiBase ?? lr,
    i = t.baseUrl ?? Wn,
    r = s || i;
  return r ? Jo(r, n) : n;
}
function Sh(e, t = {}) {
  if (!e || typeof e != 'string') return t.baseUrl ?? Wn;
  const n = e.trim();
  if (qo(n)) return n;
  const s = t.baseUrl ?? Wn,
    i = n.startsWith('/') ? n.slice(1) : n.replace(/^\.\//, '');
  return Jo(s, i);
}
function wh() {
  return zu;
}
const ar = 30,
  cr = 60,
  ur = 40;
function ju(e, t) {
  if (!e) return t;
  const n = e.trim().toLowerCase();
  return ['enabled', 'true', '1', 'on', 'yes'].includes(n)
    ? 'enabled'
    : ['disabled', 'false', '0', 'off', 'no'].includes(n)
      ? 'disabled'
      : n === 'auto'
        ? 'auto'
        : t;
}
const fr = ju(Ko('VITE_OBSERVABILITY_DIAGNOSTICS'), 'auto'),
  Hu = typeof window < 'u' && !1,
  Uu = fr === 'enabled' || (fr === 'auto' && Hu),
  _e = $t({ enabled: Uu, fetches: [], logs: [], metrics: [] });
function oi(e) {
  return `${e}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}
function li(e) {
  return _e.fetches.find((t) => t.id === e);
}
function Eh(e) {
  if (!_e.enabled) return null;
  const t = e.id || oi('fetch'),
    n = {
      id: t,
      url: e.url,
      method: (e.method || 'GET').toUpperCase(),
      status: 'pending',
      source: 'remote',
      startedAt: Date.now(),
      completedAt: null,
      durationMs: null,
      fallbackUrl: e.fallbackUrl || null,
      fallbackAttempted: !!(e.fallbackAllowed && e.fallbackUrl),
      message: 'Richiesta in corso',
      error: null,
    };
  return (_e.fetches.unshift(n), _e.fetches.length > ar && (_e.fetches.length = ar), t);
}
function Th(e, t = {}) {
  if (!_e.enabled || !e) return;
  const n = li(e);
  n &&
    (t.status && (n.status = t.status),
    t.source && (n.source = t.source),
    t.message && (n.message = t.message),
    t.error !== void 0 && (n.error = t.error || null),
    t.completed !== !1 &&
      ((n.completedAt = Date.now()), (n.durationMs = n.completedAt - n.startedAt)));
}
function xh(e, t) {
  if (!_e.enabled || !e) return;
  const n = li(e);
  n &&
    ((n.status = 'fallback'),
    (n.source = 'fallback'),
    (n.message = t),
    (n.error = n.error || null),
    (n.completedAt = Date.now()),
    (n.durationMs = n.completedAt - n.startedAt));
}
function Ch(e, t, n) {
  if (!_e.enabled || !e) return;
  const s = li(e);
  s &&
    ((s.status = 'error'),
    (s.source = 'remote'),
    (s.message = t),
    (s.error = n instanceof Error ? n.message : typeof n == 'string' ? n : null),
    (s.completedAt = Date.now()),
    (s.durationMs = s.completedAt - s.startedAt));
}
function Rh(e) {
  if (!_e.enabled) return;
  const t = {
    id: e.id || oi('log'),
    level: e.level,
    message: e.message,
    scope: e.scope || 'app',
    source: e.source || 'client',
    timestamp: e.timestamp ?? Date.now(),
  };
  (_e.logs.unshift(t), _e.logs.length > cr && (_e.logs.length = cr));
}
function Oh(e) {
  if (!_e.enabled) return;
  const t = { ...e, id: e.id || oi('metric'), timestamp: e.timestamp ?? Date.now() };
  (_e.metrics.unshift(t), _e.metrics.length > ur && (_e.metrics.length = ur));
}
function Gu() {
  const e = x(() => {
    const t = _e.fetches.length,
      n = _e.fetches.filter((r) => r.status === 'fallback').length,
      s = _e.fetches.filter((r) => r.status === 'error').length,
      i = _e.fetches.filter((r) => r.status === 'pending').length;
    return { total: t, fallback: n, failures: s, pending: i };
  });
  return {
    enabled: x(() => _e.enabled),
    fetches: x(() => _e.fetches),
    logs: x(() => _e.logs),
    metrics: x(() => _e.metrics),
    fetchSummary: e,
  };
}
const Wu = ['viewBox', 'aria-labelledby'],
  Ku = ['points', 'stroke', 'stroke-width', 'stroke-dasharray'],
  qu = ['cx', 'cy', 'r', 'fill'],
  bs = 40,
  Qu = {
    __name: 'SparklineChart',
    props: {
      points: { type: Array, default: () => [] },
      color: { type: String, default: '#61d5ff' },
      strokeWidth: { type: Number, default: 2 },
      variant: { type: String, default: 'live' },
      summaryLabel: { type: String, default: 'Andamento metriche' },
    },
    setup(e) {
      const t = e;
      let n = 0;
      const s = `sparkline-${++n}`,
        i = `${s}-summary`,
        r = `${s}-title`,
        l = x(() => (t.variant === 'demo' ? 'sparkline--demo' : '')),
        o = x(() =>
          (t.points || [])
            .map((P) => (Number.isFinite(P) ? Number(P) : 0))
            .filter((P) => Number.isFinite(P)),
        ),
        a = x(() => Math.max((o.value.length - 1) * 24, 24)),
        u = x(() => {
          if (!o.value.length) return [];
          const P = Math.min(...o.value, 0),
            F = Math.max(...o.value, 100) - P || 1;
          return o.value.map((D, j) => {
            const Z = (j / Math.max(o.value.length - 1, 1)) * a.value,
              G = bs - ((D - P) / F) * bs;
            return { x: Math.round(Z * 100) / 100, y: Math.round(G * 100) / 100 };
          });
        }),
        f = x(() => u.value.map((P) => `${P.x},${P.y}`).join(' ')),
        p = x(() => (u.value.length ? u.value[u.value.length - 1] : null)),
        g = x(() => (o.value.length ? o.value[o.value.length - 1] : null)),
        m = x(() => {
          if (!o.value.length) return null;
          const P = Math.min(...o.value),
            M = Math.max(...o.value),
            F = g.value,
            D = o.value.length > 1 ? o.value[o.value.length - 2] : F,
            j = F - D,
            Z = o.value.reduce((G, te) => G + te, 0) / o.value.length;
          return { min: P, max: M, latest: F, trendRaw: j, average: Z };
        }),
        v = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }),
        w = x(() => {
          if (!m.value)
            return {
              min: 'Min: –',
              max: 'Max: –',
              latest: 'Ultimo: –',
              trend: 'Trend: nessun dato',
            };
          const { min: P, max: M, latest: F, trendRaw: D, average: j } = m.value,
            Z =
              D === 0
                ? 'Trend: stabile'
                : D > 0
                  ? `Trend: +${v.format(D)}`
                  : `Trend: ${v.format(D)}`;
          return {
            min: `Min: ${v.format(P)}`,
            max: `Max: ${v.format(M)}`,
            latest: `Ultimo: ${v.format(F)} (media ${v.format(j)})`,
            trend: Z,
          };
        }),
        I = x(() => {
          if (!m.value) return `${t.summaryLabel}: nessun dato disponibile`;
          const { min: P, max: M, latest: F, trendRaw: D } = m.value,
            j =
              D === 0
                ? 'stabile'
                : D > 0
                  ? `in aumento di ${v.format(D)}`
                  : `in calo di ${v.format(Math.abs(D))}`;
          return `${t.summaryLabel}: minimo ${v.format(P)}, massimo ${v.format(M)}, ultimo valore ${v.format(F)}, andamento ${j}.`;
        });
      return (P, M) =>
        e.points.length
          ? (T(),
            R(
              'figure',
              { key: 0, class: mt(['sparkline', l.value]) },
              [
                (T(),
                R(
                  'svg',
                  {
                    viewBox: `0 0 ${a.value} ${bs}`,
                    role: 'img',
                    preserveAspectRatio: 'none',
                    'aria-labelledby': `${r} ${i}`,
                  },
                  [
                    c('title', { id: r }, b(I.value), 1),
                    c(
                      'polyline',
                      {
                        class: 'sparkline__line',
                        points: f.value,
                        fill: 'none',
                        stroke: e.color,
                        'stroke-width': e.strokeWidth,
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        'stroke-dasharray': e.variant === 'demo' ? '6 6' : void 0,
                      },
                      null,
                      8,
                      Ku,
                    ),
                    p.value
                      ? (T(),
                        R(
                          'circle',
                          {
                            key: 0,
                            class: 'sparkline__pivot',
                            cx: p.value.x,
                            cy: p.value.y,
                            r: e.strokeWidth * 1.2,
                            fill: e.color,
                          },
                          null,
                          8,
                          qu,
                        ))
                      : ue('', !0),
                  ],
                  8,
                  Wu,
                )),
                c('figcaption', { id: i, class: 'sparkline__summary' }, [
                  c('span', null, b(w.value.min), 1),
                  c('span', null, b(w.value.max), 1),
                  c('span', null, b(w.value.latest), 1),
                  c('span', null, b(w.value.trend), 1),
                ]),
              ],
              2,
            ))
          : (T(),
            R(
              'div',
              {
                key: 1,
                class: mt(['sparkline', 'sparkline--empty', l.value]),
                role: 'status',
                'aria-live': 'polite',
              },
              [
                ...(M[0] ||
                  (M[0] = [
                    c('span', { class: 'visually-hidden' }, 'Nessuna telemetria disponibile', -1),
                  ])),
              ],
              2,
            ));
    },
  },
  He = ze(Qu, [['__scopeId', 'data-v-b0eba4d4']]),
  $s = 'nebula-atlas-demo-cache-v1',
  Ue = $t({
    id: 'nebula-atlas',
    title: 'Nebula Atlas',
    summary: '',
    releaseWindow: '',
    curator: '',
    metrics: { species: 0, biomes: 0, encounters: 0 },
    highlights: [],
    species: [],
    biomes: [],
    encounters: [],
  });
let Nt = null;
function Yo() {
  try {
    if (typeof window < 'u' && window.localStorage) return window.localStorage;
  } catch (e) {
    console.warn('[atlasDataset] impossibile accedere a localStorage', e);
  }
  return null;
}
function Ju(e) {
  if (typeof structuredClone == 'function')
    try {
      return structuredClone(e);
    } catch (t) {
      console.warn('[atlasDataset] structuredClone non disponibile', t);
    }
  return JSON.parse(JSON.stringify(e));
}
function ys(e, t) {
  const n = Number(e);
  return Number.isFinite(n) ? n : t;
}
function ai(e) {
  const t = Ju(e),
    n = Array.isArray(t.highlights) ? [...t.highlights] : [],
    s = Array.isArray(t.species) ? t.species : [],
    i = Array.isArray(t.biomes) ? t.biomes : [],
    r = Array.isArray(t.encounters) ? t.encounters : [],
    l = typeof t.metrics == 'object' && t.metrics !== null ? t.metrics : {};
  return {
    ...t,
    id: t.id || 'nebula-atlas',
    title: t.title || 'Nebula Atlas',
    summary: t.summary || '',
    releaseWindow: typeof t.releaseWindow == 'string' ? t.releaseWindow : '',
    curator: typeof t.curator == 'string' ? t.curator : '',
    metrics: {
      ...l,
      species: ys(l.species, s.length),
      biomes: ys(l.biomes, i.length),
      encounters: ys(l.encounters, r.length),
    },
    highlights: n,
    species: s,
    biomes: i,
    encounters: r,
  };
}
function dr(e) {
  const t = ai(e);
  Object.assign(Ue, t);
}
function Xo() {
  const e = Yo();
  if (!e) return null;
  try {
    const t = e.getItem($s);
    if (!t) return null;
    const n = JSON.parse(t);
    return !n || typeof n != 'object' ? null : ai(n);
  } catch (t) {
    console.warn('[atlasDataset] cache demo non valida, si procede alla pulizia', t);
    try {
      e.removeItem($s);
    } catch (n) {
      console.warn('[atlasDataset] impossibile pulire la cache demo', n);
    }
    return null;
  }
}
function el(e) {
  const t = Yo();
  if (t)
    try {
      t.setItem($s, JSON.stringify(e));
    } catch (n) {
      console.warn('[atlasDataset] impossibile salvare la cache demo', n);
    }
}
async function tl() {
  const e = await Vu(() => Promise.resolve().then(() => nh), void 0, import.meta.url),
    t = e.atlasDemoDataset || e.default;
  return ai(t);
}
async function nl(e = {}) {
  return (
    (Nt && !e.force) ||
      (Nt = (async () => {
        if (!e.force) {
          const s = Xo();
          if (s) return (dr(s), Ue);
        }
        const n = await tl();
        return (dr(n), el(n), Ue);
      })().catch((n) => {
        throw ((Nt = null), n);
      })),
    Nt
  );
}
async function Zu() {
  if (Nt) {
    try {
      await Nt;
    } catch {}
    return;
  }
  if (!Xo())
    try {
      const e = await tl();
      el(e);
    } catch (e) {
      console.warn('[atlasDataset] prefetch dataset demo fallito', e);
    }
}
const sl = Ue,
  il = x(() => {
    var e, t, n;
    return {
      species: ((e = Ue.metrics) == null ? void 0 : e.species) ?? Ue.species.length,
      biomes: ((t = Ue.metrics) == null ? void 0 : t.biomes) ?? Ue.biomes.length,
      encounters: ((n = Ue.metrics) == null ? void 0 : n.encounters) ?? Ue.encounters.length,
    };
  }),
  Yu = x(() =>
    Ue.species.filter((e) => e.readiness && !e.readiness.toLowerCase().includes('richiede')),
  ),
  Xu = x(() =>
    Ue.encounters.filter(
      (e) => typeof e.readiness == 'string' && e.readiness.toLowerCase().includes('approvazione'),
    ),
  ),
  Ph = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        atlasActiveSpecies: Yu,
        atlasDataset: sl,
        atlasPendingApprovals: Xu,
        atlasTotals: il,
        ensureAtlasDatasetLoaded: nl,
        preloadAtlasDataset: Zu,
      },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  ),
  ef = { class: 'atlas-progress' },
  tf = { class: 'atlas-progress__header' },
  nf = { class: 'atlas-progress__sprites', 'aria-label': 'Preview sprite' },
  sf = { class: 'atlas-progress__meters' },
  rf = { class: 'atlas-meter__bar' },
  of = { class: 'atlas-meter__caption' },
  lf = { key: 0, class: 'atlas-progress__highlights' },
  af = {
    __name: 'AtlasCollectionProgress',
    props: {
      metrics: { type: Object, default: () => ({}) },
      dataset: { type: Object, default: () => ({}) },
      highlights: { type: Array, default: () => [] },
    },
    setup(e) {
      const t = e,
        n = x(() => {
          var u, f, p;
          const o = t.metrics || {};
          return [
            {
              id: 'species',
              label: 'Specie',
              target: o.species || 0,
              current: Array.isArray((u = t.dataset) == null ? void 0 : u.species)
                ? t.dataset.species.length
                : 0,
            },
            {
              id: 'biomes',
              label: 'Biomi',
              target: o.biomes || 0,
              current: Array.isArray((f = t.dataset) == null ? void 0 : f.biomes)
                ? t.dataset.biomes.length
                : 0,
            },
            {
              id: 'encounters',
              label: 'Encounter',
              target: o.encounters || 0,
              current: Array.isArray((p = t.dataset) == null ? void 0 : p.encounters)
                ? t.dataset.encounters.length
                : 0,
            },
          ].map((g) => {
            const m = g.target ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
            return { ...g, percent: m };
          });
        }),
        s = x(() => t.highlights || []),
        i = x(() => {
          var a;
          const o = Array.isArray((a = t.dataset) == null ? void 0 : a.species)
            ? t.dataset.species.slice(0, 4)
            : [];
          return o.length
            ? o.map((u) => r(u.name || u.id))
            : Array.from({ length: 4 }).map((u, f) => r(`NA-${f + 1}`));
        });
      function r(o) {
        const a = ['#38bdf8', '#c084fc', '#f472b6', '#f97316', '#22d3ee'],
          u = Math.abs(l(o)) % a.length,
          f = `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), transparent 55%), linear-gradient(135deg, ${a[u]} 0%, rgba(2, 6, 23, 0.95) 100%)`,
          p = o
            .split(' ')
            .map((g) => g[0])
            .join('')
            .slice(0, 3)
            .toUpperCase();
        return { id: o, initials: p || 'NA', style: { backgroundImage: f } };
      }
      function l(o) {
        let a = 0;
        if (!o) return a;
        for (let u = 0; u < o.length; u += 1) {
          const f = o.charCodeAt(u);
          ((a = (a << 5) - a + f), (a |= 0));
        }
        return a;
      }
      return (o, a) => (
        T(),
        R('section', ef, [
          c('header', tf, [
            a[0] ||
              (a[0] = c(
                'div',
                null,
                [
                  c('h3', null, 'Nebula Atlas · Collezione'),
                  c('p', null, 'Tracking collezionabile basato sul dataset operativo.'),
                ],
                -1,
              )),
            c('ul', nf, [
              (T(!0),
              R(
                Y,
                null,
                ve(
                  i.value,
                  (u) => (
                    T(),
                    R(
                      'li',
                      { key: u.id, style: qt(u.style) },
                      [c('span', null, b(u.initials), 1)],
                      4,
                    )
                  ),
                ),
                128,
              )),
            ]),
          ]),
          c('div', sf, [
            (T(!0),
            R(
              Y,
              null,
              ve(
                n.value,
                (u) => (
                  T(),
                  R('div', { key: u.id, class: 'atlas-meter' }, [
                    c('header', null, [
                      c('h4', null, b(u.label), 1),
                      c('span', null, b(u.percent) + '%', 1),
                    ]),
                    c('div', rf, [
                      c(
                        'div',
                        { class: 'atlas-meter__fill', style: qt({ width: `${u.percent}%` }) },
                        null,
                        4,
                      ),
                    ]),
                    c('p', of, b(u.current) + ' / ' + b(u.target) + ' pronti', 1),
                  ])
                ),
              ),
              128,
            )),
          ]),
          s.value.length
            ? (T(),
              R('aside', lf, [
                a[1] || (a[1] = c('h4', null, 'Highlights curatoriali', -1)),
                c('ul', null, [
                  (T(!0),
                  R(
                    Y,
                    null,
                    ve(s.value, (u) => (T(), R('li', { key: u }, b(u), 1))),
                    128,
                  )),
                ]),
              ]))
            : ue('', !0),
        ])
      );
    },
  },
  cf = ze(af, [['__scopeId', 'data-v-c909580b']]),
  uf = { key: 0, class: 'state-banner', role: 'status', 'aria-live': 'polite' },
  ff = { key: 0, class: 'state-banner__tokens' },
  df = { key: 1, class: 'state-banner__message' },
  pf = { key: 2, class: 'visually-hidden', 'aria-live': 'polite' },
  hf = {
    __name: 'StateBanner',
    props: { tokens: { type: Array, default: () => [] }, message: { type: String, default: '' } },
    setup(e) {
      const t = e,
        n = x(() => t.tokens),
        s = x(() => t.message),
        i = x(() => n.value.length > 0 || !!s.value),
        r = x(() => {
          const l = [];
          return (
            s.value && l.push(s.value),
            n.value.forEach((o) => {
              o != null && o.label && l.push(o.label);
            }),
            l.join('. ')
          );
        });
      return (l, o) =>
        i.value
          ? (T(),
            R('section', uf, [
              n.value.length
                ? (T(),
                  R('div', ff, [
                    (T(!0),
                    R(
                      Y,
                      null,
                      ve(
                        n.value,
                        (a) => (
                          T(),
                          rt(
                            ks,
                            { key: a.id, label: a.label, variant: a.variant, icon: a.icon },
                            null,
                            8,
                            ['label', 'variant', 'icon'],
                          )
                        ),
                      ),
                      128,
                    )),
                  ]))
                : ue('', !0),
              s.value ? (T(), R('p', df, b(s.value), 1)) : ue('', !0),
              eo(l.$slots, 'default', {}, void 0, !0),
              r.value ? (T(), R('p', pf, b(r.value), 1)) : ue('', !0),
            ]))
          : ue('', !0);
    },
  },
  mf = ze(hf, [['__scopeId', 'data-v-f2b2d38a']]),
  gf = { class: 'metric-card__header' },
  _f = { key: 0, class: 'metric-card__caption' },
  vf = { class: 'metric-card__title' },
  bf = { key: 0, class: 'metric-card__status' },
  yf = { key: 0, class: 'metric-card__description' },
  Af = { key: 1, class: 'metric-card__value' },
  Sf = { key: 2, class: 'metric-card__metrics' },
  wf = {
    __name: 'MetricCard',
    props: {
      title: { type: String, required: !0 },
      caption: { type: String, default: '' },
      description: { type: String, default: '' },
      value: { type: [String, Number], default: '' },
      statusLabel: { type: String, default: '' },
      statusVariant: { type: String, default: 'info' },
      statusIcon: { type: String, default: '' },
      state: { type: String, default: 'default' },
      tokens: { type: Array, default: () => [] },
      metrics: { type: Array, default: () => [] },
    },
    setup(e) {
      const t = e,
        n = x(() => t.metrics),
        s = x(() => t.tokens),
        i = x(() => (t.value === 0 ? '0' : t.value));
      return (r, l) => (
        T(),
        R(
          'article',
          { class: mt(['metric-card', [`metric-card--${e.state}`]]) },
          [
            c('header', gf, [
              c('div', null, [
                e.caption ? (T(), R('p', _f, b(e.caption), 1)) : ue('', !0),
                c('h3', vf, b(e.title), 1),
              ]),
              e.statusLabel || s.value.length
                ? (T(),
                  R('div', bf, [
                    e.statusLabel
                      ? (T(),
                        rt(
                          ks,
                          {
                            key: 0,
                            label: e.statusLabel,
                            variant: e.statusVariant,
                            icon: e.statusIcon,
                          },
                          null,
                          8,
                          ['label', 'variant', 'icon'],
                        ))
                      : ue('', !0),
                    (T(!0),
                    R(
                      Y,
                      null,
                      ve(
                        s.value,
                        (o) => (
                          T(),
                          rt(
                            ks,
                            {
                              key: o.id,
                              label: o.label,
                              variant: o.variant,
                              icon: o.icon,
                              compact: '',
                            },
                            null,
                            8,
                            ['label', 'variant', 'icon'],
                          )
                        ),
                      ),
                      128,
                    )),
                  ]))
                : ue('', !0),
            ]),
            e.description ? (T(), R('p', yf, b(e.description), 1)) : ue('', !0),
            i.value ? (T(), R('div', Af, b(i.value), 1)) : ue('', !0),
            n.value.length
              ? (T(),
                R('dl', Sf, [
                  (T(!0),
                  R(
                    Y,
                    null,
                    ve(
                      n.value,
                      (o) => (
                        T(),
                        R('div', { key: o.label }, [
                          c('dt', null, b(o.label), 1),
                          c('dd', null, b(o.value), 1),
                        ])
                      ),
                    ),
                    128,
                  )),
                ]))
              : ue('', !0),
            eo(r.$slots, 'default', {}, void 0, !0),
          ],
          2,
        )
      );
    },
  },
  pr = ze(wf, [['__scopeId', 'data-v-291b691f']]),
  Ef = {
    key: 0,
    class: 'demo-diagnostics',
    'aria-live': 'polite',
    'aria-label': 'Diagnostica demo',
  },
  Tf = { class: 'demo-diagnostics__header' },
  xf = { class: 'demo-diagnostics__summary', 'aria-label': 'Statistiche richieste' },
  Cf = { class: 'demo-diagnostics__summary-value' },
  Rf = { class: 'demo-diagnostics__summary-value' },
  Of = { class: 'demo-diagnostics__summary-value' },
  Pf = { class: 'demo-diagnostics__summary-value' },
  If = { class: 'demo-diagnostics__grid' },
  Nf = { class: 'demo-diagnostics__section', 'aria-label': 'Richieste recenti' },
  Df = { class: 'demo-diagnostics__list' },
  Mf = ['data-status'],
  kf = { class: 'demo-diagnostics__list-header' },
  $f = { class: 'demo-diagnostics__badge' },
  Lf = ['title'],
  Bf = { class: 'demo-diagnostics__meta' },
  Vf = { key: 0, class: 'demo-diagnostics__error' },
  Ff = { key: 1, class: 'demo-diagnostics__message' },
  zf = { key: 0, class: 'demo-diagnostics__empty' },
  jf = { class: 'demo-diagnostics__section', 'aria-label': 'Metriche browser' },
  Hf = { class: 'demo-diagnostics__list' },
  Uf = { class: 'demo-diagnostics__list-header' },
  Gf = { class: 'demo-diagnostics__badge demo-diagnostics__badge--metric' },
  Wf = { class: 'demo-diagnostics__list-value' },
  Kf = { class: 'demo-diagnostics__meta' },
  qf = { key: 0 },
  Qf = { key: 1 },
  Jf = { key: 0, class: 'demo-diagnostics__message' },
  Zf = { key: 0, class: 'demo-diagnostics__empty' },
  Yf = { class: 'demo-diagnostics__section', 'aria-label': 'Log principali' },
  Xf = { class: 'demo-diagnostics__list' },
  ed = { class: 'demo-diagnostics__list-header' },
  td = ['data-level'],
  nd = { class: 'demo-diagnostics__list-title' },
  sd = { class: 'demo-diagnostics__list-value' },
  id = { class: 'demo-diagnostics__message' },
  rd = { key: 0, class: 'demo-diagnostics__empty' },
  od = Xs({
    __name: 'DemoDiagnosticsPanel',
    setup(e) {
      const { enabled: t, fetches: n, fetchSummary: s, metrics: i, logs: r } = Gu(),
        l = x(() => n.value.slice(0, 5)),
        o = x(() => i.value.slice(0, 6)),
        a = x(() => r.value.slice(0, 6));
      function u(v) {
        return v.durationMs === null || Number.isNaN(v.durationMs)
          ? '—'
          : v.durationMs > 1e3
            ? `${(v.durationMs / 1e3).toFixed(1)}s`
            : `${Math.max(0, Math.round(v.durationMs))}ms`;
      }
      function f(v) {
        const w = v.completedAt || v.startedAt;
        return m(w);
      }
      function p(v) {
        return v.status === 'fallback'
          ? 'Fallback attivato'
          : v.status === 'error'
            ? 'Richiesta fallita'
            : v.status === 'success'
              ? v.source === 'remote'
                ? 'Risposta remota'
                : 'Risposta locale'
              : 'In corso';
      }
      function g(v) {
        return Number.isFinite(v) ? (Math.abs(v) >= 1e3 ? `${v.toFixed(0)}` : v.toFixed(2)) : 'n/d';
      }
      function m(v) {
        return new Date(v).toLocaleTimeString('it-IT', { hour12: !1 });
      }
      return (v, w) =>
        ge(t)
          ? (T(),
            R('section', Ef, [
              c('header', Tf, [
                w[4] ||
                  (w[4] = c(
                    'div',
                    null,
                    [
                      c('h3', null, 'Diagnostica demo'),
                      c(
                        'p',
                        null,
                        'Monitoraggio locale di richieste, fallback e osservabilità core.',
                      ),
                    ],
                    -1,
                  )),
                c('ul', xf, [
                  c('li', null, [
                    w[0] ||
                      (w[0] = c(
                        'span',
                        { class: 'demo-diagnostics__summary-label' },
                        'Totali',
                        -1,
                      )),
                    c('span', Cf, b(ge(s).total), 1),
                  ]),
                  c('li', null, [
                    w[1] ||
                      (w[1] = c(
                        'span',
                        { class: 'demo-diagnostics__summary-label' },
                        'Fallback',
                        -1,
                      )),
                    c('span', Rf, b(ge(s).fallback), 1),
                  ]),
                  c('li', null, [
                    w[2] ||
                      (w[2] = c(
                        'span',
                        { class: 'demo-diagnostics__summary-label' },
                        'Errori',
                        -1,
                      )),
                    c('span', Of, b(ge(s).failures), 1),
                  ]),
                  c('li', null, [
                    w[3] ||
                      (w[3] = c(
                        'span',
                        { class: 'demo-diagnostics__summary-label' },
                        'Pendenti',
                        -1,
                      )),
                    c('span', Pf, b(ge(s).pending), 1),
                  ]),
                ]),
              ]),
              c('div', If, [
                c('section', Nf, [
                  w[5] ||
                    (w[5] = c(
                      'header',
                      null,
                      [
                        c('h4', null, 'Richieste'),
                        c('p', null, 'Ultimi tentativi di fetch con fallback e durata.'),
                      ],
                      -1,
                    )),
                  c('ol', Df, [
                    (T(!0),
                    R(
                      Y,
                      null,
                      ve(
                        l.value,
                        (I) => (
                          T(),
                          R(
                            'li',
                            { key: I.id, 'data-status': I.status },
                            [
                              c('div', kf, [
                                c('span', $f, b(I.method), 1),
                                c(
                                  'span',
                                  { class: 'demo-diagnostics__list-title', title: I.url },
                                  b(I.url),
                                  9,
                                  Lf,
                                ),
                              ]),
                              c('p', Bf, [
                                c('span', null, b(p(I)), 1),
                                c('span', null, '⏱ ' + b(u(I)), 1),
                                c('span', null, '🕒 ' + b(f(I)), 1),
                              ]),
                              I.error
                                ? (T(), R('p', Vf, b(I.error), 1))
                                : (T(), R('p', Ff, b(I.message), 1)),
                            ],
                            8,
                            Mf,
                          )
                        ),
                      ),
                      128,
                    )),
                    l.value.length
                      ? ue('', !0)
                      : (T(), R('li', zf, 'Nessuna richiesta registrata')),
                  ]),
                ]),
                c('section', jf, [
                  w[6] ||
                    (w[6] = c(
                      'header',
                      null,
                      [
                        c('h4', null, 'Metriche'),
                        c('p', null, 'Core Web Vitals e performance recenti inviati/localizzati.'),
                      ],
                      -1,
                    )),
                  c('ol', Hf, [
                    (T(!0),
                    R(
                      Y,
                      null,
                      ve(
                        o.value,
                        (I) => (
                          T(),
                          R('li', { key: I.id }, [
                            c('div', Uf, [
                              c('span', Gf, b(I.name), 1),
                              c('span', Wf, b(g(I.value)), 1),
                            ]),
                            c('p', Kf, [
                              I.rating
                                ? (T(), R('span', qf, 'Valutazione: ' + b(I.rating), 1))
                                : ue('', !0),
                              I.delta !== void 0
                                ? (T(), R('span', Qf, 'Δ ' + b(I.delta.toFixed(2)), 1))
                                : ue('', !0),
                              c('span', null, '🕒 ' + b(m(I.timestamp)), 1),
                            ]),
                            I.navigationType
                              ? (T(), R('p', Jf, 'Navigation: ' + b(I.navigationType), 1))
                              : ue('', !0),
                          ])
                        ),
                      ),
                      128,
                    )),
                    o.value.length
                      ? ue('', !0)
                      : (T(), R('li', Zf, 'Metriche non ancora disponibili')),
                  ]),
                ]),
                c('section', Yf, [
                  w[7] ||
                    (w[7] = c(
                      'header',
                      null,
                      [
                        c('h4', null, 'Log'),
                        c('p', null, 'Errori e warning recenti dal client logger.'),
                      ],
                      -1,
                    )),
                  c('ol', Xf, [
                    (T(!0),
                    R(
                      Y,
                      null,
                      ve(
                        a.value,
                        (I) => (
                          T(),
                          R('li', { key: I.id }, [
                            c('div', ed, [
                              c(
                                'span',
                                { class: 'demo-diagnostics__badge', 'data-level': I.level },
                                b(I.level),
                                9,
                                td,
                              ),
                              c('span', nd, b(I.scope), 1),
                              c('span', sd, b(m(I.timestamp)), 1),
                            ]),
                            c('p', id, b(I.message), 1),
                          ])
                        ),
                      ),
                      128,
                    )),
                    a.value.length
                      ? ue('', !0)
                      : (T(), R('li', rd, 'Nessun log critico registrato')),
                  ]),
                ]),
              ]),
            ]))
          : ue('', !0);
    },
  }),
  ld = ze(od, [['__scopeId', 'data-v-ab92adfb']]),
  ad = Symbol('atlas-layout-context'),
  cd = { class: 'atlas-layout' },
  ud = { class: 'atlas-layout__header' },
  fd = { class: 'atlas-layout__intro' },
  dd = { key: 0, class: 'atlas-layout__summary' },
  pd = { class: 'atlas-layout__aside' },
  hd = { class: 'atlas-layout__metrics', 'aria-label': 'Progressione dataset' },
  md = { key: 0, class: 'atlas-layout__nav', 'aria-label': 'Sottosezioni atlas' },
  gd = {
    __name: 'AtlasLayout',
    props: { isDemo: { type: Boolean, default: !1 }, isOffline: { type: Boolean, default: !1 } },
    emits: ['notify'],
    setup(e, { emit: t }) {
      const n = e,
        s = t,
        i = Ou(),
        r = Ru(),
        { title: l, description: o, breadcrumbs: a, tokens: u } = $u(),
        f = sl,
        p = il;
      Qr(() => {
        nl().catch((j) => {
          console.warn('[AtlasLayout] caricamento dataset demo fallito', j);
        });
      });
      const g = x(() => l.value || f.title || 'Nebula Atlas'),
        m = x(() => o.value || f.summary || ''),
        v = x(() => {
          const j = [...(u.value || [])];
          return (
            n.isDemo &&
              !j.some((Z) => Z.id === 'atlas-demo') &&
              j.push({ id: 'atlas-demo', label: 'Modalità demo', variant: 'info', icon: '◎' }),
            n.isOffline &&
              !j.some((Z) => Z.id === 'atlas-offline') &&
              j.push({
                id: 'atlas-offline',
                label: 'Dataset offline',
                variant: 'warning',
                icon: '⚠',
              }),
            j
          );
        }),
        w = x(() =>
          n.isOffline
            ? 'Modalità demo · dataset offline sincronizzato da fallback'
            : n.isDemo
              ? 'Modalità demo attiva per le sezioni Atlas'
              : '',
        ),
        I = x(() =>
          n.isOffline ? [{ id: 'release-offline', label: 'Sync offline', variant: 'warning' }] : [],
        ),
        P = x(() => `Curatori · ${f.curator || 'Da definire'}`),
        M = x(() => {
          var xe, V, B;
          const j = Number((xe = f.metrics) == null ? void 0 : xe.species) || p.species,
            Z = Array.isArray(f.species) ? f.species.length : p.species,
            G = Number((V = f.metrics) == null ? void 0 : V.biomes) || p.biomes,
            te = Array.isArray(f.biomes) ? f.biomes.length : p.biomes,
            de = Number((B = f.metrics) == null ? void 0 : B.encounters) || p.encounters,
            Ae = Array.isArray(f.encounters) ? f.encounters.length : p.encounters;
          return [
            {
              id: 'species',
              title: 'Specie catalogate',
              caption: 'Catalogo Nebula',
              description: 'Blueprint specie pronte per staging.',
              value: `${Z} / ${j}`,
              metrics: [
                { label: 'Target', value: j },
                { label: 'Disponibili', value: Z },
              ],
              state: Z >= j ? 'success' : 'default',
            },
            {
              id: 'biomes',
              title: 'Biomi sincronizzati',
              caption: 'Setup ambientali',
              description: 'Biomi coordinati con telemetria attiva.',
              value: `${te} / ${G}`,
              metrics: [
                { label: 'Target', value: G },
                { label: 'Allineati', value: te },
              ],
              state: te >= G ? 'success' : 'default',
            },
            {
              id: 'encounters',
              title: 'Encounter calibrati',
              caption: 'Lab operativo',
              description: 'Pattern missione pronti per QA freeze.',
              value: `${Ae} / ${de}`,
              metrics: [
                { label: 'Target', value: de },
                { label: 'Disponibili', value: Ae },
              ],
              state: Ae >= de ? 'success' : 'default',
            },
          ];
        }),
        F = x(() => {
          const j = i.name ? String(i.name) : '',
            Z = r.getRoutes().find((te) => te.name === 'console-atlas'),
            G = (Z == null ? void 0 : Z.children) || [];
          return G.length
            ? G.filter((te) => {
                var de;
                return ((de = te.meta) == null ? void 0 : de.breadcrumb) !== !1;
              }).map((te) => {
                var V, B, J;
                const de = te.name ? String(te.name) : te.path,
                  Ae =
                    ((B = (V = te.meta) == null ? void 0 : V.breadcrumb) == null
                      ? void 0
                      : B.label) ||
                    ((J = te.meta) == null ? void 0 : J.title) ||
                    de,
                  xe = te.name ? { name: te.name } : { path: te.path };
                return { name: de, label: Ae, to: xe, active: de === j };
              })
            : [];
        });
      dn(ad, {
        dataset: f,
        totals: p,
        isDemo: x(() => n.isDemo),
        isOffline: x(() => n.isOffline),
        title: g,
        description: m,
        breadcrumbs: a,
      });
      function D(j) {
        s('notify', j);
      }
      return (j, Z) => (
        T(),
        R('section', cd, [
          c('header', ud, [
            c('div', fd, [
              se(mf, { tokens: v.value, message: w.value }, null, 8, ['tokens', 'message']),
              c('div', null, [
                c('h2', null, b(g.value), 1),
                m.value ? (T(), R('p', dd, b(m.value), 1)) : ue('', !0),
              ]),
            ]),
            c('aside', pd, [
              se(
                pr,
                {
                  title: 'Finestra di release',
                  description: P.value,
                  value: ge(f).releaseWindow || 'Non pianificata',
                  tokens: I.value,
                },
                null,
                8,
                ['description', 'value', 'tokens'],
              ),
            ]),
          ]),
          c('section', hd, [
            (T(!0),
            R(
              Y,
              null,
              ve(
                M.value,
                (G) => (
                  T(),
                  rt(
                    pr,
                    {
                      key: G.id,
                      title: G.title,
                      caption: G.caption,
                      description: G.description,
                      value: G.value,
                      metrics: G.metrics,
                      state: G.state,
                    },
                    null,
                    8,
                    ['title', 'caption', 'description', 'value', 'metrics', 'state'],
                  )
                ),
              ),
              128,
            )),
          ]),
          se(
            cf,
            { metrics: ge(f).metrics, dataset: ge(f), highlights: ge(f).highlights },
            null,
            8,
            ['metrics', 'dataset', 'highlights'],
          ),
          F.value.length
            ? (T(),
              R('nav', md, [
                (T(!0),
                R(
                  Y,
                  null,
                  ve(
                    F.value,
                    (G) => (
                      T(),
                      rt(
                        ge(jo),
                        {
                          key: G.name,
                          to: G.to,
                          class: mt([
                            'atlas-layout__nav-link',
                            { 'atlas-layout__nav-link--active': G.active },
                          ]),
                        },
                        { default: Es(() => [So(b(G.label), 1)]), _: 2 },
                        1032,
                        ['to', 'class'],
                      )
                    ),
                  ),
                  128,
                )),
              ]))
            : ue('', !0),
          se(ge(Ho), null, {
            default: Es(({ Component: G }) => [
              (T(),
              rt(
                fa(G),
                { dataset: ge(f), 'is-demo': e.isDemo, 'is-offline': e.isOffline, onNotify: D },
                null,
                40,
                ['dataset', 'is-demo', 'is-offline'],
              )),
            ]),
            _: 1,
          }),
          e.isDemo ? (T(), rt(ld, { key: 1, class: 'atlas-layout__diagnostics' })) : ue('', !0),
        ])
      );
    },
  },
  _d = ze(gd, [['__scopeId', 'data-v-ce49b0f7']]),
  Ih = Object.freeze(
    Object.defineProperty({ __proto__: null, default: _d }, Symbol.toStringTag, {
      value: 'Module',
    }),
  ),
  vd = { class: 'nebula-atlas-view' },
  bd = { key: 0, class: 'nebula-atlas-view__banner', role: 'status' },
  yd = { class: 'nebula-atlas-view__banner-meta' },
  Ad = { class: 'nebula-atlas-view__live', 'aria-live': 'polite' },
  Sd = { class: 'nebula-atlas-view__live-header' },
  wd = { class: 'nebula-atlas-view__status' },
  Ed = ['data-tone'],
  Td = { key: 0, class: 'nebula-atlas-view__error', role: 'status' },
  xd = { key: 1, class: 'nebula-atlas-view__grid' },
  Cd = { class: 'nebula-atlas-view__metrics' },
  Rd = ['data-tone'],
  Od = { class: 'nebula-atlas-view__readiness' },
  Pd = ['data-tone', 'data-mode'],
  Id = { class: 'nebula-atlas-view__chip-label' },
  Nd = { key: 0 },
  Dd = { class: 'nebula-atlas-view__chart', 'aria-label': 'Copertura QA' },
  Md = { class: 'nebula-atlas-view__chart', 'aria-label': 'Incidenti telemetria' },
  kd = { class: 'nebula-atlas-view__chart', 'aria-label': 'High priority' },
  $d = { class: 'nebula-atlas-view__generator', 'aria-label': 'Telemetria generatore' },
  Ld = ['data-tone'],
  Bd = { class: 'nebula-atlas-view__generator-meta' },
  Vd = { class: 'nebula-atlas-view__metrics nebula-atlas-view__metrics--generator' },
  Fd = ['data-tone'],
  zd = { key: 0 },
  jd = { class: 'nebula-atlas-view__generator-charts' },
  Hd = { class: 'nebula-atlas-view__chart', 'aria-label': 'Tempo generazione' },
  Ud = { class: 'nebula-atlas-view__chart', 'aria-label': 'Specie generate' },
  Gd = { class: 'nebula-atlas-view__chart', 'aria-label': 'Blueprint arricchiti' },
  Wd = { class: 'nebula-atlas-view__footer' },
  Kd = {
    __name: 'AtlasOverviewView',
    setup(e) {
      const t = Ls(),
        n = x(() => {
          var B;
          const V = (B = t.datasetStatus) == null ? void 0 : B.value;
          return V || { source: 'remote', label: 'Dataset live', offline: !1, demo: !1 };
        }),
        s = x(() => {
          const V = t.header.value || {},
            B = t.telemetrySummary.value;
          return {
            title: V.title || 'Nebula Atlas Dataset',
            summary: V.summary || '',
            datasetLabel: n.value.label,
            telemetryLabel: B.sourceLabel,
          };
        }),
        i = x(() => t.telemetryStatus.value),
        r = x(() => n.value.offline || i.value.offline),
        l = x(() => t.error.value),
        o = x(() => t.telemetrySummary.value.lastEventLabel),
        a = x(() => {
          const V = t.telemetrySummary.value;
          return [
            { id: 'total', label: 'Eventi totali', value: V.total, tone: 'neutral' },
            {
              id: 'open',
              label: 'Eventi aperti',
              value: V.open,
              tone: V.open > 0 ? 'warning' : 'success',
            },
            {
              id: 'high',
              label: 'Priorità alta',
              value: V.highPriority,
              tone: V.highPriority > 0 ? 'critical' : 'neutral',
            },
            { id: 'ack', label: 'Acknowledged', value: V.acknowledged, tone: 'success' },
          ];
        }),
        u = x(() => {
          const V = t.telemetryDistribution.value,
            B = i.value,
            J = n.value,
            Le = [
              { id: 'success', label: 'Pronte', tone: 'success', value: V.success },
              { id: 'warning', label: 'In attesa', tone: 'warning', value: V.warning },
              { id: 'neutral', label: 'Neutrali', tone: 'neutral', value: V.neutral },
              { id: 'critical', label: 'Bloccate', tone: 'critical', value: V.critical },
            ];
          if (r.value) {
            let me = 'Modalità demo';
            return (
              B.offline
                ? (me = B.mode === 'fallback' ? 'Offline fallback' : 'Telemetria demo')
                : J.source === 'fallback'
                  ? (me = 'Dataset fallback')
                  : J.source === 'static' && (me = 'Dataset demo'),
              Le.map((ie) => ({ ...ie, demo: !0, badge: me }))
            );
          }
          return Le.map((me) => ({ ...me, demo: !1, badge: '' }));
        }),
        f = x(() => t.telemetryStreams.value.coverage),
        p = x(() => t.telemetryStreams.value.incidents),
        g = x(() => t.telemetryStreams.value.highPriority),
        m = x(() => {
          var B;
          const V = (B = t.generatorStatus) == null ? void 0 : B.value;
          return (
            V || {
              status: 'unknown',
              label: 'Generatore non disponibile',
              generatedAt: null,
              updatedAt: null,
              sourceLabel: 'Generator telemetry offline',
            }
          );
        }),
        v = x(() => {
          var B;
          const V = (B = t.generatorMetrics) == null ? void 0 : B.value;
          return (
            V || {
              generationTimeMs: null,
              speciesTotal: 0,
              enrichedSpecies: 0,
              eventTotal: 0,
              datasetSpeciesTotal: 0,
              coverageAverage: 0,
              coreTraits: 0,
              optionalTraits: 0,
              synergyTraits: 0,
              expectedCoreTraits: 0,
            }
          );
        }),
        w = x(() => {
          var B;
          const V = (B = t.generatorStreams) == null ? void 0 : B.value;
          return V || { generationTime: [], species: [], enriched: [] };
        });
      function I(V) {
        if (!V) return 'N/D';
        const B = new Date(V);
        return Number.isNaN(B.getTime())
          ? V
          : new Intl.DateTimeFormat('it-IT', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).format(B);
      }
      const P = x(() => m.value.label),
        M = x(() => I(m.value.generatedAt || m.value.updatedAt)),
        F = x(() => m.value.sourceLabel),
        D = x(() => {
          const V = m.value.status;
          return V === 'success'
            ? 'success'
            : V === 'warning' || V === 'degraded'
              ? 'warning'
              : V === 'unknown'
                ? 'neutral'
                : 'offline';
        }),
        j = x(() => {
          const V = v.value,
            B = typeof V.coverageAverage == 'number' ? V.coverageAverage : 0,
            J = V.datasetSpeciesTotal || 0;
          return [
            { id: 'species-total', label: 'Specie totali', value: V.speciesTotal, tone: 'neutral' },
            {
              id: 'enriched',
              label: 'Blueprint arricchiti',
              value: V.enrichedSpecies,
              tone: V.enrichedSpecies >= J ? 'success' : 'warning',
              meta: J ? `Target ${J}` : '',
            },
            {
              id: 'events',
              label: 'Eventi runtime',
              value: V.eventTotal,
              tone: V.eventTotal > 0 ? 'warning' : 'success',
            },
            {
              id: 'coverage',
              label: 'Copertura atlas',
              value: `${B}%`,
              tone: B >= 75 ? 'success' : 'neutral',
            },
          ];
        }),
        Z = x(() =>
          t.loading.value
            ? 'neutral'
            : r.value
              ? 'offline'
              : t.telemetrySummary.value.open > 0
                ? 'warning'
                : 'success',
        ),
        G = x(() =>
          t.loading.value
            ? 'Aggiornamento…'
            : i.value.offline
              ? i.value.label
              : n.value.offline
                ? n.value.label
                : t.telemetrySummary.value.lastEventLabel,
        ),
        te = x(() => {
          const V = t.telemetrySummary.value,
            B = [V.updatedAt ? V.updatedAt : '—'];
          return (
            n.value.offline && B.push(n.value.label),
            V.isDemo && V.sourceLabel && V.sourceLabel !== n.value.label && B.push(V.sourceLabel),
            B.filter(Boolean).join(' · ')
          );
        }),
        de = x(() => i.value.variant),
        Ae = () => t.refresh(),
        xe = () =>
          typeof t.activateDemoTelemetry == 'function' ? t.activateDemoTelemetry() : t.refresh();
      return (V, B) => (
        T(),
        R('section', vd, [
          r.value
            ? (T(),
              R('aside', bd, [
                c('div', null, [
                  B[2] || (B[2] = c('h2', null, 'Modalità demo attiva', -1)),
                  c(
                    'p',
                    null,
                    ' Il dataset ' +
                      b(s.value.title) +
                      ' è disponibile in modalità offline coordinata e la console mantiene sincronizzazioni di supporto per garantire la continuità operativa. ',
                    1,
                  ),
                  c('ul', yd, [
                    c('li', null, [
                      B[0] || (B[0] = c('span', null, 'Dataset', -1)),
                      c('strong', null, b(s.value.datasetLabel), 1),
                    ]),
                    c('li', null, [
                      B[1] || (B[1] = c('span', null, 'Telemetria', -1)),
                      c('strong', null, b(i.value.label), 1),
                    ]),
                  ]),
                ]),
                c('div', { class: 'nebula-atlas-view__banner-actions' }, [
                  c(
                    'button',
                    { type: 'button', class: 'nebula-atlas-view__banner-button', onClick: Ae },
                    ' Riprova sincronizzazione ',
                  ),
                  c(
                    'button',
                    { type: 'button', class: 'nebula-atlas-view__banner-button', onClick: xe },
                    ' Forza telemetria demo ',
                  ),
                ]),
              ]))
            : ue('', !0),
          se(
            rl,
            {
              header: ge(t).header,
              cards: ge(t).cards,
              'timeline-entries': ge(t).timelineEntries,
              'evolution-matrix': ge(t).evolutionMatrix,
              share: ge(t).share,
              'telemetry-status': ge(t).telemetryStatus.value,
            },
            null,
            8,
            [
              'header',
              'cards',
              'timeline-entries',
              'evolution-matrix',
              'share',
              'telemetry-status',
            ],
          ),
          c('section', Ad, [
            c('header', Sd, [
              B[3] ||
                (B[3] = c(
                  'div',
                  null,
                  [
                    c('h3', null, 'Telemetria live'),
                    c(
                      'p',
                      null,
                      'Indicatori dal generatore Nebula combinati con il dataset atlas.',
                    ),
                  ],
                  -1,
                )),
              c('div', wd, [
                c(
                  'span',
                  { class: 'nebula-atlas-view__badge', 'data-tone': Z.value },
                  b(G.value),
                  9,
                  Ed,
                ),
                c('small', null, 'Ultimo sync: ' + b(te.value), 1),
              ]),
            ]),
            l.value
              ? (T(), R('div', Td, b(l.value.message), 1))
              : (T(),
                R('div', xd, [
                  c('div', Cd, [
                    (T(!0),
                    R(
                      Y,
                      null,
                      ve(
                        a.value,
                        (J) => (
                          T(),
                          R(
                            'article',
                            { key: J.id, class: 'nebula-atlas-view__metric', 'data-tone': J.tone },
                            [c('h4', null, b(J.label), 1), c('strong', null, b(J.value), 1)],
                            8,
                            Rd,
                          )
                        ),
                      ),
                      128,
                    )),
                  ]),
                  c('div', Od, [
                    B[4] || (B[4] = c('h4', null, 'Readiness branchi', -1)),
                    c('ul', null, [
                      (T(!0),
                      R(
                        Y,
                        null,
                        ve(
                          u.value,
                          (J) => (
                            T(),
                            R(
                              'li',
                              {
                                key: J.id,
                                'data-tone': J.tone,
                                'data-mode': J.demo ? 'demo' : 'live',
                              },
                              [
                                c('div', Id, [
                                  c('span', null, b(J.label), 1),
                                  J.demo ? (T(), R('small', Nd, b(J.badge), 1)) : ue('', !0),
                                ]),
                                c('strong', null, b(J.value), 1),
                              ],
                              8,
                              Pd,
                            )
                          ),
                        ),
                        128,
                      )),
                    ]),
                  ]),
                  c('div', Dd, [
                    c('header', null, [
                      B[5] || (B[5] = c('h4', null, 'Copertura QA media', -1)),
                      c('span', null, b(ge(t).telemetryCoverageAverage) + '%', 1),
                    ]),
                    se(He, { points: f.value, color: '#61d5ff', variant: de.value }, null, 8, [
                      'points',
                      'variant',
                    ]),
                  ]),
                  c('div', Md, [
                    c('header', null, [
                      B[6] || (B[6] = c('h4', null, 'Incidenti ultimi 7 giorni', -1)),
                      c('span', null, b(p.value.reduce((J, Le) => J + Le, 0)), 1),
                    ]),
                    se(He, { points: p.value, color: '#ff6982', variant: de.value }, null, 8, [
                      'points',
                      'variant',
                    ]),
                  ]),
                  c('div', kd, [
                    c('header', null, [
                      B[7] || (B[7] = c('h4', null, 'High priority', -1)),
                      c('span', null, b(g.value.reduce((J, Le) => J + Le, 0)), 1),
                    ]),
                    se(He, { points: g.value, color: '#f4c060', variant: de.value }, null, 8, [
                      'points',
                      'variant',
                    ]),
                  ]),
                  c('div', $d, [
                    c('header', null, [
                      c('div', null, [
                        B[8] || (B[8] = c('h4', null, 'Generatore Nebula', -1)),
                        c('small', null, b(F.value), 1),
                      ]),
                      c(
                        'span',
                        { class: 'nebula-atlas-view__badge', 'data-tone': D.value },
                        b(P.value),
                        9,
                        Ld,
                      ),
                    ]),
                    c('p', Bd, 'Ultima run: ' + b(M.value), 1),
                    c('div', Vd, [
                      (T(!0),
                      R(
                        Y,
                        null,
                        ve(
                          j.value,
                          (J) => (
                            T(),
                            R(
                              'article',
                              {
                                key: J.id,
                                class: 'nebula-atlas-view__metric',
                                'data-tone': J.tone,
                              },
                              [
                                c('h4', null, b(J.label), 1),
                                c('strong', null, b(J.value), 1),
                                J.meta ? (T(), R('small', zd, b(J.meta), 1)) : ue('', !0),
                              ],
                              8,
                              Fd,
                            )
                          ),
                        ),
                        128,
                      )),
                    ]),
                    c('div', jd, [
                      c('div', Hd, [
                        c('header', null, [
                          B[9] || (B[9] = c('h4', null, 'Tempo generazione', -1)),
                          c('span', null, b(v.value.generationTimeMs ?? '—') + ' ms', 1),
                        ]),
                        se(
                          He,
                          { points: w.value.generationTime, color: '#7c5cff', variant: de.value },
                          null,
                          8,
                          ['points', 'variant'],
                        ),
                      ]),
                      c('div', Ud, [
                        c('header', null, [
                          B[10] || (B[10] = c('h4', null, 'Specie generate', -1)),
                          c('span', null, b(v.value.speciesTotal), 1),
                        ]),
                        se(
                          He,
                          { points: w.value.species, color: '#4ade80', variant: de.value },
                          null,
                          8,
                          ['points', 'variant'],
                        ),
                      ]),
                      c('div', Gd, [
                        c('header', null, [
                          B[11] || (B[11] = c('h4', null, 'Blueprint arricchiti', -1)),
                          c('span', null, b(v.value.enrichedSpecies), 1),
                        ]),
                        se(
                          He,
                          { points: w.value.enriched, color: '#ff99cc', variant: de.value },
                          null,
                          8,
                          ['points', 'variant'],
                        ),
                      ]),
                    ]),
                  ]),
                ])),
            c('footer', Wd, [
              c('span', null, b(o.value), 1),
              c('div', { class: 'nebula-atlas-view__controls' }, [
                c(
                  'button',
                  { type: 'button', class: 'nebula-atlas-view__refresh', onClick: Ae },
                  'Aggiorna ora',
                ),
                c(
                  'button',
                  { type: 'button', class: 'nebula-atlas-view__refresh', onClick: xe },
                  'Carica mock',
                ),
              ]),
            ]),
          ]),
        ])
      );
    },
  },
  qd = ze(Kd, [['__scopeId', 'data-v-b3d0a007']]),
  Nh = Object.freeze(
    Object.defineProperty({ __proto__: null, default: qd }, Symbol.toStringTag, {
      value: 'Module',
    }),
  ),
  Qd = { class: 'atlas-evogene-deck' },
  Jd = { class: 'atlas-evogene-deck__grid' },
  Zd = { class: 'atlas-evogene-deck__rarity' },
  Yd = ['data-state'],
  Xd = { class: 'atlas-evogene-deck__synopsis' },
  ep = { class: 'atlas-evogene-deck__meta', 'aria-label': 'Dati operativi' },
  tp = { class: 'atlas-evogene-deck__traits' },
  np = { class: 'atlas-evogene-deck__footer' },
  sp = {
    __name: 'AtlasEvoGeneDeckView',
    props: {
      dataset: { type: Object, required: !0 },
      isDemo: { type: Boolean, default: !1 },
      isOffline: { type: Boolean, default: !1 },
    },
    setup(e) {
      const t = e,
        n = x(() => (Array.isArray(t.dataset.species) ? t.dataset.species : []));
      function s(l) {
        return typeof l != 'number' ? '—' : `${Math.round(l * 100)}%`;
      }
      function i(l) {
        if (!l) return '—';
        const o = new Date(l);
        return Number.isNaN(o.getTime())
          ? l
          : new Intl.DateTimeFormat('it-IT', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }).format(o);
      }
      function r(l) {
        if (!l) return 'unknown';
        const o = l.toLowerCase();
        return o.includes('approvazione')
          ? 'pending'
          : o.includes('qa freeze') || o.includes('in staging')
            ? 'progress'
            : o.includes('pronto') || o.includes('completato')
              ? 'ready'
              : 'info';
      }
      return (l, o) => (
        T(),
        R('section', Qd, [
          o[9] ||
            (o[9] = c(
              'header',
              { class: 'atlas-evogene-deck__header' },
              [
                c('h3', null, 'EvoGene Deck Nebula'),
                c(
                  'p',
                  null,
                  ' Specie focalizzate sul dataset Nebula: solo blueprint già normalizzati secondo i tratti fotonici e pronti per staging/QA. ',
                ),
              ],
              -1,
            )),
          c('div', Jd, [
            (T(!0),
            R(
              Y,
              null,
              ve(
                n.value,
                (a) => (
                  T(),
                  R('article', { key: a.id, class: 'atlas-evogene-deck__card' }, [
                    c('header', null, [
                      c('div', null, [c('p', Zd, b(a.rarity), 1), c('h4', null, b(a.name), 1)]),
                      c(
                        'span',
                        { class: 'atlas-evogene-deck__badge', 'data-state': r(a.readiness) },
                        b(a.readiness),
                        9,
                        Yd,
                      ),
                    ]),
                    c('p', Xd, b(a.synopsis), 1),
                    c('dl', ep, [
                      c('div', null, [
                        o[0] || (o[0] = c('dt', null, 'Archetipo', -1)),
                        c('dd', null, b(a.archetype), 1),
                      ]),
                      c('div', null, [
                        o[1] || (o[1] = c('dt', null, 'Threat', -1)),
                        c('dd', null, b(a.threatTier), 1),
                      ]),
                      c('div', null, [
                        o[2] || (o[2] = c('dt', null, 'Energia', -1)),
                        c('dd', null, b(a.energyProfile), 1),
                      ]),
                    ]),
                    c('div', tp, [
                      c('div', null, [
                        o[3] || (o[3] = c('h5', null, 'Core', -1)),
                        c('ul', null, [
                          (T(!0),
                          R(
                            Y,
                            null,
                            ve(a.traits.core, (u) => (T(), R('li', { key: u }, b(u), 1))),
                            128,
                          )),
                        ]),
                      ]),
                      c('div', null, [
                        o[4] || (o[4] = c('h5', null, 'Optional', -1)),
                        c('ul', null, [
                          (T(!0),
                          R(
                            Y,
                            null,
                            ve(a.traits.optional, (u) => (T(), R('li', { key: u }, b(u), 1))),
                            128,
                          )),
                        ]),
                      ]),
                      c('div', null, [
                        o[5] || (o[5] = c('h5', null, 'Sinergie', -1)),
                        c('ul', null, [
                          (T(!0),
                          R(
                            Y,
                            null,
                            ve(a.traits.synergy, (u) => (T(), R('li', { key: u }, b(u), 1))),
                            128,
                          )),
                        ]),
                      ]),
                    ]),
                    c('footer', np, [
                      c('div', null, [
                        o[6] || (o[6] = c('strong', null, 'Habitat', -1)),
                        c('span', null, b(a.habitats.join(', ')), 1),
                      ]),
                      c('div', null, [
                        o[7] || (o[7] = c('strong', null, 'Copertura QA', -1)),
                        c(
                          'span',
                          null,
                          b(s(a.telemetry.coverage)) + ' · ' + b(i(a.telemetry.lastValidation)),
                          1,
                        ),
                      ]),
                      c('div', null, [
                        o[8] || (o[8] = c('strong', null, 'Curatore', -1)),
                        c('span', null, b(a.telemetry.curatedBy), 1),
                      ]),
                    ]),
                  ])
                ),
              ),
              128,
            )),
          ]),
        ])
      );
    },
  },
  ip = ze(sp, [['__scopeId', 'data-v-53f06848']]),
  Dh = Object.freeze(
    Object.defineProperty({ __proto__: null, default: ip }, Symbol.toStringTag, {
      value: 'Module',
    }),
  ),
  rp = { class: 'atlas-world' },
  op = { class: 'atlas-world__grid' },
  lp = { class: 'atlas-world__hazard' },
  ap = { class: 'atlas-world__story' },
  cp = { class: 'atlas-world__meta', 'aria-label': 'Piano operativo' },
  up = {
    __name: 'AtlasWorldBuilderView',
    props: {
      dataset: { type: Object, required: !0 },
      isDemo: { type: Boolean, default: !1 },
      isOffline: { type: Boolean, default: !1 },
    },
    setup(e) {
      const t = e,
        n = x(() => (Array.isArray(t.dataset.biomes) ? t.dataset.biomes : []));
      return (s, i) => (
        T(),
        R('section', rp, [
          i[4] ||
            (i[4] = c(
              'header',
              { class: 'atlas-world__header' },
              [
                c('h3', null, 'World Builder'),
                c(
                  'p',
                  null,
                  ' Blueprint ambientali con preset già filtrati per il branch Nebula. Ogni ambiente include hazard stabilizzati e corridoi di ingaggio suggeriti. ',
                ),
              ],
              -1,
            )),
          c('div', op, [
            (T(!0),
            R(
              Y,
              null,
              ve(
                n.value,
                (r) => (
                  T(),
                  R('article', { key: r.id, class: 'atlas-world__card' }, [
                    c('header', null, [c('h4', null, b(r.name), 1), c('span', lp, b(r.hazard), 1)]),
                    c('p', ap, b(r.storyHook), 1),
                    c('dl', cp, [
                      c('div', null, [
                        i[0] || (i[0] = c('dt', null, 'Stabilità', -1)),
                        c('dd', null, b(r.stability), 1),
                      ]),
                      c('div', null, [
                        i[1] || (i[1] = c('dt', null, 'Operazioni', -1)),
                        c('dd', null, b(r.operations.join(', ')), 1),
                      ]),
                      c('div', null, [
                        i[2] || (i[2] = c('dt', null, 'Corridoi', -1)),
                        c('dd', null, b(r.lanes.join(', ')), 1),
                      ]),
                    ]),
                    c('footer', null, [
                      i[3] || (i[3] = c('strong', null, 'Infiltrazione', -1)),
                      c('p', null, b(r.infiltration), 1),
                    ]),
                  ])
                ),
              ),
              128,
            )),
          ]),
        ])
      );
    },
  },
  fp = ze(up, [['__scopeId', 'data-v-9f2666ee']]),
  Mh = Object.freeze(
    Object.defineProperty({ __proto__: null, default: fp }, Symbol.toStringTag, {
      value: 'Module',
    }),
  ),
  dp = { class: 'atlas-encounter' },
  pp = { class: 'atlas-encounter__grid' },
  hp = { class: 'atlas-encounter__focus' },
  mp = ['data-state'],
  gp = { class: 'atlas-encounter__meta', 'aria-label': 'Parametri' },
  _p = { class: 'atlas-encounter__squads', 'aria-label': 'Squadre' },
  vp = { class: 'atlas-encounter__footer' },
  bp = { class: 'atlas-encounter__approvals', 'aria-label': 'Approvazioni' },
  yp = ['onClick'],
  Ap = {
    __name: 'AtlasEncounterLabView',
    props: {
      dataset: { type: Object, required: !0 },
      isDemo: { type: Boolean, default: !1 },
      isOffline: { type: Boolean, default: !1 },
    },
    emits: ['notify'],
    setup(e, { emit: t }) {
      const n = t,
        s = e,
        i = x(() => (Array.isArray(s.dataset.encounters) ? s.dataset.encounters : []));
      function r(o) {
        if (!o) return 'unknown';
        const a = o.toLowerCase();
        return a.includes('approvazione')
          ? 'pending'
          : a.includes('monitoraggio')
            ? 'progress'
            : a.includes('staging') || a.includes('pronto')
              ? 'ready'
              : 'info';
      }
      function l(o) {
        n('notify', { id: o.id, name: o.name, readiness: o.readiness, approvals: o.approvals });
      }
      return (o, a) => (
        T(),
        R('section', dp, [
          a[5] ||
            (a[5] = c(
              'header',
              { class: 'atlas-encounter__header' },
              [
                c('h3', null, 'Encounter Lab'),
                c(
                  'p',
                  null,
                  ' Varianti Nebula già filtrate per il laboratorio incontri. Ogni scenario eredita slot e squadre dalla pipeline QA e mette in evidenza approvazioni mancanti. ',
                ),
              ],
              -1,
            )),
          c('div', pp, [
            (T(!0),
            R(
              Y,
              null,
              ve(
                i.value,
                (u) => (
                  T(),
                  R('article', { key: u.id, class: 'atlas-encounter__card' }, [
                    c('header', null, [
                      c('div', null, [c('h4', null, b(u.name), 1), c('p', hp, b(u.focus), 1)]),
                      c(
                        'span',
                        { class: 'atlas-encounter__badge', 'data-state': r(u.readiness) },
                        b(u.readiness),
                        9,
                        mp,
                      ),
                    ]),
                    c('dl', gp, [
                      c('div', null, [
                        a[0] || (a[0] = c('dt', null, 'Biome', -1)),
                        c('dd', null, b(u.biomeId), 1),
                      ]),
                      c('div', null, [
                        a[1] || (a[1] = c('dt', null, 'Cadenza', -1)),
                        c('dd', null, b(u.cadence), 1),
                      ]),
                      c('div', null, [
                        a[2] || (a[2] = c('dt', null, 'Densità', -1)),
                        c('dd', null, b(u.density), 1),
                      ]),
                      c('div', null, [
                        a[3] || (a[3] = c('dt', null, 'Ingressi', -1)),
                        c('dd', null, b(u.entryPoints.join(', ')), 1),
                      ]),
                    ]),
                    c('section', _p, [
                      (T(!0),
                      R(
                        Y,
                        null,
                        ve(
                          u.squads,
                          (f) => (
                            T(),
                            R('article', { key: `${u.id}-${f.role}` }, [
                              c('h5', null, b(f.role), 1),
                              c('ul', null, [
                                (T(!0),
                                R(
                                  Y,
                                  null,
                                  ve(f.units, (p) => (T(), R('li', { key: p }, b(p), 1))),
                                  128,
                                )),
                              ]),
                            ])
                          ),
                        ),
                        128,
                      )),
                    ]),
                    c('footer', vp, [
                      c('div', bp, [
                        a[4] || (a[4] = c('strong', null, 'Approvazioni richieste', -1)),
                        c('ul', null, [
                          (T(!0),
                          R(
                            Y,
                            null,
                            ve(u.approvals, (f) => (T(), R('li', { key: f }, b(f), 1))),
                            128,
                          )),
                        ]),
                      ]),
                      c(
                        'button',
                        { type: 'button', class: 'atlas-encounter__notify', onClick: (f) => l(u) },
                        ' Notifica team QA ',
                        8,
                        yp,
                      ),
                    ]),
                  ])
                ),
              ),
              128,
            )),
          ]),
        ])
      );
    },
  },
  Sp = ze(Ap, [['__scopeId', 'data-v-8a154991']]),
  kh = Object.freeze(
    Object.defineProperty({ __proto__: null, default: Sp }, Symbol.toStringTag, {
      value: 'Module',
    }),
  ),
  wp = { class: 'atlas-telemetry', 'aria-live': 'polite' },
  Ep = { class: 'atlas-telemetry__header' },
  Tp = ['data-mode'],
  xp = { key: 0, class: 'atlas-telemetry__error' },
  Cp = { key: 1, class: 'atlas-telemetry__grid' },
  Rp = { class: 'atlas-telemetry__panel' },
  Op = { class: 'atlas-telemetry__summary' },
  Pp = ['data-tone'],
  Ip = ['data-tone'],
  Np = { class: 'atlas-telemetry__updated' },
  Dp = { class: 'atlas-telemetry__panel' },
  Mp = { class: 'atlas-telemetry__chips' },
  kp = ['data-tone'],
  $p = { key: 0 },
  Lp = { class: 'atlas-telemetry__panel atlas-telemetry__panel--chart' },
  Bp = { class: 'atlas-telemetry__panel atlas-telemetry__panel--chart' },
  Vp = { class: 'atlas-telemetry__panel atlas-telemetry__panel--chart' },
  Fp = {
    __name: 'AtlasTelemetryView',
    setup(e) {
      const t = Ls(),
        n = x(() => {
          var v;
          const m = (v = t.datasetStatus) == null ? void 0 : v.value;
          return m || { label: 'Dataset live', source: 'remote', demo: !1 };
        }),
        s = x(() => t.telemetryStatus.value),
        i = x(() => {
          var m;
          return ((m = t.error.value) == null ? void 0 : m.message) || null;
        }),
        r = x(() => t.telemetrySummary.value),
        l = x(() => t.telemetryCoverageAverage.value),
        o = x(() => t.telemetryStreams.value.coverage),
        a = x(() => t.telemetryStreams.value.incidents),
        u = x(() => t.telemetryStreams.value.highPriority),
        f = x(() => {
          const m = t.telemetryDistribution.value,
            v = s.value,
            w = n.value,
            I = [
              { id: 'success', label: 'Pronte', tone: 'success', value: m.success },
              { id: 'warning', label: 'In attesa', tone: 'warning', value: m.warning },
              { id: 'neutral', label: 'Neutrali', tone: 'neutral', value: m.neutral },
              { id: 'critical', label: 'Bloccate', tone: 'critical', value: m.critical },
            ];
          if (v.offline || w.source !== 'remote' || w.demo) {
            const P = v.mode === 'mock' ? 'Telemetria demo' : 'Fallback dataset';
            return I.map((M) => ({ ...M, badge: P }));
          }
          return I.map((P) => ({ ...P, badge: '' }));
        }),
        p = () => t.refresh(),
        g = () =>
          typeof t.activateDemoTelemetry == 'function' ? t.activateDemoTelemetry() : t.refresh();
      return (m, v) => (
        T(),
        R('section', wp, [
          c('header', Ep, [
            c('div', null, [
              v[0] || (v[0] = c('h2', null, 'Telemetria Nebula', -1)),
              c(
                'p',
                { class: 'atlas-telemetry__status', 'data-mode': s.value.mode },
                b(s.value.label) + ' · ' + b(n.value.label),
                9,
                Tp,
              ),
            ]),
            c('div', { class: 'atlas-telemetry__actions' }, [
              c('button', { type: 'button', onClick: p }, 'Aggiorna ora'),
              c('button', { type: 'button', onClick: g }, 'Modalità demo'),
            ]),
          ]),
          i.value
            ? (T(), R('p', xp, b(i.value), 1))
            : (T(),
              R('section', Cp, [
                c('article', Rp, [
                  v[5] || (v[5] = c('h3', null, 'Riepilogo eventi', -1)),
                  c('ul', Op, [
                    c('li', null, [
                      v[1] || (v[1] = c('span', null, 'Eventi totali', -1)),
                      c('strong', null, b(r.value.total), 1),
                    ]),
                    c('li', null, [
                      v[2] || (v[2] = c('span', null, 'Eventi aperti', -1)),
                      c(
                        'strong',
                        { 'data-tone': r.value.open > 0 ? 'warning' : 'success' },
                        b(r.value.open),
                        9,
                        Pp,
                      ),
                    ]),
                    c('li', null, [
                      v[3] || (v[3] = c('span', null, 'Priorità alta', -1)),
                      c(
                        'strong',
                        { 'data-tone': r.value.highPriority > 0 ? 'critical' : 'neutral' },
                        b(r.value.highPriority),
                        9,
                        Ip,
                      ),
                    ]),
                    c('li', null, [
                      v[4] || (v[4] = c('span', null, 'Acknowledged', -1)),
                      c('strong', null, b(r.value.acknowledged), 1),
                    ]),
                  ]),
                  c('p', Np, 'Ultimo evento: ' + b(r.value.lastEventLabel), 1),
                ]),
                c('article', Dp, [
                  v[6] || (v[6] = c('h3', null, 'Distribuzione readiness', -1)),
                  c('ul', Mp, [
                    (T(!0),
                    R(
                      Y,
                      null,
                      ve(
                        f.value,
                        (w) => (
                          T(),
                          R(
                            'li',
                            { key: w.id, 'data-tone': w.tone },
                            [
                              c('span', null, b(w.label), 1),
                              c('strong', null, b(w.value), 1),
                              w.badge ? (T(), R('small', $p, b(w.badge), 1)) : ue('', !0),
                            ],
                            8,
                            kp,
                          )
                        ),
                      ),
                      128,
                    )),
                  ]),
                ]),
                c('article', Lp, [
                  c('header', null, [
                    v[7] || (v[7] = c('h3', null, 'Copertura QA', -1)),
                    c('span', null, b(l.value) + '%', 1),
                  ]),
                  se(He, { points: o.value, color: '#4f46e5' }, null, 8, ['points']),
                ]),
                c('article', Bp, [
                  v[8] ||
                    (v[8] = c(
                      'header',
                      null,
                      [c('h3', null, 'Timeline incidenti'), c('span', null, '7 giorni')],
                      -1,
                    )),
                  se(He, { points: a.value, color: '#0ea5e9' }, null, 8, ['points']),
                ]),
                c('article', Vp, [
                  v[9] ||
                    (v[9] = c(
                      'header',
                      null,
                      [c('h3', null, 'High priority'), c('span', null, 'Ticket giornalieri')],
                      -1,
                    )),
                  se(He, { points: u.value, color: '#f97316' }, null, 8, ['points']),
                ]),
              ])),
        ])
      );
    },
  },
  zp = ze(Fp, [['__scopeId', 'data-v-a3771212']]),
  $h = Object.freeze(
    Object.defineProperty({ __proto__: null, default: zp }, Symbol.toStringTag, {
      value: 'Module',
    }),
  ),
  jp = { class: 'atlas-generator', 'aria-live': 'polite' },
  Hp = { class: 'atlas-generator__header' },
  Up = ['data-tone'],
  Gp = { class: 'atlas-generator__meta' },
  Wp = { key: 0, class: 'atlas-generator__error' },
  Kp = { key: 1, class: 'atlas-generator__grid' },
  qp = { class: 'atlas-generator__panel' },
  Qp = { class: 'atlas-generator__panel' },
  Jp = { class: 'atlas-generator__traits' },
  Zp = { class: 'atlas-generator__panel atlas-generator__panel--chart' },
  Yp = { class: 'atlas-generator__panel atlas-generator__panel--chart' },
  Xp = { class: 'atlas-generator__panel atlas-generator__panel--chart' },
  eh = {
    __name: 'AtlasGeneratorView',
    setup(e) {
      const t = Ls(),
        n = x(() => t.generatorStatus.value),
        s = x(() => t.generatorMetrics.value),
        i = x(() => t.generatorStreams.value),
        r = x(() => {
          var a;
          return ((a = t.error.value) == null ? void 0 : a.message) || null;
        }),
        l = x(() => {
          const a = n.value,
            u = a.generatedAt || a.updatedAt;
          if (!u) return 'N/D';
          const f = new Date(u);
          return Number.isNaN(f.getTime())
            ? u
            : new Intl.DateTimeFormat('it-IT', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }).format(f);
        }),
        o = () => t.refresh();
      return (a, u) => (
        T(),
        R('section', jp, [
          c('header', Hp, [
            c('div', null, [
              u[0] || (u[0] = c('h2', null, 'Generatore Nebula', -1)),
              c(
                'p',
                { class: 'atlas-generator__status', 'data-tone': n.value.status },
                b(n.value.label),
                9,
                Up,
              ),
              c(
                'p',
                Gp,
                ' Ultima run: ' +
                  b(l.value) +
                  ' · Dataset: ' +
                  b(s.value.datasetSpeciesTotal) +
                  ' specie ',
                1,
              ),
            ]),
            c('div', { class: 'atlas-generator__actions' }, [
              c('button', { type: 'button', onClick: o }, 'Aggiorna stato'),
            ]),
          ]),
          r.value
            ? (T(), R('p', Wp, b(r.value), 1))
            : (T(),
              R('section', Kp, [
                c('article', qp, [
                  u[5] || (u[5] = c('h3', null, 'Metriche principali', -1)),
                  c('ul', null, [
                    c('li', null, [
                      u[1] || (u[1] = c('span', null, 'Specie generate', -1)),
                      c('strong', null, b(s.value.speciesTotal), 1),
                    ]),
                    c('li', null, [
                      u[2] || (u[2] = c('span', null, 'Blueprint arricchiti', -1)),
                      c('strong', null, b(s.value.enrichedSpecies), 1),
                    ]),
                    c('li', null, [
                      u[3] || (u[3] = c('span', null, 'Copertura media', -1)),
                      c('strong', null, b(s.value.coverageAverage) + '%', 1),
                    ]),
                    c('li', null, [
                      u[4] || (u[4] = c('span', null, 'Eventi telemetria', -1)),
                      c('strong', null, b(s.value.eventTotal), 1),
                    ]),
                  ]),
                ]),
                c('article', Qp, [
                  u[9] || (u[9] = c('h3', null, 'Distribuzione tratti', -1)),
                  c('div', Jp, [
                    c('div', null, [
                      u[6] || (u[6] = c('span', null, 'Core traits', -1)),
                      c('strong', null, b(s.value.coreTraits), 1),
                    ]),
                    c('div', null, [
                      u[7] || (u[7] = c('span', null, 'Optional', -1)),
                      c('strong', null, b(s.value.optionalTraits), 1),
                    ]),
                    c('div', null, [
                      u[8] || (u[8] = c('span', null, 'Synergy', -1)),
                      c('strong', null, b(s.value.synergyTraits), 1),
                    ]),
                  ]),
                ]),
                c('article', Zp, [
                  c('header', null, [
                    u[10] || (u[10] = c('h3', null, 'Tempo di generazione', -1)),
                    c(
                      'span',
                      null,
                      b(s.value.generationTimeMs ? `${s.value.generationTimeMs}ms` : 'N/D'),
                      1,
                    ),
                  ]),
                  se(He, { points: i.value.generationTime, color: '#6366f1' }, null, 8, ['points']),
                ]),
                c('article', Yp, [
                  c('header', null, [
                    u[11] || (u[11] = c('h3', null, 'Specie per ciclo', -1)),
                    c('span', null, b(s.value.speciesTotal), 1),
                  ]),
                  se(He, { points: i.value.species, color: '#0ea5e9' }, null, 8, ['points']),
                ]),
                c('article', Xp, [
                  c('header', null, [
                    u[12] || (u[12] = c('h3', null, 'Blueprint arricchiti', -1)),
                    c('span', null, b(s.value.enrichedSpecies), 1),
                  ]),
                  se(He, { points: i.value.enriched, color: '#f59e0b' }, null, 8, ['points']),
                ]),
              ])),
        ])
      );
    },
  },
  th = ze(eh, [['__scopeId', 'data-v-003e0216']]),
  Lh = Object.freeze(
    Object.defineProperty({ __proto__: null, default: th }, Symbol.toStringTag, {
      value: 'Module',
    }),
  ),
  hr = {
    id: 'nebula-atlas',
    title: 'Nebula Predation Initiative',
    summary:
      'Branch orchestrato dedicato alla variante Nebula, ottimizzato per branchi sincronizzati in ambienti a nebbia fotonica.',
    releaseWindow: 'Patch 1.2 · Focus Nebbia',
    curator: 'QA Core · Narrative Ops',
    metrics: { species: 6, biomes: 3, encounters: 4 },
    highlights: [
      'Preset coordinati per branchi ad alta cadenza con segnalazione sinergie fotoniche.',
      'Blueprint ambientali con punti di infiltrazione già bilanciati per staging Nebula.',
      'Encounter lab calibrato per QA freeze con varianti approvate.',
    ],
    species: [
      {
        id: 'nebula-alpha',
        name: 'Lupo Nebulare Alfa',
        archetype: 'Predatore sinergico',
        rarity: 'Rara',
        threatTier: 'T2',
        energyProfile: 'Alta intensità',
        synopsis:
          'Leader del branco Nebula, specializzato in disorientamento luminoso e coordinamento multi-branch.',
        traits: {
          core: ['coordinazione_spettrale', 'fase_di_camuffamento', 'risonanza_di_branco'],
          optional: ['eco_di_nebbia', 'corsa_fotonica'],
          synergy: ['aurora_di_blindo', 'richiamo_corale'],
        },
        habitats: ['Paludi del Crepuscolo'],
        readiness: 'Pronto per staging',
        telemetry: { coverage: 0.82, lastValidation: '2024-05-18T08:35:00Z', curatedBy: 'QA Core' },
      },
      {
        id: 'nebula-scout',
        name: 'Scout Nebulare',
        archetype: 'Ricognitore tattico',
        rarity: 'Non comune',
        threatTier: 'T1',
        energyProfile: 'Media intensità',
        synopsis:
          'Esploratore leggero che mantiene canali acustici attivi per guidare i branchi principali.',
        traits: {
          core: ['sensori_geomagnetici', 'ricognizione_sonora'],
          optional: ['oscillazione_prismatica', 'ancora_risonante'],
          synergy: ['pattugliamento_mimetico'],
        },
        habitats: ['Paludi del Crepuscolo', 'Cresta di Ossidiana'],
        readiness: 'Validazione completata',
        telemetry: {
          coverage: 0.76,
          lastValidation: '2024-05-17T21:10:00Z',
          curatedBy: 'Narrative QA',
        },
      },
      {
        id: 'obsidian-enforcer',
        name: "Vincolatore d'Ossidiana",
        archetype: 'Controllo territoriale',
        rarity: 'Rara',
        threatTier: 'T2',
        energyProfile: 'Alta intensità',
        synopsis:
          'Stabilizza i corridoi cristallini e genera micro-punti ciechi per incursioni Nebula coordinate.',
        traits: {
          core: ['armatura_cristallina', 'anelli_vorticanti'],
          optional: ['presa_geomagnetica', 'eco_del_bastione'],
          synergy: ['contrappunto_di_luce'],
        },
        habitats: ['Cresta di Ossidiana'],
        readiness: 'QA freeze',
        telemetry: {
          coverage: 0.68,
          lastValidation: '2024-05-18T07:05:00Z',
          curatedBy: 'Biome Ops',
        },
      },
      {
        id: 'mist-reclaimer',
        name: 'Reclaimer della Nebbia',
        archetype: 'Supporto metabolico',
        rarity: 'Non comune',
        threatTier: 'T1',
        energyProfile: 'Bassa intensità',
        synopsis:
          'Gestisce la saturazione fotonica e mantiene i branchi oltre soglia in scenari di durata prolungata.',
        traits: {
          core: ['riciclo_fotoforico', 'membrane_nebulose'],
          optional: ['catalisi_mirata', 'respiro_di_sospensione'],
          synergy: ['ridistribuzione_nebbia'],
        },
        habitats: ['Paludi del Crepuscolo', 'Crinali di Bruma'],
        readiness: 'Staging completato',
        telemetry: {
          coverage: 0.74,
          lastValidation: '2024-05-18T10:45:00Z',
          curatedBy: 'Field Lab',
        },
      },
      {
        id: 'rift-pouncer',
        name: 'Balzo di Rift',
        archetype: 'Assalto rapido',
        rarity: 'Rara',
        threatTier: 'T2',
        energyProfile: 'Alta intensità',
        synopsis:
          'Unita impiegata nelle finestre di corridoio temporaneo per neutralizzare gli obiettivi di comando.',
        traits: {
          core: ['frattura_intermittente', 'impulsi_lamellari'],
          optional: ['richiamo_sincronico', 'falcata_prismatica'],
          synergy: ['telemetria_di_branchia'],
        },
        habitats: ['Corridoi di Rift', 'Cresta di Ossidiana'],
        readiness: 'In attesa di approvazione',
        telemetry: { coverage: 0.63, lastValidation: '2024-05-18T09:55:00Z', curatedBy: 'Ops QA' },
      },
      {
        id: 'veil-harbinger',
        name: 'Araldo del Velo',
        archetype: 'Controllo psicotattico',
        rarity: 'Epica',
        threatTier: 'T3',
        energyProfile: 'Alta intensità',
        synopsis:
          "Amplifica i segnali di nebbia psicoattiva e imposta le condizioni per l'ingaggio finale del branco.",
        traits: {
          core: ['egida_fotonica', 'trasmissione_aurorale'],
          optional: ['anelito_sinaptico', 'cicli_di_sovrapposizione'],
          synergy: ['corruzione_di_velo'],
        },
        habitats: ['Paludi del Crepuscolo'],
        readiness: 'Richiede validazione narrativa',
        telemetry: {
          coverage: 0.58,
          lastValidation: '2024-05-16T18:15:00Z',
          curatedBy: 'Narrative Ops',
        },
      },
    ],
    biomes: [
      {
        id: 'twilight-marsh',
        name: 'Paludi del Crepuscolo',
        hazard: 'Nebbia fotonica instabile',
        stability: 'Moderata',
        operations: ['Hub Nebula', 'Corridori acustici'],
        lanes: ['Ambush', 'Risonanza', 'Fallback'],
        infiltration: 'Ingressi modulati tramite luci fase',
        storyHook:
          'La nebbia fotonica è modulata per proteggere i branchi: mantenere i fari di fase sincronizzati.',
      },
      {
        id: 'obsidian-ridge',
        name: 'Cresta di Ossidiana',
        hazard: 'Venti cristallizzati',
        stability: 'Bassa',
        operations: ['Balzi di Rift', 'Gallerie cristalline'],
        lanes: ['Vertical Strike', 'Echo Corridor'],
        infiltration: 'Punti ciechi generati dai vincolatori cristallini.',
        storyHook:
          'I cristalli rifrangono i richiami Nebula; mantenere i segnali entro la finestra di risonanza.',
      },
      {
        id: 'lumina-basin',
        name: 'Bacino di Lumina',
        hazard: 'Tempeste fotoioniche',
        stability: 'Alta',
        operations: ['Staging supporto metabolico', 'Depositi di cariche aurorali'],
        lanes: ['Support Corridor', 'Supply Loop'],
        infiltration: 'Sfruttare i canali ridistribuiti dagli specialisti metabolici.',
        storyHook:
          'Il bacino alimenta gli assalti prolungati: coordinare i reclaimers con i branchi principali.',
      },
    ],
    encounters: [
      {
        id: 'nebula-strike',
        name: 'Incursione Nebula',
        focus: 'Intercettazione rapida su nebbia controllata',
        biomeId: 'twilight-marsh',
        cadence: 'Impulsi rapidi',
        density: 'Compatta',
        entryPoints: ['Hub Nebula', 'Flusso laterale'],
        squads: [
          { role: 'Avanguardia', units: ['Lupo Nebulare Alfa', 'Scout Nebulare'] },
          { role: 'Supporto metabolico', units: ['Reclaimer della Nebbia'] },
        ],
        readiness: 'In staging',
        approvals: ['QA Core', 'Ops QA'],
      },
      {
        id: 'obsidian-collapse',
        name: 'Collasso a Ossidiana',
        focus: 'Neutralizzare i pilastri cristallini prima del reset',
        biomeId: 'obsidian-ridge',
        cadence: 'Sequenza tattica',
        density: 'Diluita',
        entryPoints: ['Canalone principale'],
        squads: [
          { role: 'Vincolatori', units: ["Vincolatore d'Ossidiana", 'Balzo di Rift'] },
          { role: 'Ricognizione', units: ['Scout Nebulare'] },
        ],
        readiness: 'Richiede approvazione narrativa',
        approvals: ['Narrative QA'],
      },
      {
        id: 'lumina-siphon',
        name: 'Sifone Lumina',
        focus: 'Assicurare pipeline energetiche nel bacino',
        biomeId: 'lumina-basin',
        cadence: 'Sostenuta',
        density: 'Bilanciata',
        entryPoints: ['Depositi aurorali'],
        squads: [
          { role: 'Supporto metabolico', units: ['Reclaimer della Nebbia'] },
          { role: 'Psicotattica', units: ['Araldo del Velo'] },
        ],
        readiness: 'Monitoraggio log validazione',
        approvals: ['QA Core', 'Narrative Ops'],
      },
      {
        id: 'veil-convergence',
        name: 'Convergenza del Velo',
        focus: 'Stabilizzare la sovrapposizione aurorale per ingaggio finale',
        biomeId: 'twilight-marsh',
        cadence: 'Sequenza sincronizzata',
        density: 'Alta',
        entryPoints: ['Hub Nebula', 'Corridori acustici'],
        squads: [
          { role: 'Psicotattica', units: ['Araldo del Velo'] },
          { role: 'Assalto', units: ['Lupo Nebulare Alfa', 'Balzo di Rift'] },
        ],
        readiness: 'In approvazione',
        approvals: ['Creative Lead', 'QA Core'],
      },
    ],
  },
  nh = Object.freeze(
    Object.defineProperty(
      { __proto__: null, atlasDemoDataset: hr, default: hr },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  );
export {
  mh as $,
  oh as A,
  _l as B,
  Ko as C,
  Ah as D,
  Rh as E,
  Y as F,
  wh as G,
  Eh as H,
  Th as I,
  Ch as J,
  xh as K,
  Sh as L,
  He as M,
  oa as N,
  sl as O,
  nl as P,
  eo as Q,
  rt as R,
  ks as S,
  ts as T,
  So as U,
  Es as V,
  fh as W,
  ah as X,
  dh as Y,
  gh as Z,
  ze as _,
  Qe as a,
  hh as a0,
  ph as a1,
  ch as a2,
  uh as a3,
  fa as a4,
  ih as a5,
  Ga as a6,
  jo as a7,
  Ou as a8,
  $u as a9,
  Ua as aa,
  Ho as ab,
  vh as ac,
  bh as ad,
  Vu as ae,
  yh as af,
  Oh as ag,
  _h as ah,
  Ph as ai,
  Ih as aj,
  Nh as ak,
  Dh as al,
  Mh as am,
  kh as an,
  $h as ao,
  Lh as ap,
  Jr as b,
  x as c,
  Xs as d,
  rh as e,
  sa as f,
  si as g,
  xo as h,
  Te as i,
  se as j,
  R as k,
  T as l,
  c as m,
  ve as n,
  Qr as o,
  mt as p,
  b as q,
  Bl as r,
  Vl as s,
  lh as t,
  ge as u,
  qt as v,
  In as w,
  ue as x,
  $t as y,
  $n as z,
};
