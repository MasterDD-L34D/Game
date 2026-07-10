// apps/backend/services/combat/pendingStatusRemovals.js
//
// Canale di RIMOZIONE degli status, simmetrico a session._pendingStatusApplies.
// Spec: docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md (sez. 2b)
//
// Perche' serve. Il canale di apply e' drenato con combat/morale.applyMoraleStatus,
// che e' `unit.status[s] = Math.max(cur, dur)`: monotono crescente, incapace di
// rimuovere. E il loop di syncStatusesFromRoundState riscrive sessionUnit.status
// dall'array tracciato roundUnit.statuses, ripristinando qualsiasi delete fatto a
// meta' attacco. Senza questo canale il furto di ghiandole_mnemoniche degraderebbe
// silenziosamente a una COPIA nel path round-model, restando un FURTO in quello
// legacy: due path dello stesso motore con comportamento divergente.
//
// Quando invocarlo: SUBITO DOPO il drain degli applies, cioe' dopo il rebuild
// tracked->dict. adaptSessionToRoundState ri-deriva l'array tracciato leggendo il
// dict, quindi la cancellazione sopravvive al giro successivo.
//
// Estratto in un modulo proprio perche' syncStatusesFromRoundState e' una closure non
// esportata di createRoundBridge: qui e' testabile in isolamento.
//
// Best-effort: non lancia mai, non blocca il round.

'use strict';

/**
 * Applica e svuota session._pendingStatusRemovals.
 *
 * @param {object} session                oggetto sessione (mutato: la coda viene svuotata)
 * @param {Map<string,object>} unitsById  unita' per id (mutate: perdono lo status)
 * @returns {number} quante rimozioni sono state applicate
 */
function drainStatusRemovals(session, unitsById) {
  if (!session || !Array.isArray(session._pendingStatusRemovals)) return 0;
  if (session._pendingStatusRemovals.length === 0) return 0;

  let applied = 0;
  for (const pending of session._pendingStatusRemovals) {
    if (!pending || !pending.status) continue;
    const unit = unitsById && unitsById.get(String(pending.unit_id));
    if (!unit || !unit.status || typeof unit.status !== 'object') continue;
    delete unit.status[pending.status];
    if (unit.status_intensity && typeof unit.status_intensity === 'object') {
      delete unit.status_intensity[pending.status];
    }
    applied += 1;
  }
  session._pendingStatusRemovals = [];
  return applied;
}

module.exports = { drainStatusRemovals };
