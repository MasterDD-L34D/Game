# Canvas — Aggiornamenti Rapidi

## Nuove feature
- **Mission Control refresh** — Landing guidata, quick actions contestuali e timeline attività filtrabile mantengono il team allineato sui rollout giornalieri.
- **Dataset Hub & monitor YAML** — Dashboard automatica che valida i file `data/**/*.yaml`, evidenziando inconsistenze e stato import per Drive Sync.
- **Generatore VC** — Radar dinamico, confronto specie side-by-side, pin persistente e tooltips hazard/ruoli per condividere build rapidi in QA.
- **CLI Pack Rolling (TS/Python)** — Gli script `tools/ts/roll_pack` e `tools/py/roll_pack.py` permettono di simulare l'assegnazione dei pacchetti PI usando `data/packs.yaml`, mantenendo parità funzionale tra stack tecnologici.
- **Generatore Encounter Python** — `tools/py/generate_encounter.py` sfrutta `data/biomes.yaml` per derivare difficoltà, affissi dinamici e adattamenti VC, utile per playtest veloci.
- **Missione Skydock Siege** — Infiltrazione verticale con obiettivi multilivello, evacuazione cronometrata e coordinamento a quote diverse.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
- **Reattori Aeon** — Risorsa leggendaria che abilita poteri temporali specifici per le Forme Armoniche.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
- **Telemetry Risk Tuning 2025-10-24** — Nuovo metodo `ema_capped_minmax` con segnale `overcap_guard_events` e smoothing 0.2 per ridurre i falsi positivi nelle squadre Bravo/Delta.【F:data/telemetry.yaml†L2-L25】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L62】

### Aggiornamento QA 2025-11-01
- **Metriche Canvas aggiornate** — Il dashboard VC mostra risk medio 0.55 (Delta 0.55, Echo 0.58, Bravo 0.52) e coesione media 0.81 con varianza <0.10 sulle squadre QA finali.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L1-L44】
- **Visual HUD** — Inserire screenshot ricalcolato con gradienti risk rivisti e timeline SquadSync entro il pacchetto `v0.6.0-rc1`; allegare callout su picco Echo wave 3 risolto live.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L19-L44】
- **Azioni successive** — Pubblicare grafici aggiornati in Canvas/Drive e collegare annuncio Slack programmato il 2025-11-07 ore 16:00 CET al changelog RC.【F:docs/changelog.md†L21-L33】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L45】 Coordinare il nuovo riepilogo quotidiano delle PR per mantenere Mission Control e Canvas sincronizzati.

## Riepilogo quotidiano PR
<!-- daily-pr-summary:start -->
<!-- daily-pr-summary:end -->

## Revisione playtest VC (Canvas)
![Dashboard VC](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==)

- **Screenshot dashboard HUD** — Il nuovo pannello VC mostra risk band dinamiche e coesione aggregata per squadra, confermando le soglie di avviso sul client r2821.
- **Metriche chiave** — Il playtest 2025-10-24 mostra `risk.weighted_index` stabile a 0.57 per Delta (sotto soglia) e un picco controllato a 0.61 per Echo durante l'evento Aeon Overclock; coesione 0.76 conferma il tuning support Actions.【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】
- **Cambiamenti strutturali** — Il bias `random_general_d20` ora reindirizza ai profili `bias_d12` delle Forme per bilanciare i pacchetti PI, mentre il filtro SquadSync è agganciato alla pipeline telemetrica per missioni verticali multi-fase; i log Delta/Echo alimentano le dashboard tramite Drive Sync.【F:data/packs.yaml†L1-L41】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】

## Regole di gioco evidenziate
- **Economia PI** — I costi e i massimali (`pi_shop.costs`/`caps`) definiscono la cadenza di progressione e i limiti per i pack iniziali.【F:data/packs.yaml†L1-L17】
- **Bias per Forma** — Le tabelle `bias_d12` forniscono controllo sullo skew dei pacchetti in base al MBTI scelto, abilitando tuning mirato delle build iniziali.【F:data/packs.yaml†L18-L88】
- **Adattamenti VC per Bioma** — I flag `vc_adapt` determinano come gli encounter scalano controlli, guardia, imboscate e burst secondo i segnali di telemetria della squadra.【F:data/biomes.yaml†L6-L13】
- **Regole Ibride di Mating** — Le combinazioni in `hybrid_rules` chiariscono le fusioni locomozione/sensi quando due forme condividono caratteristiche uniche.【F:data/mating.yaml†L25-L32】
- **Filtro SquadSync** — L'indice StressWave ora isola i picchi dovuti a mismatch di ruolo, supportando tuning mirato della difficoltà co-op.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
- **Nidi itineranti con ancoraggi** — Gli spostamenti dei clan sabbiosi richiedono Resonance Shards per stabilizzare il trasferimento tra turni.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
- **Protocollo di soccorso** — Nuove chiamate di rinforzo NPG basate su telemetria live per recuperare squadre in difficoltà.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】

## Dati YAML aggiornati
- **Biomi** — Ogni voce contiene difficoltà base, modificatori e affissi tematici (es. `savana`, `caverna`, `palude`).【F:data/biomes.yaml†L1-L5】
- **Telemetria VC** — Le finestre EMA, gli indici VC e le formule MBTI/Ennea supportano il nuovo layer di analytics live per sessioni co-op.【F:data/telemetry.yaml†L1-L25】
- **Standard di Nido** — I profili `dune_stalker` ed `echo_morph` specificano ambiente, struttura e risorse, fungendo da baseline per la progressione narrativa di clan.【F:data/mating.yaml†L13-L24】
