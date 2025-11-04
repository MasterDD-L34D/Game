# Sistema NPG, PF & Mutazioni — Canvas C

## Obiettivi & Panoramica

- Generare incontri reattivi al valore StressWave, reputazione fazioni e progressione squadra, modulando reclutamento e ostilità tramite Affinità/Fiducia.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L1-L31】
- Collegare Director, biomi e tabelle mutazioni per offrire missioni emergenti (soccorso, trade, vendetta, fuga) e supportare Fusion Node/Resonance Shards introdotti nei vertical slice VC.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L33-L116】【F:docs/Canvas/feature-updates.md†L9-L24】

## Struttura Dati & Director

- Record NPG includono `npg_id`, `biome`, `role`, `power_range`, `motivation`, `affinity_tags`, `reward_hooks` e `spawn_profile` con `group_size` e trigger su timer, obiettivi e StressWave.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L17-L46】
- `director_flags` (reinforce, retreat, convertible, legendary) governano escalation; `telemetry_hooks` raccolgono assist, danni e eventi social per alimentare UI e telemetria VC.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L17-L46】【F:docs/Telemetria-VC.md†L1-L40】

## Biomi & Affissi

| Bioma               | Affissi chiave              | Hazard                                 | Archetipi NPG                                       |
| ------------------- | --------------------------- | -------------------------------------- | --------------------------------------------------- |
| Canyons Risonanti   | Echo Surge, Shifting Winds  | Cadute, tunnel sonori                  | Sibilant Wardens (Support), Echo Drifters (Scout)   |
| Foresta Miceliale   | Spore Bloom, Myco Link      | Visibilità ridotta, radici bloccanti   | Verdant Shepherds (Healer), Fungal Titans (Bruiser) |
| Atollo Obsidiana    | Resonance Tide, Shard Storm | Maree magnetiche, piattaforme mobili   | Aegis Corsairs (Tank), Gale Splicers (Controller)   |
| Mezzanotte Orbitale | Zero-G Flux, Alarm Cascade  | Corridoi stretti, campi gravitazionali | Skydock Sentinels, Aeon Engineers                   |

【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L33-L72】

## StressWave & Tabelle Spawn

- StressWave <0.30 favorisce scouting leggero; 0.31-0.6 introduce elite/mix support; >0.6 attiva ondate leggendarie o rinforzi Director (es. Myco Hive, Tidecaller).【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L67-L96】
- Protocollo di soccorso si attiva oltre 0.60 portando rinforzi alleati o escalation Overrun; gli outcome vengono loggati in `session-metrics.yaml` per telemetria e riepilogo PR.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L83-L116】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L1-L79】

## Reclutamento & Conversioni

1. Identificare tag `convertible` nel profilo NPG.
2. Triggerare prove narrative (dialogo/aiuto/salvataggio) per +1 Affinità.
3. Completare missione `Trust Trial` come opzionale durante l'incursione.
4. Con Fiducia ≥1 l'NPG diventa `Recruit`, disponibile per rotazione Nido; fallimento critico aumenta StressWave +0.1.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L104-L132】【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L1-L69】

## Mutazioni & Fusioni

- Tabelle T0/T1/T2 sono legate al bioma e agli affissi; i NPG reclutati ereditano moduli dal Nido e possono accedere a Fusion Node usando Reattori Aeon + Resonance Shards.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L96-L132】【F:docs/Canvas/feature-updates.md†L11-L24】
- Dataset `data/core/species.yaml` fornisce esempi di parti default, sinergie (`echo_backstab`) e budget morph per specie come `dune_stalker`, usati per bilanciare conversioni e fusioni.【F:data/core/species.yaml†L1-L41】

## PF (Punti Forma) & Coordinamento Telemetria

- Telemetria risk/cohesion determina quando sbloccare mutazioni e potenziamenti PF; i log vengono sincronizzati via Drive e analizzati durante review telemetriche settimanali.【F:docs/Telemetria-VC.md†L1-L60】【F:docs/drive-sync.md†L1-L80】
- `pi_shop` e `pe_economy` regolano accesso a sigilli Forma e guardie situazionali post-conversione, mantenendo equilibrio tra nuove fusioni e bilancio squadra.【F:data/packs.yaml†L1-L23】【F:data/core/telemetry.yaml†L63-L78】

## Strumenti & Automazione

- Editor YAML `npg_pack.yaml` (validatore `tools/py/.../validate_package.py`) e dashboard Canvas monitorano spawn vs risk e timeline conversioni.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L118-L132】【F:docs/tool_run_report.md†L1-L40】
- Workflow `daily-pr-summary` e script `daily_pr_report.py` assicurano che nuove mutazioni o aggiornamenti Director compaiano in `docs/chatgpt_changes/`, changelog e roadmap entro le 18:00 CET.【F:docs/Telemetria-VC.md†L41-L80】【F:docs/piani/roadmap.md†L1-L90】

## KPI & Stato

- KPI: tasso conversione NPG→alleati, durata scontro per bioma, uso abilità Mythic (Tier 3), eventi Protocollo di soccorso riusciti, delta StressWave medio squadre QA.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L118-L132】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L1-L79】
- Dataset `npg_pack.json` contiene 48 profili aggiornati; necessario ritoccare `Myco Hive` (StressWave alto troppo punitivo) nelle prossime revisioni VC.【F:docs/appendici/C-CANVAS_NPG_BIOMI.txt†L124-L132】【F:docs/piani/roadmap.md†L61-L90】
