# Prompt per prossima sessione — Canonical Documentation Refactor

## Copia-incolla questo prompt all'inizio della prossima sessione:

---

Ciao! CWD = `C:\Users\VGit\Desktop\Game`.

**Mega-task: refactor documentale canonico + reintegrazione sistemi dispersi.**

Leggi prima il memory file `project_canonical_refactor.md` per il contesto completo, poi procedi con questa pipeline a 4 fasi.

## Fase 1 — Audit (usa agent sot-planner o Explore)

Fai l'audit di TUTTI questi file/gruppi e classifica ogni sistema come: **core** / **appendix** / **research** / **historical**.

Sistemi da classificare (10):

1. Foodweb / ecosistemi / archetipi ruolo×bioma
2. Tri-Sorgente / progressione a carte
3. Nido / Recruit / Mating
4. MBTI / PF gate soft / Enneagramma / Forme
5. Mission Console / HUD / XP Cipher
6. Sentience / Sentience Track
7. A.L.I.E.N.A.
8. Sandbox concept
9. EchoWake (corpus intero)
10. Snapshot/GDD storici

Fonti da verificare:

- `docs/core/00-GDD_MASTER.md`, `00-SOURCE-OF-TRUTH.md`, `01-VISIONE.md`, `11-REGOLE_D20_TV.md`, `22-FORME_BASE_16.md`, `24-TELEMETRIA_VC.md`, `27-MATING_NIDO.md`, `30-UI_TV_IDENTITA.md`, `90-FINAL-DESIGN-FREEZE.md`
- `docs/architecture/tri-sorgente/*`, `docs/hubs/README.md`
- `docs/planning/**`, `docs/planning/research/**`, `docs/planning/EchoWake/**`
- `docs/appendici/**`, `docs/archive/**`
- `engine/tri_sorgente/**`, `data/core/*.yaml`, `packs/**/foodweb*`
- `examples/biomes/dune_ferrose/cards.yaml`
- `docs/governance/docs_registry.json`

Output: tabella audit con colonne [Sistema | Stato repo | Classificazione | Fonti primarie | Duplicati/rumore]

## Fase 2 — Matrice di promozione canonica

Crea `docs/core/00B-CANONICAL_PROMOTION_MATRIX.md` con frontmatter governance. Tabella:

| Blocco | Stato attuale | Decisione | Azione richiesta | Fonti principali |

Include tutti 10 sistemi. Decisioni: `promuovere a core` / `mantenere appendix` / `declassare a research` / `marcare historical`.

## Fase 3 — GDD Master refactor

Aggiorna `docs/core/00-GDD_MASTER.md` come **vero entrypoint canonico**. Deve coprire in sintesi + link:

1. Prima partita / onboarding reale
2. Worldgen (4 livelli: bioma → ecosistema → meta-ecosistema → eventi)
3. Foodweb come sistema ecologico significativo (non nota laterale)
4. Collegamento biomi → ecosistemi → specie → morph → trait → Forme
5. Framing TV-first + companion app
6. Premessa narrativa del Sistema
7. **Tri-Sorgente**: progressione a carte post-scontro/post-evento (3 carte + Skip → Frammenti Genetici). Offerte influenzate da bioma/roll, personalità/forma, telemetria azioni recenti. Ponte tra tactics run-based ed evoluzione Spore-like
8. Nido / Recruit / Mating come meta-loop controllato
9. MBTI / PF / Ennea / Forme come asse identitario
10. Boundary chiaro: gameplay HUD vs Mission Console vs telemetry/debrief UI

Regole: sintesi canonica + link ai doc specialistici. No duplicazioni. No sistemi inventati — usa solo ciò che i file supportano.

## Fase 4 — Governance alignment

- Aggiorna `docs/governance/docs_registry.json` per nuovi/spostati file
- Aggiorna `docs/hubs/README.md` se serve
- Marca doc_status correttamente (source_of_truth, active, research, historical_ref, draft)
- Esegui `/docs-govern` per verificare compliance
- Esegui `/authority-check` per coerenza A0-A5

## Vincoli ferrei

- **Conservativo**: no rimozioni aggressive, no sistemi inventati
- **Backward compat**: mantieni link interni dove ragionevole
- **Archivi**: non cancellare mai, al massimo marca come historical
- **Naming**: segui tassonomia doc_status già nel repo
- **Conflitti**: scegli soluzione più coerente col Final Design Freeze, annota nel report

## Deliverable finali

1. File modificati nel repo
2. Nuovo `docs/core/00B-CANONICAL_PROMOTION_MATRIX.md`
3. Diff summary leggibile
4. Elenco file toccati
5. Report finale: promosso / appendix / storico / TODO aperti

## Skills e agent da usare

- `/sot-plan` → gap matrix iniziale (Fase 1 boost)
- `/authority-check` → coerenza livelli autorità (Fase 4)
- `/docs-govern` → compliance frontmatter + registry (Fase 4)
- Agent Explore → audit file dispersi (Fase 1, parallelizzabile)

Lavora direttamente sui file. Mostra patch/diff e rationale per ogni blocco. Se trovi conflitti, scegli e annota.

---
