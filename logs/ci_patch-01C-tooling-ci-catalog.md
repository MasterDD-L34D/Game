# CI patch/01C-tooling-ci-catalog – tracking run verdi

## Run attese

- Branch: `patch/01C-tooling-ci-catalog`
- Validatori da tracciare (3 run verdi): `data-quality`, `validate_traits`, `schema-validate`.
- Stato `validate-naming`: **consultivo** finché la matrice core/derived non è stabile.

## Esiti e log CI

| Check CI        | Run # | Data/ora (UTC) | Esito    | Log CI / Link artefatto | Note |
| --------------- | ----- | -------------- | -------- | ----------------------- | ---- |
| data-quality    | 1     | —              | Pending  | —                       | In attesa di prima run verde. |
| data-quality    | 2     | —              | Pending  | —                       | — |
| data-quality    | 3     | —              | Pending  | —                       | — |
| validate_traits | 1     | —              | Pending  | —                       | — |
| validate_traits | 2     | —              | Pending  | —                       | — |
| validate_traits | 3     | —              | Pending  | —                       | — |
| schema-validate | 1     | —              | Pending  | —                       | — |
| schema-validate | 2     | —              | Pending  | —                       | — |
| schema-validate | 3     | —              | Pending  | —                       | — |
| validate-naming | consultivo | — | Non blocking | — | Passare a enforcing solo dopo decisione finale. |

> Aggiornare la tabella con data/ora UTC e link al log CI per ogni run verde. In assenza di link pubblico, allegare percorso file archiviato in `logs/` o riferimento al job CI interno.

## Decisione enforcement `validate-naming`

- Stato attuale: consultivo
- Decisione finale: **[da definire]**
- Rollback plan: **[da definire]** (es.: revert commit di enforcement o toggle config su pipeline CI)

