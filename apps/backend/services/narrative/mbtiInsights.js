// 2026-04-26 — Disco MBTI tag debrief (P0 Tier S quick-win, P4 surfacing).
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md (Disco Elysium)
// Pattern donor: Disco Elysium thought cabinet diegetic reveal.
//
// Funzione: per ogni actor a fine session, genera 1-2 MBTI insight in
// italiano narrativo (NO statistic dump). Reveal diegetic con metafora
// adatta alla persona Skiv (palette deserto-tattica) + altri species.
//
// Wire: apps/backend/services/rewardEconomy.js buildDebriefSummary()
//   aggiunge field debrief.mbti_insights[actor_id] = ['frase 1', 'frase 2']
//
// Narrative quality: 1-2 frasi ciascuna, evita "your INTP score 0.85".
// Invece: "il tuo agire pesa il piano prima del passo" (diegetic).

'use strict';

// MBTI 4-axis insight palette. Italian narrative, action-anchored.
// Format: { high: string, low: string }  — high = pole positivo (E/N/T/J),
// low = pole opposite (I/S/F/P).
const AXIS_INSIGHTS = {
  E_I: {
    high: [
      'Cerchi sempre il primo contatto: il tuo passo va incontro al rischio.',
      'Le tue azioni dichiarano presenza prima ancora di colpire.',
    ],
    low: [
      'Osservi prima di muovere: la pausa è la tua prima arma.',
      "Lasci che l'avversario si scopra: il tuo silenzio pesa la stanza.",
    ],
  },
  S_N: {
    high: [
      "Vedi pattern dove altri vedono caos: leggi il bioma come una mappa d'intenzioni.",
      'Il tuo agire pesa il piano prima del passo, anticipa il prossimo nodo.',
    ],
    low: [
      "Conosci ogni pietra del sentiero: l'esperienza concreta guida la tua mano.",
      'I dati immediati ti bastano: il presente è già una decisione.',
    ],
  },
  T_F: {
    high: [
      "Il calcolo precede l'istinto: la tua scelta è una formula.",
      "Pesi costo e ritorno con la freddezza di chi non si lascia distrarre dall'eco.",
    ],
    low: [
      'I legami contano nei tuoi turni: chi cade pesa più del bilancio del round.',
      "L'empatia detta il bersaglio: proteggi prima di ottimizzare.",
    ],
  },
  J_P: {
    high: [
      'Pianifichi il round prima del primo dado: la struttura è la tua comodità.',
      'Le tue mosse sono già tre passi avanti: il caos si piega alla tua agenda.',
    ],
    low: [
      "Adatti il piano al rumore della battaglia: l'opportunità è il tuo strumento.",
      "Cambi rotta a metà turno se la sabbia detta nuove tracce: l'improvvisazione è arma.",
    ],
  },
};

const ENNEA_INSIGHTS = {
  1: 'Tipo 1 (Riformatore): cerchi la mossa giusta, non solo quella che funziona.',
  2: 'Tipo 2 (Soccorritore): proteggi anche a costo di esporre te stesso.',
  3: 'Tipo 3 (Realizzatore): la vittoria conta come segnale, non come fine.',
  4: 'Tipo 4 (Individualista): scegli la rotta che nessun altro vedrebbe.',
  5: 'Tipo 5 (Investigatore): trattieni il colpo finché il quadro non è completo.',
  6: 'Tipo 6 (Lealista): il pattern fidato vince sul colpo brillante.',
  7: 'Tipo 7 (Esploratore): salti opzioni, raccogli combo prima della fine.',
  8: 'Tipo 8 (Sfidante): rompi la catena di pressione del Sistema.',
  9: 'Tipo 9 (Pacificatore): preferisci il riposizionamento al frontale.',
};

/**
 * Estrae axis tag dal MBTI type (es. 'INTP' -> ['I','N','T','P']).
 * Returns null se invalid.
 */
function _parseMbtiAxes(mbtiType) {
  if (!mbtiType || typeof mbtiType !== 'string' || mbtiType.length !== 4) return null;
  const upper = mbtiType.toUpperCase();
  const axes = {
    E_I: upper[0] === 'E' ? 'high' : 'low',
    S_N: upper[1] === 'N' ? 'high' : 'low',
    T_F: upper[2] === 'T' ? 'high' : 'low',
    J_P: upper[3] === 'J' ? 'high' : 'low',
  };
  return axes;
}

/**
 * Genera 1-2 insight per un singolo actor VC snapshot.
 *
 * @param {object} vc — single actor VC: { mbti_type, ennea_archetypes, aggregate_indices, axes_confidence? }
 * @param {object} opts — { axisCount: number = 1, includeEnnea: boolean = true, maxAxes: 2 }
 * @returns {Array<string>} array insight strings (1-2 entries)
 */
function generateActorInsights(vc, opts = {}) {
  const { axisCount = 1, includeEnnea = true, maxAxes = 2 } = opts;
  if (!vc || typeof vc !== 'object') return [];

  const insights = [];
  const axes = _parseMbtiAxes(vc.mbti_type);
  if (axes) {
    // Pick top-N axes by confidence (se confidence map disponibile, altrimenti random stable).
    const conf = vc.axes_confidence || {};
    const axisOrder = Object.entries(axes)
      .map(([k, dir]) => ({ axis: k, dir, conf: Number(conf[k] ?? 0.5) }))
      .sort((a, b) => b.conf - a.conf)
      .slice(0, Math.min(maxAxes, Math.max(1, axisCount)));

    for (const { axis, dir } of axisOrder) {
      const palette = AXIS_INSIGHTS[axis];
      if (!palette) continue;
      const lines = palette[dir] || [];
      if (lines.length === 0) continue;
      // Stable pick: hash mbti_type + axis -> index (deterministic, no rng).
      const seed = (vc.mbti_type + axis).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      insights.push(lines[seed % lines.length]);
    }
  }

  if (includeEnnea && Array.isArray(vc.ennea_archetypes) && vc.ennea_archetypes.length > 0) {
    const top = vc.ennea_archetypes[0];
    const enneaNum = Number(top?.type ?? top);
    if (enneaNum >= 1 && enneaNum <= 9) {
      insights.push(ENNEA_INSIGHTS[enneaNum]);
    }
  }

  return insights;
}

/**
 * Build insights map per tutti actors nel vcSnapshot.
 * Output: { [unitId]: ['insight 1', 'insight 2', ...] }
 */
function buildMbtiInsights(vcSnapshot, opts = {}) {
  const map = {};
  if (!vcSnapshot || !vcSnapshot.per_actor) return map;
  for (const [uid, vc] of Object.entries(vcSnapshot.per_actor)) {
    const insights = generateActorInsights(vc, opts);
    if (insights.length > 0) map[uid] = insights;
  }
  return map;
}

module.exports = {
  generateActorInsights,
  buildMbtiInsights,
  AXIS_INSIGHTS,
  ENNEA_INSIGHTS,
};
