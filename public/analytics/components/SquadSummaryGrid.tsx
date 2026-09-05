import React from 'react';

import type { SquadSyncSquad } from '../../../tools/graphql/schema.js';

export interface SquadSummaryGridProps {
  squads: SquadSyncSquad[];
}

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export const SquadSummaryGrid: React.FC<SquadSummaryGridProps> = ({ squads }) => {
  if (!squads || squads.length === 0) {
    return <p className="squadsync__placeholder">Nessuna squadra disponibile nel periodo selezionato.</p>;
  }

  return (
    <section className="squadsync__grid" aria-label="Riepilogo squadre">
      {squads.map((squad) => (
        <article key={squad.name} className="squadsync__card">
          <header>
            <h3>{squad.name}</h3>
            <p className="squadsync__card-subtitle">
              {squad.summary.daysCovered} giorni • {formatPercentage(squad.summary.engagementScore)} engagement medio
            </p>
          </header>
          <dl className="squadsync__metrics">
            <div>
              <dt>Active members</dt>
              <dd>{squad.summary.averageActiveMembers.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Deployments</dt>
              <dd>{squad.summary.totalDeployments}</dd>
            </div>
            <div>
              <dt>Stand-up</dt>
              <dd>{squad.summary.totalStandups}</dd>
            </div>
            <div>
              <dt>Incidenti</dt>
              <dd>{squad.summary.totalIncidents}</dd>
            </div>
          </dl>
        </article>
      ))}
    </section>
  );
};

export default SquadSummaryGrid;
