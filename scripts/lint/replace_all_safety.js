#!/usr/bin/env node
// M7-#1: replace_all pattern safety check
//
// Background: 2 bug production in 48h causati da replace_all che ha sostituito
// identificatori ambigui in scope più ampio del voluto:
// - PR #1628: action/roundAction typo → session.js crash
// - PR #1641 (M6-#1 hotfix): action.channel scope error → 0 damage iter2
//
// Questo script analizza git staged diff + emette WARN (non blocking) quando
// rileva pattern sospetti: stesso short identifier renamed in molti punti,
// tipicamente sintomo di replace_all senza scope review.
//
// Usage: `node scripts/lint/replace_all_safety.js`
// Integrazione: chiamato da .husky/pre-commit come warn-only (exit 0 always).

'use strict';

const { execSync } = require('node:child_process');

// Short identifier comuni pericolosi (substring-ambiguous in grep):
// action, state, result, turn, round, actor, target, player, enemy, session
const RISKY_IDENTIFIERS = new Set([
  'action',
  'state',
  'result',
  'turn',
  'round',
  'actor',
  'target',
  'player',
  'enemy',
  'session',
  'unit',
  'event',
]);

// Threshold: N occorrenze in diff dello stesso identificatore cambiato → WARN
const OCCURRENCE_THRESHOLD = 8;

function getStagedDiff() {
  try {
    return execSync('git diff --cached --unified=0', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (_e) {
    return '';
  }
}

function analyseDiff(diff) {
  // Parse added/removed lines separately
  const addedLines = [];
  const removedLines = [];
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) addedLines.push(line.slice(1));
    else if (line.startsWith('-')) removedLines.push(line.slice(1));
  }

  const warnings = [];
  for (const id of RISKY_IDENTIFIERS) {
    const wordRe = new RegExp(`\\b${id}\\b`, 'g');
    const addedCount = addedLines.reduce((sum, l) => sum + (l.match(wordRe) || []).length, 0);
    const removedCount = removedLines.reduce((sum, l) => sum + (l.match(wordRe) || []).length, 0);
    // Pattern sospetto: molti add OR molti remove stesso identificatore
    // (= rename diffuso tipo replace_all). OR logic: un rename può sostituire
    // l'identificatore con un substring-contains (roundAction contiene "action"
    // ma `\baction\b` non matcha) o renombrarlo del tutto (action → foo).
    // Trigger se uno dei due conteggi raggiunge soglia.
    if (addedCount >= OCCURRENCE_THRESHOLD || removedCount >= OCCURRENCE_THRESHOLD) {
      warnings.push({
        identifier: id,
        added: addedCount,
        removed: removedCount,
      });
    }
  }

  return warnings;
}

function main() {
  const diff = getStagedDiff();
  if (!diff) {
    process.exit(0);
  }

  const warnings = analyseDiff(diff);
  if (warnings.length === 0) {
    process.exit(0);
  }

  // Non-blocking WARN con reminder pattern M7-#1
  console.warn('');
  console.warn('⚠️  [replace_all safety] Rilevati rename massivi di identificatori ambigui:');
  console.warn('');
  for (const w of warnings) {
    console.warn(`   "${w.identifier}" — rimosso ${w.removed}x, aggiunto ${w.added}x`);
  }
  console.warn('');
  console.warn(
    '   Se hai usato replace_all su identificatore short/ambiguo (es. action → roundAction),',
  );
  console.warn('   verifica manualmente che il rename NON abbia toccato:');
  console.warn('   - scope diverso dal voluto (es. local var vs property)');
  console.warn('   - test esistenti che referenziano lo scope vecchio');
  console.warn('   - string literals in log/error messages');
  console.warn('');
  console.warn('   Lesson M5/M6: 2x bug production 48h per questo pattern (PR #1628, #1641).');
  console.warn('   Docs: docs/process/2026-04-19-M7-sprint-plan-expert-synthesis.md');
  console.warn('');
  // Warn-only (non blocking). exit 0.
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { analyseDiff, RISKY_IDENTIFIERS, OCCURRENCE_THRESHOLD };
