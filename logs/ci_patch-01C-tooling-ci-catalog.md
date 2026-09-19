# CI patch/01C-tooling-ci-catalog – tracking run verdi

## Run attese

- Branch: `patch/01C-tooling-ci-catalog`
- Validatori da tracciare (3 run verdi): `data-quality`, `validate_traits`, `schema-validate`.
- Stato `validate-naming`: **consultivo** finché la matrice core/derived non è stabile.

## Esiti e log CI

| Check CI        | Run # | Data/ora (UTC)        | Esito    | Log CI / Link artefatto            | Note |
| --------------- | ----- | --------------------- | -------- | ---------------------------------- | ---- |
| data-quality    | 1     | 2025-11-29 12:53:58Z  | Verde    | logs/ci/data-quality_run1.log      | Run manuale locale (schema-only core+pack) su branch patch/01C. |
| data-quality    | 2     | 2025-11-29 12:54:05Z  | Verde    | logs/ci/data-quality_run2.log      | — |
| data-quality    | 3     | 2025-11-29 12:54:10Z  | Verde    | logs/ci/data-quality_run3.log      | — |
| validate_traits | 1     | 2025-11-29 12:54:23Z  | Rosso    | logs/ci/validate_traits_run1.log   | Fermi per errori index/coverage trait (vedi log). Run 2–3 sospese finché non si risolve. |
| validate_traits | 2     | 2025-11-30 04:59:33Z  | Verde    | logs/ci/validate_traits_run2.log   | Ripartenza post-fix: index e coverage già allineati, nessun intervento aggiuntivo richiesto. |
| validate_traits | 3     | 2025-11-30 13:50:22Z  | Verde    | logs/ci/validate_traits_run3.log   | Confermato pass strict (validator + index + coverage + style). |
| validate_traits | 4     | 2025-11-30 13:50:29Z  | Verde    | logs/ci/validate_traits_run4.log   | Terza run consecutiva verde, nessun drift rilevato. |
| schema-validate | 1     | 2025-11-29 12:54:52Z  | Verde    | logs/ci/schema-validate_run1.log   | Validazione JSON schema Draft202012. |
| schema-validate | 2     | 2025-11-29 12:54:58Z  | Verde    | logs/ci/schema-validate_run2.log   | — |
| schema-validate | 3     | 2025-11-29 12:55:01Z  | Verde    | logs/ci/schema-validate_run3.log   | — |
| validate-naming | consultivo | — | Non blocking | — | Passare a enforcing solo dopo decisione finale. |

> Aggiornare la tabella con data/ora UTC e link al log CI per ogni run verde. In assenza di link pubblico, allegare percorso file archiviato in `logs/` o riferimento al job CI interno.

## Decisione enforcement `validate-naming`

- Stato attuale: consultivo (trigger solo `push`/`workflow_dispatch`).
- Decisione finale (dopo 3 run verdi su `validate_traits`): mantenere **consultivo** finché la matrice core/derived non è stabilizzata; proporre enforcement solo dopo revisione con Master DD.
- Rollback plan: se in futuro promosso a enforcing, rollback immediato = ripristinare `continue-on-error: true`, disattivare trigger `pull_request` e limitare di nuovo il workflow al branch `patch/01C-tooling-ci-catalog` via commit dedicato (o revert del commit di enforcement) notificando Master DD/owner dev-tooling nel log operativo.

### Condivisione stato

- Stato e decisione condivisi con owner **dev-tooling** e **Master DD**; `validate_traits` ha 3 run consecutive verdi, si rimane in consultivo finché la matrice core/derived non è stabile.

