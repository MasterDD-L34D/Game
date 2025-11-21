export type { TaxonomySpecies, TaxonomyBiome, SpeciesBiomeLink } from '@game/contracts';

export type MissionStatus = 'planned' | 'in-progress' | 'completed' | 'at-risk';

export interface Mission {
  id: string;
  codename: string;
  status: MissionStatus;
  summary: string;
  lead: string;
  operators: string[];
  riskLevel: 'Low' | 'Moderate' | 'High';
  lastUpdated: string;
  tags: string[];
  upcomingActions: string[];
}

export interface EventLog {
  id: string;
  timestamp: string;
  category: 'intel' | 'operations' | 'logistics' | 'engineering';
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface AtlasNode {
  id: string;
  title: string;
  excerpt: string;
  focus: 'strategy' | 'field-report' | 'technology' | 'analysis';
  lastUpdated: string;
}

export interface AtlasRegion {
  id: string;
  name: string;
  description: string;
  nodes: AtlasNode[];
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  archetype: string;
  playstyle: string;
  signatureMoves: string[];
}

export interface NebulaMilestone {
  id: string;
  title: string;
  owner: string;
  status: 'on-track' | 'blocked' | 'monitor';
  eta: string;
  progress: number;
  summary: string;
  dependencies: string[];
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'steady';
  change: string;
}
