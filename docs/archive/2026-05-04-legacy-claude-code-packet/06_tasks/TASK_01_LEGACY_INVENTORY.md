# TASK 01 - Legacy Inventory

## Obiettivo

Rileggere il legacy pack e aggiornare la matrice se il repo corrente mostra differenze rispetto allo snapshot.

## Input

- `02_audit/legacy_to_godot_matrix.csv`
- `02_audit/summary.json`
- `03_legacy_source/evo_tactics_param_synergy_v8_3_extracted/`

## Passi

1. Carica la matrice CSV.
2. Verifica categorie principali: species, morph, jobs, biomes, rules, social, nest, ennea, director, surge, tags.
3. Per ogni item `unmapped`, cerca equivalenti correnti in `Game` e `Game-Godot-v2`.
4. Aggiorna mentalmente o produci nuova matrice in `legacy_triage_work/`.

## Output

- Conteggi aggiornati.
- Lista item con stato cambiato.
- Lista item ancora candidati.
