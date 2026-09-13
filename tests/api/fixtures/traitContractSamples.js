const TRAIT_ID = 'alpha_trait';

function buildTraitPayload(overrides = {}) {
  const base = {
    id: TRAIT_ID,
    label: 'i18n:traits.alpha_trait.label',
    famiglia_tipologia: 'Supporto/Logistico',
    tier: 'T1',
    slot: [],
    sinergie: [],
    conflitti: [],
    metrics: [],
    usage_tags: ['core'],
  };
  return { ...base, ...(overrides || {}) };
}

function buildTraitMeta(overrides = {}) {
  const base = {
    id: TRAIT_ID,
    path: 'traits/supporto/alpha_trait.json',
    category: 'supporto',
    isDraft: false,
    version: '2024-01-15T10:00:00.000Z',
    savedAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    etag: '"etag-alpha"',
  };
  return { ...base, ...(overrides || {}) };
}

function buildIndexDocument(overrides = {}) {
  const baseMeta = buildTraitMeta();
  const base = {
    traits: {
      [TRAIT_ID]: {
        label: 'i18n:traits.alpha_trait.label',
        tier: 'T1',
        usage_tags: ['core'],
      },
    },
    meta: {
      schema: {
        version: '3.0.0',
        path: 'config/schemas/trait.schema.json',
      },
      glossary: {
        path: 'data/core/traits/glossary.json',
      },
      traits: {
        [TRAIT_ID]: baseMeta,
      },
    },
    legacy: {
      schema_version: '2.0',
      trait_glossary: 'data/core/traits/glossary.json',
      traits: {
        [TRAIT_ID]: {
          label: 'i18n:traits.alpha_trait.label',
          tier: 'T1',
        },
      },
    },
  };

  return {
    ...base,
    ...overrides,
    traits: overrides.traits ? overrides.traits : base.traits,
    meta: {
      ...base.meta,
      ...(overrides.meta || {}),
      schema: {
        ...base.meta.schema,
        ...(overrides.meta?.schema || {}),
      },
      glossary: {
        ...base.meta.glossary,
        ...(overrides.meta?.glossary || {}),
      },
      traits: {
        ...base.meta.traits,
        ...(overrides.meta?.traits || {}),
      },
    },
    legacy: {
      ...base.legacy,
      ...(overrides.legacy || {}),
      traits: {
        ...base.legacy.traits,
        ...(overrides.legacy?.traits || {}),
      },
    },
  };
}

function buildTraitResponse(overrides = {}) {
  return {
    trait: buildTraitPayload(overrides.trait),
    meta: buildTraitMeta(overrides.meta),
  };
}

module.exports = {
  TRAIT_ID,
  buildTraitPayload,
  buildTraitMeta,
  buildIndexDocument,
  buildTraitResponse,
};
