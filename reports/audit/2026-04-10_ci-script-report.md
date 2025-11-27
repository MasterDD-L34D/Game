# Inventario CI e script locali – 2026-04-10 (dev-tooling, report-only)

## Workflow CI attivi (focus pack/incoming/derived)

| Nome | Percorso | Trigger/Input | Output/Artefatti | Owner | Impatto pack |
| ---- | -------- | ------------- | ---------------- | ----- | ------------ |
| Data audit e validation | .github/workflows/data-quality.yml | PR su data/**, packs/**, tool di audit | Valida dataset YAML/JSON, esegue trait audit e genera coverage/metriche con upload artefatti (reports/**, data/derived/analysis, logs/trait_audit) | dev-tooling | Controllo dati core/pack e derived; non modifica pack ma blocca PR se audit fallisce |
| Validate Trait Catalog | .github/workflows/validate_traits.yml | Push/PR su data/traits, schema trait, tools/py | Costruisce indice e coverage trait, esegue lint stile e carica report (reports/**, data/derived/analysis) | dev-tooling | Garantisce coerenza trait e derived; gating PR su regressioni trait |
| Validate registry naming | .github/workflows/validate-naming.yml | Push/PR su registri pack e scanner correlati | Esegue scanner naming Python per slug/registri del pack | dev-tooling | Protegge naming pack/registri; nessun artefatto |
| Schema validate | .github/workflows/schema-validate.yml | Push/PR su schemas/**, dispatch manuale | Verifica struttura JSON Schema con jsonschema Draft2020-12 | dev-tooling | Riduce rischio schema invalido usato da CLI/validator |
| Incoming CLI smoke | .github/workflows/incoming-smoke.yml | Dispatch manuale con input opzionali data-root/pack-root | Esegue profile CLI `staging_incoming` e carica `incoming-smoke-logs` da logs/incoming_smoke | dev-tooling | Smoke non bloccante su pacchetti incoming decompressi; non attivo su PR |

## Script locali con I/O (report-only)

| Script | Percorso | Scopo/I-O | Dipendenze | Impatto pack |
| ------ | -------- | --------- | ---------- | ------------ |
| CLI smoke | scripts/cli_smoke.sh | Esegue profili CLI (es. staging_incoming), legge dataset/biomi/pack e salva log in logs/cli e logs/incoming_smoke | Python CLI + PyYAML, dataset locali | Smoke locale su core/pack; nessuna modifica dati |
| Incoming report | scripts/report_incoming.sh | Analizza archivii ZIP in incoming/, estrae e lancia `game_cli.py validate-datasets` e `validate-ecosystem-pack`; produce summary/log in reports/incoming/validation | unzip, Python CLI, dataset pack | Valida drop incoming prima dell’ingest; non tocca pack |
| Pipeline 02A→03A→03B | scripts/run_pipeline_cycle.sh | Orchestratore report-only con override BRANCH_03A/BRANCH_03B, LOG_ID; registra status/log e bundle audit | bash, git, Python deps da requirements-dev.txt | Usato per simulare ciclo derived+incoming su branch patch/03A-core-derived e patch/03B-incoming-cleanup |
| Build pack dist | scripts/build_evo_tactics_pack_dist.mjs | Prepara `dist/evo-tactics-pack` copiando docs/public pack, asset vendor e runtime stub (option offline) | Node.js, accesso rete opzionale per CDN | Genera build offline/online del pack; non pubblica di default |

## Controlli mancanti rilevati (proposte, non attivate)

- Derived sync: nessun job CI verifica che i file `data/derived/**` siano rigenerati rispetto ai sorgenti `data/traits`/`config` dopo le modifiche. Proposta: step opzionale (non blocking) in `validate_traits.yml` che ricostruisce gli artefatti derived e segnala drift; da tenere report-only finché non approvato.
- Incoming gating: lo smoke `incoming-smoke.yml` è solo dispatch manuale e non monitora i nuovi drop in `incoming/`. Proposta: script locale `scripts/report_incoming.sh` da usare come pre-ingest obbligatorio e job CI su branch dedicato `patch/03B-incoming-cleanup` che raccoglie solo log (senza bloccare PR) quando cambiano file `incoming/**`.
- Pack registry coverage: il naming check copre gli slug ma non incrocia le registry del pack con i dataset core/derived. Proposta: estendere `validate-naming.yml` con fase report-only che confronta registri pack con index trait/species generati localmente (senza fallire finché la matrice core/derived non è stabile).
