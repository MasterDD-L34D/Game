'use strict';
// Per-step integration invariants for the full-loop runner (fase-1b). Pure: given
// one chapter's result, return a list of violation strings (empty = clean). The
// runner aggregates these so a regression that breaks the loop surfaces as a
// concrete failing invariant instead of a silent pass.

function checkInvariants({ advanceStatus, outcome, peEarned, survivors, sourceRosterIds } = {}) {
  const v = [];
  if (advanceStatus !== 200) v.push(`advance status ${advanceStatus} != 200`);
  if (!['victory', 'defeat', 'timeout'].includes(outcome)) v.push(`invalid outcome ${outcome}`);
  if (!(Number(peEarned) >= 0)) v.push(`pe_earned ${peEarned} < 0`);
  const src = Array.isArray(sourceRosterIds) ? sourceRosterIds : [];
  const foreign = (survivors || []).filter((id) => !src.includes(id));
  if (foreign.length) v.push(`foreign survivor ids: ${foreign.join(',')}`);
  return v;
}

module.exports = { checkInvariants };
