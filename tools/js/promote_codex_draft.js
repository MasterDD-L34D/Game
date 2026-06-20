#!/usr/bin/env node
// Promote a drafted codex entry once its A.L.I.E.N.A. lore is authored.
//
//   node tools/js/promote_codex_draft.js <id>
//
// Refuses to promote unless every one of the 6 A.L.I.E.N.A. dimensions is
// present with NON-EMPTY content that no longer contains a "TODO master-dd"
// placeholder -- i.e. the lore voice prose has actually been written. On
// success it moves data/codex/_drafts/<id>.yaml -> data/codex/<id>.yaml (the
// flat loader then serves it + the encounter_completed trigger can unlock it).
//
// Built for SPEC-H predoni_nomadi (2026-06-20): master-dd authors the prose,
// then `node tools/js/promote_codex_draft.js predoni_nomadi` + commit. Generic
// so future drafted entries reuse it.
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DIMENSION_KEYS = [
  'A_ambiente',
  'L_linee_evolutive',
  'I_impianto',
  'E_ecologia',
  'N_norme_socio',
  'A_ancoraggio_narrativo',
];

// Machine-generated drafts (tools/py/codex_aliena_lore_gen.py) are stamped
// `lore_review_status: generated_pending_review` so AI prose can NEVER be
// promoted to players without human curation. Promotion requires the author to
// flip it to `human_reviewed` (or remove the field) after editing the prose.
const REVIEW_STATUS_OK = 'human_reviewed';

/**
 * Pure readiness check (no filesystem access -> unit-testable). Returns
 * { ready, problems }. The CLI (main) wraps it with file IO + the rename.
 */
function evaluateDraft(doc) {
  const problems = [];
  const ce = doc && doc.codex_entry;
  const dims = ce && ce.aliena_dimensions;
  if (!dims) {
    problems.push('missing codex_entry.aliena_dimensions');
    return { ready: false, problems };
  }
  for (const key of DIMENSION_KEYS) {
    const dim = dims[key];
    if (!dim) {
      problems.push(`missing dimension: ${key}`);
      continue;
    }
    const content = String(dim.content || '').trim();
    if (!content) problems.push(`empty content: ${key}`);
    else if (/TODO\s+master-dd/i.test(content))
      problems.push(`unauthored (TODO master-dd placeholder still present): ${key}`);
  }
  const status = ce.lore_review_status;
  if (status && status !== REVIEW_STATUS_OK) {
    problems.push(
      `generated draft pending human review (lore_review_status: ${status}) -- ` +
        'edit the prose then set lore_review_status: human_reviewed (or remove the field)',
    );
  }
  return { ready: problems.length === 0, problems };
}

function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('usage: node tools/js/promote_codex_draft.js <id>');
    process.exit(2);
  }
  const root = path.resolve(__dirname, '..', '..');
  const src = path.join(root, 'data', 'codex', '_drafts', `${id}.yaml`);
  const dst = path.join(root, 'data', 'codex', `${id}.yaml`);

  if (!fs.existsSync(src)) {
    console.error(`draft not found: data/codex/_drafts/${id}.yaml`);
    process.exit(2);
  }
  if (fs.existsSync(dst)) {
    console.error(`already promoted: data/codex/${id}.yaml exists`);
    process.exit(2);
  }

  let doc;
  try {
    doc = yaml.load(fs.readFileSync(src, 'utf8'));
  } catch (err) {
    console.error(`YAML parse error: ${err && err.message}`);
    process.exit(1);
  }

  const { ready, problems } = evaluateDraft(doc);
  if (!ready) {
    console.error(`NOT READY to promote ${id}:`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error('Author the A.L.I.E.N.A. voice prose in every content: field first.');
    process.exit(1);
  }

  fs.renameSync(src, dst);
  console.log(`PROMOTED ${id}: data/codex/_drafts/${id}.yaml -> data/codex/${id}.yaml`);
  console.log(
    'Next: git add -A data/codex && npm run test:api (HA2 validate_codex_aliena) && commit.',
  );
}

if (require.main === module) main();

module.exports = { evaluateDraft, DIMENSION_KEYS };
