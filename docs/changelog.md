# Changelog

## [Unreleased]

### Added

- Trait reference aggiornato (`docs/catalog/trait_reference.md`) con mappatura
  glossario IT/EN e workflow di sincronizzazione.
- Guida operativa aggiornata per autori di trait
  (`README_HOWTO_AUTHOR_TRAIT.md`) e report generato da
  `tools/py/collect_trait_fields.py --glossary-output`.
- Estensioni agli script `scripts/sync_trait_locales.py` e
  `tools/py/collect_trait_fields.py` per propagare label/description approvate
  nelle localizzazioni.
- Trait metadata (`species_affinity`, `usage_tags`, `completion_flags`) now exposed across catalog loaders, generators e servizi API, con test automatici aggiornati.
- Piano di rollout trait (`docs/process/trait_rollout_plan.md`) con fasi, checklist e calendario versioni condivisi con i team coinvolti.
- Calendario training per il team di gioco e canali di monitoraggio dedicati (`#trait-rollout`, report settimanali).

### Changed

- Template trait, guida contributiva e processo di localizzazione aggiornati per
  includere glossario e checklist sincronizzata.
- Note di rilascio aggiornate con canali di comunicazione e monitoraggio post-rollout, includendo reminder per `docs/publishing_calendar.md`.
- Guida Evo Tactics Pack v2: verificati campi obbligatori con la scheda operativa, ribadita opzionalità di `metrics`/`cost_profile`/`testability`, esempi sinergie/conflitti aggiornati con `id` repository e promemoria mapping.
- Reference tooling/CI (`docs/planning/REF_TOOLING_AND_CI.md`) aggiornata (owner Laura B., riferimento 03A) con mappa workflow/validatori core ↔ pack e checklist 02A (schema-checker, lint dati, rigenerazione pack simulata) senza modifiche ai workflow.

### Fixed

- _Nessuna voce._

### Known Issues

- _Nessuno segnalato._

## [2025-12-17] Repository SSoT & Pack mapping 0.3

### Added

- Reference sorgenti di verità (`docs/planning/REF_REPO_SOURCES_OF_TRUTH.md`) con tabella dei percorsi canonici per trait/specie/biomi/ecosistemi e criteri core vs derived allineati a schema ALIENA/UCUM.
- Mappa sintetica core → derived/pack (`docs/planning/REF_PACKS_AND_DERIVED.md`) con gap noti e script/tool già in repo per la rigenerazione standard (input core → output pack/fixture).

### Changed

- Regola standard di rigenerazione pack/fixture aggiornata per esplicitare dipendenze da `scripts/update_evo_pack_catalog.js`, tool Python `derive_*` e validator pack (`run_all_validators.py`) con step pre-check e gating.
- Collegamento esplicito dei prerequisiti di governance ai patchset **01A – Catalogo incoming** e **02A – Tooling di validazione** per assicurare input canonici e validator in CI.

## [2025-12-06] HUD Smart Alerts & SquadSync bridge

### Added

- Dashboard canary HUD (`tools/feedback/hud_canary_dashboard.yaml`) collegata al canale `#feedback-enhancements` e ai mock aggiornati.
- Tutorial rapidi per overlay HUD (`docs/tutorials/hud-overlay-quickstart.md`) e adaptive engine SquadSync (`docs/tutorials/adaptive-engine-quickstart.md`).
- Mock aggiornati per HUD Smart Alerts e SquadSync (`assets/hud/overlay/mock-timeline.svg`, `assets/analytics/squadsync_mock.svg`) integrati in Canvas e README.

### Changed

- README e Canvas aggiornati con la sezione "Sync HUD · dicembre 2025" e riferimenti incrociati a dashboard, changelog e routing Slack.
- `tools/feedback/form_config.yaml` e `tools/feedback/collection_pipeline.yaml` estesi per la pipeline canary e le nuove cadence di sync.

### Fixed

- Allineamento dei link dashboard/documentazione per gli owner feedback, evitando riferimenti obsoleti al canale `#feedback-intake`.

### Known Issues

