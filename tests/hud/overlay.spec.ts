import assert from 'assert';
import { before, describe, it } from 'node:test';
import path from 'node:path';
import Module from 'node:module';

const toolsNodeModules = path.resolve(__dirname, '../../tools/ts/node_modules');
const previousNodePath = process.env.NODE_PATH;
process.env.NODE_PATH = previousNodePath
  ? `${toolsNodeModules}${path.delimiter}${previousNodePath}`
  : toolsNodeModules;
Module._initPaths();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require('../../tools/ts/node_modules/react') as typeof import('react');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { renderToStaticMarkup } = require('../../tools/ts/node_modules/react-dom/server') as typeof import('../../tools/ts/node_modules/react-dom/server');

type HudOverlayModule = typeof import('../../public/hud/Overlay');
type OverlayProps = HudOverlayModule['HudOverlayProps'];
let HudOverlay: HudOverlayModule['default'];

before(async () => {
  const module = (await import('../../public/hud/Overlay')) as HudOverlayModule;
  HudOverlay = module.default;
});

describe('HudOverlay component', () => {
  const layout: NonNullable<OverlayProps['layout']> = {
    overlays: [
      {
        id: 'smart-risk-alerts',
        title: 'Smart Risk Alerts',
        description: 'Monitoraggio timeline missione',
        filters: {
          weighted_index_threshold: 0.6,
        },
        panels: [
          { id: 'trend-risk', type: 'metric', source: 'indices.risk.weighted_index', format: 'percentage' },
        ],
        threshold_badge: {
          label: 'Soglia attuale',
          value: '0.60',
          severity: 'high',
          description: 'EMA sopra limite operativo',
        },
        timeline: {
          title: 'Ultime variazioni',
          events: [
            {
              id: 'evt-1',
              title: 'Delta coesione +18%',
              timestamp: '2024-09-14T10:34:00Z',
              description: 'Team support in arrivo entro 2 turni',
            },
            {
              id: 'evt-2',
              title: 'Richiesta supporto confermata',
              timestamp: '2024-09-14T09:52:00Z',
              description: 'Azioni supporto coordinate',
            },
          ],
        },
        context_card: {
          title: 'Supporto contestuale',
          summary: 'Snapshot degli indicatori di supporto e coesione',
          metrics: [
            { id: 'cohesion', label: 'Δ Coesione', value: '+0.18', trend: 'up' },
            { id: 'support', label: 'Azioni supporto', value: '4', trend: 'stable' },
          ],
          asset: '../../assets/hud/overlay/context-card.svg',
        },
      },
    ],
  };

  it('renderizza badge soglia, timeline e card contestuale', () => {
    const markup = renderToStaticMarkup(
      React.createElement(HudOverlay, { missionTag: 'smart-risk-alerts', layout })
    );

    assert.match(markup, /hud-overlay__threshold-value/);
    assert.match(markup, /Ultime variazioni/);
    assert.match(markup, /Delta coesione \+18%/);
    assert.match(markup, /Supporto contestuale/);
    assert.match(markup, /hud-overlay__canvas/);
  });

  it('usa il fallback legacy quando non trova overlay', () => {
    const markup = renderToStaticMarkup(
      React.createElement(HudOverlay, {
        missionTag: 'inesistente',
        layout: { overlays: [], legacy_fallback: { component: 'Legacy', description: 'fallback' } },
      })
    );

    assert.match(markup, /Legacy/);
    assert.match(markup, /fallback/);
  });
});
