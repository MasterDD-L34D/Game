# Buff-steal e oracle-reveal -- design

- **Data**: 2026-07-10
- **Stato**: approvato (master-dd, AskUserQuestion)
- **Tratti coperti**: `ghiandole_mnemoniche`, `nodi_micorrizici_oracolari`
- **Chiude**: la voce "Owner design call" dei cluster _buff-manipulation_ e
  _recon/foresight_ in `docs/planning/2026-06-28-gap2-next-block-mechanics-proposal.md`
  e `docs/planning/2026-06-29-gap2-block3-mechanics-proposal.md`

## Problema

Entrambi i tratti hanno definizione in `data/traits/**` e voce nel glossario, ma
nessuna entry in `data/core/traits/active_effects.yaml`. In partita non fanno
nulla. Sono stati esclusi dal bundle i18n player-facing (PR #3247) perche' il
testo curato prometteva un effetto inesistente.

Sono due dei **64** tratti indicizzati (su 309) privi di entry meccanica. Questo
spec ne copre due; non pretende di chiudere la coorte.

## Ground truth accertata (verifica diretta, non inferenza)

Fatti load-bearing, ognuno letto a codice prima di progettare:

1. **Nessuno dei due e' acquisibile da un'unita' viva, oggi.** L'unica sorgente di
   `unit.traits` e' il payload di richiesta, via `normaliseUnit`
   (`apps/backend/routes/sessionHelpers.js:54,97`). Nessun produttore vivo li
   inietta: `species_catalog.json` `trait_refs` non ha **alcun** consumatore
   backend; `biome_pools.json` `preferred_traits` e' solo un criterio di peso in
   `biomeSpawnBias.js:122`; nessun `trait_swap.add` li concede; onboarding e
   character-creation pescano da set fissi.

2. **Avere una entry in `active_effects.yaml` non basta a essere vivi.**
   `passesBasicTriggers` (`apps/backend/services/traitEffects.js:308`) rifiuta
   ogni `trigger.action_type !== 'attack'`. Per questo
   `spore_psichiche_silenziate` -- che _ha_ una entry, con `melee_attack` -- e'
   inerte. La superficie viva reale e' rispecchiata da
   `tests/helpers/traitLiveness.js`.

3. **`conflitti` non e' letto dal motore.** Unico lettore:
   `apps/backend/services/traitStyleGuide.js:494`, un linter. Il conflitto
   dichiarato di `nodi_micorrizici_oracolari` verso `spore_psichiche_silenziate`
   e' gia' inerte da entrambi i lati.

4. **La pipe di reveal esiste, e' wired, ed e' affamata.**
   `combat/telepathicReveal.js` e' invocata in
   `routes/sessionRoundBridge.js:2302` dentro `begin-planning`. Rivela gli intent
   nemici (`intent_type`, `target_id`, `distance`) entro manhattan `opts.range`
   (default 3) a ogni attore con `status.telepatic_link > 0`. Il suo unico
   produttore attuale, `risonanza_magnetica`, e' gated su
   `on_result: hit` + `on_kill: true` + `min_mos: 5` -- il commento nel YAML
   ammette che serve a limitare la firing-rate al boss-finish. **Zero produttori
   passivi.**

5. **`telepatic_link` non ha alcun delta statistico.**
   `combat/statusModifiers.js:206-208`: _"No stat effect -- narrative reveal
   marker only."_ Renderlo permanente non introduce power-creep numerico.

6. **La magnitudo di uno status non e' scalabile.** `computeStatusModifiers` legge
   `status_intensity` per un solo status, `abbagliato`
   (`statusModifiers.js:241`). Tutti gli altri sono binari: `isPositive(turni>0)`
   -> delta fisso. Non esiste "mezzo `linked`".

7. **`unit.traits` (combat) e `unit.trait_ids` (mutazioni/meta) sono namespace
   distinti.** `normaliseUnit` non popola mai `trait_ids`;
   `mutationEngine.js:141,156` e `mutationCatalogLoader.js:147` leggono e scrivono
   solo `trait_ids`.

## Decisioni

### 1. `nodi_micorrizici_oracolari` -- solo dati

Non richiede alcun primitive nuovo. Il fatto (4) rende la forma seguente
interamente interna alla superficie viva esistente:

```yaml
nodi_micorrizici_oracolari:
  tier: T3
  category: sensoriale
  applies_to: actor
  trigger:
    action_type: passive
  effect:
    kind: apply_status
    stato: telepatic_link
    turns: 2
    log_tag: nodi_micorrizici_oracolari
```

Consumo: `combat/passiveStatusApplier.applyPassiveAncestors` (inizio sessione +
fine round) applica `telepatic_link`; `computeTelepathicReveal` lo legge in
`begin-planning`. `passiveStatusSpec` legge esattamente `trigger.action_type`,
`effect.kind`, `effect.stato`, `effect.turns` -- nessun `target_side` richiesto.

L'applier e' un **refresh-to-floor** (`if (current >= spec.turns) continue`), per
cui `turns: 2` equivale a "sempre attivo" senza codice aggiuntivo.

Contenimento della potenza: **il raggio, non la rarita'.** Il reveal e' gia'
limitato a manhattan 3 dal default di `computeTelepathicReveal`, e per il fatto
(5) non concede statistiche. Il tratto e' informazione locale, non forza.

`isEngineLiveReliable` riconosce questa forma come viva (caso _d_):
**`tests/helpers/traitLiveness.js` non va modificato.**

### 2. `ghiandole_mnemoniche` -- un modulo dedicato

Intento autoriale, da `docs/traits/Frattura_Abissale_Sinaptica_trait_draft.md:57`
(`role_template` "Sciame Memetico", tier 3, `preferred_traits:
[ghiandole_mnemoniche, organi_metacronici]`, `functional_tags: ["sabotaggio",
"furto_buff"]`):

> micro-larve che rubano buff temporanei e li riapplicano in forma ridotta

Quindi: **furto**, non copia. Serve stato/logica custom -> pattern
`persistent_marker` + modulo dedicato, come `cortecciaMemetica` /
`artigliPsionici` / `tessutiAdattivi`.

- **File**: `apps/backend/services/combat/ghiandoleMnemoniche.js`
- **Entry YAML**: `trigger: {action_type: passive}`, `effect: {kind:
persistent_marker, marker: ghiandole_mnemoniche, log_tag:
ghiandole_mnemoniche}` (registrazione; la logica vive nel modulo)
- **Wire**: `apps/backend/routes/session.js`, post-attacco, accanto a
  `consumeRisonanza`
- **Comportamento**: su hit andato a segno, se il bersaglio possiede uno status in
  whitelist, il primo in ordine deterministico di whitelist viene **rimosso** da
  `target.status` (e da `target.status_intensity`, se presente) e applicato ad
  `actor.status` con durata `max(1, ceil(turni_originali / 2))`. Un solo buff per
  colpo.

**Whitelist**, in ordine di priorita' deterministico:

1. `frenzy`
2. `linked`
3. `sensed`
4. `coordinamento`
5. `risonanza_memetica`

`frenzy` e' primo per scelta di design (master-dd): il tratto va sempre per la
preda piu' grossa, coerente col tag `sabotaggio` del role_template -- la priorita'
e' TOGLIERE al nemico, non massimizzare il guadagno proprio.

**Perche' `frenzy` e' rubabile e non ambiguo.** `computeStatusModifiers` lo legge
su entrambi i lati, ma sono le due facce dello stesso status sulla stessa unita':
`:202` `isPositive(actorStatus.frenzy) -> attackDelta += 1` ("rage variant") e
`:253` `isPositive(targetStatus.frenzy) -> defenseDelta -= 1` ("rage exposure").
Chi porta `frenzy` colpisce meglio e si difende peggio. Lo status si sposta con
l'unita' e si porta dietro il proprio lato negativo.

Ne segue una proprieta' voluta: `frenzy` e' l'unico buff della whitelist il cui
furto **non e' un guadagno netto**. Il portatore strappa +1 attacco al nemico ma
ne eredita la guardia abbassata. Gli altri quattro sono puro upside.

`PASSIVE_BLOCKLIST` contiene `frenzy` (`passiveStatusApplier.js:45`), ma vieta
l'auto-applicazione _passiva_ ("frenzy = 2 turns rage, not always-on"). Il modulo
lo applica direttamente a durata dimezzata: nessun conflitto, e la regola
dimezzante rispetta quell'intento canonico.

Esclusi, con motivo:

- `nucleo_intatto` -- e' uno stato strutturale, non un buff temporaneo; il suo
  rovescio `danno_nucleo` e' governato da `combat/nucleiWeakPoint.js`.
- `telepatic_link` -- e' la firma di `nodi_micorrizici_oracolari` (decisione 1);
  rubarlo incrocerebbe i due tratti in un modo che nessuno ha progettato.

### 2b. Canale di rimozione (`_pendingStatusRemovals`)

Il furto non persiste senza un canale dedicato. `_pendingStatusApplies` e' drenato
con `applyMoraleStatus` (`combat/morale.js:61`), che e'
`unit.status[s] = Math.max(cur, dur)` -- monotono crescente, non sa rimuovere. E il
loop di `syncStatusesFromRoundState` (`sessionRoundBridge.js:415-419`) riscrive
`sessionUnit.status` dall'array tracciato `roundUnit.statuses`, ripristinando
qualsiasi `delete` fatto a meta' attacco.

Senza rimozione, `ghiandole_mnemoniche` diventerebbe silenziosamente una COPIA nel
path round-model e un FURTO in quello legacy: due path dello stesso motore con
comportamento divergente. E' la stessa classe di difetto che questo spec chiude --
una meccanica che sembra viva perche' il codice c'e', ma il cui effetto viene
mangiato da un seam a valle.

Soluzione: `session._pendingStatusRemovals` (`[{unit_id, status}]`), drenato subito
dopo gli applies, cioe' DOPO il rebuild tracked->dict. `adaptSessionToRoundState`
(`sessionRoundBridge.js:297-309`) ri-deriva l'array tracciato leggendo il dict,
quindi la cancellazione sopravvive al giro successivo.

Il drain vive in `combat/pendingStatusRemovals.js` -- funzione pura, testabile --
perche' `syncStatusesFromRoundState` e' una closure non esportata di
`createRoundBridge`.

Band-neutral: nessuna unita' pusha rimozioni se non porta il tratto.

### 3. Scostamento dal canone, dichiarato

Il canone (`docs/traits/trait_reference_manual.md:35`, tratto gemello
`riverbero_memetico`) dice _"duplica prossimo buff al 50%"_. Per il fatto (6) il
50% di magnitudo **non e' esprimibile** senza toccare `computeStatusModifiers` su
circa dodici rami, il che ri-bilancerebbe ogni tratto esistente che produce quegli
status.

Consegniamo quindi il 50% **di durata**. E' uno scostamento consapevole, va
annotato nel docstring del modulo, e non va corretto silenziosamente in futuro
senza ri-aprire questa decisione.

### 4. `traitLiveness.js` resta invariato -- di proposito

Il mirror esclude gia' ogni `persistent_marker` (`corteccia_memetica`,
`artigli_psionici`, `tessuti_adattivi` sono tutti fuori). Lasciare
`ghiandole_mnemoniche` fuori significa che i path di grant automatico
(`imprint/imprintTraitGrant.js`, `identity/brancoTraitEmergence.js`) non lo
pescheranno mai. E' il comportamento conservativo corretto: un tratto con stato
custom non deve entrare in una mappatura di grant senza un ratify N=40 dedicato.