- In corso la validazione dei cron canary (`config/jobs/hud_canary.yaml`) per assicurare refresh puntuali sopra i 10 minuti.

## [2025-12-02] Feedback & Tutorial boost

### Added

- Tutorial rapidi con schede SVG dedicate per CLI, Idea Engine e dashboard (`docs/tutorials/*`, `assets/tutorials/*`).
- Integrazione del changelog nel `README.md` e nelle pagine indice dei documenti.
- Canale Slack `#feedback-enhancements` collegato alle procedure di QA rapida.

### Changed

- Modulo feedback dell'Idea Engine ora visibile anche senza API configurata, con fallback su Slack e template aggiornato.
- `docs/public/embed.js` supporta il canale Slack configurabile e messaggi guida aggiornati.

### Fixed

- Documentazione principale aggiornata con link coerenti verso tutorial e changelog.

### Known Issues

- In attesa di nuove PR giornaliere per popolare la sezione "Unreleased".

### Riepilogo PR giornalieri

<!-- daily-pr-summary:start -->
- **2025-11-24** — [#803](https://github.com/MasterDD-L34D/Game/pull/803) Document SSoT sources and pack regeneration mapping; [#804](https://github.com/MasterDD-L34D/Game/pull/804) Aggiorna checklist 02A e mappa workflow CI; [#805](https://github.com/MasterDD-L34D/Game/pull/805) Add phase triggers to reference migration plan; [#808](https://github.com/MasterDD-L34D/Game/pull/808) Align planning docs with report v0.5; [#809](https://github.com/MasterDD-L34D/Game/pull/809) Align incoming triage with catalog and log update; [#810](https://github.com/MasterDD-L34D/Game/pull/810) Piano operativo per PATCHSET-01B; [#811](https://github.com/MasterDD-L34D/Game/pull/811) Clarify planning restart checkpoints; [#812](https://github.com/MasterDD-L34D/Game/pull/812) Add RIAPERTURA-2026-01 log and update freeze status; [#813](https://github.com/MasterDD-L34D/Game/pull/813) Clarify incoming gap list ticket status; [#814](https://github.com/MasterDD-L34D/Game/pull/814) Update 01A handoff logs and readiness notes; [#815](https://github.com/MasterDD-L34D/Game/pull/815) Aggiorna triage incoming con marcature legacy; [#816](https://github.com/MasterDD-L34D/Game/pull/816) Add preliminary core-derived matrix for 01B; [#817](https://github.com/MasterDD-L34D/Game/pull/817) Add CI workflow inventory and link from CI docs; [#818](https://github.com/MasterDD-L34D/Game/pull/818) Add log entry for RIAPERTURA-2026-01A; [#819](https://github.com/MasterDD-L34D/Game/pull/819) Add report-only baseline for 02A validators; [#820](https://github.com/MasterDD-L34D/Game/pull/820) Add freeze plan and merge checklist for 03A/03B; [#821](https://github.com/MasterDD-L34D/Game/pull/821) Log RIAPERTURA-2026-02 and refresh incoming README notes. [Report](chatgpt_changes/daily-pr-summary-2025-11-24.md)
- **2025-11-23** — [#753](https://github.com/MasterDD-L34D/Game/pull/753) Allinea i tratti Evo v2 a glossario e i18n; [#754](https://github.com/MasterDD-L34D/Game/pull/754) Move markdown docs into docs tree; [#755](https://github.com/MasterDD-L34D/Game/pull/755) Normalize evo legacy data naming; [#756](https://github.com/MasterDD-L34D/Game/pull/756) Integrate TR-1100 traits into catalog; [#757](https://github.com/MasterDD-L34D/Game/pull/757) Realign Evo-Tactics seed docs and index; [#758](https://github.com/MasterDD-L34D/Game/pull/758) Normalize Evo pack references to trait ids; [#759](https://github.com/MasterDD-L34D/Game/pull/759) Log trait validation batch and refresh reports; [#760](https://github.com/MasterDD-L34D/Game/pull/760) Fix broken documentation links and remove private Codex URLs; [#761](https://github.com/MasterDD-L34D/Game/pull/761) Align Evo Tactics Pack guide with operational fields; [#762](https://github.com/MasterDD-L34D/Game/pull/762) Document npm proxy config migration; [#763](https://github.com/MasterDD-L34D/Game/pull/763) Normalize hive consciousness slug; [#764](https://github.com/MasterDD-L34D/Game/pull/764) Add docs link check log and configuration; [#765](https://github.com/MasterDD-L34D/Game/pull/765) Chiarisci id obbligatori e opzionalità campi Evo; [#767](https://github.com/MasterDD-L34D/Game/pull/767) Add incoming species data and validation log; [#769](https://github.com/MasterDD-L34D/Game/pull/769) Rename agent profile directory to .ai; [#768](https://github.com/MasterDD-L34D/Game/pull/768) Integrate TR-110x traits into canonical taxonomy; [#770](https://github.com/MasterDD-L34D/Game/pull/770) Update EVO QA status report; [#771](https://github.com/MasterDD-L34D/Game/pull/771) Add missing trait index entries and refresh reports; [#772](https://github.com/MasterDD-L34D/Game/pull/772) Update trait-curator agent scope; [#773](https://github.com/MasterDD-L34D/Game/pull/773) Fix documentation quick links after docs relocation; [#774](https://github.com/MasterDD-L34D/Game/pull/774) Normalize Evo v2 traits and refresh documentation; [#775](https://github.com/MasterDD-L34D/Game/pull/775) Add pipeline templates for agent workflows; [#776](https://github.com/MasterDD-L34D/Game/pull/776) Expand stack lint patterns to TypeScript files; [#777](https://github.com/MasterDD-L34D/Game/pull/777) Expand lint stack patterns to TypeScript; [#778](https://github.com/MasterDD-L34D/Game/pull/778) Add AI agent audit log document; [#779](https://github.com/MasterDD-L34D/Game/pull/779) Refine curator agent briefs; [#780](https://github.com/MasterDD-L34D/Game/pull/780) Add curator references to trait documentation; [#782](https://github.com/MasterDD-L34D/Game/pull/782) Clarify curator agent governance and checklists; [#783](https://github.com/MasterDD-L34D/Game/pull/783) Allinea template pipeline ai curatori trait/specie/bioma; [#784](https://github.com/MasterDD-L34D/Game/pull/784) Normalize locomotivo trait metadata and indexing; [#785](https://github.com/MasterDD-L34D/Game/pull/785) Update trait refactor pipeline template; [#786](https://github.com/MasterDD-L34D/Game/pull/786) Update curator agent charters; [#787](https://github.com/MasterDD-L34D/Game/pull/787) Update species biome pipeline template; [#788](https://github.com/MasterDD-L34D/Game/pull/788) Clean copy artifacts in agent guidance docs; [#781](https://github.com/MasterDD-L34D/Game/pull/781) Update trait phase checklist; [#789](https://github.com/MasterDD-L34D/Game/pull/789) Add Codex refactor global prompt; [#790](https://github.com/MasterDD-L34D/Game/pull/790) Add PATCHSET-00 planning stubs and incoming triage scaffolding; [#791](https://github.com/MasterDD-L34D/Game/pull/791) Fill planning references with actionable sections; [#792](https://github.com/MasterDD-L34D/Game/pull/792) Add incoming inventory and triage notes; [#793](https://github.com/MasterDD-L34D/Game/pull/793) Document pack/derived regeneration references; [#794](https://github.com/MasterDD-L34D/Game/pull/794) Document CI tooling mapping and patchset checks; [#795](https://github.com/MasterDD-L34D/Game/pull/795) Document patchset sequencing for migration plan; [#796](https://github.com/MasterDD-L34D/Game/pull/796) Update incoming catalog to v0.3; [#797](https://github.com/MasterDD-L34D/Game/pull/797) Update packs and derived reference to v0.3; [#798](https://github.com/MasterDD-L34D/Game/pull/798) Update tooling and CI reference checklist; [#799](https://github.com/MasterDD-L34D/Game/pull/799) Raffina sequenza patchset migrazione; [#800](https://github.com/MasterDD-L34D/Game/pull/800) Clarify numbering and ownership for REF_REPO_PATCH_PROPOSTA; [#801](https://github.com/MasterDD-L34D/Game/pull/801) Update planning references to PATCHSET-00 version 0.3; [#802](https://github.com/MasterDD-L34D/Game/pull/802) Normalize incoming catalog tables. [Report](chatgpt_changes/daily-pr-summary-2025-11-23.md)
- **2025-11-22** — [#721](https://github.com/MasterDD-L34D/Game/pull/721) Add Evo pack alignment documentation and compatibility links; [#722](https://github.com/MasterDD-L34D/Game/pull/722) Aggiorna guida validazione traits; [#723](https://github.com/MasterDD-L34D/Game/pull/723) Add quick links and repo flow notes to Evo Tactics guide; [#724](https://github.com/MasterDD-L34D/Game/pull/724) Add sentience scale documentation and update guide links; [#725](https://github.com/MasterDD-L34D/Game/pull/725) Fix relative links in Evo Tactics guide; [#726](https://github.com/MasterDD-L34D/Game/pull/726) Add trait conversion summary to Evo Tactics guide; [#727](https://github.com/MasterDD-L34D/Game/pull/727) Add mandatory trait field summary to guide; [#728](https://github.com/MasterDD-L34D/Game/pull/728) Document repository validation steps in migration pipeline; [#729](https://github.com/MasterDD-L34D/Game/pull/729) Clarify trait alias usage in Evo pack docs; [#730](https://github.com/MasterDD-L34D/Game/pull/730) Add optional recommended fields box for Evo v2; [#731](https://github.com/MasterDD-L34D/Game/pull/731) Add Evo v2 deep dive references; [#732](https://github.com/MasterDD-L34D/Game/pull/732) Clarify optional trait fields in Evo Tactics Pack guide; [#733](https://github.com/MasterDD-L34D/Game/pull/733) Organize root markdown docs into docs tree; [#734](https://github.com/MasterDD-L34D/Game/pull/734) Document SSoT gaps and index trait manual; [#735](https://github.com/MasterDD-L34D/Game/pull/735) Fix trait documentation links and indexes; [#736](https://github.com/MasterDD-L34D/Game/pull/736) Fix Prisma fallback and correct data import paths; [#737](https://github.com/MasterDD-L34D/Game/pull/737) Add client for service actor sessions API; [#738](https://github.com/MasterDD-L34D/Game/pull/738) Handle missing prisma in species biomes router; [#739](https://github.com/MasterDD-L34D/Game/pull/739) Handle mission tagger errors in HUD alerts; [#740](https://github.com/MasterDD-L34D/Game/pull/740) Add IDs and i18n entries for TR-110x trait pack; [#741](https://github.com/MasterDD-L34D/Game/pull/741) Add Evo traits dataset; [#742](https://github.com/MasterDD-L34D/Game/pull/742) Restore energy upkeep values in trait definitions; [#743](https://github.com/MasterDD-L34D/Game/pull/743) Sync Evo catalog links; [#744](https://github.com/MasterDD-L34D/Game/pull/744) Link next-steps plan into trait docs; [#745](https://github.com/MasterDD-L34D/Game/pull/745) Riorganizza requisiti sezione tratti; [#746](https://github.com/MasterDD-L34D/Game/pull/746) Update integration guide with tooling status; [#747](https://github.com/MasterDD-L34D/Game/pull/747) Align Evo v2 documentation references; [#748](https://github.com/MasterDD-L34D/Game/pull/748) Add version metadata to Evo species data and schema; [#749](https://github.com/MasterDD-L34D/Game/pull/749) Clarify energy maintenance factor descriptions; [#750](https://github.com/MasterDD-L34D/Game/pull/750) Relocate incoming markdown docs into docs tree; [#751](https://github.com/MasterDD-L34D/Game/pull/751) Aggiorna guida campi obbligatori Evo Tactics; [#752](https://github.com/MasterDD-L34D/Game/pull/752) Normalize Evo legacy metric naming and bump versions. [Report](chatgpt_changes/daily-pr-summary-2025-11-22.md)
- **2025-11-21** — [#700](https://github.com/MasterDD-L34D/Game/pull/700) Align workspaces and dev stack setup; [#701](https://github.com/MasterDD-L34D/Game/pull/701) Migrate backend storage to Prisma; [#702](https://github.com/MasterDD-L34D/Game/pull/702) Add Prisma-backed species-biome relations and dashboard wiring; [#703](https://github.com/MasterDD-L34D/Game/pull/703) Document Docker/Prisma bootstrap and env configuration; [#704](https://github.com/MasterDD-L34D/Game/pull/704) Fix Evo pack asset path rewrites; [#705](https://github.com/MasterDD-L34D/Game/pull/705) Preserve biome pool metadata for offline generation; [#706](https://github.com/MasterDD-L34D/Game/pull/706) Add tests for evo pack sync and biome metadata fallback; [#707](https://github.com/MasterDD-L34D/Game/pull/707) Update database tracker and runbook notes; [#708](https://github.com/MasterDD-L34D/Game/pull/708) Finalize data stack tracker and logs; [#709](https://github.com/MasterDD-L34D/Game/pull/709) Aggiorna riferimenti test indice documentazione; [#710](https://github.com/MasterDD-L34D/Game/pull/710) Update traits tracking index entry date; [#711](https://github.com/MasterDD-L34D/Game/pull/711) Add ali_solari_fotoni to trait glossary; [#712](https://github.com/MasterDD-L34D/Game/pull/712) Add pathfinder dataset modular crystal eyes trait; [#713](https://github.com/MasterDD-L34D/Game/pull/713) Add modular crystal eyes trait localization; [#714](https://github.com/MasterDD-L34D/Game/pull/714) Normalize trait entry and refresh coverage baselines; [#715](https://github.com/MasterDD-L34D/Game/pull/715) Refine trait operational sheet and links; [#716](https://github.com/MasterDD-L34D/Game/pull/716) Add quick reference link for trait authoring; [#717](https://github.com/MasterDD-L34D/Game/pull/717) Add references to trait operational guide; [#718](https://github.com/MasterDD-L34D/Game/pull/718) Add quick example to trait operational sheet; [#719](https://github.com/MasterDD-L34D/Game/pull/719) Add quick access navigation for trait docs; [#720](https://github.com/MasterDD-L34D/Game/pull/720) Aggiorna vincolo id traits. [Report](chatgpt_changes/daily-pr-summary-2025-11-21.md)
- **2025-11-20** — [#699](https://github.com/MasterDD-L34D/Game/pull/699) Reorganize monorepo into backend and dashboard apps. [Report](chatgpt_changes/daily-pr-summary-2025-11-20.md)
- **2025-11-19** — Nessun merge registrato.
- **2025-11-18** — Nessun merge registrato.
- **2025-11-17** — Nessun merge registrato.
- **2025-11-16** — Nessun merge registrato.
- **2025-11-15** — [#697](https://github.com/MasterDD-L34D/Game/pull/697) Normalize Evo seed catalog imports. [Report](chatgpt_changes/daily-pr-summary-2025-11-15.md)
- **2025-11-14** — [#695](https://github.com/MasterDD-L34D/Game/pull/695) chore: sync evo tactics pack assets; [#696](https://github.com/MasterDD-L34D/Game/pull/696) Enable offline MongoDB migrations for development. [Report](chatgpt_changes/daily-pr-summary-2025-11-14.md)
- **2025-11-13** — [#693](https://github.com/MasterDD-L34D/Game/pull/693) Update documentation for CLI subcommands and usage; [#694](https://github.com/MasterDD-L34D/Game/pull/694) Update CLI smoke logging options and documentation. [Report](chatgpt_changes/daily-pr-summary-2025-11-13.md)
- **2025-11-12** — [#667](https://github.com/MasterDD-L34D/Game/pull/667) Ensure Evo pack mirrors use pack-relative paths; [#668](https://github.com/MasterDD-L34D/Game/pull/668) Align evo pack mirrors with pack data paths; [#669](https://github.com/MasterDD-L34D/Game/pull/669) Document Evo Tactics database status in README; [#670](https://github.com/MasterDD-L34D/Game/pull/670) Aggiorna documentazione CLI con comandi supportati; [#671](https://github.com/MasterDD-L34D/Game/pull/671) Align log documentation with tracked CLI outputs; [#672](https://github.com/MasterDD-L34D/Game/pull/672) Add discrepancy reporting guidance to README; [#673](https://github.com/MasterDD-L34D/Game/pull/673) Add Evo-Tactics documentation diff tooling and rollout reports; [#674](https://github.com/MasterDD-L34D/Game/pull/674) Switch Evo trait diff graph output to SVG; [#675](https://github.com/MasterDD-L34D/Game/pull/675) Add Evo species ecosystem normalization report; [#676](https://github.com/MasterDD-L34D/Game/pull/676) Plan Evo rollout backlog and coordination assets; [#677](https://github.com/MasterDD-L34D/Game/pull/677) Automate Evo rollout pipeline and telemetry integrations; [#678](https://github.com/MasterDD-L34D/Game/pull/678) Add Evo documentation archive sync workflow; [#679](https://github.com/MasterDD-L34D/Game/pull/679) Automate Evo traits sync workflow; [#680](https://github.com/MasterDD-L34D/Game/pull/680) Align Nebula atlas rollout with feature flag; [#681](https://github.com/MasterDD-L34D/Game/pull/681) Automate Evo rollout status updates; [#682](https://github.com/MasterDD-L34D/Game/pull/682) Align Evo doc metadata workflow outputs; [#683](https://github.com/MasterDD-L34D/Game/pull/683) Fix traits sync workflow secret conditions; [#684](https://github.com/MasterDD-L34D/Game/pull/684) Fix traits sync workflow secret guard; [#685](https://github.com/MasterDD-L34D/Game/pull/685) Add manual helper for traits export publishing; [#686](https://github.com/MasterDD-L34D/Game/pull/686) Replace EvoTactics binaries with text placeholders; [#687](https://github.com/MasterDD-L34D/Game/pull/687) Add Evo trait schema validation and rollout report checks; [#688](https://github.com/MasterDD-L34D/Game/pull/688) Add validate helper to Draft202012Validator stub; [#689](https://github.com/MasterDD-L34D/Game/pull/689) Add internal trait evaluation CLI and tests; [#690](https://github.com/MasterDD-L34D/Game/pull/690) Add internal evaluation artifacts to traits sync workflow; [#691](https://github.com/MasterDD-L34D/Game/pull/691) Propagate Nebula species rollout matrix to telemetry tools. [Report](chatgpt_changes/daily-pr-summary-2025-11-12.md)
- **2025-11-11** — [#638](https://github.com/MasterDD-L34D/Game/pull/638) Rehome console Playwright suite and clean mockup docs; [#639](https://github.com/MasterDD-L34D/Game/pull/639) Log validation sweep warnings in traits tracker; [#640](https://github.com/MasterDD-L34D/Game/pull/640) Update inventory checklist for trait searches; [#641](https://github.com/MasterDD-L34D/Game/pull/641) docs: sincronizza index e log con report incoming; [#642](https://github.com/MasterDD-L34D/Game/pull/642) Add Evo-Tactics trait guide markdown conversions; [#643](https://github.com/MasterDD-L34D/Game/pull/643) Normalize Evo schemas and document enum diff; [#644](https://github.com/MasterDD-L34D/Game/pull/644) Integrate Evo species dataset validation and reporting; [#645](https://github.com/MasterDD-L34D/Game/pull/645) Import Evo traits batch and update glossary; [#646](https://github.com/MasterDD-L34D/Game/pull/646) Stabilize Evo incoming scripts and expose new automation targets; [#647](https://github.com/MasterDD-L34D/Game/pull/647) Align ops CI docs and site-audit tooling; [#648](https://github.com/MasterDD-L34D/Game/pull/648) Relocate Evo Playwright suite and refresh sitemap assets; [#649](https://github.com/MasterDD-L34D/Game/pull/649) chore: log evo QA run and sync tracking; [#650](https://github.com/MasterDD-L34D/Game/pull/650) feat: add automation for Evo tracker registry; [#651](https://github.com/MasterDD-L34D/Game/pull/651) Archive Evo incoming duplicates and document audit; [#652](https://github.com/MasterDD-L34D/Game/pull/652) Restore docs lint workflow and QA trackers; [#653](https://github.com/MasterDD-L34D/Game/pull/653) Use AJV wrapper for evo validation and refresh QA logs; [#654](https://github.com/MasterDD-L34D/Game/pull/654) Ensure Playwright Chromium is installed and mock console passes tests; [#655](https://github.com/MasterDD-L34D/Game/pull/655) Archive legacy trait docs and update inventory audit; [#656](https://github.com/MasterDD-L34D/Game/pull/656) Close QA follow-ups for DOC-02 and FRN-01; [#657](https://github.com/MasterDD-L34D/Game/pull/657) Archive Evo-Tactics legacy duplicates; [#658](https://github.com/MasterDD-L34D/Game/pull/658) Document Evo workflow secret dependencies; [#659](https://github.com/MasterDD-L34D/Game/pull/659) Finalize evo staging cleanup; [#660](https://github.com/MasterDD-L34D/Game/pull/660) Add integration propagation review summary; [#661](https://github.com/MasterDD-L34D/Game/pull/661) Clarify secret provisioning workflow in propagation review; [#662](https://github.com/MasterDD-L34D/Game/pull/662) Document provisioning of SITE_BASE_URL secret; [#663](https://github.com/MasterDD-L34D/Game/pull/663) Add Evo Tactics trace hash tooling and audit; [#664](https://github.com/MasterDD-L34D/Game/pull/664) Ensure Evo Tactics trace hashes propagate canonical digest; [#665](https://github.com/MasterDD-L34D/Game/pull/665) Ensure biome pools expose metadata; [#666](https://github.com/MasterDD-L34D/Game/pull/666) Extend trace hash updater to ecosystem manifests. [Report](chatgpt_changes/daily-pr-summary-2025-11-11.md)
<!-- daily-pr-summary:end -->

## [v0.6.0-rc1] - 2025-11-07

### Added

- Generatore VC potenziato con sintesi biomi procedurale, salvataggio filtri avanzati, timeline attività persistente e pannelli insight contestuali per condividere rapidamente i setup QA. Le esportazioni includono ora anteprime JSON/YAML e azioni rapide per dossier/ZIP.
- Instrumentazione HUD risk alert consolidata: pipeline EMA → HUD → canale `pi.balance.alerts` con log dedicato e metriche risk/cohesion pronte per il pacchetto comunicazione `v0.6.0-rc1` (nuovi asset Canvas HUD inclusi).【F:docs/Canvas/feature-updates.md†L9-L23】
- Automazione operativa alimentata dai report PR giornalieri: workflow `daily-pr-summary`, guida CLI/Smoke aggiornata, checklist marketing/prodotto sincronizzata e note Canvas/roadmap derivate automaticamente.【F:docs/chatgpt_changes/daily-pr-summary-2025-11-07.md†L1-L15】【F:docs/piani/roadmap.md†L72-L109】
- Aggiornamenti dati e documentazione: allineamento trait PI ↔ environment registry, curva budget PI/telemetry ribilanciata e nuova documentazione playtest/roadmap per il RC di novembre 2025.【F:docs/checklist/project-setup-todo.md†L61-L109】【F:docs/playtest/SESSION-2025-11-12.md†L1-L76】

### Changed

- Allineamento 2025-11-07: follow-up HUD overlay telemetrico (UI Systems — F. Conti), progressione Cipher PROG-04 (Progression Design — L. Serra) e contrasto EVT-03 (VFX/Lighting — G. Leone) registrati in daily summary, checklist e Canvas con checkpoint 2025-11-09.【F:docs/chatgpt_changes/daily-pr-summary-2025-11-07.md†L1-L15】【F:docs/checklist/milestones.md†L13-L16】【F:docs/Canvas/feature-updates.md†L24-L37】
- Generatore e documentazione UI rifiniti: layout carte responsive, overlay radar e timeline filtrabili garantiscono lettura coerente su desktop/mobile, con preset manifest storici ripristinati accanto al bundle demo.【F:docs/Canvas/feature-updates.md†L9-L23】
- Pipeline CI completa ristabilita (build/test + Pages) e helper catalog condivisi esposti agli strumenti browser/CLI per ridurre duplicazioni.【F:docs/ci-pipeline.md†L1-L48】
- Bilanciamento VC aggiornato: tuning missione Skydock Siege, curva PI e hazard registry normalizzati per mantenere rischio/coesione nei target RC.【F:docs/piani/roadmap.md†L60-L85】【F:data/core/missions/skydock_siege.yaml†L1-L91】
- Calendario comunicazioni release raffinato con agenda cross-team confermata, allegati HUD/metriche distribuiti su Slack/Drive e notifica marketing/prodotto completata (Slack 16:00 CET, briefing Drive 18:00 CET).【F:docs/Canvas/feature-updates.md†L18-L34】【F:docs/piani/roadmap.md†L72-L85】

### Fixed

- Ripristinate le API helper dello scanner tratti ambientali e l'ordine di inizializzazione del manifest per evitare preset mancanti nel generatore.【F:docs/checklist/project-setup-todo.md†L61-L104】
- Documentazione CLI/playtest aggiornata con esiti verificati, inclusi log test interfaccia e parità `roll_pack` tra stack TS/Python.【F:docs/Canvas/feature-updates.md†L9-L23】【F:docs/playtest/SESSION-2025-11-12.md†L24-L76】

### Known Issues

- Nessuno segnalato.

### Riepilogo PR giornalieri

- **2025-11-07** — Nessun merge registrato; confermati owner e follow-up HUD/PROG-04/EVT-03 nel changelog con supporto di roadmap, Canvas e tool run report.【F:docs/chatgpt_changes/daily-pr-summary-2025-11-07.md†L1-L15】【F:docs/piani/roadmap.md†L72-L109】【F:docs/tool_run_report.md†L9-L22】

## [2025-11] VC Patch Note (RC)

### Stato feature

- **HUD Risk/Cohesion Overlay** — Pronto per release; metriche QA 2025-11-05 confermano risk medio 0.57 (Delta 0.59, Echo 0.54) e coesione 0.76/0.80 con alert HUD mitigati entro 2 turni.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L88】
- **Protocollo SquadSync Playbook** — Deploy confermato su Echo/Delta con cooldown supporti ottimizzato; mantenere monitoraggio su picchi risk 0.62 per eventi Aeon Overclock e ack PI automatici.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L9-L83】
- **Missione Skydock Siege (vertical slice)** — Contenuti narrativi e timer evacuazione completi; tuning Tier 3 stabile con tilt <0.46 e timer evacuazione a 6 turni.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L102】

### Issue note

- **Alert risk Delta turno 11** — Picco 0.62 mitigato entro due turni con ack PI e cooldown relay; verificare replicabilità nel prossimo smoke test.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L19-L83】
- **Allineamento annunci** — Confermare agenda riunione cross-team 2025-11-06 (10:30 CET) e invio comunicazioni Slack/Drive post tag `v0.6.0-rc1` alle 16:00/18:00 CET del 2025-11-07.【F:docs/piani/roadmap.md†L72-L85】

### Prossimi passi

- Pubblicare il tag `v0.6.0-rc1` dopo conferma QA 2025-11-05 e distribuire note VC al team ampliato.
- Aggiornare materiali marketing/Canvas con screenshot HUD e grafici risk/cohesion aggiornati al playtest 2025-11-05 (Delta/Echo).【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L88】【F:docs/Canvas/feature-updates.md†L17-L27】
- Creare il tag Git ufficiale a chiusura QA, notificare Marketing Ops e Product con recap su asset HUD aggiornati e collegare la libreria screenshot revisionata.
