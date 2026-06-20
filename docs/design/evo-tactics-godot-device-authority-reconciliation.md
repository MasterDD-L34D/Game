---
title: 'Evo-Tactics Godot Device-Authority Reconciliation'
date: 2026-06-06
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-07'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, godot, device-authority, tv-mirror, coop, nido, route-vote]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics Godot Device-Authority Reconciliation

## 1. Decisione

La TV/host non e' un giocatore.

Nel prodotto target:

- la TV e' tavolo condiviso, mirror pubblico, regia, memoria e recap;
- i device sono l'unica superficie di scelta, conferma e controllo;
- il backend conserva la verita' canonica;
- Godot TV puo' aprire stream tecnici o observer, ma non deve essere la fonte di
  una scelta di gameplay;
- ogni vecchio bottone host/TV deve essere classificato come fallback tecnico,
  dev/offline path, o debt da migrare.

Questa spec riconcilia il codice Godot/Game esistente con questa decisione.
Non chiede di riscrivere tutto subito: separa runtime attuale, target canonico e
passi di migrazione.

## 2. Glossario operativo

| Termine           | Definizione                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| TV mirror         | Surface pubblica: mostra stato, tally, log, recap, regia e reveal. Non committa scelte.            |
| Device input      | Phone/browser del player: invia scelte, intent, conferme, rituali e controllo creatura.            |
| Host tecnico      | Token/connessione usata per aprire room, observer o broadcast. Non equivale a player authority.    |
| Backend canonical | Stato/event-log/risoluzione autoritativa lato Game.                                                |
| Dev fallback      | Bottone o path usato per sbloccare smoke/offline/debug. Va marcato e isolato.                      |
| Host legacy       | Flusso storico in cui il client host/TV conferma o sceglie. Va migrato o esplicitamente confinato. |

Regola guida:

```text
device decide -> backend canonicalizza -> TV mostra
```

La TV puo' chiedere o inizializzare una finestra di voto se questo e' un atto
tecnico di broadcast, ma il contenuto della scelta deve arrivare dai device.

## 3. Evidenza code-first

### 3.1 Game backend

File rilevanti:

- `apps/backend/routes/coop.js`
- `apps/backend/services/coop/coopOrchestrator.js`
- `apps/backend/services/network/wsSession.js`
- `apps/backend/routes/campaign.js`
- `apps/backend/routes/sessionHelpers.js`

Stato osservato:

- `world_vote` esiste come voto accept/reject in world setup.
- `world_confirm` e' ancora host-only in alcuni path.
- `route_vote` e `/api/coop/route/open` sono live su Game `origin/main` via
  PR #2597, non nel branch locale corrente del thread.
- `route_vote` ha host guard: il telefono host resta arbiter-only e non vota.
- `nido_start_mission` e `next_macro` sono ancora host-gated.
- `forceAdvance` e' esplicitamente escape hatch.

Lettura corretta:

- il backend ha gia' molti hook per device intent;
- alcuni gate host-only sono storici o tecnici;
- non bisogna duplicare route-vote: prima riallineare il branch a
  `origin/main`;
- serve una policy di autorita' per decidere quali host-only restano e quali
  diventano quorum/device confirm.

### 3.2 Godot TV/client

File rilevanti in `C:/dev/Game-Godot-v2`:

- `scripts/main_route_choice.gd`
- `scripts/phone/phone_composer_view.gd`
- `scripts/phone/phone_nido_view.gd`
- `scripts/ui/nido_hub_view.gd`
- `scripts/main_debrief.gd`
- `scripts/ui/tv_mating_panel.gd`
- `scripts/phone/phone_debrief_recruit_wire.gd`
- `scripts/phone/main_phone_offspring_mount.gd`
- `scripts/net/coop_ws_peer.gd`
- `scripts/net/coop_api.gd`

Stato osservato:

- `MainRouteChoice` apre `/coop/route/open` e ascolta un observer
  `route_tally`.
- `PhoneComposerView` invia `route_vote` e blocca il voto dal telefono host.
- `PhoneComposerView` contiene ancora CTA host-only per start/world confirm.
- `PhoneNidoView` dichiara oggi "read-only" e "host drives Nido upgrades from
  the TV".
- `NidoHubView` e' principalmente read-only ma contiene anche righe recruit
  storiche.
- `TvMatingPanel` e `MainDebrief` sono gia' coerenti: TV read-only mirror di
  mating tally e offspring reveal.
