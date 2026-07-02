---
title: Flint — installation guide
doc_status: active
doc_owner: flint-maintainer
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: true
language: it-en
review_cycle_days: 180
---

# Flint — installation guide

> Guida adozione Flint in repo nuovo. 3 modalità: **auto** (install.py), **manuale** (5 step), **minimal** (solo stdlib).

## Pre-requisiti

- Python 3.10+ (3.12+ raccomandato)
- Git repo target iniziale
- Claude Code (opzionale, per Claude integration layer)
- `uv` o `pipx` (opzionale, per CLI install)

## Modalità 1 — Auto (install.py)

```bash
# 1. Copy flint/ nel repo target (subtree / clone / download)
git subtree add --prefix=flint https://github.com/MasterDD-L34D/Game.git main --squash
# OR: download zip + unzip

# 2. Run install script
cd <your-repo>
python3 flint/install.py --target-repo . --project-name "My Project" --project-type gamedev-solo

# 3. Verify
python3 flint/tools/flint_status_stdlib.py --output docs/flint-status.json
```

Script `install.py` fa:

1. Detect repo hash (path convertito `/` → `-`)
2. Copy `tools/flint_status_stdlib.py` → `<target>/tools/py/` (se non esiste)
3. Copy `claude-integration/memory/*.md` → `~/.claude/projects/<hash>/memory/`
4. Copy `claude-integration/commands/*.md` → `<target>/.claude/commands/`
5. Append `claude-integration/CLAUDE.md-section-template.md` → `<target>/CLAUDE.md`
6. Report cosa installato + cosa configurare manualmente

Flags opzionali:

- `--target-repo <path>` (default: cwd)
- `--project-name <str>` (default: nome dir)
- `--project-type gamedev-solo|webapp|data-ops|custom` (default: custom)
- `--skip-memory` (non copiare user memory files)
- `--skip-cli` (non install `uv tool install flint`)
- `--dry-run` (mostra cosa farebbe senza eseguire)

## Modalità 2 — Manuale (5 step)

### Step 1: stdlib fallback (essenziale)

```bash
mkdir -p tools/py
cp flint/tools/flint_status_stdlib.py tools/py/
```

Test:

```bash
PYTHONIOENCODING=utf-8 python3 tools/py/flint_status_stdlib.py --output docs/flint-status.json
# OK: exported flint status → docs/flint-status.json
```

### Step 2: personalizza classifier

Edit `tools/py/flint_status_stdlib.py` linee 21-27 per tuo dominio. Esempio webapp:

```python
COMMIT_PATTERNS = [
    (("feat(", "feature/", "frontend/", "api/"), "FEATURE"),
    (("fix(", "bug/", "hotfix"), "FIX"),
    (("test/", "spec/"), "TEST"),
    (("docker", "ci/", ".github/workflows", "chore("), "INFRA"),
    (("docs/", ".md", "docs("), "DOCS"),
]
```

### Step 3: CLI install (opzionale)

```bash
# Raccomandato 2026: uv
cd flint && uv tool install .

# Legacy: pipx
cd flint && pipx install .
```

Dopo: `flint status` ovunque nel repo.

### Step 4: Claude Code memory (opzionale)

```bash
# Calcola <repo-hash>: path convertito con / → -
# Es: C:/Users/X/Desktop/MyProj → C--Users-X-Desktop-MyProj

REPO_HASH=$(pwd | sed 's|/|-|g' | sed 's|\\|-|g')
mkdir -p ~/.claude/projects/$REPO_HASH/memory/

cp flint/claude-integration/memory/*.md ~/.claude/projects/$REPO_HASH/memory/
cp flint/claude-integration/memory/MEMORY.md.template ~/.claude/projects/$REPO_HASH/memory/MEMORY.md
# Editare MEMORY.md: rimuovere header template, aggiungere "## Progetto <nome>"
```

### Step 5: Slash commands (opzionale)

```bash
mkdir -p .claude/commands
cp flint/claude-integration/commands/*.md .claude/commands/
```

Append `flint/claude-integration/CLAUDE.md-section-template.md` content a `CLAUDE.md` del repo.

## Modalità 3 — Minimal (solo stdlib, no deps)

Se non vuoi full integration:

```bash
curl -o tools/flint_status.py \
  https://raw.githubusercontent.com/MasterDD-L34D/Game/main/flint/tools/flint_status_stdlib.py

python3 tools/flint_status.py --output docs/flint-status.json
```

Ottieni: JSON snapshot con gameplay_ratio + commit classification. Niente altro.

## Adoption checklist

- [ ] Stdlib funziona (`python3 tools/py/flint_status_stdlib.py` esporta JSON)
- [ ] Classifier customizzato (>80% commit classified non-ALTRO)
- [ ] (Opzionale) CLI installed (`flint status` working)
- [ ] (Opzionale) Memory files in `~/.claude/projects/<hash>/`
- [ ] (Opzionale) Commands in `.claude/commands/`
- [ ] CLAUDE.md aggiornato con sezione Flint
- [ ] `docs/archive/` dir preparata per kill decisions future (usa `flint/archive-template/`)

## Uninstall

```bash
# CLI
uv tool uninstall flint
# OR
pipx uninstall flint

# Files
rm -rf flint/
rm tools/py/flint_status_stdlib.py
rm -rf ~/.claude/projects/<hash>/memory/feedback_claude_workflow_consolidated.md
rm -rf ~/.claude/projects/<hash>/memory/feedback_meta_checkpoint_directive.md
rm -rf ~/.claude/projects/<hash>/memory/reference_flint_optimization_guide.md
rm .claude/commands/meta-checkpoint.md

# Remove section from CLAUDE.md manualmente
```

## Troubleshooting

### `UnicodeEncodeError` su Windows

```bash
# Fix:
PYTHONIOENCODING=utf-8 python3 tools/py/flint_status_stdlib.py ...
```

### Memory non auto-loaded da Claude Code

Verifica path `~/.claude/projects/<hash>/memory/MEMORY.md` esiste (non solo i feedback files). Hash = path convertito.

### Classifier dà 0% gameplay_ratio

Pattern non riconoscono tuo stile commit. Edit `_COMMIT_PATTERNS` in `tools/py/flint_status_stdlib.py`. Vedi PROJECT.md §6 per template domini comuni.

### CLI `flint` non trovato dopo install

```bash
# Verifica PATH
which flint

# Re-install
uv tool install --reinstall .
# OR
uv tool uninstall flint && uv tool install .
```

## Support

- **Canonical doc**: [PROJECT.md](./PROJECT.md)
- **Issues**: <https://github.com/MasterDD-L34D/Game/issues> (fino a v1.0 repo extraction)
- **Sources**: `claude-integration/memory/reference_flint_optimization_guide.md`
