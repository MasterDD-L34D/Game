export type NebulaTraits = {
  core?: string[];
  optional?: string[];
  synergy?: string[];
};

export type NebulaSpeciesTelemetry = {
  coverage?: number;
  lastValidation?: string;
  curatedBy?: string;
};

export interface NebulaSpecies {
  id: string;
  name: string;
  readiness?: string;
  archetype?: string;
  rarity?: string;
  threatTier?: string;
  energyProfile?: string;
  synopsis?: string;
  traits?: NebulaTraits;
  habitats?: string[];
  telemetry?: NebulaSpeciesTelemetry;
  [key: string]: unknown;
}

export interface NebulaDatasetMetrics {
  species?: number;
  biomes?: number;
  encounters?: number;
  [key: string]: unknown;
}

export interface NebulaDataset {
  id: string;
  title: string;
  summary: string;
  releaseWindow?: string | null;
  curator?: string | null;
  metrics?: NebulaDatasetMetrics;
  highlights?: string[];
  species: NebulaSpecies[];
  biomes: Array<Record<string, unknown>>;
  encounters: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface TelemetrySummary {
  totalEvents: number;
  openEvents: number;
  acknowledgedEvents: number;
  highPriorityEvents: number;
  lastEventAt: string | null;
}

export interface TelemetryCoverage {
  average: number;
  history: number[];
  distribution: Record<'success' | 'warning' | 'neutral' | 'critical', number>;
}

export interface TelemetryIncidents {
  timeline: Array<{ date: string; total: number; highPriority: number }>;
}

export interface NebulaTelemetry {
  summary: TelemetrySummary;
  coverage: TelemetryCoverage;
  incidents: TelemetryIncidents;
  updatedAt: string | null;
  sample: unknown[];
  [key: string]: unknown;
}

export interface GeneratorMetrics {
  generationTimeMs: number | null;
  speciesTotal: number;
  enrichedSpecies: number;
  eventTotal: number;
  datasetSpeciesTotal: number;
  coverageAverage: number;
  coreTraits: number;
  optionalTraits: number;
  synergyTraits: number;
  expectedCoreTraits: number;
  [key: string]: unknown;
}

export interface GeneratorStreams {
  generationTime: number[];
  species: number[];
  enriched: number[];
  [key: string]: unknown;
}

export interface NebulaGeneratorTelemetry {
  status: string;
  label: string;
  generatedAt: string | null;
  dataRoot?: string | null;
  metrics: GeneratorMetrics;
  streams: GeneratorStreams;
  updatedAt: string | null;
  sourceLabel: string;
  [key: string]: unknown;
}

export type TelemetryMode = 'live' | 'fallback' | 'mock';

export interface NebulaApiResponse {
  dataset?: NebulaDataset | null;
  telemetry?: NebulaTelemetry | null;
  generator?: NebulaGeneratorTelemetry | null;
  [key: string]: unknown;
}

export type DatasetSource = 'remote' | 'fallback' | 'static';
