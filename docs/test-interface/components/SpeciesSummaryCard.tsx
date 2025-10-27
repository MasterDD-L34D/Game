import React, { useMemo } from "react";

type UISpecies = {
  id: string;
  name: string;
  budget: string;
  over_budget: boolean;
  active_synergies: string[];
  known_counters: string[];
  warnings: string[];
};

type SpeciesSummaryCardProps = { s: UISpecies };

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of values) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

function areStringListsEqual(a: unknown, b: unknown): boolean {
  const listA = normalizeStringList(a);
  const listB = normalizeStringList(b);
  if (listA.length !== listB.length) {
    return false;
  }
  return listA.every((value, index) => value === listB[index]);
}

function SpeciesSummaryCardComponent({ s }: SpeciesSummaryCardProps) {
  const activeSynergies = useMemo(() => normalizeStringList(s.active_synergies), [s.active_synergies]);
  const knownCounters = useMemo(() => normalizeStringList(s.known_counters), [s.known_counters]);
  const warnings = useMemo(() => normalizeStringList(s.warnings), [s.warnings]);
  const hasWarnings = warnings.length > 0;
  const overBudget = Boolean(s.over_budget);

  return (
    <article
      className={`card species-summary-card${
        overBudget ? " species-summary-card--danger" : ""
      }`}
      data-budget-state={overBudget ? "over" : "within"}
    >
      <header className="species-summary-card__header">
        <h3 className="species-summary-card__title">{s.name}</h3>
        <div className="species-summary-card__badges">
          <span className="pill" data-variant="neutral">
            Budget: {s.budget}
          </span>
          {overBudget ? (
            <span className="pill" data-variant="critical" aria-live="polite">
              Fuori budget
            </span>
          ) : (
            <span className="pill" data-variant="success">Budget OK</span>
          )}
        </div>
      </header>

      <div className="species-summary-card__content">
        <section className="species-summary-card__section">
          <h4>Sinergie attive</h4>
          <ul className="species-summary-card__list">
            {activeSynergies.length ? (
              activeSynergies.map((value, index) => (
                <li key={`${value}-${index}`} className="species-summary-card__item">
                  {value}
                </li>
              ))
            ) : (
              <li className="species-summary-card__item species-summary-card__item--empty">
                —
              </li>
            )}
          </ul>
        </section>

        <section className="species-summary-card__section">
          <h4>Counter noti</h4>
          <ul className="species-summary-card__list">
            {knownCounters.length ? (
              knownCounters.map((value, index) => (
                <li key={`${value}-${index}`} className="species-summary-card__item">
                  {value}
                </li>
              ))
            ) : (
              <li className="species-summary-card__item species-summary-card__item--empty">
                —
              </li>
            )}
          </ul>
        </section>
      </div>

      {hasWarnings && (
        <section
          className="species-summary-card__warnings"
          aria-live="polite"
          aria-label="Avvisi specie"
        >
          <h4>Warning</h4>
          <ul>
            {warnings.map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="species-summary-card__actions">
        <button
          type="button"
          className="species-summary-card__action"
          disabled={overBudget}
          title={overBudget ? "Rientra nel budget per salvare" : "Salva"}
        >
          Salva specie
        </button>
      </div>
    </article>
  );
}

function areSpeciesPropsEqual(prev: SpeciesSummaryCardProps, next: SpeciesSummaryCardProps): boolean {
  if (prev.s === next.s) {
    return true;
  }

  return (
    prev.s.id === next.s.id &&
    prev.s.name === next.s.name &&
    prev.s.budget === next.s.budget &&
    Boolean(prev.s.over_budget) === Boolean(next.s.over_budget) &&
    areStringListsEqual(prev.s.active_synergies, next.s.active_synergies) &&
    areStringListsEqual(prev.s.known_counters, next.s.known_counters) &&
    areStringListsEqual(prev.s.warnings, next.s.warnings)
  );
}

const SpeciesSummaryCard = React.memo(SpeciesSummaryCardComponent, areSpeciesPropsEqual);

export { SpeciesSummaryCard };

export type { UISpecies };
