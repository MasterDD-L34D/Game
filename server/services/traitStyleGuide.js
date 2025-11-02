'use strict';

const SLUG_PATTERN = /^[a-z0-9_]+$/;
const TIER_PATTERN = /^T[0-9]$/;

const I18N_FIELDS = [
  'label',
  'mutazione_indotta',
  'uso_funzione',
  'spinta_selettiva',
  'debolezza',
  'fattore_mantenimento_energetico',
];

const SEVERITY_ORDER = {
  info: 0,
  warning: 1,
  error: 2,
};

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalisePath(pathSegments) {
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return '';
  }
  return `/${pathSegments.map((segment) => String(segment)).join('/')}`;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function addSuggestion(bucket, suggestion) {
  const severity = suggestion.severity || 'warning';
  const normalised = {
    ...suggestion,
    severity,
    path: suggestion.path || '',
  };
  bucket.push(normalised);
}

function checkI18nFields(trait, suggestions, traitId) {
  I18N_FIELDS.forEach((field) => {
    const pointer = normalisePath([field]);
    const value = trait[field];
    if (typeof value !== 'string' || !value.trim()) {
      addSuggestion(suggestions, {
        path: pointer,
        severity: 'error',
        message: `Il campo \`${field}\` deve usare una chiave i18n dedicata (i18n:traits.${traitId || 'trait'}.${field}).`,
        fix: traitId
          ? { type: 'set', value: `i18n:traits.${traitId}.${field}` }
          : { type: 'set', note: 'Imposta una chiave i18n per questo campo.' },
      });
      return;
    }
    const expectedPrefix = traitId ? `i18n:traits.${traitId}.` : 'i18n:traits.';
    if (!value.startsWith(expectedPrefix)) {
      addSuggestion(suggestions, {
        path: pointer,
        severity: 'error',
        message: `Allinea \`${field}\` al namespace i18n del tratto (${expectedPrefix}...).`,
        fix: traitId ? { type: 'set', value: `${expectedPrefix}${field}` } : undefined,
      });
    }
  });
}

function checkTier(trait, suggestions) {
  const pointer = normalisePath(['tier']);
  const tier = trait.tier;
  if (typeof tier !== 'string' || !tier.trim()) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'error',
      message: 'Imposta il tier del tratto utilizzando il formato T1/T2/T3.',
      fix: { type: 'set', note: 'Scegliere il tier coerente con la matrice di bilanciamento (es. "T1").' },
    });
    return;
  }
  const upper = tier.toUpperCase();
  if (!TIER_PATTERN.test(upper)) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'error',
      message: `Il valore \`${tier}\` non rispetta il formato T{numero}.`,
      fix: { type: 'set', value: upper.replace(/[^0-9]/g, '') ? upper : 'T1' },
    });
    return;
  }
  if (tier !== upper) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'info',
      message: 'Utilizza il formato maiuscolo per il tier (es. T1).',
      fix: { type: 'set', value: upper },
    });
  }
}

function checkId(trait, suggestions, traitId) {
  const pointer = normalisePath(['id']);
  const currentId = trait.id;
  if (!currentId && traitId) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'error',
      message: `Il payload deve includere l'id \`${traitId}\`.`,
      fix: { type: 'set', value: traitId },
    });
    return;
  }
  if (typeof currentId !== 'string' || !currentId.trim()) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'error',
      message: 'Specificare un id in formato snake_case.',
      fix: { type: 'set', note: 'Usa solo caratteri a-z, numeri e underscore.' },
    });
    return;
  }
  if (!SLUG_PATTERN.test(currentId)) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'error',
      message: `L'id \`${currentId}\` non è uno slug valido (consentiti a-z0-9_).`,
      fix: { type: 'set', value: currentId.toLowerCase().replace(/[^a-z0-9_]/g, '_') },
    });
  }
  if (traitId && currentId !== traitId) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'warning',
      message: `Allinea l'id del payload all'elemento selezionato (${traitId}).`,
      fix: { type: 'set', value: traitId },
    });
  }
}

function checkSlugArray(trait, suggestions, field) {
  const pointer = normalisePath([field]);
  const value = trait[field];
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'error',
      message: `\`${field}\` deve essere un array di id in snake_case.`,
      fix: { type: 'set', note: 'Converti il valore in lista di slug.' },
    });
    return;
  }
  const seen = new Set();
  value.forEach((entry, index) => {
    const entryPath = normalisePath([field, index]);
    if (typeof entry !== 'string') {
      addSuggestion(suggestions, {
        path: entryPath,
        severity: 'error',
        message: 'Usa slug in formato snake_case.',
        fix: { type: 'set', note: 'Rimuovi valori non testuali.' },
      });
      return;
    }
    const trimmed = entry.trim();
    if (!SLUG_PATTERN.test(trimmed)) {
      addSuggestion(suggestions, {
        path: entryPath,
        severity: 'error',
        message: `\`${entry}\` non rispetta lo slug richiesto (a-z0-9_).`,
        fix: { type: 'set', value: trimmed.toLowerCase().replace(/[^a-z0-9_]/g, '_') },
      });
    }
    if (seen.has(trimmed)) {
      addSuggestion(suggestions, {
        path: entryPath,
        severity: 'warning',
        message: `Valore duplicato \`${trimmed}\` in \`${field}\`.`,
        fix: { type: 'remove' },
      });
    }
    seen.add(trimmed);
  });
}

