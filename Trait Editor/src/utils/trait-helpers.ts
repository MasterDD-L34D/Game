import type { Trait, TraitIndexEntry } from '../types/trait';

const deepClone = <T>(value: T): T => {
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

export const cloneTraitEntry = (entry: TraitIndexEntry): TraitIndexEntry => deepClone(entry);

export const synchroniseTraitPresentation = (trait: Trait): Trait => {
  trait.entry.label = trait.name;
  trait.entry.famiglia_tipologia = trait.archetype;
  trait.entry.spinta_selettiva = trait.playstyle;
  trait.entry.uso_funzione = trait.description;
  trait.entry.sinergie = [...trait.signatureMoves];
  return trait;
};

export const cloneTrait = (trait: Trait): Trait => {
  const signatureMoves = [...trait.signatureMoves];
  const entryClone = cloneTraitEntry(trait.entry);
  entryClone.sinergie = [...signatureMoves];

  const traitClone: Trait = {
    ...trait,
    signatureMoves,
    entry: entryClone,
  };

  return synchroniseTraitPresentation(traitClone);
};

export const cloneTraits = (traits: Trait[]): Trait[] => traits.map((trait) => cloneTrait(trait));
