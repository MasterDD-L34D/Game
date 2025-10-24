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
  return (
    <div className={`card ${s.over_budget ? "card--danger" : "card--ok"}`}>
      <div className="row">
        <h3>{s.name}</h3>
        <span className="pill">Budget: {s.budget}</span>
        {s.over_budget && <span className="pill pill--warn">OVER BUDGET</span>}
      </div>

      <div className="row">
        <div className="col">
          <strong>Sinergie attive</strong>
          <ul>
            {s.active_synergies.length ? (
              s.active_synergies.map((x) => <li key={x}>{x}</li>)
            ) : (
              <li>—</li>
            )}
          </ul>
        </div>
        <div className="col">
          <strong>Counter noti</strong>
          <ul>
            {s.known_counters.length ? (
              s.known_counters.map((x) => <li key={x}>{x}</li>)
            ) : (
              <li>—</li>
            )}
          </ul>
        </div>
      </div>

      {s.warnings.length > 0 && (
        <div className="warnings">
          <strong>Warning</strong>
          <ul>
            {s.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="actions">
        <button
          disabled={s.over_budget}
          title={s.over_budget ? "Rientra nel budget per salvare" : "Salva"}
        >
          Salva Specie
        </button>
      </div>
    </div>
  );
}

export type { UISpecies };
