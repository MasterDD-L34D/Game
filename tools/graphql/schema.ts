export const squadSyncTypeDefs = /* GraphQL */ `
  """Intervallo temporale per filtrare il report SquadSync."""
  input SquadSyncRangeInput {
    """Data di inizio (ISO 8601)."""
    start: String
    """Data di fine (ISO 8601)."""
    end: String
  }

  """Informazioni sull'intervallo temporale del report."""
  type SquadSyncRange {
    start: String!
    end: String!
    days: Int!
  }

  """Valori aggregati per tutte le squadre nel periodo richiesto."""
  type SquadSyncAggregate {
    deployments: Int!
    standups: Int!
    incidents: Int!
    averageActiveMembers: Float!
    averageEngagement: Float!
  }

  """Statistiche giornaliere per una singola squadra."""
  type SquadSyncDailyStat {
    date: String!
    activeMembers: Int!
    standups: Int!
    deployments: Int!
    incidents: Int!
    engagement: Float!
  }

  """Sommario di alto livello per una squadra nella finestra temporale."""
  type SquadSyncSquadSummary {
    daysCovered: Int!
    averageActiveMembers: Float!
    totalDeployments: Int!
    totalStandups: Int!
    totalIncidents: Int!
    engagementScore: Float!
  }

  """Collezione di dati giornalieri e sommari per una squadra."""
  type SquadSyncSquad {
    name: String!
    summary: SquadSyncSquadSummary!
    daily: [SquadSyncDailyStat!]!
  }

  """Report completo di SquadSync (range, squadre, totali)."""
  type SquadSyncReport {
    range: SquadSyncRange!
    generatedAt: String!
    squads: [SquadSyncSquad!]!
    totals: SquadSyncAggregate!
  }

  extend type Query {
    squadSyncAnalytics(range: SquadSyncRangeInput): SquadSyncReport!
  }
`;

export interface SquadSyncRange {
  start: string;
  end: string;
  days: number;
}

export interface SquadSyncDailyStat {
  date: string;
  activeMembers: number;
  standups: number;
  deployments: number;
  incidents: number;
  engagement: number;
}

export interface SquadSyncSquadSummary {
  daysCovered: number;
  averageActiveMembers: number;
  totalDeployments: number;
  totalStandups: number;
  totalIncidents: number;
  engagementScore: number;
}

export interface SquadSyncSquad {
  name: string;
  summary: SquadSyncSquadSummary;
  daily: SquadSyncDailyStat[];
}

export interface SquadSyncAggregate {
  deployments: number;
  standups: number;
  incidents: number;
  averageActiveMembers: number;
  averageEngagement: number;
}

export interface SquadSyncReport {
  range: SquadSyncRange;
  generatedAt: string;
  squads: SquadSyncSquad[];
  totals: SquadSyncAggregate;
}

export interface SquadSyncRangeInput {
  start?: string;
  end?: string;
}
