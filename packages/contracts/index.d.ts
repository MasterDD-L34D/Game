export interface SnapshotCompletion {
  completed: number;
  total: number;
  [key: string]: unknown;
}

export interface SnapshotOverview {
  objectives: string[];
  blockers?: string[];
  completion?: SnapshotCompletion;
  [key: string]: unknown;
}

export interface SnapshotSpeciesSummary {
  curated?: number;
  total?: number;
  shortlist?: string[];
  [key: string]: unknown;
}

export interface SnapshotBiomeSummary {
  validated: number;
  pending: number;
  [key: string]: unknown;
}

export interface SnapshotEncounterSummary {
  variants: number;
  seeds: number;
  warnings: number;
  [key: string]: unknown;
}

export interface SnapshotRuntimeSummary {
  lastBlueprintId: string | null;
  fallbackUsed: boolean | null;
  validationMessages: number;
  lastRequestId: string | null;
  error?: string | null;
  [key: string]: unknown;
}

export interface SnapshotCheckSummary {
  passed?: number;
  total?: number;
  conflicts?: number;
  [key: string]: unknown;
}

export interface SnapshotQualityRelease {
  checks?: Record<string, SnapshotCheckSummary>;
  traitDiagnosticsSummary?: Record<string, unknown> | null;
  traitDiagnosticsGeneratedAt?: string | null;
  [key: string]: unknown;
}

export interface GenerationSnapshotNotification {
  id?: string;
  channel?: string;
  message?: string;
  time?: string;
  severity?: string;
  [key: string]: unknown;
}

export interface GenerationSnapshotPublishingStep {
  status?: string;
  owner?: string;
  eta?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface GenerationSnapshotPublishing {
  artifactsReady?: number;
  totalArtifacts?: number;
  channels?: string[];
  workflow?: Record<string, GenerationSnapshotPublishingStep>;
  history?: Record<string, unknown>[];
  notifications?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface GenerationSnapshotSuggestion {
  id?: string;
  scope?: string;
  title?: string;
  description?: string;
  action?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export interface GenerationSnapshot {
  overview: SnapshotOverview;
  species?: SnapshotSpeciesSummary;
  biomeSummary: SnapshotBiomeSummary;
  encounterSummary: SnapshotEncounterSummary;
  runtime?: SnapshotRuntimeSummary | null;
  qualityRelease?: SnapshotQualityRelease;
  qualityReleaseContext?: Record<string, unknown>;
  notifications?: GenerationSnapshotNotification[];
  publishing?: GenerationSnapshotPublishing;
  suggestions?: GenerationSnapshotSuggestion[];
  biomes?: Record<string, unknown>[];
  encounter?: Record<string, unknown>;
  initialSpeciesRequest?: {
    trait_ids?: string[];
    fallback_trait_ids?: string[];
    request_id?: string;
    seed?: string | number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AtlasSpeciesTraits {
  core: string[];
  optional?: string[];
  synergy?: string[];
  [key: string]: unknown;
}

export interface AtlasSpeciesTelemetry {
  coverage?: number;
  lastValidation?: string | null;
  curatedBy?: string | null;
  [key: string]: unknown;
}

export interface AtlasSpecies {
  id: string;
  name: string;
  archetype?: string;
  rarity?: string;
  threatTier?: string;
  energyProfile?: string;
  synopsis?: string;
  traits?: AtlasSpeciesTraits;
  habitats?: string[];
  readiness?: string;
  telemetry?: AtlasSpeciesTelemetry;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface TelemetrySummary {
  totalEvents: number;
  openEvents: number;
  acknowledgedEvents: number;
  highPriorityEvents: number;
  lastEventAt: string | null;
  [key: string]: unknown;
}

export interface TelemetryCoverageDistribution {
  success: number;
  warning: number;
  neutral: number;
  critical: number;
  [key: string]: unknown;
}

export interface TelemetryCoverage {
  average: number;
  history: number[];
  distribution: TelemetryCoverageDistribution;
  [key: string]: unknown;
}

export interface TelemetryIncidentEntry {
  date: string;
  total: number;
  highPriority: number;
  [key: string]: unknown;
}

export interface TelemetryIncidents {
  timeline: TelemetryIncidentEntry[];
  [key: string]: unknown;
}

export interface AtlasTelemetryRecord {
  id?: string;
  label?: string;
  severity?: string;
  status?: string;
  priority?: string;
  eventTimestamp?: string;
  [key: string]: unknown;
}

export interface AtlasTelemetry {
  summary: TelemetrySummary;
  coverage: TelemetryCoverage;
  incidents: TelemetryIncidents;
  updatedAt: string;
  sample: AtlasTelemetryRecord[];
  state: string;
  [key: string]: unknown;
}

export declare const generationSnapshotSchema: Record<string, unknown>;
export declare const speciesSchema: Record<string, unknown>;
export declare const telemetrySchema: Record<string, unknown>;
