// apps/backend/services/combat/ghiandoleMnemoniche.js
//
// ghiandole_mnemoniche -- furto di buff.
// Spec: docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
//
// Intento autoriale (docs/traits/Frattura_Abissale_Sinaptica_trait_draft.md:57,
// role_template "Sciame Memetico", tier 3, functional_tags sabotaggio + furto_buff):
// "micro-larve che rubano buff temporanei e li riapplicano in forma ridotta".
// Su un colpo andato a segno il portatore strappa UN buff alla preda e ne indossa
// una copia attenuata.
//
// SCOSTAMENTO DAL CANONE, deliberato. Il canone (trait_reference_manual.md:35, il
// gemello riverbero_memetico) dice "duplica prossimo buff al 50%". La magnitudo di
// uno status NON e' scalabile in questo motore: computeStatusModifiers legge
// status_intensity per il solo `abbagliato` (statusModifiers.js:241); tutti gli altri
// status sono binari (isPositive -> delta fisso). Non esiste "mezzo linked". Il 50%
// e' quindi reso sulla DURATA. Non convertirlo in magnitudo senza riaprire la
// decisione: toccherebbe ~12 rami di computeStatusModifiers e ri-bilancerebbe ogni
// tratto esistente che produce quegli status.
//
// `frenzy` e' primo in whitelist per scelta di design (master-dd): la priorita' e'
// TOGLIERE al nemico (tag `sabotaggio`), non massimizzare il guadagno proprio. Ed e'
// l'unico buff il cui furto NON e' un guadagno netto: computeStatusModifiers legge lo
// STESSO status sui due lati -- +1 attacco quando si attacca (:202), -1 difesa quando
// si e' bersagliati (:253) -- quindi il ladro eredita anche la guardia abbassata.
//
// PASSIVE_BLOCKLIST contiene frenzy (passiveStatusApplier.js:45), ma vieta
// l'auto-applicazione PASSIVA ("frenzy = 2 turns rage, not always-on"). Qui il buff e'
// applicato direttamente e a durata dimezzata: nessun conflitto, e la regola
// dimezzante rispetta quell'intento canonico.
//
// Esclusi dalla whitelist: `nucleo_intatto` (stato strutturale, non un buff; il suo
// rovescio danno_nucleo e' governato da combat/nucleiWeakPoint.js) e `telepatic_link`
// (firma di nodi_micorrizici_oracolari: rubarlo incrocerebbe i due tratti in un modo
// che nessuno ha progettato).
//
// Questo tratto resta fuori da tests/helpers/traitLiveness.js DI PROPOSITO: il mirror
// esclude ogni persistent_marker, cosi' i path di grant automatico (imprintTraitGrant,
// brancoTraitEmergence) non lo pescheranno mai senza un ratify N=40 dedicato.
// Non e' una dimenticanza.
//
// Puro rispetto al modulo: muta in place gli status-map di actor e target, come i pari
// cortecciaMemetica / tessutiAdattivi. La PERSISTENZA della rimozione nel path
// round-model e' responsabilita' del chiamante: routes/session.js pusha in
// session._pendingStatusRemovals (vedi combat/pendingStatusRemovals.js), perche' il
// rebuild tracked->dict annullerebbe un delete fatto a meta' attacco.
//
// Band-neutral: nessuna sim unit porta ghiandole_mnemoniche.

'use strict';

const GHIANDOLE_TRAIT = 'ghiandole_mnemoniche';

// Ordine di priorita' deterministico. Un solo buff per colpo.
const STEALABLE = ['frenzy', 'linked', 'sensed', 'coordinamento', 'risonanza_memetica'];

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

/**
 * Durata attenuata: 50% arrotondato per eccesso, con floor 1 su input positivi.
 *
 * @param {number} turns
 * @returns {number} 0 quando l'input non e' un numero positivo
 */
function attenuate(turns) {
  const t = Number(turns);
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.max(1, Math.ceil(t / 2));
}

/**
 * Ruba il primo buff in whitelist posseduto dal target. Muta entrambe le unita'.
 *
 * @param {object} opts
 * @param {object} opts.actor  portatore del tratto (mutato: guadagna il buff)
 * @param {object} opts.target preda (mutata: perde il buff)
 * @returns {{stato: string, stolen_turns: number, granted_turns: number} | null}
 */
function stealBuff({ actor, target }) {
  if (!actor || typeof actor !== 'object') return null;
  if (!target || typeof target !== 'object') return null;
  if (!hasTrait(actor, GHIANDOLE_TRAIT)) return null;

  const targetStatus = target.status;
  if (!targetStatus || typeof targetStatus !== 'object' || Array.isArray(targetStatus)) {
    return null;
  }

  for (const stato of STEALABLE) {
    const turns = Number(targetStatus[stato]);
    if (!Number.isFinite(turns) || turns <= 0) continue;

    const granted = attenuate(turns);
    delete targetStatus[stato];
    if (target.status_intensity && typeof target.status_intensity === 'object') {
      delete target.status_intensity[stato];
    }

    if (!actor.status || typeof actor.status !== 'object') actor.status = {};
    const current = Number(actor.status[stato] || 0);
    // max-policy, coerente con applyMoraleStatus: un furto non abbassa mai un buff
    // che il portatore possiede gia' con durata maggiore.
    actor.status[stato] = Math.max(current, granted);

    return { stato, stolen_turns: turns, granted_turns: actor.status[stato] };
  }
  return null;
}

module.exports = {
  stealBuff,
  attenuate,
  hasTrait,
  GHIANDOLE_TRAIT,
  STEALABLE,
};
