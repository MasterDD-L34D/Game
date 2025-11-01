import { z } from 'zod';

import type {
  NebulaApiResponse,
  NebulaDataset,
  NebulaGeneratorTelemetry,
  NebulaTelemetry,
} from '../types/nebula';

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNumberArray(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value)) as number[];
}

function toStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
}

const datasetSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    summary: z.string().default(''),
    releaseWindow: z.string().optional().nullable(),
    curator: z.string().optional().nullable(),
    metrics: z
      .object({
        species: z.unknown().optional(),
        biomes: z.unknown().optional(),
        encounters: z.unknown().optional(),
      })
      .partial()
      .transform((metrics) => ({
        species: toOptionalNumber(metrics.species),
        biomes: toOptionalNumber(metrics.biomes),
        encounters: toOptionalNumber(metrics.encounters),
      }))
      .optional(),
    highlights: z.unknown().optional().transform((value) => toStringArray(value)).default([]),
    species: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            readiness: z.string().optional(),
            archetype: z.string().optional(),
            telemetry: z
              .object({
                coverage: z.unknown().optional(),
                lastValidation: z.string().optional(),
                curatedBy: z.string().optional(),
              })
              .partial()
              .transform((telemetry) => ({
                coverage: toOptionalNumber(telemetry.coverage),
                lastValidation: typeof telemetry.lastValidation === 'string' ? telemetry.lastValidation : undefined,
                curatedBy: typeof telemetry.curatedBy === 'string' ? telemetry.curatedBy : undefined,
              }))
              .optional(),
            traits: z
              .object({
                core: z.unknown().optional(),
                optional: z.unknown().optional(),
                synergy: z.unknown().optional(),
              })
              .partial()
              .transform((traits) => ({
                core: toStringArray(traits.core),
                optional: toStringArray(traits.optional),
                synergy: toStringArray(traits.synergy),
              }))
              .optional(),
            habitats: z.unknown().optional().transform((value) => toStringArray(value)).optional(),
          })
          .passthrough(),
      )
      .default([]),
    biomes: z.array(z.record(z.unknown())).default([]),
    encounters: z.array(z.record(z.unknown())).default([]),
  })
  .passthrough();

const telemetrySchema = z
  .object({
    summary: z
      .object({
        totalEvents: z.unknown().optional(),
        openEvents: z.unknown().optional(),
        acknowledgedEvents: z.unknown().optional(),
        highPriorityEvents: z.unknown().optional(),
        lastEventAt: z.string().optional().nullable(),
      })
      .partial()
      .transform((value) => ({
        totalEvents: toNumber(value.totalEvents, 0),
        openEvents: toNumber(value.openEvents, 0),
        acknowledgedEvents: toNumber(value.acknowledgedEvents, 0),
        highPriorityEvents: toNumber(value.highPriorityEvents, 0),
        lastEventAt: typeof value.lastEventAt === 'string' ? value.lastEventAt : null,
      })),
    coverage: z
      .object({
        average: z.unknown().optional(),
        history: z.unknown().optional(),
        distribution: z
          .object({
            success: z.unknown().optional(),
            warning: z.unknown().optional(),
            neutral: z.unknown().optional(),
            critical: z.unknown().optional(),
          })
          .partial()
          .optional(),
      })
      .partial()
      .transform((value) => ({
        average: toNumber(value.average, 0),
        history: toNumberArray(value.history),
        distribution: {
          success: toNumber(value.distribution?.success, 0),
          warning: toNumber(value.distribution?.warning, 0),
          neutral: toNumber(value.distribution?.neutral, 0),
          critical: toNumber(value.distribution?.critical, 0),
        },
      })),
    incidents: z
      .object({
        timeline: z
          .array(
            z
              .object({
                date: z.string(),
                total: z.unknown().optional(),
                highPriority: z.unknown().optional(),
              })
              .partial()
              .transform((entry) => ({
                date: entry.date || new Date().toISOString(),
                total: toNumber(entry.total, 0),
                highPriority: toNumber(entry.highPriority, 0),
              })),
          )
          .default([]),
      })
      .partial()
      .transform((value) => ({
        timeline: value.timeline ?? [],
      })),
    updatedAt: z.string().optional().nullable(),
    sample: z.array(z.unknown()).optional(),
  })
  .passthrough()
  .transform((payload) => ({
    summary: payload.summary,
    coverage: payload.coverage,
    incidents: payload.incidents,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
    sample: Array.isArray(payload.sample) ? payload.sample : [],
  }));

const generatorSchema = z
  .object({
    status: z.string(),
    label: z.string(),
    generatedAt: z.string().optional().nullable(),
    dataRoot: z.string().optional().nullable(),
    metrics: z
      .object({
        generationTimeMs: z.unknown().optional(),
        speciesTotal: z.unknown().optional(),
        enrichedSpecies: z.unknown().optional(),
        eventTotal: z.unknown().optional(),
        datasetSpeciesTotal: z.unknown().optional(),
        coverageAverage: z.unknown().optional(),
        coreTraits: z.unknown().optional(),
        optionalTraits: z.unknown().optional(),
        synergyTraits: z.unknown().optional(),
        expectedCoreTraits: z.unknown().optional(),
      })
      .partial()
      .transform((metrics) => ({
        generationTimeMs: toNullableNumber(metrics.generationTimeMs),
        speciesTotal: toNumber(metrics.speciesTotal, 0),
        enrichedSpecies: toNumber(metrics.enrichedSpecies, 0),
        eventTotal: toNumber(metrics.eventTotal, 0),
        datasetSpeciesTotal: toNumber(metrics.datasetSpeciesTotal, 0),
        coverageAverage: toNumber(metrics.coverageAverage, 0),
        coreTraits: toNumber(metrics.coreTraits, 0),
        optionalTraits: toNumber(metrics.optionalTraits, 0),
        synergyTraits: toNumber(metrics.synergyTraits, 0),
        expectedCoreTraits: toNumber(metrics.expectedCoreTraits, 0),
      })),
    streams: z
      .object({
        generationTime: z.unknown().optional(),
        species: z.unknown().optional(),
        enriched: z.unknown().optional(),
      })
      .partial()
      .transform((streams) => ({
        generationTime: toNumberArray(streams.generationTime),
        species: toNumberArray(streams.species),
        enriched: toNumberArray(streams.enriched),
      })),
    updatedAt: z.string().optional().nullable(),
    sourceLabel: z.string().default(''),
  })
  .passthrough()
  .transform((payload) => ({
    ...payload,
    generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : null,
    dataRoot: typeof payload.dataRoot === 'string' ? payload.dataRoot : null,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
  }));

const aggregateSchema = z
  .object({
    dataset: datasetSchema.optional(),
    telemetry: telemetrySchema.optional(),
    generator: generatorSchema.optional(),
  })
  .passthrough();

export function parseNebulaDataset(input: unknown): NebulaDataset {
  return datasetSchema.parse(input) as NebulaDataset;
}

export function parseNebulaTelemetry(input: unknown): NebulaTelemetry {
  return telemetrySchema.parse(input) as NebulaTelemetry;
}

export function parseNebulaGenerator(input: unknown): NebulaGeneratorTelemetry {
  return generatorSchema.parse(input) as NebulaGeneratorTelemetry;
}

export function parseNebulaAggregate(input: unknown): NebulaApiResponse {
  const parsed = aggregateSchema.parse(input);
  return {
    dataset: parsed.dataset ?? null,
    telemetry: parsed.telemetry ?? null,
    generator: parsed.generator ?? null,
  };
}
