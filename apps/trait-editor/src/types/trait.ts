export interface TraitCompletionFlags {
  has_biome: boolean;
  has_data_origin: boolean;
  has_species_link: boolean;
  has_usage_tags: boolean;
}

export interface TraitRequirementMeta {
  expansion?: string;
  notes?: string;
  tier?: string;
  [key: string]: unknown;
}

export interface TraitRequirementConditions {
  biome_class?: string;
  [key: string]: unknown;
}

export interface TraitRequirement {
  capacita_richieste: string[];
  condizioni: TraitRequirementConditions;
  fonte: string;
  meta?: TraitRequirementMeta;
}

export interface TraitSlotProfile {
  core: string;
  complementare: string;
}

export interface TraitSynergyPi {
  co_occorrenze: string[];
  combo_totale: number;
  forme: string[];
  tabelle_random: string[];
}

export interface TraitSpeciesAffinity {
  roles: string[];
  species_id: string;
  weight: number;
}

export interface TraitIndexEntry {
  id: string;
  label: string;
  tier: string;
  famiglia_tipologia: string;
  slot_profile: TraitSlotProfile;
  slot: string[];
  usage_tags: string[];
  completion_flags: TraitCompletionFlags;
  data_origin: string;
  debolezza: string;
  mutazione_indotta: string;
  requisiti_ambientali: TraitRequirement[];
  sinergie: string[];
  sinergie_pi: TraitSynergyPi;
  species_affinity: TraitSpeciesAffinity[];
  spinta_selettiva: string;
  uso_funzione: string;
  fattore_mantenimento_energetico: string;
  conflitti: string[];
  biome_tags?: string[];
}

export interface TraitIndexDocument {
  schema_version: string;
  trait_glossary: string;
  traits: Record<string, TraitIndexEntry>;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  archetype: string;
  playstyle: string;
  signatureMoves: string[];
  entry: TraitIndexEntry;
}
