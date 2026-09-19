import React, { useEffect, useMemo, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

try {
  require('./Overlay.css');
} catch (error) {
  // L'import del foglio di stile è opzionale in ambienti non web (es. durante i test).
}

const defaultTimelineAsset: string = (() => {
  try {
    return require('../../assets/hud/overlay/mock-timeline.svg');
  } catch (error) {
    return '';
  }
})();

const defaultContextAsset: string = (() => {
  try {
    return require('../../assets/hud/overlay/context-card.svg');
  } catch (error) {
    return '';
  }
})();

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

interface ThresholdBadgeSpec {
  label: string;
  value: string | number;
  severity?: 'low' | 'medium' | 'high';
  description?: string;
}

interface TimelineEventSpec {
  id: string;
  title: string;
  timestamp?: string;
  description?: string;
  icon?: string;
}

interface TimelineSpec {
  title?: string;
  events: TimelineEventSpec[];
  asset?: string;
}

interface ContextMetricSpec {
  id: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
}

interface ContextCardSpec {
  title: string;
  summary?: string;
  asset?: string;
  metrics?: ContextMetricSpec[];
}

interface OverlaySpec {
  id: string;
  title: string;
  description?: string;
  filters?: Record<string, unknown>;
  mission_tags?: MissionTagSpec[];
  panels?: PanelSpec[];
  threshold_badge?: ThresholdBadgeSpec;
  timeline?: TimelineSpec;
  context_card?: ContextCardSpec;
  canvas_asset?: string;
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
    const fileLayout = require('../../data/core/hud/layout.yaml');
    if (fileLayout && typeof fileLayout === 'object') {
      return fileLayout as LayoutConfig;
    }
  } catch (error) {
    console.warn('[HUD Overlay] Impossibile caricare data/core/hud/layout.yaml', error);
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

function renderThresholdBadge(badge?: ThresholdBadgeSpec): React.ReactNode {
  if (!badge) {
    return null;
  }

  const severity = badge.severity ?? 'medium';

  return (
    <div className={`hud-overlay__threshold hud-overlay__threshold--${severity}`}>
      <span className="hud-overlay__threshold-label">{badge.label}</span>
      <strong className="hud-overlay__threshold-value">{badge.value}</strong>
      {badge.description && <p className="hud-overlay__threshold-description">{badge.description}</p>}
    </div>
  );
}

function renderTimeline(timeline?: TimelineSpec): React.ReactNode {
  if (!timeline || !Array.isArray(timeline.events) || timeline.events.length === 0) {
    return null;
  }

  return (
    <section className="hud-overlay__timeline" aria-label={timeline.title ?? 'Timeline eventi'}>
      {timeline.title && <h3>{timeline.title}</h3>}
      <ol>
        {timeline.events.map((event) => (
          <li key={event.id} className="hud-overlay__timeline-event">
            <div className="hud-overlay__timeline-meta">
              {event.icon && <img src={event.icon} alt="" aria-hidden="true" />}
              {event.timestamp && <time dateTime={event.timestamp}>{event.timestamp}</time>}
            </div>
            <div className="hud-overlay__timeline-content">
              <strong>{event.title}</strong>
              {event.description && <p>{event.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function renderContextCard(card?: ContextCardSpec): React.ReactNode {
  if (!card) {
    return null;
  }

  return (
    <article className="hud-overlay__context-card">
      <header>
        <h3>{card.title}</h3>
        {card.summary && <p>{card.summary}</p>}
      </header>
      {Array.isArray(card.metrics) && card.metrics.length > 0 && (
        <ul className="hud-overlay__context-metrics">
          {card.metrics.map((metric) => (
            <li key={metric.id} data-trend={metric.trend ?? 'stable'}>
              <span className="hud-overlay__metric-label">{metric.label}</span>
              <strong className="hud-overlay__metric-value">{metric.value}</strong>
            </li>
          ))}
        </ul>
      )}
    </article>
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canvasAsset = useMemo(() => {
    const candidates = [
      overlay.context_card?.asset,
      overlay.timeline?.asset,
      overlay.canvas_asset,
      defaultContextAsset,
      defaultTimelineAsset,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return '';
  }, [overlay.context_card?.asset, overlay.timeline?.asset, overlay.canvas_asset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#38bdf8';
    context.font = 'bold 14px Inter, system-ui, sans-serif';
    context.fillText(overlay.title, 16, 28);

    if (!canvasAsset) {
      context.fillStyle = '#fcd34d';
      context.fillText('Asset overlay non disponibile', 16, canvas.height - 24);
      return;
    }

    const image = new Image();
    image.referrerPolicy = 'no-referrer';

    const drawImage = () => {
      const availableWidth = canvas.width - 32;
      const availableHeight = canvas.height - 64;
      let width = image.width;
      let height = image.height;

      if (width > availableWidth) {
        const ratio = availableWidth / width;
        width *= ratio;
        height *= ratio;
      }
      if (height > availableHeight) {
        const ratio = availableHeight / height;
        width *= ratio;
        height *= ratio;
      }

      const x = (canvas.width - width) / 2;
      const y = 48 + (availableHeight - height) / 2;
      context.drawImage(image, x, y, width, height);
    };

    image.onload = drawImage;
    image.onerror = () => {
      context.fillStyle = '#f87171';
      context.fillText('Impossibile caricare l\'asset overlay', 16, canvas.height - 24);
    };
    image.src = canvasAsset;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [canvasAsset, overlay.title]);

  return (
    <section className="hud-overlay" data-overlay-id={overlay.id}>
      <header className="hud-overlay__header">
        <div>
          <h2>{overlay.title}</h2>
          {overlay.description && <p>{overlay.description}</p>}
        </div>
        {renderThresholdBadge(overlay.threshold_badge)}
      </header>

      <div className="hud-overlay__body">
        <div className="hud-overlay__main">
          {renderFilters(overlay.filters)}
          {renderPanels(overlay.panels)}
          {renderTimeline(overlay.timeline)}
        </div>
        <aside className="hud-overlay__aside">
          <canvas
            ref={canvasRef}
            className="hud-overlay__canvas"
            width={overlay.context_card ? 360 : 320}
            height={overlay.context_card ? 220 : 180}
            role="img"
            aria-label="Anteprima timeline smart alerts"
          />
          {renderContextCard(overlay.context_card)}
        </aside>
      </div>
    </section>
  );
};

export default HudOverlay;
