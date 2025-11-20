import { z } from 'zod';

export const traitCompletionFlagsSchema = z.object({
  has_biome: z.boolean(),
  has_data_origin: z.boolean(),
  has_species_link: z.boolean(),
  has_usage_tags: z.boolean(),
});

export const traitRequirementMetaSchema = z
  .object({
    expansion: z.string().optional(),
    notes: z.string().optional(),
    tier: z.string().optional(),
  })
  .catchall(z.unknown())
  .optional();

export const traitRequirementConditionsSchema = z
  .object({
    biome_class: z.string().optional(),
  })
  .catchall(z.unknown());

export const traitRequirementSchema = z.object({
  capacita_richieste: z.array(z.string()),
  condizioni: traitRequirementConditionsSchema,
  fonte: z.string(),
  meta: traitRequirementMetaSchema,
});

export const traitSlotProfileSchema = z.object({
  core: z.string(),
  complementare: z.string(),
});

export const traitSynergyPiSchema = z.object({
  co_occorrenze: z.array(z.string()),
  combo_totale: z.number(),
  forme: z.array(z.string()),
  tabelle_random: z.array(z.string()),
});

export const traitSpeciesAffinitySchema = z.object({
  roles: z.array(z.string()),
  species_id: z.string(),
  weight: z.number(),
});

export const traitIndexEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  tier: z.string(),
  famiglia_tipologia: z.string(),
  slot_profile: traitSlotProfileSchema,
  slot: z.array(z.string()),
  usage_tags: z.array(z.string()),
  completion_flags: traitCompletionFlagsSchema,
  data_origin: z.string(),
  debolezza: z.string(),
  mutazione_indotta: z.string(),
  requisiti_ambientali: z.array(traitRequirementSchema),
  sinergie: z.array(z.string()),
  sinergie_pi: traitSynergyPiSchema,
  species_affinity: z.array(traitSpeciesAffinitySchema),
  spinta_selettiva: z.string(),
  uso_funzione: z.string(),
  fattore_mantenimento_energetico: z.string(),
  conflitti: z.array(z.string()),
  biome_tags: z.array(z.string()).optional(),
});

export const traitIndexSchema = z.object({
  schema_version: z.string(),
  trait_glossary: z.string(),
  traits: z.record(traitIndexEntrySchema),
});

export type TraitIndexDocument = z.infer<typeof traitIndexSchema>;
export type TraitIndexEntry = z.infer<typeof traitIndexEntrySchema>;
export type TraitRequirement = z.infer<typeof traitRequirementSchema>;
export type TraitRequirementMeta = z.infer<typeof traitRequirementMetaSchema>;
export type TraitRequirementConditions = z.infer<typeof traitRequirementConditionsSchema>;
export type TraitSlotProfile = z.infer<typeof traitSlotProfileSchema>;
export type TraitSynergyPi = z.infer<typeof traitSynergyPiSchema>;
export type TraitCompletionFlags = z.infer<typeof traitCompletionFlagsSchema>;
export type TraitSpeciesAffinity = z.infer<typeof traitSpeciesAffinitySchema>;

export type TraitEnvironment = 'dev' | 'mock' | 'prod';
export type TraitDataSource = 'remote' | 'fallback' | 'mock';

export interface TraitListItem {
  id: string;
  label: string;
  tier: string;
  family: string;
  coreRole: string;
  complementaryRole: string;
  usageTags: string[];
  summary: string;
  searchText: string;
}

export interface TraitDetail extends TraitListItem {
  weakness: string;
  mutation: string;
  selectivePressure: string;
  function: string;
  synergies: string[];
  conflicts: string[];
  energyMaintenance: string;
  dataOrigin: string;
  requirements: TraitRequirement[];
  speciesAffinity: TraitSpeciesAffinity[];
  completionFlags: TraitCompletionFlags;
  synergyInsights: TraitSynergyPi;
  biomeTags?: string[];
}

export interface TraitListResponse {
  traits: TraitListItem[];
  schemaVersion: string;
  glossaryPath: string;
  environment: TraitEnvironment;
  source: TraitDataSource;
  usedMock: boolean;
}

export type TraitValidationSeverity = 'error' | 'warning' | 'suggestion';

export interface TraitValidationFix {
  type?: string;
  value?: unknown;
  note?: string;
  autoApplicable?: boolean;
}

export interface TraitValidationIssue {
  id: string;
  path: string;
  displayPath: string;
  message: string;
  severity: TraitValidationSeverity;
  source: 'schema' | 'style';
  fix?: TraitValidationFix;
}

export interface TraitValidationResult {
  valid: boolean;
  issues: TraitValidationIssue[];
}

export interface TraitDetailResponse {
  trait: TraitDetail;
  rawEntry: TraitIndexEntry;
  environment: TraitEnvironment;
  source: TraitDataSource;
  usedMock: boolean;
}
