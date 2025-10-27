import React from "react";

type UISpecies = {
  id: string;
  name: string;
  budget: string;
  over_budget: boolean;
  active_synergies: string[];
  known_counters: string[];
  warnings: string[];
};

export function SpeciesSummaryCard({ s }: { s: UISpecies }) {
  const warnings = Array.isArray(s.warnings) ? s.warnings : [];
  const hasWarnings = warnings.length > 0;

  return (
    <article
      className={`card species-summary-card${
        s.over_budget ? " species-summary-card--danger" : ""
      }`}
      data-budget-state={s.over_budget ? "over" : "within"}
    >
      <header className="species-summary-card__header">
        <h3 className="species-summary-card__title">{s.name}</h3>
        <div className="species-summary-card__badges">
          <span className="pill" data-variant="neutral">
            Budget: {s.budget}
          </span>
          {s.over_budget ? (
            <span className="pill" data-variant="critical" aria-live="polite">
              Fuori budget
            </span>
          ) : (
            <span className="pill" data-variant="success">
              Budget OK
            </span>
          )}
        </div>
      </header>

      <div className="species-summary-card__content">
        <section className="species-summary-card__section">
          <h4>Sinergie attive</h4>
          <ul className="species-summary-card__list">
            {s.active_synergies.length ? (
              s.active_synergies.map((value) => (
                <li key={value} className="species-summary-card__item">
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
            {s.known_counters.length ? (
              s.known_counters.map((value) => (
                <li key={value} className="species-summary-card__item">
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
          disabled={s.over_budget}
          title={s.over_budget ? "Rientra nel budget per salvare" : "Salva"}
        >
          Salva specie
        </button>
      </div>
    </article>
  );
}

export type { UISpecies };
