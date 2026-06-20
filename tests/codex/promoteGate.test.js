// SPEC-H -- promote_codex_draft.js readiness gate unit test.
// The gate must refuse machine-generated drafts (lore_review_status:
// generated_pending_review) so AI prose never reaches players without human
// curation -- in addition to the existing empty/TODO checks.

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateDraft } = require('../../tools/js/promote_codex_draft.js');

const DIMS = [
  'A_ambiente',
  'L_linee_evolutive',
  'I_impianto',
  'E_ecologia',
  'N_norme_socio',
  'A_ancoraggio_narrativo',
];

function draft(overrides = {}) {
  const aliena_dimensions = {};
  for (const k of DIMS) {
    aliena_dimensions[k] = { content: 'Prosa autorata valida per la dimensione.' };
  }
  return { codex_entry: { id: 'x', aliena_dimensions, ...overrides } };
}

test('ready when all 6 dims authored and no review-gate flag', () => {
  const { ready, problems } = evaluateDraft(draft());
  assert.equal(ready, true, problems.join('; '));
});

test('NOT ready when a dimension still has TODO master-dd', () => {
  const d = draft();
  d.codex_entry.aliena_dimensions.A_ambiente.content = 'TODO master-dd: x';
  const { ready, problems } = evaluateDraft(d);
  assert.equal(ready, false);
  assert.ok(problems.some((p) => /A_ambiente/.test(p)));
});

test('NOT ready when lore_review_status is generated_pending_review', () => {
  const { ready, problems } = evaluateDraft(
    draft({ lore_review_status: 'generated_pending_review' }),
  );
  assert.equal(ready, false);
  assert.ok(
    problems.some((p) => /review/i.test(p)),
    `expected a review problem, got: ${problems.join('; ')}`,
  );
});

test('ready when lore_review_status flipped to human_reviewed', () => {
  const { ready, problems } = evaluateDraft(draft({ lore_review_status: 'human_reviewed' }));
  assert.equal(ready, true, problems.join('; '));
});

test('NOT ready when a dimension is missing', () => {
  const d = draft();
  delete d.codex_entry.aliena_dimensions.E_ecologia;
  const { ready, problems } = evaluateDraft(d);
  assert.equal(ready, false);
  assert.ok(problems.some((p) => /E_ecologia/.test(p)));
});

test('NOT ready when lore_review_status is present but null/empty (corrupt)', () => {
  // A present-but-not-human_reviewed flag must reject, even if falsy. Only an
  // ABSENT field (hand-authored, or human-removed after review) may promote.
  for (const bad of [null, '', 'generated_pending_review', 'pending']) {
    const { ready } = evaluateDraft(draft({ lore_review_status: bad }));
    assert.equal(ready, false, `expected reject for lore_review_status=${JSON.stringify(bad)}`);
  }
});

test('NOT ready when a dimension content is not a string', () => {
  const d = draft();
  d.codex_entry.aliena_dimensions.A_ambiente.content = [1, 2, 3];
  const { ready, problems } = evaluateDraft(d);
  assert.equal(ready, false);
  assert.ok(problems.some((p) => /A_ambiente/.test(p)));
});
