# 🦴 flint v0.2.1

> Companion CLI per solo-dev / piccoli team. Legge i tuoi commit e ti aiuta a non perdere la rotta di design/scope. Integrato primariamente con [Evo-Tactics](https://github.com/MasterDD-L34D/Game) ma progettato per essere ripetibile su altri progetti.

**📘 Canonical doc**: [PROJECT.md](./PROJECT.md) — project definition, architettura, integration pattern, roadmap, lessons learned.

**🗂 Archive kill-60 (2026-04-18)**: [docs/archive/flint-kill-60-2026-04-18/](../docs/archive/flint-kill-60-2026-04-18/) — classificazione + decision gate + sources.

**Stack 2026:** Python 3.12+ · uv · Typer · Rich · Ruff strict · mypy strict · pytest+cov · GitHub Actions CI · PEP 735 dependency-groups.

---

## ⚠️ Post kill-60 (2026-04-18)

Tool passato da 4/10 → diagnostica passiva. Rimossi: achievement system, post-commit hook auto-rigenera, auto-trigger narrative block, 8 memory files consolidati in 1. Dettagli decisione + sources: [archive MANIFEST](../docs/archive/flint-kill-60-2026-04-18/MANIFEST.md).

Sezioni "Hook automatico" e "Achievement" sotto sono **storiche** — preservate per re-open condizionale, non per uso corrente.

## Cosa fa

1. **Analizza i tuoi commit** (ultimi 10) e li classifica: `GAMEPLAY`, `INFRA`, `TOOLING`, `DOCS`, `DATA`, `ALTRO`.
2. **Rileva deriva**: se il gameplay ratio scende sotto il 20% o ci sono 4+ INFRA consecutivi, te lo dice.
3. **Parla solo quando serve**, con 5 tipi di output contestuali:
   - `micro_sprint` — task 5-15 min concreto
   - `design_hint` — principio ancorato ai 6 pilastri di Evo-Tactics
   - `mini_game` — pausa creativa 2-5 min, sempre diversa
   - `evo_twist` — playtest guidato con vincolo
   - `scope_check` — anti scope/future creep (MoSCoW, RICE, SPACE) ✨ NEW
4. **Hook git opzionale** con throttling 90 min: niente spam, parla solo se hai rotto la rotta o chiuso un GAMEPLAY.

## Install

```bash
# Stack 2026: uv raccomandato
uv tool install flint

# Legacy: pipx
pipx install flint

# Dev locale
cd flint
uv sync --all-extras --all-groups
```

## Uso

```bash
caveman                              # parlata contestuale (usa stato repo corrente)
caveman speak -c scope_check         # forza categoria
caveman status                       # tabella commit + metriche
caveman check                        # hook-mode: exit 0 se parla, 1 se zitto
caveman check --force                # ignora throttling
caveman install-hook                 # post-commit hook opt-in
caveman uninstall-hook
caveman --version
```

## Categorie & logica di scelta

```
se file dirty >= 5           → micro_sprint (pulisci WIP)
else se repo in deriva       → design_hint (schiaffo)
else se 6+ commit senza      → scope_check (30% prob)
     scope check recente
else se ultimo è GAMEPLAY    → micro_sprint (prossimo passo)
else                         → random pesato
                               (sprint 35% / twist 20% / game 18% /
                                hint 15% / scope 12%)
```

**Repo "in deriva"** = `gameplay_ratio < 20%` sugli ultimi 10 commit, OPPURE `4+ INFRA consecutivi`.

## Hook automatico

```bash
caveman install-hook
```

Dopo ogni `git commit`:

- Se in deriva → design_hint
- Se GAMEPLAY → celebra + prossimo sprint
- Altrimenti → zitto
- Throttle 90 min per evitare spam

Disattiva: `caveman uninstall-hook`.

| Emoji | Titolo             | Condizione                             |
| ----- | ------------------ | -------------------------------------- |
| 🎯    | Game-First Striker | 3 commit GAMEPLAY di fila              |
| ✂️    | Ruthless Cutter    | 2+ commit di rimozione negli ultimi 10 |
| 🏔️    | Pillar Diversifier | 3+ pilastri toccati in 5 commit        |
| 🌱    | Fresh Breath       | 1° GAMEPLAY dopo 3+ INFRA di fila      |
| 🧹    | Clean Workspace    | zero file dirty                        |
| 🦴    | Unga Bunga         | gameplay ratio ≥ 60%                   |
| ⚠️    | Docker Addict      | WARN: 5+/10 commit INFRA               |
| 📜    | Wordy Committer    | WARN: 3+ messaggi >80 char             |

## Architettura

```
flint/
├── pyproject.toml          # PEP 735 dependency-groups, ruff strict, mypy strict
├── Makefile
├── README.md
├── CAVEMAN.md              # doc utente veloce
├── DEEP_RESEARCH.md        # scoperte ricerca 2026
├── smoke_test.py
├── .github/workflows/flint-ci.yml  # uv + matrix py3.12/3.13
├── src/caveman/
│   ├── __init__.py
│   ├── __main__.py
│   ├── repo.py             # snapshot repo via git (<100ms)
│   ├── seeds.py            # 50+ seed contestualizzati, 5 categorie
│   ├── engine.py           # decisione + throttling + persistenza
│   └── cli.py              # Typer + Rich, 6 subcomandi
└── tests/
    ├── test_repo.py
    └── test_engine.py
```

## Performance

- Snapshot completo: ~50-100ms su repo tipico
- `frozen dataclass + slots=True` per dati immutabili
- `@functools.cache` su metriche derivate
- Hook post-commit early-exits in <10ms se non serve parlare

## Dev

```bash
make check   # lint + type + test
make test
make lint
make fmt
make type
```

CI GitHub Actions gira su ogni push: ruff + ruff format + mypy + pytest su Python 3.12 e 3.13, più un job "dogfooding" che fa girare `caveman status` sul repo stesso.

## Confronto con tool simili

Dal deep research (aprile 2026):

- **DocWeave** — genera doc da commit. Scope diverso.
- **git-commits-analysis / commits-analyzer** — produttività pura, dashboard. Noi siamo più "compagno di lavoro" che dashboard.
- **prek** (hook manager 2026 in Rust) — alternativa a pre-commit. Caveman può convivere: caveman è un post-commit hook singolo, prek è il gestore globale.

## Filosofia

> 🪨 _caveman non finire gioco. caveman finire turno. domani, altro turno. piano piano, gioco diventare vivo._

Vedi `CAVEMAN.md` per il mantra completo e le 3 domande da farsi ogni venerdì.

## Licenza

MIT.