function checkSlotProfile(trait, suggestions) {
  const pointer = normalisePath(['slot_profile']);
  const slotProfile = trait.slot_profile;
  if (slotProfile === undefined) {
    return;
  }
  if (typeof slotProfile !== 'object' || slotProfile === null || Array.isArray(slotProfile)) {
    addSuggestion(suggestions, {
      path: pointer,
      severity: 'error',
      message: 'La sezione `slot_profile` deve essere un oggetto con `core` e `complementare`.',
      fix: { type: 'set', note: 'Converti il valore in oggetto { core, complementare }.' },
    });
    return;
  }
  ['core', 'complementare'].forEach((field) => {
    const value = slotProfile[field];
    const fieldPath = normalisePath(['slot_profile', field]);
    if (typeof value !== 'string' || !value.trim()) {
      addSuggestion(suggestions, {
        path: fieldPath,
        severity: 'warning',
        message: `Compila il campo \`${field}\` in slot_profile (es. "metabolico").`,
        fix: { type: 'set', note: 'Allinea il valore ai cluster slot condivisi.' },
      });
    } else if (value !== value.toLowerCase()) {
      addSuggestion(suggestions, {
        path: fieldPath,
        severity: 'info',
        message: 'Usa lettere minuscole per le etichette slot.',
        fix: { type: 'set', value: value.toLowerCase() },
      });
    }
  });
}

function checkEnvironmentalRequirements(trait, suggestions) {
  const requirements = ensureArray(trait.requisiti_ambientali);
  if (!requirements.length) {
    return;
  }
  const traitTier = typeof trait.tier === 'string' ? trait.tier.toUpperCase() : null;
  requirements.forEach((entry, index) => {
    const basePath = ['requisiti_ambientali', index];
    if (typeof entry !== 'object' || entry === null) {
      addSuggestion(suggestions, {
        path: normalisePath(basePath),
        severity: 'error',
        message: 'Ogni requisito ambientale deve essere un oggetto con condizioni/meta.',
        fix: { type: 'set', note: "Trasforma l'elemento in un oggetto strutturato." },
      });
      return;
    }
    const fonte = entry.fonte;
    if (!fonte || typeof fonte !== 'string') {
      addSuggestion(suggestions, {
        path: normalisePath([...basePath, 'fonte']),
        severity: 'warning',
        message: "Specifica la fonte (es. env_to_traits) per tracciare l'origine della regola.",
        fix: { type: 'set', value: 'env_to_traits' },
      });
    }
    const meta = entry.meta;
    if (typeof meta !== 'object' || meta === null) {
      addSuggestion(suggestions, {
        path: normalisePath([...basePath, 'meta']),
        severity: 'warning',
        message: 'Aggiungi la sezione meta con tier, notes e expansion.',
        fix: { type: 'set', note: 'Inserire { "tier": "T1", "notes": "..." }.' },
      });
    } else {
      const tier = meta.tier;
      if (traitTier && tier !== traitTier) {
        addSuggestion(suggestions, {
          path: normalisePath([...basePath, 'meta', 'tier']),
          severity: 'warning',
          message: `Allinea meta.tier (${tier || '—'}) al tier del tratto (${traitTier}).`,
          fix: { type: 'set', value: traitTier },
        });
      }
      if (!meta.notes || typeof meta.notes !== 'string') {
        addSuggestion(suggestions, {
          path: normalisePath([...basePath, 'meta', 'notes']),
          severity: 'info',
          message: 'Compila le note descrivendo perché il tratto si attiva in questo bioma.',
          fix: { type: 'set', note: 'Riassumi il contesto narrativo/tattico.' },
        });
      }
    }
    const condizioni = entry.condizioni;
    if (typeof condizioni !== 'object' || condizioni === null) {
      addSuggestion(suggestions, {
        path: normalisePath([...basePath, 'condizioni']),
        severity: 'error',
        message: 'Ogni requisito deve definire condizioni (es. biome_class, salinita_in).',
        fix: { type: 'set', note: 'Imposta un oggetto condizioni con chiavi specifiche.' },
      });
    }
  });
}

function checkCompletionFlags(trait, suggestions) {
  const flags = trait.completion_flags;
  if (typeof flags !== 'object' || flags === null || Array.isArray(flags)) {
    return;
  }
  const requirements = ensureArray(trait.requisiti_ambientali);
  if (requirements.length && flags.has_biome === false) {
    addSuggestion(suggestions, {
      path: normalisePath(['completion_flags', 'has_biome']),
      severity: 'warning',
      message: 'Segna `has_biome` a true dopo aver mappato i requisiti ambientali.',
      fix: { type: 'set', value: true },
    });
  }
}

function evaluateTraitStyle(traitInput, options = {}) {
  const trait = clone(traitInput) || {};
  const suggestions = [];
  const traitId = options.traitId || trait.id;

  checkId(trait, suggestions, traitId);
  if (traitId) {
    checkI18nFields(trait, suggestions, traitId);
  }
  checkTier(trait, suggestions);
  checkSlugArray(trait, suggestions, 'sinergie');
  checkSlugArray(trait, suggestions, 'conflitti');
  checkSlotProfile(trait, suggestions);
  checkEnvironmentalRequirements(trait, suggestions);
  checkCompletionFlags(trait, suggestions);

  const summary = suggestions.reduce(
    (acc, suggestion) => {
      const severity = suggestion.severity || 'warning';
      acc.total += 1;
      acc.bySeverity[severity] = (acc.bySeverity[severity] || 0) + 1;
      return acc;
    },
    { total: 0, bySeverity: { info: 0, warning: 0, error: 0 } },
  );

  return { suggestions, summary };
}

module.exports = {
  evaluateTraitStyle,
  I18N_FIELDS,
  SEVERITY_ORDER,
};
