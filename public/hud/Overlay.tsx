import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

interface PanelSpec {
  id: string;
  type: string;
  source?: string;
  format?: string;
}

interface MissionTagSpec {
  tag: string;
  missions?: string[];
}

interface OverlaySpec {
  id: string;
  title: string;
  description?: string;
  filters?: Record<string, unknown>;
  mission_tags?: MissionTagSpec[];
  panels?: PanelSpec[];
}

interface LegacyFallbackSpec {
  component?: string;
  asset?: string;
  description?: string;
}

interface LayoutConfig {
  version?: number;
  overlays: OverlaySpec[];
  legacy_fallback?: LegacyFallbackSpec;
}

export interface HudOverlayProps {
  missionId?: string;
  missionTag?: string;
  forceLegacy?: boolean;
  layout?: LayoutConfig;
}

function loadLayout(): LayoutConfig {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const globalLayout = typeof globalThis !== 'undefined' ? (globalThis as any).__HUD_LAYOUT__ : undefined;
  if (globalLayout && typeof globalLayout === 'object') {
    return globalLayout as LayoutConfig;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fileLayout = require('../../data/hud/layout.yaml');
    if (fileLayout && typeof fileLayout === 'object') {
      return fileLayout as LayoutConfig;
    }
  } catch (error) {
    console.warn('[HUD Overlay] Impossibile caricare data/hud/layout.yaml', error);
  }

  return {
    overlays: [],
    legacy_fallback: {
      component: 'LegacyRiskOverlay',
      description: 'Impossibile caricare il layout smart alerts, uso fallback legacy.',
    },
  };
}

const defaultLayout = loadLayout();

function matchesOverlay(spec: OverlaySpec, missionTag?: string, missionId?: string): boolean {
  if (!spec.mission_tags || spec.mission_tags.length === 0) {
    return true;
  }

  if (!missionTag && !missionId) {
    return false;
  }

  return spec.mission_tags.some((tagSpec) => {
    if (missionTag && tagSpec.tag === missionTag) {
      return true;
    }
    if (missionId && Array.isArray(tagSpec.missions)) {
      return tagSpec.missions.includes(missionId);
    }
    return false;
  });
}

function selectOverlay(config: LayoutConfig, missionTag?: string, missionId?: string): OverlaySpec | undefined {
  if (!config.overlays || config.overlays.length === 0) {
    return undefined;
  }

  const exactMatch = config.overlays.find((overlay) => matchesOverlay(overlay, missionTag, missionId));
  if (exactMatch) {
    return exactMatch;
  }

  return config.overlays[0];
}

function renderFilters(filters?: Record<string, unknown>): React.ReactNode {
  if (!filters || Object.keys(filters).length === 0) {
    return null;
  }

  return (
    <dl className="hud-overlay__filters">
      {Object.entries(filters).map(([key, value]) => (
        <React.Fragment key={key}>
          <dt>{key}</dt>
          <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function renderPanels(panels?: PanelSpec[]): React.ReactNode {
  if (!panels || panels.length === 0) {
    return null;
  }

  return (
    <ul className="hud-overlay__panels">
      {panels.map((panel) => (
        <li key={panel.id} data-panel-type={panel.type}>
          <strong>{panel.source ?? panel.id}</strong>
          {panel.format && <span className="hud-overlay__format">{panel.format}</span>}
        </li>
      ))}
    </ul>
  );
}

function renderLegacyFallback(fallback?: LegacyFallbackSpec): React.ReactElement {
  const title = fallback?.component ?? 'Legacy HUD';
  const description =
    fallback?.description ?? 'Modalità legacy attivata: visualizzazione statica senza smart alerts.';

  return (
    <section className="hud-overlay hud-overlay--legacy" data-overlay-id="legacy">
      <header>
        <h2>{title}</h2>
      </header>
      <p>{description}</p>
      {fallback?.asset && (
        <p>
          <a href={fallback.asset}>Apri asset legacy</a>
        </p>
      )}
    </section>
  );
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  missionId,
  missionTag,
  forceLegacy,
  layout,
}) => {
  const config = layout ?? defaultLayout;

  if (forceLegacy) {
    return renderLegacyFallback(config.legacy_fallback);
  }

  const overlay = selectOverlay(config, missionTag, missionId);

  if (!overlay) {
    return renderLegacyFallback(config.legacy_fallback);
  }

  return (
    <section className="hud-overlay" data-overlay-id={overlay.id}>
      <header>
        <h2>{overlay.title}</h2>
        {overlay.description && <p>{overlay.description}</p>}
      </header>

      {renderFilters(overlay.filters)}
      {renderPanels(overlay.panels)}
    </section>
  );
};

export default HudOverlay;
