# TASK 02 - Legacy Job Recovery Pass

## Obiettivo

Trasformare i 6 job legacy in schede moderne di design, senza codice.

## Input

- `03_legacy_source/evo_tactics_param_synergy_v8_3_extracted/jobs/*.yaml`
- `05_templates/TEMPLATE_JOB_RECOVERY_SPEC.md`
- repo `Game` e `Game-Godot-v2` correnti

## Job target

- skirmisher
- vanguard
- warden
- artificer
- invoker
- harvester

## Passi

1. Leggi le 6 schede legacy.
2. Cerca ogni job nei repo vivi.
3. Classifica: asset only / runtime partial / runtime complete / missing.
4. Crea una tabella moderna.
5. Proponi uno sprint in micro-PR, ma non scrivere codice.

## Output

| Job | Stato corrente | Fantasy recuperabile | Meccanica moderna proposta | Repo target | Rischio | Prossimo passo |
| --- | -------------- | -------------------- | -------------------------- | ----------- | ------- | -------------- |
