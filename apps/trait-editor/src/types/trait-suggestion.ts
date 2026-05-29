// ADR-2026-05-29 TKT-BR-09 -- ERMES trait suggestion types.
// Mirrors the ermes_trait_suggestion schema v1.0.0 emitted by
// prototypes/ermes_lab/suggestions.py and served by GET /api/traits/suggestions.

export interface TraitSuggestionPatch {
  op: 'add' | 'replace' | 'remove' | string;
  path: string;
  value?: unknown;
}

export type TraitSuggestionDecision = 'pending' | 'accepted' | 'rejected';

export interface TraitSuggestion {
  trait_id: string;
  biome_id: string;
  kind: string;
  rationale: string;
  confidence: number;
  evidence?: Record<string, unknown>;
  proposed_patch?: TraitSuggestionPatch;
}

export interface TraitSuggestionsResponse {
  schema: string;
  schema_version: string;
  suggestions: TraitSuggestion[];
  note?: string;
}