- `PhoneDebriefRecruitWire` e il phone offspring mount sono gia' direzione
  corretta: scelta/rituale via device.

Lettura corretta:

- non tutto il phone e' mirror;
- non tutta la TV e' sbagliata;
- la frizione vera e' concentrata su world setup, Nido, route open come atto
  tecnico, next mission e wording legacy.

## 4. Matrice surface

| Area                         | Runtime attuale                                 | Target                                            | Classificazione | Migrazione                                     |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------- | --------------- | ---------------------------------------------- |
| Lobby create/join            | host crea room, device join                     | invariato: host tecnico crea tavolo               | host tecnico OK | mantenere, chiarire wording                    |
| Onboarding narrativo         | host-only single choice storica                 | scelta device/player-slot o quorum iniziale       | host legacy     | SPEC-A/B decide se per-player o aggregate      |
| Form Pulse                   | device invia input phase-agnostic               | device input costante                             | device input OK | estendere ledger                               |
| World setup vote             | device accept/reject + host confirm             | device vote/confirm, TV recap                     | partial         | spostare confirm finale su quorum/device       |
| World confirm CTA phone host | CTA host-only per smoke                         | dev fallback o transizione tecnica                | dev fallback    | marcare e sostituire con device quorum         |
| Route choice                 | TV apre candidate broadcast; phone vota         | phone vota, TV osserva tally e reveal             | mostly OK       | distinguere `open` tecnico da scelta           |
| Route pick TV card           | possibile path host/TV                          | solo se solo/offline/dev                          | host legacy     | disabilitare in co-op quando route-vote attivo |
| Combat planning              | phone composer esiste ma non ancora WEGO finale | device per creatura, preview non canonica, commit | partial         | SPEC-C                                         |
| Round render                 | TV mostra combat/replay parziali                | piano-sequenza da event-log immutabile            | partial         | SPEC-D                                         |
| Debrief recruit              | phone action live; TV mirror                    | device recruit, TV recap                          | OK/partial      | smoke reale multi-device                       |
| Mating vote                  | phone tally/resolved, TV mirror                 | device vote/rituale, TV reveal                    | OK/partial      | rifinire UX Canvas-D                           |
| Offspring ritual             | phone mount via facade                          | device ritual, backend canonical                  | OK/partial      | decidere ingresso roster via Nido              |
| Nido hub TV                  | TV render + wording host-driven                 | TV stato pubblico del Nido                        | partial         | rimuovere azioni player-facing                 |
| Nido phone                   | read-only mirror                                | azioni Nido per-player                            | missing/partial | aggiungere tab action device                   |
| Party select                 | roster backend, surface non chiusa              | scelta device dal gruppo sociale                  | missing         | SPEC-E + build                                 |
| Next mission from Nido       | host-only `nido_start_mission`                  | device/quorum/leader confermato                   | host legacy     | sostituire con mission ready/quorum            |
| Lethal confirm               | engine supporta lethal gated                    | conferma device player coinvolto                  | missing surface | SPEC-J                                         |
| Tri-Sorgente                 | pezzi reward/codex/diary                        | scelte device, TV sedimenta pubblico              | design/partial  | SPEC-G                                         |

## 5. Regole normative

### 5.1 Cosa la TV puo' fare

La TV puo':

- mostrare stato pubblico;
- mostrare tally aggregati;
- mostrare preview pubbliche e recap;
- aprire observer tecnici;
- avviare una finestra di voto solo come broadcast tecnico;
- eseguire dev/offline fallback marcati;
- animare il risultato canonico;
- mostrare il Nido come spazio comune.

La TV non puo':

- scegliere per i player;
- committare una route in co-op;
- selezionare creatura principale o party per un player;
- confermare missione lethal per un player;
- reclutare o rifiutare creature al posto del device;
- decidere mating, offspring, Tri-Sorgente o dottrina;
- alterare l'event-log durante la resa animata.

### 5.2 Cosa i device devono fare

I device devono:

- identificare player/slot;
- inviare Form Pulse e micro-input comportamentali;
- scegliere/committare intent combat;
- votare world/route/next mission quando la scelta e' condivisa;
- gestire reclute, mating, offspring e rituali per-player;
- confermare rischio lethal quando riguarda il proprio gruppo;
- selezionare creatura principale e party dal gruppo sociale;
- ricevere informazioni filtrate da sensi, cognizione, ruolo, relazione e
  creatura controllata.

### 5.3 Cosa il backend deve garantire

Il backend deve:

