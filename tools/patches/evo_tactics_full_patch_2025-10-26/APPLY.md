# Evo Tactics — Patch Completa (2025‑10‑26)

Questa patch applica il riallineamento del repo **Game** ai pacchetti *Param Synergy v8.3* e *FullRepo v1.0*, seguendo la merge policy:
- **Parametri** autorevoli in `data/evo-tactics/param-synergy/...`
- **Codice/patch/manifest** in `modules/evo-tactics/core/...`
- Monoliti `data/*.yaml` diventano **artefatti generati** (non più sorgenti) tramite script in `tools/build/`

## Prerequisiti
- Python ≥ 3.10  
- `pip install -r tools/build/requirements.txt` (richiede `PyYAML`)
- I due ZIP disponibili localmente (o path accessibili):
  - `evo_tactics_param_synergy_v8_3.zip`
  - `EvoTactics_FullRepo_v1.0.zip`

## Uso rapido
```bash
# dry‑run per vedere cosa verrebbe scritto
python tools/patches/evo_tactics_full_patch_2025-10-26/apply_patch.py \
  --param-zip /path/to/evo_tactics_param_synergy_v8_3.zip \
  --core-zip  /path/to/EvoTactics_FullRepo_v1.0.zip \
  --repo-root . --dry-run

# applica realmente la patch (scrive/crea file/dir)
python tools/patches/evo_tactics_full_patch_2025-10-26/apply_patch.py \
  --param-zip /path/to/evo_tactics_param_synergy_v8_3.zip \
  --core-zip  /path/to/EvoTactics_FullRepo_v1.0.zip \
  --repo-root .

# genera gli artefatti monolitici per compatibilità
python tools/build/emit_species_yaml.py
python tools/build/emit_packs_yaml.py
python tools/build/emit_telemetry_yaml.py
python tools/build/emit_mating_yaml.py
```

## Check‑list operativa
1. **Backup branch** (opzionale): `git checkout -b backup/pre‑patch`
2. **Dry‑run** della patch e revisione output
3. **Apply** patch
4. Esegui gli **script build** per generare i monoliti compatibili in `data/*.yaml`
5. Lancia la **CI** (validazione YAML/JSON)
6. Review e cleanup:  
   - Deprecare/archiviare duplicati in `archive_from_user/_dedup/...`  
   - Aggiornare riferimenti a nuovi percorsi canonici
7. Commit + push

Dettagli su mapping e policy in `patch_manifest.json` e `docs/evo-tactics/checklist_patch.md`.
