import { computeThreat, parseThreatTier } from '../state/generator/encounterGenerator.js';

function normalizeTemplate(template, variant) {
  if (template) {
    return template;
  }
  const defaultThreatTier = variant?.metrics?.threat?.tier;
  const base = defaultThreatTier ? parseThreatTier(defaultThreatTier) : 0;
  return {
    id: variant?.id || 'custom',
    name: variant?.summary || 'Variante',
    dynamics: {
      threat: {
        base,
        slotWeight: {},
      },
    },
  };
}

function buildAssignments(variant) {
  if (!variant) {
    return [];
  }
  return (variant.slots || []).map((slot) => ({
    slot: {
      id: slot.id,
      title: slot.title,
    },
    quantity: slot.quantity ?? slot.species?.length ?? 0,
    species: (slot.species || []).map((specimen) => ({
      ...specimen,
      statistics: {
        ...(specimen.statistics || {}),
        threat_tier: specimen.statistics?.threat_tier || specimen.threat_tier || specimen.balance?.threat_tier || null,
        rarity: specimen.statistics?.rarity || specimen.rarity || null,
      },
      balance: specimen.balance || null,
    })),
  }));
}

function normalizeParameters(variant) {
  const result = {};
  const entries = Object.entries(variant?.parameters || {});
  for (const [id, value] of entries) {
    if (value && typeof value === 'object') {
      result[id] = value;
    }
  }
  return result;
}

function computeRarityMix(assignments) {
  const counts = {};
  let total = 0;
  for (const assignment of assignments) {
    for (const specimen of assignment.species) {
      const rarity = specimen.statistics?.rarity || 'Sconosciuta';
      counts[rarity] = (counts[rarity] || 0) + 1;
      total += 1;
    }
  }
  const distribution = {};
  let dominant = null;
  let dominantCount = 0;
  for (const [rarity, count] of Object.entries(counts)) {
    const percent = total === 0 ? 0 : Number(((count / total) * 100).toFixed(1));
    distribution[rarity] = percent;
    if (count > dominantCount) {
      dominantCount = count;
      dominant = rarity;
    }
  }
  return {
    total,
    counts,
    distribution,
    dominant: dominant || null,
  };
}

export function calculateEncounterMetrics(template, variant) {
  if (!variant) {
    return {
      threat: { tier: 'T?', score: 0 },
      rarityMix: { total: 0, counts: {}, distribution: {}, dominant: null },
    };
  }
  const normalizedTemplate = normalizeTemplate(template, variant);
  const assignments = buildAssignments(variant);
  const parameters = normalizeParameters(variant);
  const threat = computeThreat(normalizedTemplate, parameters, assignments);
  const rarityMix = computeRarityMix(assignments);
  return {
    threat,
    rarityMix,
  };
}

export function buildEncounterSuggestions(metrics) {
  if (!metrics) {
    return [];
  }
  const suggestions = [];
  const threatScore = metrics.threat?.score ?? 0;
  const threatTier = metrics.threat?.tier ?? 'T?';
  const totalUnits = metrics.rarityMix?.total ?? 0;
  const dominant = metrics.rarityMix?.dominant;

  if (threatScore >= 9) {
    suggestions.push('Riduci la presenza di unità d\'élite o abbassa la cadenza per riportare la minaccia sotto controllo.');
  } else if (threatScore <= 4 && totalUnits > 0) {
    suggestions.push('Aggiungi un rinforzo pesante o aumenta l\'intensità dei parametri per evitare un incontro troppo facile.');
  }

  if (dominant && dominant.toLowerCase().includes('comune')) {
    suggestions.push('Inserisci una creatura rara per aumentare la varietà tattica e la ricompensa percepita.');
  }

  if (!suggestions.length && threatTier !== 'T?') {
    suggestions.push('La configurazione è bilanciata: valuta solo piccoli ritocchi narrativi o di pacing.');
  }

  return suggestions;
}
