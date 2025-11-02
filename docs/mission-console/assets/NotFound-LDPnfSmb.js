import {
  _ as a,
  k as d,
  m as o,
  j as _,
  q as n,
  u as t,
  V as u,
  a7 as c,
  l as i,
  U as l,
} from './atlas-CH8HkhBa.js';
import { a as r } from './flow-Denzei7K.js';
const f = { class: 'not-found' },
  p = { class: 'not-found__card' },
  m = { class: 'not-found__tag' },
  v = {
    __name: 'NotFound',
    setup(h) {
      const { t: s } = r();
      return (F, e) => (
        i(),
        d('section', f, [
          o('div', p, [
            o('span', m, n(t(s)('views.notFound.tag')), 1),
            o('h1', null, n(t(s)('views.notFound.title')), 1),
            o('p', null, n(t(s)('views.notFound.body')), 1),
            _(
              t(c),
              { to: { name: 'console-home' }, class: 'not-found__link' },
              { default: u(() => [l(n(t(s)('views.notFound.cta')), 1)]), _: 1 },
            ),
          ]),
          e[0] || (e[0] = o('div', { class: 'not-found__bg', 'aria-hidden': 'true' }, null, -1)),
        ])
      );
    },
  },
  x = a(v, [['__scopeId', 'data-v-9e190417']]);
export { x as default };
