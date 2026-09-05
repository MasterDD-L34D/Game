---
name: catalog-sync
description: Run full Game → Game-Database catalog sync pipeline (sync:evo-pack + evo:import)
user_invocable: true
---

# Catalog Sync

Full pipeline: regenerate catalog from Game data, import into Game-Database.

## Steps

### 1. Regenerate catalog

```bash
npm run sync:evo-pack
```

This rebuilds `packs/evo_tactics_pack/docs/catalog/` from canonical data sources.

Check output for errors. If any → STOP, report.

### 2. Check for catalog changes

```bash
git diff --stat -- packs/evo_tactics_pack/docs/catalog/
```

If no changes → catalog already up to date, skip import.

### 3. Import into Game-Database

Requires Game-Database Postgres running on port 5433.

```bash
cd ~/Documents/GitHub/Game-Database/server && npm run evo:import -- --repo ~/Desktop/Game --verbose 2>&1
```

### 4. Parse import report

Extract from JSON output:

- totali_letti, normalizzati, aggiornati_o_upsertati, scartati, errori
- Per-domain breakdown
- elapsed_ms

### 5. Produce report

```
## Catalog Sync Report

| Domain | Read | Normalized | Upserted | Skipped | Errors |
|--------|------|------------|----------|---------|--------|
| traits | ... | ... | ... | ... | ... |
| biomes | ... | ... | ... | ... | ... |
| species | ... | ... | ... | ... | ... |
| ecosystems | ... | ... | ... | ... | ... |
| **Total** | ... | ... | ... | ... | ... |

Elapsed: Xms
```

### 6. If errors > 0

List error samples from report. Suggest fixes:

- "specie non normalizzabile" → check source JSON for missing fields
- "slug conflict" → check for duplicate IDs in catalog files

### 7. Commit suggestion

If import succeeded with 0 errors:

- Suggest committing catalog changes on Game side (if any)
- Suggest committing on Game-Database side (if DB was updated)

Ask user before committing.
