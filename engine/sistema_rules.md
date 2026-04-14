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
