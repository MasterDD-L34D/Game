import type { Trait, TraitIndexEntry } from '../types/trait';

export const deepClone = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return (value.map((item) => deepClone(item)) as unknown) as T;
  }

  if (value && typeof value === 'object') {
    if (value === null) {
      return value;
    }

    const source = value as Record<string, unknown>;
    const clone: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      clone[key] = deepClone(source[key]);
    }
    return clone as T;
  }

  return value;
};

const deepAssign = (target: unknown, source: unknown): unknown => {
  if (source === undefined) {
    return target;
  }

  if (Array.isArray(source)) {
    return source.map((item) => deepClone(item));
  }

  if (source && typeof source === 'object') {
    const sourceObject = source as Record<string, unknown>;
    const baseObject = (target && typeof target === 'object'
      ? (target as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    const result: Record<string, unknown> = { ...baseObject };
    for (const key of Object.keys(sourceObject)) {
      result[key] = deepAssign(baseObject[key], sourceObject[key]);
    }
    return result;
  }

  return source;
};

export const cloneTraitEntry = (entry: TraitIndexEntry): TraitIndexEntry => deepClone(entry);

export const cloneTrait = (trait: Trait): Trait => deepClone(trait);

export const cloneTraits = (traits: Trait[]): Trait[] => traits.map((trait) => cloneTrait(trait));

export const mergeTrait = (baseline: Trait, updates: Trait): Trait => {
  const baseClone = cloneTrait(baseline);
  return deepAssign(baseClone, updates) as Trait;
};

export const synchroniseTraitPresentation = (trait: Trait): Trait => {
  trait.entry.label = trait.name;
  trait.entry.famiglia_tipologia = trait.archetype;
  trait.entry.spinta_selettiva = trait.playstyle;
  trait.entry.uso_funzione = trait.description;
  trait.entry.sinergie = [...trait.signatureMoves];
  return trait;
};
