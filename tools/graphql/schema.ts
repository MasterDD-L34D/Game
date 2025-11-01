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

  enum SquadSyncAdaptivePriority {
    CRITICAL
    WARNING
    INFO
  }

  type SquadSyncAdaptiveRange {
    start: String!
    end: String!
  }

  type SquadSyncAdaptiveResponse {
    id: ID!
    squad: String!
    priority: SquadSyncAdaptivePriority!
    metric: String!
    title: String!
    message: String!
    value: Float!
    baseline: Float
    delta: Float
    createdAt: String!
    expiresAt: String
    tags: [String!]!
    source: String!
    variant: String!
    range: SquadSyncAdaptiveRange
  }

  type SquadSyncAdaptiveVariantSummary {
    key: String!
    total: Int!
  }

  type SquadSyncAdaptiveSquadSummary {
    squad: String!
    total: Int!
    critical: Int!
    warning: Int!
    info: Int!
    latestResponseAt: String
  }

  type SquadSyncAdaptiveSummary {
    total: Int!
    critical: Int!
    warning: Int!
    info: Int!
    variants: [SquadSyncAdaptiveVariantSummary!]!
    squads: [SquadSyncAdaptiveSquadSummary!]!
  }

  type SquadSyncAdaptivePayload {
    responses: [SquadSyncAdaptiveResponse!]!
    summary: SquadSyncAdaptiveSummary!
  }

  """Report completo di SquadSync (range, squadre, totali)."""
  type SquadSyncReport {
    range: SquadSyncRange!
    generatedAt: String!
    squads: [SquadSyncSquad!]!
    totals: SquadSyncAggregate!
    adaptive: SquadSyncAdaptivePayload!
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

export type SquadSyncAdaptivePriority = 'CRITICAL' | 'WARNING' | 'INFO';

export interface SquadSyncAdaptiveRange {
  start: string;
  end: string;
}

export interface SquadSyncAdaptiveResponse {
  id: string;
  squad: string;
  priority: SquadSyncAdaptivePriority;
  metric: string;
  title: string;
  message: string;
  value: number;
  baseline: number | null;
  delta: number | null;
  createdAt: string;
  expiresAt: string | null;
  tags: string[];
  source: string;
  variant: string;
  range: SquadSyncAdaptiveRange | null;
}

export interface SquadSyncAdaptiveVariantSummary {
  key: string;
  total: number;
}

export interface SquadSyncAdaptiveSquadSummary {
  squad: string;
  total: number;
  critical: number;
  warning: number;
  info: number;
  latestResponseAt: string | null;
}

export interface SquadSyncAdaptiveSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  variants: SquadSyncAdaptiveVariantSummary[];
  squads: SquadSyncAdaptiveSquadSummary[];
}

export interface SquadSyncAdaptivePayload {
  responses: SquadSyncAdaptiveResponse[];
  summary: SquadSyncAdaptiveSummary;
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
  adaptive: SquadSyncAdaptivePayload;
}

export interface SquadSyncRangeInput {
  start?: string;
  end?: string;
}
