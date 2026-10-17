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

- dir: `.github/`, `tools/`, `scripts/`, `services/`, `config/`, `apps/`,
  `packs/`, root (`Makefile`, `package.json`, `*.md` root);
- estensioni: `.yml .yaml .json .js .cjs .mjs .ts .py .sh .ps1 .mk .md`;
- **esclusi**: `docs/**` (doc-che-cita-doc = territorio del link checker
  `tools/check_site_links.py`), `.claude/**` (protocolli bootstrap con path-esempio),
  `node_modules/**`, `reports/**` (artifact per-run), **`tests/**`** (le fixture di
`tests/test_check_docs_governance.py`contengono token`docs/`-string
false-by-construction -- es. `docs/missing.md`, `docs/adr/some-decision.md`,
`docs/governance/nonexistent.json`-- che referenziano input-di-test, NON pin runtime;
~44 token misuranti che non si potrebbero mai "sanare"/rimuovere -> corromperebbero la
baseline decrescente e seppellirebbero i pin veri. Il check-gemello`unregistered_document`non scansiona`tests/`, quindi il suo `SCAN_EXEMPT_PREFIXES` non
  offre protezione: va escluso esplicitamente qui).

Estrazione per riga -- **pre-strip URL** poi regex token letterali `docs/[A-Za-z0-9_./-]+`,
poi normalizzazione deterministica:

0. **strip degli URL prima dell'estrazione** (o scarto di ogni token il cui match e'
   preceduto sulla stessa riga da `://`): la regex e' substring-anchored, NON
   path-anchored, quindi matcha DENTRO gli URL. Un blob GitHub cross-repo
   `https://github.com/.../blob/main/docs/godot-v2/PRD-...md` produrrebbe un falso pin
   `docs/godot-v2/...` (assente in locale by-design). Questa classe e' densissima proprio
   nei `.md` root (CLAUDE.md, OPEN_DECISIONS.md) che la decisione #5 tira in scope -> senza
   lo strip la promessa "CI verde al primo commit" fallirebbe il giorno 1 (>=13 falsi pin
   tracciati: CLAUDE.md, OPEN_DECISIONS.md, flint/DEEP_RESEARCH.md, sprt_calibrate.py, ...).
   Un `docs/`-URL e' un riferimento ESTERNO (lo confermerebbe qualunque link-checker: skip
   per best-practice internal-only), non un pin locale.
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
swarm JSON-tier dormant, piu' quello che emerge). Nota: i path **cross-repo bare**
authored-ma-localmente-assenti che sopravvivono all'URL-strip (regola 0) -- es.
`docs/adr/0024-...aistation.md` in OPEN_DECISIONS.md verso un altro repo -- sono
indistinguibili da pin-rotti locali sotto un existence-test puro: atterrano in baseline
con un commento-tag `# cross-repo-by-design` per non confonderli con i rotti da sanare.
Regole:

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

Suite esistente `tests/test_check_docs_governance.py` (CI `python-tests`), ~14 casi
nuovi su fixture tmp:

1. pin file esistente -> 0 issue;
2. pin file mancante -> warning `broken_doc_pin` con referrer:riga;
3. pin dir esistente/mancante (trailing slash e senza estensione);
4. placeholder -> tronca a dir, pinna la dir;
5. glob -> tronca a dir base;
6. baseline hit -> 0 issue; baseline miss -> warning;
7. `--pins-strict` -> severity error (exit code strict);
8. `.md` fuori docs incluso; `docs/**` escluso; `.claude/**` escluso; **`tests/**`escluso** (fixture con`docs/missing.md` non produce pin);
9. trailing punteggiatura strippata;
10. reverse-map presente nel report JSON anche per pin sani;
11. dedup (path, referrer);
12. file binario nello scan -> nessun crash;
13. **URL-embedded**: riga con blob GitHub
    `https://github.com/x/y/blob/main/docs/z.md` -> **0 pin** (URL-strip regola 0);
14. **path bare vs URL sulla stessa riga**: `docs/real.md` (locale, esiste) accanto a
    un `https://.../docs/other.md` -> 1 solo pin per il bare, 0 per l'URL.

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
- **Annotazioni inline PR (reviewdog / checks-API)**: DEFERRED al futuro flip
  `--pins-strict`. Richiede un edit a `.github/workflows/` (owner-gated) e paga solo
  quando `broken_doc_pin` e' un gate duro anziche' un warning assorbito dalla baseline;
  il payload `referrer:line` gia' emesso in `doc_pins` fornisce i dati per
  l'annotazione a quel punto. NON questo PR.
- **Adozione lychee/linkspector off-the-shelf**: scartata -- nessun link-checker
  dell'ecosistema (lychee/linkspector/markdown-link-check) parsa i riferimenti
  codice->doc-path (shell arg, YAML paths-filter, const Python, commenti): parsano link
  DENTRO i markdown, competenza gia' coperta da `check_site_links.py`. Adottarli
  lascerebbe il gap che questa spec riempie + aggiungerebbe un dep binario Rust + CI
  wiring evitati by-design. (Confronto ecosistema -> vedi sotto.)

## Selezione da confronto ecosistema (2026-07-02)

Ricerca community/web (`last30days` engine + web pre-research) + Workflow di scoring
adversariale (10 pattern provati valutati vs questa spec, + critico di completezza
anti-SDMG). Finding-chiave: **ogni tool dell'ecosistema (lychee 3.7K star, linkspector,
markdown-link-check) controlla LINK dentro i markdown; nessuno controlla i riferimenti
codice->doc-path** = la dimensione che `broken_doc_pin` serve e' genuinamente unserved ->
il custom validator e' giustificato, non reinventa la ruota.

Esito selezione:

- **ADOTTATO in questo PR**: (1) FP-first -> escludi `tests/**` (fixture
  false-by-construction); (2) URL-strip (regola 0) -- gap trovato dal critico, non
  dall'ecosistema (trappola SDMG: la mia regex non falsificata contro "codice cita docs/
  come URL"). Entrambi trivial + 1 caso TDD ciascuno.
- **GIA' COPERTO**: internal-only (network-free by construction), report-at-file:line
  (referrer:line in 3 superfici), runnable-locally (CLI argparse in
  `check_docs_governance.py`, mirror `.claude/commands/docs-govern.md`), PR-review +
  gate (Temporal 98%: main commit-blocked + baseline decrescente owner-gated).
- **DEFERRED**: reviewdog inline annotations (post `--pins-strict` flip, vedi Non-goal).
- **REJECTED**: adopt-lychee / fold-check_site_links-into-lychee (zero overlap +
  dep/CI evitati) / config-file-baseline stile lychee.toml (aprirebbe un SECONDO canale
  di silenziamento non-ratcheted accanto alla baseline reviewata = regressione
  guardrail-integrity; il set di exclude qui e' chiuso/repo-strutturale, non volatile) /
  caching (`--cache` cachea risultati NETWORK; qui zero chiamate di rete, ogni pin =
  `os.path.exists` locale).
