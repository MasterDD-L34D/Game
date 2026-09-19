# Regole del Sistema (IA Regista)

> Pilastro 5 — "Co-op vs Sistema". Questo file raccoglie in linguaggio
> naturale le regole che l'IA Regista ("Sistema") applica alla fine di
> ogni turno giocato dai PG. Le regole vanno scritte prima in italiano e
> solo dopo tradotte in codice (`apps/backend/routes/session.js`:
> `runSistemaTurn`).
>
> Ogni regola ha un id stabile `REGOLA_###` che compare anche nel
> session log come campo `ia_rule`, così è possibile filtrare e
> analizzare ex post l'aderenza del Sistema alle sue stesse regole.

## REGOLA_001 — Priorità sul nemico più debole

Il Sistema, durante il proprio turno, seleziona l'unità nemica con meno
HP (in caso di pareggio, la prima trovata scansionando in ordine di id).
Se quella unità è in range (distanza di Manhattan **≤ 2** sulla griglia
6×6) esegue un'azione di `attack` contro di essa. Altrimenti esegue un
`move` di un singolo passo Manhattan verso di essa.

Il d20 usato dal Sistema è lo stesso resolver delle unità giocatore
(`resolveAttack` in `apps/backend/routes/session.js`), quindi tutti i
trait vivi (`data/core/traits/active_effects.yaml`) e i calcoli di PT
restano coerenti tra PG e IA.

**Scope esplicito di questa versione**:

- Una sola regola, una sola frase, nessuna priorità complessa.
- Niente path-finding: il movimento è uno step Manhattan semplice.
- Niente memoria del turno precedente: la decisione è presa sullo
  stato corrente della sessione.
- Se non esistono nemici vivi, il Sistema passa senza azione.

Le estensioni future (priorità multiple, regole di contesto, reazione
ai trait dell'avversario) saranno `REGOLA_002`, `REGOLA_003`, ecc., e
andranno documentate qui **prima** di implementarle, non dopo.

---

## Fairness

> Pilastro 6 — "Fairness". Questa sezione raccoglie i cap e le regole di
> equità che vincolano quanto i giocatori (e il Sistema) possono
> potenziare le proprie azioni in una singola sessione. Le regole di
> Fairness non hanno l'id `REGOLA_###` delle regole dell'IA — sono
> identificate come `FAIRNESS_###` per evitare ambiguità semantica.

## FAIRNESS_CAP_001 — Cap PT hard per-sessione

In una singola sessione non può essere speso più di `cap_pt_max` cap_pt
complessivi. Il valore è letto al boot da
`data/packs.yaml:pi_shop.caps.cap_pt_max`. Se il file non esiste o il
campo manca, il default è `1`.

**Enforcement**: il session engine valida ogni `POST /api/session/action`
tramite `checkCapPtBudget` in `apps/backend/services/fairnessCap.js`. Il
client può richiedere un costo `cap_pt` tramite il campo opzionale
`cost.cap_pt` nel body:

```jsonc
{ "actor_id": "...", "action_type": "...", "cost": { "cap_pt": 1 } }
```

**Comportamento**:

- Se `session.cap_pt_used + requested > cap_pt_max` → la route ritorna
  `400 { error: "cap_pt_max exceeded", cap_pt_used, cap_pt_max, requested }`
  senza mutare stato né scrivere eventi nel session log.
- Se il budget è sufficiente → l'azione viene risolta normalmente, il
  contatore `session.cap_pt_used` viene incrementato, e l'evento nel
  log include `cost: { cap_pt: N }` per analytics successive.

**Scope esplicito di questa versione**:

- Il cap è una proprietà della sessione, non della singola unità o del
  singolo turno — si esaurisce non appena viene raggiunto, a prescindere
  da chi l'ha speso.
- Il cap vale sia per `action_type=attack` che per `action_type=move`,
  così future abilità di movimento potenziato condividono lo stesso
  budget.
- Le azioni dell'IA Sistema (`runSistemaTurn`) non spendono `cap_pt`:
  il Sistema gioca sempre a costo zero, perché la sua "potenza" viene
  già bilanciata dalle soglie di REGOLA_001.

Estensioni future (altri cap, costi differenziati per abilità, cap
per-round invece che per-sessione) saranno `FAIRNESS_CAP_002`,
`FAIRNESS_CAP_003`, ecc., e andranno documentate qui **prima** di
essere implementate.
