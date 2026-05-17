import React from 'react';

export interface SkillBracketProps {
  readonly min?: number;
  readonly max?: number;
  readonly lowerBound?: number;
  readonly upperBound?: number;
}

export interface MatchmakingControlsProps {
  readonly regions: string[];
  readonly gameModes: string[];
  readonly selectedRegion?: string;
  readonly selectedMode?: string;
  readonly skillBracket?: SkillBracketProps;
  readonly teamSizeOptions?: number[];
  readonly selectedTeamSize?: number;
  readonly crossplayEnabled?: boolean;
  readonly isFiltered?: boolean;
  readonly isFetching?: boolean;
  readonly activePlayers?: number;
  readonly averageWaitTime?: number;
  readonly onRegionChange?: (region: string) => void;
  readonly onModeChange?: (mode: string) => void;
  readonly onSkillBracketChange?: (bracket: { min?: number; max?: number }) => void;
  readonly onTeamSizeChange?: (teamSize: number | undefined) => void;
  readonly onCrossplayToggle?: (enabled: boolean) => void;
  readonly onResetFilters?: () => void;
}

interface IndicatorProps {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'success' | 'warning' | 'danger' | 'neutral';
}

const toneToClass = (tone: IndicatorProps['tone']): string => {
  switch (tone) {
    case 'success':
      return 'matchmaking-indicator matchmaking-indicator--success';
    case 'warning':
      return 'matchmaking-indicator matchmaking-indicator--warning';
    case 'danger':
      return 'matchmaking-indicator matchmaking-indicator--danger';
    default:
      return 'matchmaking-indicator matchmaking-indicator--neutral';
  }
};

const Indicator: React.FC<IndicatorProps> = ({ label, value, tone = 'neutral' }) => (
  <div className={toneToClass(tone)}>
    <span className="matchmaking-indicator__label">{label}</span>
    <span className="matchmaking-indicator__value">{value}</span>
  </div>
);