- rifiutare intent non autorizzati;
- separare host tecnico da player authority;
- registrare input device in ledger tracciabile;
- produrre event-log deterministico;
- broadcastare state/tally/reveal alla TV e ai device;
- mantenere compatibilita' con fallback dev dove necessario;
- esporre errori leggibili per device chiuso, voto fuori fase, quorum mancante,
  player non eleggibile o scelta gia' committata.

## 6. Pattern di migrazione

### 6.1 Host technical open

Alcuni endpoint richiedono `host_token` per aprire una finestra o un observer:
esempio `/api/coop/route/open`.

Questo e' accettabile solo se:

- l'host non sceglie il risultato;
- la scelta e' raccolta dai device;
- il tally e' broadcastato;
- il backend applica host guard;
- il path co-op non lascia un bottone TV equivalente che bypassa i device.

Nome consigliato nei doc/code comments:

```text
host technical open / arbiter open
```

Non:

```text
host chooses / TV drives
```

### 6.2 Dev fallback

Un bottone host/TV puo' restare temporaneamente se serve a:

- test offline;
- smoke single-machine;
- recovery da stato bloccato;
- percorso solo/standalone;
- debug sotto flag esplicito.

Ogni fallback deve avere:

- flag o guard chiara;
- commento `DEV_FALLBACK` o equivalente;
- test che dimostri che in co-op production non bypassa i device;
- ticket di rimozione o migrazione.

### 6.3 Quorum/shared decision

Per decisioni condivise:

```text
open window -> device votes -> backend tally -> quorum/timeout -> canonical commit -> TV reveal
```

Esempi:

- route choice;
- next mission from Nido;
- Tri-Sorgente dottrina comune;
- world setup lock-in.

Timeout:

- deve essere visibile su device;
- puo' applicare default chiaro;
- deve essere mostrato in TV come risultato del tavolo, non come scelta TV.

### 6.4 Per-player consent

Per decisioni che toccano agency o rischio personale:

```text
device owner confirms -> backend validates ownership -> canonical effect
```

Esempi:

- missione lethal per creatura del player;
- pensionamento/successione creatura principale;
- export Custode personale;
- scambio carte che concede controllo reale;
- mating/offspring se coinvolge creature del gruppo sociale del player.

Queste scelte non devono essere quorum-only: serve consenso del player
coinvolto.

## 7. Target flow per fase

### 7.1 Join e slot

Target:

1. TV mostra codice room e roster slot.
2. Device entra con codice.
3. Backend assegna `player_id`, token, role e slot.
4. Device sceglie nome/identita' player.
5. TV mostra presence e readiness.

Non target:

- scegliere Custode come prima azione obbligatoria di join;
- far partire la campagna da un bottone TV se i device non sono ready.

### 7.2 World seed e Form Pulse

Target:

1. Device risponde a micro-scenari diegetici.
2. Backend aggrega Form Pulse e input di identita'.
3. TV rivela ecosistema unico della partita.
4. Device riceve dettagli filtrati.

La TV mostra l'intersezione pubblica: biome, pressione, scenario tone,
Custode/eco seed, non il profilo privato completo dei player.

### 7.3 Route choice Descent

Target:

1. Backend propone candidati route.
2. TV mostra map/route cards come tavolo condiviso.
3. Host tecnico apre la finestra di voto.
4. Device votano per `node_id`.
5. Backend calcola quorum/tally/leader.
6. TV mostra tally e reveal della scelta.
7. Backend committa `/campaign/choose`.

Debt:

- se TV card pick resta disponibile in co-op, deve diventare solo dev/solo path;
- il branch Game corrente va riallineato a `origin/main` prima di toccare codice.

### 7.4 Combat WEGO

Target:

1. Device mostra creatura principale assegnata e controlli extra validi.
2. Player esplora preview non canonica.
3. Player committa intent entro AP/budget.
4. AI/Sistema committa policy.
5. Backend risolve event-log.
6. TV mostra piano-sequenza del round.
7. Device mostra conseguenze e nuovo planning.

La TV non deve essere UI di planning. Puo' mostrare readiness, tensione e
pubblico recap.

### 7.5 Debrief, recruit, mating, offspring

Target:

- TV mostra recap, candidati, tally, offspring reveal e conseguenze pubbliche.
- Device gestisce recruit, bonding, mating vote, mutation choice e rituale
  offspring.
- Backend canonicalizza recruit roster, lineage, epigenome, wounds e tribe.

Stato attuale:

