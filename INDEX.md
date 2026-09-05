# 🦴 Evo-Tactics Drop v0.2 — 17 aprile 2026

Drop completo per il repo **Game**. Contiene:

## Cosa c'è

```
evo-tactics-drop/
├── INDEX.md              ← sei qui
├── CAVEMAN.md            ← da mettere nella root di Game/ (doc utente veloce)
├── flint/          ← CLI tool, da mettere in Game/flint/
│   ├── pyproject.toml    ← stack 2026: uv, ruff, mypy, dependency-groups
│   ├── README.md
│   ├── CAVEMAN.md
│   ├── DEEP_RESEARCH.md  ← report della ricerca con fonti
│   ├── Makefile
│   ├── smoke_test.py
│   ├── .github/workflows/flint-ci.yml
│   ├── src/caveman/      ← pacchetto Python
│   └── tests/
└── flint-narrative-skill/   ← da installare su Claude.ai come skill custom
    ├── SKILL.md
    └── references/
        ├── categories.md
        └── pillars.md
```

## Installazione passo passo

### 1. Copia nel repo Game

```bash
cd /path/to/Game

# Copia la cartella del tool
cp -r /path/to/evo-tactics-drop/flint .

# Copia il file doc in root
cp /path/to/evo-tactics-drop/CAVEMAN.md .

# Commit (caveman friendly!)
git add flint FLINT.md
git commit -m "add flint v0.2 (gameplay-first companion)"
```

### 2. Installa il CLI

```bash
cd flint
uv sync --all-groups     # se usi uv (raccomandato)
# oppure
pip install -e ".[dev]"

# Test
uv run caveman status
# oppure
caveman status
```

### 3. Attiva hook (opzionale)

```bash
cd /path/to/Game
caveman install-hook
# Ora ogni git commit che "rompe la rotta" avrà un caveman.
```

### 4. Installa la skill su Claude.ai

1. Zippa la cartella `flint-narrative-skill/`:
   ```bash
   cd /path/to/evo-tactics-drop
   zip -r caveman-mode.zip flint-narrative-skill/
   ```
2. Vai su Claude.ai → Settings → Features → Custom Skills
3. Upload del file `caveman-mode.zip`
4. Fatto: le prossime conversazioni avranno accesso alla skill.

## Workflow consigliato

```bash
# Ogni mattina
caveman status    # quanto gameplay ho fatto ultimamente?
caveman           # parlata del caveman (sprint contestuale)

# Quando non sai cosa fare
caveman speak -c mini_game   # pausa creativa

# Quando aggiungi feature
caveman speak -c scope_check # MoSCoW check

# Ogni venerdì
caveman achievements         # come è andata la settimana?
```

## Cosa è cambiato rispetto alla v0.1

- ✨ Nuova categoria `scope_check` con MoSCoW/RICE/SPACE (anti scope-creep)
- ✨ Modulo `achievements.py` con 8 achievement da pattern commit (Game-First
  Striker, Ruthless Cutter, ⚠️ Docker Addict, 🦴 Unga Bunga, ecc.)
- 📦 Stack 2026: PEP 735 `[dependency-groups]`, uv-native, ruff strict, mypy strict
- 🤖 GitHub Actions CI con matrix Python 3.12/3.13 + self-check "dogfooding"
- 📚 `DEEP_RESEARCH.md` con sintesi di 40+ fonti sui topic rilevanti
- 🎯 Skill `caveman-mode` v2 riscritta seguendo le best practice Claude 2026
  (description "pushy", progressive disclosure, <500 righe, pattern Why/What/How)
- 🎁 50+ seed (da 30), molti contestualizzati con dati veri del repo
- 🛠️ Fix priorità: molti dirty files → micro_sprint (non design_hint)

## Filosofia

Tutto questo drop è coerente con UNA sola idea:

> **Il gioco prima del codice.** Infrastruttura senza gameplay = progetto morto.

Il resto sono strumenti per ricordarselo con leggerezza.

---

🦴 _unga bunga Master. ora scompattare. poi committare. poi giocare._
