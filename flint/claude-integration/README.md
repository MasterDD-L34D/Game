# flint/claude-integration/ — Claude Code integration layer

Questa cartella contiene **tutti i file necessari** per integrare Flint con Claude Code in un nuovo repo.

## Contenuto

```
claude-integration/
├── README.md                           ← questo file
├── memory/                             ← auto-loaded da Claude Code
│   ├── MEMORY.md.template              ← index template (personalizza)
│   ├── feedback_claude_workflow_consolidated.md    ← 9 pattern workflow
│   ├── feedback_meta_checkpoint_directive.md       ← auto-trigger meta-pause
│   ├── reference_classification_4d.md              ← framework 4D keep/kill
│   └── reference_flint_optimization_guide.md       ← 40+ sources research
├── commands/                           ← slash commands
│   ├── meta-checkpoint.md              ← /meta-checkpoint (self-audit)
│   └── classify-4d.md                  ← /classify-4d (asset triage)
└── CLAUDE.md-section-template.md       ← sezione da paste in CLAUDE.md
```

## Installazione (manuale)

### 1. Memory files (user-level, non in repo)

```bash
# Target path: ~/.claude/projects/<repo-hash>/memory/
# Dove <repo-hash> è il path convertito del tuo repo (Claude Code convention)

# Esempio repo in C:/Users/X/Desktop/MyProj:
# → ~/.claude/projects/C--Users-X-Desktop-MyProj/memory/

mkdir -p ~/.claude/projects/<your-repo-hash>/memory/
cp flint/claude-integration/memory/*.md ~/.claude/projects/<your-repo-hash>/memory/
cp flint/claude-integration/memory/MEMORY.md.template ~/.claude/projects/<your-repo-hash>/memory/MEMORY.md
# Personalizza MEMORY.md con sezione "Progetto <tuo-nome>"
```

### 2. Slash commands (repo-level)

```bash
mkdir -p .claude/commands
cp flint/claude-integration/commands/*.md .claude/commands/
```

### 3. CLAUDE.md section

Apri `CLAUDE.md` del tuo repo. Paste contenuto di `CLAUDE.md-section-template.md` prima di "Platform notes" (o equivalente). Personalizza `<PROJECT_NAME>` e `<MEMORY_PATH>`.

### 4. Verify

- Riavvia Claude Code session
- Check skill list — devono apparire `meta-checkpoint` + `classify-4d`
- Test: scrivi "dammi un flint" → risposta composta A+C+D+E (+G se venerdì)
- Test: `/classify-4d <file>` → tabella 4D + raccomandazione atomica

## Installazione (automatica)

```bash
python3 flint/install.py --target-repo . --project-name "My Project" --project-type gamedev-solo
```

Vedi `flint/INSTALL.md` per dettagli.

## Path convention

| Componente   | Location                                       | Scope                       |
| ------------ | ---------------------------------------------- | --------------------------- |
| Memory files | `~/.claude/projects/<repo-hash>/memory/`       | User-level, auto-loaded     |
| Commands     | `.claude/commands/`                            | Repo-level, shared con team |
| CLAUDE.md    | Repo root                                      | Repo-level                  |
| Flint CLI    | `flint/` subtree o via `uv tool install flint` | Portable                    |

## Troubleshooting

**Memory non auto-loaded**: verifica path `~/.claude/projects/<hash>/memory/MEMORY.md` esiste. Il hash corrisponde a path convertito (`/` → `-`).

**Skill /meta-checkpoint non compare**: riavvia Claude Code session. Skills caricate a SessionStart.

**Conflitti con caveman:caveman plugin**: nessun conflitto. Caveman = voce (upstream), Flint = workflow (custom). Ortogonali.