- recruit da phone e' gia' nella direzione corretta;
- mating/offspring facade e' gia' vivo su Godot main;
- resta da rifinire quando e come offspring entra nel party select.

### 7.6 Nido

Target:

TV:

- vista comune del Nido;
- stato branco/tribu';
- relazioni aggregate;
- lineage tree pubblico;
- risorse comuni;
- Custode commentary;
- mission board/route recap.

Device:

- selezione creatura principale;
- party select;
- recruit acceptance;
- mating/breeding/offspring ritual;
- ferite/rituali;
- Tri-Sorgente;
- lethal consent;
- export/resync Custode.

Debt attuale:

- `PhoneNidoView` e' mirror read-only;
- wording "host drives Nido upgrades from the TV" va sostituito;
- `nido_start_mission` host-only va migrato verso ready/quorum o leader
  confermato dai device.

## 8. Contratti dati minimi

### 8.1 Authority metadata

Ogni azione device-facing nuova dovrebbe dichiarare:

```json
{
  "authority": "device|backend|tv_mirror|host_technical|dev_fallback",
  "scope": "per_player|shared|per_creature|campaign",
  "owner_player_id": "optional",
  "requires_consent": true,
  "phase": "nido|combat_planning|route_choice|debrief",
  "canonical_effect": "short id"
}
```

### 8.2 Surface metadata

Ogni view Godot toccata da questa migrazione dovrebbe essere annotata nel ticket:

```text
surface_role: TV_MIRROR | DEVICE_INPUT | DEVICE_PRIVATE | DEV_FALLBACK
production_coop: true|false
solo_offline: true|false
backend_source: endpoint/ws/action
```

Questo serve a impedire nuove ambiguita' "host" nei commenti e nei test.

## 9. Acceptance criteria

SPEC-K e' chiusa quando:

1. ogni surface Godot rilevante ha classificazione `TV_MIRROR`,
   `DEVICE_INPUT`, `DEVICE_PRIVATE`, `HOST_TECHNICAL`, `DEV_FALLBACK` o
   `LEGACY_TO_REMOVE`;
2. in co-op production non esiste path TV/host che committi scelte
   player-facing senza device input;
3. route choice distingue `open` tecnico da voto device;
4. world confirm ha target device/quorum o fallback dev marcato;
5. Nido phone non e' piu' solo mirror per le azioni player-facing;
6. party select e creatura principale sono device-owned;
7. recruit, mating, offspring e lethal consent hanno owner/consent chiari;
8. i vecchi commenti "host drives" sono rimossi o riclassificati;
9. il playtest TV + telefoni verifica almeno route-vote, recruit, mating
   resolved, Nido entry e next mission.

## 10. Ticket derivabili

### K-01 Surface audit Godot

Inventariare file Godot con `host-only`, `host drives`, `read-only`,
`world_confirm`, `route/open`, `nido_start_mission`.

Output:

- tabella `surface_role`;
- lista `LEGACY_TO_REMOVE`;
- lista `DEV_FALLBACK`;
- doc stale da bonificare.

### K-02 World confirm migration

Sostituire il confirm host-only come path production co-op.

Target:

- device ready/quorum;
- backend commit dopo quorum;
- TV recap.

Il vecchio CTA host-only puo' restare solo dev/offline con guard.

### K-03 Route TV pick guard

Garantire che, in co-op con route-vote attivo, la TV non possa committare una
route bypassando i device.

Target:

- TV mostra route cards;
- host tecnico apre vote;
- device votano;
- backend committa leader.

### K-04 Nido phone action surface

Trasformare `PhoneNidoView` da mirror puro a hub device per:

- party select;
- creatura principale;
- recruit review;
- mating/offspring;
- wound rituals;
- lethal consent;
- Tri-Sorgente;
- Custode export/resync.

### K-05 Next mission quorum

Migrare `nido_start_mission` da host-only a:

- ready check device;
- quorum shared;
- owner/leader confirm se serve;
- TV countdown/recap.

### K-06 Wording cleanup

Bonificare commenti/doc:

- `host drives`;
- `phone never drives`;
- `host-only` non marcato;
- PR #413/#423 indicati come open;
- route-vote ancora descritto come gap.

File gia' individuati:

- `C:/dev/Game-Godot-v2/docs/godot-v2/sprint-context-archive.md`
- `C:/dev/Game-Godot-v2/docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md`
- `C:/dev/Game-Godot-v2/scripts/phone/phone_nido_view.gd`
- `C:/dev/Game-Godot-v2/scripts/phone/phone_composer_view.gd`