const humanizeWait = (waitInSeconds?: number): string => {
  if (waitInSeconds === undefined || Number.isNaN(waitInSeconds)) {
    return 'n/d';
  }
  if (waitInSeconds < 60) {
    return `${Math.round(waitInSeconds)}s`;
  }
  const minutes = Math.floor(waitInSeconds / 60);
  const seconds = Math.round(waitInSeconds % 60);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

const computeQueueTone = (players?: number): IndicatorProps['tone'] => {
  if (players === undefined || Number.isNaN(players)) {
    return 'neutral';
  }
  if (players >= 2000) {
    return 'success';
  }
  if (players >= 800) {
    return 'warning';
  }
  return 'danger';
};

const computeActiveFilterCount = (props: MatchmakingControlsProps): number => {
  let count = 0;
  if (props.selectedRegion) count += 1;
  if (props.selectedMode) count += 1;
  if (props.selectedTeamSize !== undefined) count += 1;
  if (props.crossplayEnabled !== undefined) count += 1;
  const { skillBracket } = props;
  if (skillBracket?.min !== undefined || skillBracket?.max !== undefined) {
    count += 1;
  }
  return count;
};

const toValue = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback;

export const MatchmakingControls: React.FC<MatchmakingControlsProps> = (props) => {
  const {
    regions,
    gameModes,
    selectedRegion,
    selectedMode,
    skillBracket,
    teamSizeOptions = [],
    selectedTeamSize,
    crossplayEnabled,
    isFiltered,
    isFetching,
    activePlayers,
    averageWaitTime,
    onRegionChange,
    onModeChange,
    onSkillBracketChange,
    onTeamSizeChange,
    onCrossplayToggle,
    onResetFilters,
  } = props;

  const lowerBound = toValue(skillBracket?.lowerBound, 0);
  const upperBound = toValue(skillBracket?.upperBound, 5000);
  const minValue = Math.max(lowerBound, toValue(skillBracket?.min, lowerBound));
  const maxValue = Math.min(upperBound, toValue(skillBracket?.max, upperBound));

  const filterCount = computeActiveFilterCount(props);

  const queueTone = computeQueueTone(activePlayers);
  const waitTone: IndicatorProps['tone'] = averageWaitTime && averageWaitTime > 90 ? 'warning' : 'success';

  const handleSkillChange = (next: Partial<{ min: number; max: number }>) => {
    if (!onSkillBracketChange) return;
    const nextBracket = {
      min: next.min ?? (skillBracket?.min ?? lowerBound),
      max: next.max ?? (skillBracket?.max ?? upperBound),
    };
    onSkillBracketChange(nextBracket);
  };

  return (
    <section className="matchmaking-controls" aria-busy={isFetching}>
      <header className="matchmaking-controls__header">
        <h2>Matchmaking</h2>
        <div className="matchmaking-controls__status">
          <Indicator label="Giocatori attivi" value={activePlayers ? activePlayers.toLocaleString() : 'n/d'} tone={queueTone} />
          <Indicator label="Tempo medio coda" value={humanizeWait(averageWaitTime)} tone={waitTone} />
          <Indicator
            label="Filtri attivi"
            value={filterCount.toString()}
            tone={filterCount > 0 ? 'success' : 'neutral'}
          />
        </div>
      </header>

      <div className="matchmaking-controls__grid">
        <label className="matchmaking-controls__field">
          <span className="matchmaking-controls__field-label">Regione</span>
          <select
            value={selectedRegion ?? ''}
            onChange={(event) => onRegionChange?.(event.target.value || '')}
            aria-label="Filtro regione"
          >
            <option value="">Tutte le regioni</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>

        <label className="matchmaking-controls__field">
          <span className="matchmaking-controls__field-label">Modalità</span>
          <select
            value={selectedMode ?? ''}
            onChange={(event) => onModeChange?.(event.target.value || '')}
            aria-label="Filtro modalità"
          >
            <option value="">Tutte le modalità</option>
            {gameModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>

        {teamSizeOptions.length > 0 && (
          <label className="matchmaking-controls__field">
            <span className="matchmaking-controls__field-label">Dimensione squadra</span>
            <select
              value={selectedTeamSize?.toString() ?? ''}
              onChange={(event) =>
                onTeamSizeChange?.(event.target.value ? Number.parseInt(event.target.value, 10) : undefined)
              }
              aria-label="Filtro dimensione squadra"
            >
              <option value="">Qualsiasi</option>
              {teamSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <fieldset className="matchmaking-controls__field matchmaking-controls__field--range">
          <legend className="matchmaking-controls__field-label">Fascia abilità</legend>
          <div className="matchmaking-controls__range-inputs">
            <label>
              <span>Min</span>
              <input
                type="range"
                min={lowerBound}
                max={maxValue}
                value={minValue}
                onChange={(event) => handleSkillChange({ min: Number(event.target.value) })}
              />
              <output aria-live="polite">{minValue}</output>
            </label>
            <label>
              <span>Max</span>
              <input
                type="range"
                min={minValue}
                max={upperBound}
                value={maxValue}
                onChange={(event) => handleSkillChange({ max: Number(event.target.value) })}
              />
              <output aria-live="polite">{maxValue}</output>
            </label>
          </div>
        </fieldset>

        <label className="matchmaking-controls__toggle">
          <span className="matchmaking-controls__field-label">Cross-play</span>
          <input
            type="checkbox"
            checked={Boolean(crossplayEnabled)}
            onChange={(event) => onCrossplayToggle?.(event.target.checked)}
          />
        </label>
      </div>

      <footer className="matchmaking-controls__footer">
        <button type="button" onClick={() => onResetFilters?.()} disabled={!isFiltered}>
          Reimposta filtri
        </button>
        {isFetching && <span className="matchmaking-controls__loading">Aggiornamento dati…</span>}
      </footer>
    </section>
  );
};

export default MatchmakingControls;
