import {
  _ as c,
  k as r,
  j as i,
  V as l,
  u as _,
  ab as u,
  l as t,
  R as f,
  a4 as m,
  a6 as p,
} from './atlas-CH8HkhBa.js';
import './flow-Denzei7K.js';
const d = { class: 'console-layout' },
  y = {
    __name: 'ConsoleLayout',
    emits: ['notify'],
    setup(C, { emit: a }) {
      const s = a;
      function n(o) {
        s('notify', o);
      }
      return (o, k) => (
        t(),
        r('section', d, [
          i(_(u), null, {
            default: l((e) => [
              (t(), f(m(e.Component), p(e.route.props || {}, { onNotify: n }), null, 16)),
            ]),
            _: 1,
          }),
        ])
      );
    },
  },
  w = c(y, [['__scopeId', 'data-v-a87efb0c']]);
export { w as default };