### K-07 Real-device smoke

Playtest Lenovo/Cloudflare:

- TV host visible;
- 2+ phones connected;
- route-vote;
- recruit post-combat;
- mating resolved;
- offspring reveal;
- Nido entry;
- next mission start.

Questo e' gate di produzione, non sostituto dei test unitari.

## 11. Dipendenze

Prima di modificare codice Game:

- usare `origin/main` o branch nuovo basato su `origin/main`;
- non implementare di nuovo route-vote;
- verificare `META_NETWORK_ROUTING`, `NIDO_UNLOCKED` e policy ALIENA/ERMES.

Spec collegate:

- SPEC-A Device Input Ledger;
- SPEC-B TV/Public vs Device/Private Contract;
- SPEC-C WEGO Phone Combat Composer;
- SPEC-D TV Cinematic Round Director;
- SPEC-E Nido Groups, Party Select and Tribe;
- SPEC-J Lethal Consent and Wound Rituals;
- SPEC-L Runtime Feature Inventory Reconcile.

## 12. Fonti

Documenti locali:

- `docs/planning/2026-06-05-evo-tactics-tv-device-campaign-flow-reconstruction.md`
- `docs/planning/2026-06-05-evo-tactics-complete-game-systems-reconstruction.md`
- `docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`
- `docs/planning/2026-06-06-game-godot-code-surface-reconcile.md`

Game:

- `apps/backend/routes/coop.js`
- `apps/backend/services/coop/coopOrchestrator.js`
- `apps/backend/services/network/wsSession.js`
- `apps/backend/routes/campaign.js`

Godot:

- `C:/dev/Game-Godot-v2/scripts/main_route_choice.gd`
- `C:/dev/Game-Godot-v2/scripts/phone/phone_composer_view.gd`
- `C:/dev/Game-Godot-v2/scripts/phone/phone_nido_view.gd`
- `C:/dev/Game-Godot-v2/scripts/ui/nido_hub_view.gd`
- `C:/dev/Game-Godot-v2/scripts/main_debrief.gd`
- `C:/dev/Game-Godot-v2/scripts/ui/tv_mating_panel.gd`
- `C:/dev/Game-Godot-v2/scripts/phone/main_phone_offspring_mount.gd`

## 13. Flip verdict 2026-06-17 -- doc_status active = design ratificato, NON surface completa

Master-dd verdict (item-1 flip-plan, evidence = flip-readiness workflow): **flip-as-
ratification**. `doc_status: review_needed -> active` registra che il CANON device-authority
e' RATIFICATO ([ADR-2026-06-07](ADR-2026-06-07-device-authority-tv-mirror-canon.md) ACCEPTED) +
il seam architetturale e' stabile (SPEC-B visibility e SPEC-J consent gia' ci dipendono).

**NON significa che la sez.9 acceptance sia tutta soddisfatta** (verify-before-done, anti-Gate-5
laundering): criterio 3 (route-vote distinzione, PR #2597) e 7 (per-device action wires) = MET;
1/2/4 = PARTIAL (dev-fallback marcati); **5 (Nido phone actions) e 9 (playtest TV+telefoni) = UNMET**.
Il completamento sez.9 = **item-3 Godot build-residue**, tracciato come K-01..K-07 (sez.10) in
`BACKLOG.md`. Precedent: SPEC-I/A/G flippate active con forward-work esplicito + runtime/surface
gated separatamente. Nessuna superficie non-costruita e' spacciata per fatta.

> **Update 2026-06-20 (K-01 design-call 9.5 reconcile, audit PR #2878).** Currency Gate
> (git > marker): **criterio 5 (Nido phone actions) = MET** -- K-04 DONE e2e 2026-06-18
> (recruit GGv2 #481 `200ac70` + wound-ritual #479 `eac9232`; `phone_nido_view.gd` ha azioni
> player-facing). **criterio 4 (world confirm device/quorum) = MET-buildable** -- K-02 DONE
> (backend #2879 + Godot surface #513, mechanism A1 host-propose/device-commit, flag
> `WORLD_CONFIRM_QUORUM_ENABLED` OFF). Resta **UNMET solo il criterio 9 (real-device playtest
> TV+telefoni)** = K-07. SPEC-K item-3 = **6/7 DONE**; surface_role table (criterio 1) anche
> depositata (GGv2 #516 registry+map). Sez.13 sopra preservata come snapshot 2026-06-17.