Motivare la scelta nel docstring del modulo, cosi' che il prossimo lettore non la
scambi per una dimenticanza.

## Fuori scope (deliberatamente)

- **La mutazione `simbionte_micorriza_radici`** resta irraggiungibile. Il suo
  prereq `prerequisites.traits: [nodi_micorrizici_oracolari]` punta -- dopo questo
  change -- a un tratto vivo, quindi _non va toccato_. Cio' che la blocca e' il
  fatto (7): `listEligibleForUnit` interroga `unit.trait_ids`, che nessuna unita'
  di combattimento possiede. E' un bug di namespace, separato e piu' grande.
- **I 18 tratti che dichiarano `passive` + `apply_status` + `stato: focused`**
  (`percezione`, `olfatto`, `controllo_cognitivo`, `localizzazione_delle_minacce`,
  `memoria_iconica`, ...). `focused` non e' in `WAVE_A_STATUSES`, quindi
  `passiveStatusApplier` li scarta tutti. **Non e' una scoperta e non ha impatto
  sul giocatore**: il gap e' gia' documentato in `services/ai/policy.js:121-124`
  ("rimandati a sprint futuri ... richiedono modifica `resolveAttack` per
  focused") e in `imprint/imprintTraitGrant.js:88`, dove il recon li aveva gia'
  rifiutati dai path di grant. Nessuno dei 18 e' in `data/traits/index.json`,
  quindi nessuno e' assegnabile. E' un rinvio di design consapevole, non un
  difetto latente.
- **Gli altri 62 tratti inerti.** Nessuna policy generale viene ratificata qui.

## Verifica

Il change e' **band-neutral**: nessuna sim unit porta i due tratti (fatto 1),
quindi le run AI restano byte-stabili.

1. TDD: test RED prima del codice, per entrambi i tratti.
2. `node --test` sui nuovi file di test.
3. `node --test tests/ai/*.test.js` -> 557/557 byte-stable (band-neutral, no
   carrier).
4. `npm run test:api` -> considerare reali solo gli `AssertionError` (il full-run
   inonda le porte effimere su Ryzen; vedi memoria `reference_game_apisuite_eaddrinuse`).
5. ASCII-guard + `validate_traits`.

## Test previsti

**`nodi_micorrizici_oracolari`** (data-only, ma il comportamento va inchiodato):

- `applyPassiveAncestors` su un'unita' col tratto -> `status.telepatic_link === 2`.
- `computeTelepathicReveal` con quell'unita' + un intent nemico pendente entro
  raggio 3 -> l'intent e' rivelato; oltre il raggio -> non lo e'.
- `isEngineLiveReliable(def)` -> `true` (protegge dal caso in cui qualcuno cambi
  la forma e la renda inerte senza accorgersene).

**`ghiandole_mnemoniche`**:

- hit su bersaglio con `linked: 4` -> il bersaglio perde `linked`, l'attaccante lo
  guadagna con `2`.
- hit su bersaglio con `linked: 1` -> l'attaccante lo guadagna con `1` (floor).
- hit su bersaglio con `sensed` + `linked` -> ruba **solo** `linked` (precede
  `sensed` in whitelist), un buff per colpo.
- hit su bersaglio con `frenzy` + `linked` -> ruba `frenzy` (primo in whitelist),
  **non** `linked`.
- hit su bersaglio con `frenzy: 2` -> il bersaglio perde `frenzy`; l'attaccante lo
  guadagna con `1`, e da quel momento `computeStatusModifiers` gli concede `+1`
  attacco (`:202`) e gli applica `-1` difesa quando e' bersagliato (`:253`). Il
  test verifica **entrambi** i lati: il furto non e' un guadagno netto.
- hit su bersaglio con `nucleo_intatto` / `telepatic_link` -> **nessun** furto
  (esclusi).
- miss -> nessun furto.
- portatore assente -> no-op (nessuna mutazione degli status).
