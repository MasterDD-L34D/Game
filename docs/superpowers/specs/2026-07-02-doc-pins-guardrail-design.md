---
title: 'Doc-pins guardrail -- existence-check dei path docs/ referenziati dal codice'
doc_status: draft
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-07-02'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Doc-pins guardrail (broken_doc_pin) -- design

## Problema

La reorg docs 2026-07-02 (PR #3185) ha mostrato che il gate reale su un move/delete di un
doc non e' la struttura dell'albero ma **chi lo scrive/legge via codice**: workflow CI che
committano dentro una dir, tool py/js con path const, config che puntano a playbook,
paths-filter. Quel knowledge oggi vive solo nel grep-audit manuale della sessione e nel PR
body: la prossima sessione (o un agent Jules) che muove un doc deve rifare l'audit a mano,
e un pin rotto (path citato dal codice che non esiste piu') resta invisibile fino al
runtime. Ne esistono gia' di rotti: `config/tracker_registry.yaml -> docs/appendici/*.txt`
(varianti .txt mai esistite), `evo-rollout-status.yml -> docs/roadmap/status/`,
`qa-reports.yml -> docs/recap/qa-playbook.md`.

## Decisioni ratificate (brainstorm 2026-07-02, master-dd)

1. Direzione: **guardrail pin-map** (non unpin del tooling, non bonifica generated/logs --
   restano follow-up separati).
2. Enforcement: **dentro `tools/check_docs_governance.py`** (validator gia' CI-required dal
   job `docs-governance`), NON un nuovo workflow ne' pre-commit.
3. Pin-map: **ibrida** -- scanner deterministico a ogni run + baseline curata per i rotti
   pre-esistenti.
4. Approccio: **existence-check stato-based** (path citato ma assente su disco = pin
   rotto), NON diff-aware, NON artefatto committato.
5. Scope sorgenti: **anche i `.md` fuori da `docs/`** (verdetto esplicito master-dd --
   include CLAUDE.md root: un pointer sprint-context verso un handoff archiviato diventa
   warning = anti-pattern #19 auto-rilevato).

## Architettura

Nuovo check `broken_doc_pin` in `tools/check_docs_governance.py`, simmetrico al check
`unregistered_document` esistente:

- funzione `find_broken_doc_pins(repo_root, baseline) -> list[Issue]`;
- arg CLI `--pins-baseline` (default `docs/governance/doc_pins_baseline.json`, stesso
  pattern di `--scan-baseline`);
- arg CLI `--pins-strict` (default off): promuove `broken_doc_pin` da warning a error;
- `main()`: un `issues.extend(find_broken_doc_pins(...))` in piu';
- reverse-map completa nel report per-run (vedi Report).

Nessun file in `.github/workflows/` viene toccato: il job `docs-governance` esegue gia' il
validator e uploada gia' il report come artifact.

## Scanner (estrazione pin)

Input: file tracked (`git ls-files`), filtrati per:

- dir: `.github/`, `tools/`, `scripts/`, `services/`, `config/`, `apps/`, `tests/`,
  `packs/`, root (`Makefile`, `package.json`, `*.md` root);
- estensioni: `.yml .yaml .json .js .cjs .mjs .ts .py .sh .ps1 .mk .md`;
- **esclusi**: `docs/**` (doc-che-cita-doc = territorio del link checker
  `tools/check_site_links.py`), `.claude/**` (protocolli bootstrap con path-esempio),
  `node_modules/**`, `reports/**` (artifact per-run).

Estrazione per riga: regex token letterali `docs/[A-Za-z0-9_./-]+`, poi normalizzazione
deterministica:

1. strip prefissi `./`, conversione backslash -> slash;
2. token con **placeholder** (`YYYY`, `XX`, `${`, `{`, `<`, `%s`, `*.`, `-*`) -> tronca
   alla dir piu' profonda senza placeholder e pinna quella (es.
   `docs/playtest/playtest-2-${DATE}.md` -> pin `docs/playtest/`);
3. glob (`*`, `**`) -> tronca alla dir base prima del glob (es. paths-filter
   `docs/research/swarm/**.json` -> `docs/research/swarm/`);
4. trailing punteggiatura di prosa (`.`, `,`, `:`, `)`, `]`, backtick) -> strip;
5. dedup per (path, referrer).

I commenti NON vengono skippati di proposito: un cross-link in commento (es.
`apps/play/src/audio.js -> docs/design/audio/howler-middleware-OD-028.md`) e' un pin
debole ma reale -- se il doc muore, il commento va aggiornato. La severity warning rende
il costo di un falso positivo residuo = una riga di baseline.

## Check

Per ogni pin estratto: il path deve esistere su disco (file, oppure dir se termina con
`/` o e' senza estensione e la dir esiste). Mancante e non in baseline ->
`Issue(severity, "broken_doc_pin", <path>, "citato da <referrer>:<riga>, non esiste su disco")`
con severity = warning (error con `--pins-strict`).

## Baseline e ratchet

`docs/governance/doc_pins_baseline.json`: array di path noti-rotti pre-esistenti,
popolato al primo run (attesi: tracker_registry .txt, docs/roadmap/, docs/recap/,
swarm JSON-tier dormant, piu' quello che emerge). Regole:

- baseline **solo-decrescente**: si toglie quando si sana il pin, non si aggiunge senza
  istruttoria (regola nel commento header del json e in questa spec);
- pin rotto nuovo = warning subito visibile nel job;
- flip futuro a gate duro = 1 riga (`--pins-strict`) nel workflow, owner call, senza
  toccare il codice del validator.

## Report / reverse-map

Nel report esistente `reports/docs/governance_drift_report.json` (artifact CI, per-run,
NON committato) campo nuovo:

```json
"doc_pins": {
  "docs/skiv/MONITOR.md": [".github/workflows/skiv-monitor.yml:65"],
  "docs/playtest/": [".github/workflows/ai-sim-nightly.yml:262", "..."]
}
```

Mappa completa anche per i pin sani: e' la pin-map consultabile. Il metodo reorg
diventa: (1) lancia il validator, (2) leggi `doc_pins` per sapere cosa e' pinnato e da
chi, (3) muovi solo il non-pinnato o riscrivi i referrer nello stesso PR.

## Error handling

- file non decodificabile UTF-8 o binario -> skip silenzioso (comportamento gia' usato
  dal validator per contenuti malformati);
- righe oltre ~2000 char (minified/bundle) -> skip riga;
- path Windows nel sorgente -> normalizzati a posix prima del match;
- repo senza git disponibile -> fallback a walk filesystem con gli stessi filtri.

## Testing (TDD)

Suite esistente `tests/test_check_docs_governance.py` (CI `python-tests`), ~12 casi
nuovi su fixture tmp:

1. pin file esistente -> 0 issue;
2. pin file mancante -> warning `broken_doc_pin` con referrer:riga;
3. pin dir esistente/mancante (trailing slash e senza estensione);
4. placeholder -> tronca a dir, pinna la dir;
5. glob -> tronca a dir base;
6. baseline hit -> 0 issue; baseline miss -> warning;
7. `--pins-strict` -> severity error (exit code strict);
8. `.md` fuori docs incluso; `docs/**` escluso; `.claude/**` escluso;
9. trailing punteggiatura strippata;
10. reverse-map presente nel report JSON anche per pin sani;
11. dedup (path, referrer);
12. file binario nello scan -> nessun crash.

## Rollout e rollback

- 1 PR: validator + baseline popolata + test + 2 righe nel guide
  `docs/guide/docs-governance-stale-lifecycle.md` (sezione lifecycle) + registry entry
  per questa spec. Branch `claude/doc-pins-guardrail`, merge = master-dd.
- Guardrail 50-righe: >50 LOC fuori `apps/backend/` -- conferma esplicita master-dd =
  questa design-review (brainstorm 2026-07-02).
- CI attesa verde al primo colpo (baseline assorbe i rotti noti); `docs-governance`
  errors deve restare 0.
- Rollback: revert del singolo PR -- check additivo, nessun flag runtime, nessuno schema.

## Non-goal (espliciti)

- Diff-aware move-gate (scartato: complessita' base-ref, non vede i pin gia' rotti).
- Pin-map committata come secondo registry (scartato: churn di sync; il report per-run
  basta).
- Unpin del tooling (path const -> config) e bonifica `generated/`+`logs/`: follow-up
  separati, non questo PR.
- Link fra doc dentro `docs/**`: gia' coperti da `tools/check_site_links.py`.
