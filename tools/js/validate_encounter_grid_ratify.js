'use strict';
// Advisory author-guard (mirror validate_encounter_difficulty.js): warns when an
// encounter's grid_size diverges from the ratified baseline without fresh evidence.
// Rule (spec sez. A2): ANY grid change -> re-run full-loop-batch N=10 probe -> N=40
// ratify (L-069). Old ratification does NOT transfer. Warn-only, never blocks.
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ENC_DIRS = ['docs/planning/encounters', 'docs/planning/encounters-draft'];
const BASELINE = 'data/core/balance/grid_ratify_baseline.json';

function sameGrid(a, b) {
  return (
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i])
  );
}

function checkGridRatify(encounter, baseline) {
  const warns = [];
  const id = encounter.encounter_id;
  if (!id || !encounter.grid_size) return warns;
  const entry = (baseline.encounters || {})[id];
  if (!entry) {
    warns.push(
      `[grid-ratify] ${id}: unratified grid (absent from baseline) -- run N=10 probe -> N=40 ratify (L-069)`,
    );
    return warns;
  }
  if (!sameGrid(encounter.grid_size, entry.grid_size) && !entry.evidence_ref) {
    warns.push(
      `[grid-ratify] ${id}: grid changed ${JSON.stringify(entry.grid_size)} -> ${JSON.stringify(encounter.grid_size)} without fresh evidence_ref -- re-run full-loop-batch N=40 (L-069); old ratification does NOT transfer`,
    );
  }
  return warns;
}

function run() {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf-8'));
  const allWarns = [];
  for (const d of ENC_DIRS) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.yaml'))) {
      const enc = yaml.load(fs.readFileSync(path.join(d, f), 'utf-8'));
      if (enc) allWarns.push(...checkGridRatify(enc, baseline));
    }
  }
  allWarns.forEach((w) => console.warn(w));
  console.log(`[grid-ratify] checked encounters, ${allWarns.length} warning(s) (advisory)`);
  return 0; // warn-only, never non-zero
}

if (require.main === module) process.exit(run());
module.exports = { checkGridRatify, run };
