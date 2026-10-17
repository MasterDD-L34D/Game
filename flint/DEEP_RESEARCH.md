# 🔍 DEEP_RESEARCH.md

> Sintesi della ricerca di aprile 2026 per il progetto `flint`.
> Aggiornato al 17 aprile 2026.

Questo file raccoglie scoperte, fonti e take-aways per informare il design
di `flint` e il workflow su Evo-Tactics. Non è letteratura pura:
solo ciò che ha influenzato scelte concrete.

---

## 1. Tool simili esistenti (cosa c'è già fuori)

### Dev-companion / sentiment / achievements

**GitMood** — _CLI che analizza le emozioni dei tuoi commit_ (devchallenge 2026).

- Sentiment analysis lexicon-based (AFINN), achievements, mood weekly patterns.
- Link: https://dev.to/ohmygod/building-gitmood-a-cli-that-analyzes-your-commit-emotions-with-github-copilot-cli-3lgm
- **Take-away:** ispirazione diretta per `achievements.py`. Abbiamo però ancorato
  gli achievement a **game design** (Game-First Striker, Ruthless Cutter) invece
  che a sentiment, perché per Evo-Tactics conta la rotta, non l'umore.

**DocWeave** — genera doc markdown + mermaid dai commit (GitHub Copilot CLI).

- Pattern interessante: classifica commit → output strutturato.
- Link: https://dev.to/julsr_mx/cli-tool-that-analyzes-git-repos-and-generates-beautiful-documentation-4e47
- **Take-away:** scope diverso, ma la logica di "leggere commit → produrre artefatto"
  è la stessa che applichiamo in `repo.py`.

**Burnout early warning system** (su GitHub topic `git-analytics`).

- Sistema self-hosted che analizza pattern di commit per predire burnout dei dev.
- Link: https://github.com/topics/git-analytics
- **Take-away:** la filosofia "il codice dice come stai" è validata in campo.
  Non l'abbiamo implementata perché fuori scope, ma è una direzione futura.

### Hook managers

**prek** (Rust, 2026) — drop-in replacement per `pre-commit`.

- Single binary, no Python/Node runtime required, multi-language toolchains.
- Link: https://prek.j178.dev/ · https://github.com/j178/prek
- **Take-away:** il nostro caveman è un singolo post-commit hook leggero, non
  in conflitto. Potremmo distribuirlo come hook prek-compatibile in futuro.

**lefthook** / **husky** — alternative leggere più usate in progetti JS/TS.

- Link: https://devtoolbox.dedyn.io/blog/git-hooks-complete-guide
- **Take-away:** il nostro hook è plain bash, compatibile con qualsiasi gestore.

---

## 2. Stack Python 2026 — cosa usare, cosa lasciare

### Astral domina

**uv** (Astral) ha sostituito **pip + poetry + venv + pyenv + pip-tools** in un
singolo Rust binary. 10-100× più veloce, cache condivisa, hard-link, workspaces.

**ruff** (Astral) ha sostituito **flake8 + black + isort + pydocstyle**. 500+
regole, autofix, zero-config, millisecondi invece di secondi.

**ty** (Astral, beta) — nuovo type checker, alternativa a mypy.

**pyx** — registry Python privato di Astral (waitlist).

**News importante (marzo 2026):** Astral è stata acquisita da OpenAI (Codex team).
I tool restano MIT, la community potrà forkare se peggiorano.

- Link: https://www.ismatsamadov.com/blog/uv-ruff-replaced-pip-flake8-black-python-toolchain
- Link: https://docs.astral.sh/uv/guides/tools/
- **Take-away applicato:** `flint` usa uv + ruff strict. CI con
  `astral-sh/setup-uv@v5` e cache su `uv.lock`.

### PEP 735 — `[dependency-groups]`

Nuovo standard 2026 per le dev deps. Sostituisce `optional-dependencies[dev]`.

```toml
[dependency-groups]
dev = ["pytest>=8.3.0", "ruff>=0.8.0", "mypy>=1.13.0"]
```

Installi con: `uv sync --all-groups` o `uv sync --group dev`.

- **Take-away applicato:** `pyproject.toml` usa questa sintassi.

### GitHub Actions pattern 2026

```yaml
- uses: astral-sh/setup-uv@v5
  with:
    enable-cache: true
    cache-dependency-glob: 'uv.lock'
- run: uv sync --all-extras --all-groups
- run: uv run ruff check .
- run: uv run mypy src
- run: uv run pytest
```

- **Take-away applicato:** `.github/workflows/flint-ci.yml` segue questo pattern,
  matrix su Python 3.12 + 3.13, più un job "dogfooding" che fa girare
  `caveman status` sul repo stesso (meta!).

---

## 3. Claude Skills best practices (novembre 2025 – aprile 2026)

### Dalla doc ufficiale Anthropic

- **SKILL.md ≤ 500 righe** per performance ottimale (context window è bene pubblico)
- **Progressive disclosure**: la description nel frontmatter è sempre in context,
  il body si carica solo quando triggera, `references/` solo quando necessario
- **Description "pushy"**: meglio over-triggerare che under-triggerare.
  Esempio: non "How to build a dashboard", ma "How to build a dashboard.
  **Make sure to use this whenever the user mentions dashboards, data viz, metrics,
  or wants to display any kind of data, even if they don't explicitly ask**".

Fonti:

- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

### Vercel evals — finding scomodo

Vercel ha valutato skills e ha trovato che:

- **Skills non triggerano nel 56% dei test cases**, producendo zero improvement su baseline
- **AGENTS.md / CLAUDE.md compresso batte le skills**: docs index embedded direttamente
  nel file di onboarding ha raggiunto 100% pass rate

Link: https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/

**Take-away applicato:** la skill `caveman-mode` v2 è più "pushy" nella description,
e abbiamo duplicato le info critiche in `CAVEMAN.md` del repo così vivono anche
fuori dalla skill (per quando la skill non triggera).

### Pattern Why/What/How per CLAUDE.md

Dalla HumanLayer (autori di Claude Code wrappers):

```markdown
# Project Name

## Why [1-3 frasi]

## What [mappa progetto]

## How [regole sempre attive]

## Progressive Disclosure [puntatori a file specifici]
```

- CLAUDE.md ≤ 100 righe, auto-generati vengono ignorati dall'agent.
- Link: https://www.humanlayer.dev/blog/writing-a-good-claude-md
- **Take-away:** `CAVEMAN.md` del repo segue una versione leggera di questo pattern.

### Self-improving skills (pattern emergente)

Alcuni dev fanno skills che analizzano le sessioni passate ed estraggono pattern
di errore per auto-aggiornare le loro stesse istruzioni. Interessante per futuro,
non implementato nella v0.2.

---

## 4. Game Design — scope creep & future creep

### Scope creep = silent killer (Wayline, UniversityXP, Codecks)

**Scope creep**: aggiunte al progetto che sembrano piccole, ma si accumulano.
**Future creep**: cugino peggiore — codare per utenti/feature che non esistono ancora.

Citazione chiave (Wayline): _"Docker funzionante, CI verde, dashboard bella non
sono progress di game design."_ → ha ispirato il messaggio del nostro design_hint
quando rileviamo streak INFRA ≥3.

**Undertale** come caso studio (Toby Fox): grafica semplice, mondo piccolo,
turni base. **Vincente perché ha tagliato tutto tranne il core.** Citato direttamente
in un seed `design_hint`.

### Frameworks di prioritizzazione

**MoSCoW** (Must/Should/Could/Won't) — semplice, veloce, perfetto per solo dev.
**RICE** (Reach × Impact × Confidence / Effort) — più quantitativo.
**SPACE** (Satisfaction, Performance, Activity, Collaboration, Efficiency) —
framework moderno (Google/GitHub research) per misurare produttività senza
ridurla a LoC/commits.

- Link: https://www.wayline.io/blog/scope-creep-solo-indie-game-development
- Link: https://www.manuelsanchezdev.com/blog/scope-vs-future-creep-game-development
- Link: https://www.codecks.io/blog/2025/how-to-avoid-scope-creep-in-game-development/

**Take-away applicato:** nuova categoria **`scope_check`** con 5 seed basati
esattamente su MoSCoW, RICE, SPACE, scope creep, future creep. Il caveman
propone uno scope check ogni ~6 commit se non ne ha fatto recentemente.

### Saint-Exupéry, citato da mezza industria

> _"La perfezione si raggiunge non quando non c'è più nulla da aggiungere,
> ma quando non c'è più nulla da togliere."_

Usato direttamente come seed `design_hint`. Funziona.

---

## 5. Cosa NON abbiamo implementato (ma lo nota)

Idee valide viste durante la ricerca, rimandate per tenere lo scope stretto:

- **Sentiment analysis sui messaggi di commit** (GitMood style)
- **Report PDF / mermaid diagram** (DocWeave style)
- **Integration con GitHub API per issue metrics** (siamo 100% local-first)
- **Burnout detection** (troppo invasivo per un companion leggero)
- **Self-improving via session analysis** (pattern emergente, ancora immaturo)
- **Prek-compatibility** (utile se flint diventa distribuito)
- **Dashboard web** (vs filosofia "playtest > dashboard")

Scope creep prevention applicato al caveman stesso: cut your darlings.

---

## 6. Risorse consultate (lista completa)

### Python 2026

- https://www.ismatsamadov.com/blog/uv-ruff-replaced-pip-flake8-black-python-toolchain
- https://www.pyinns.com/python/efficient-code/uv-ruff-fastest-python-workflow-2026
- https://docs.astral.sh/uv/guides/tools/
- https://medium.com/@diwasb54/the-2026-golden-path-building-and-publishing-python-packages-with-a-single-tool-uv-b19675e02670
- https://simone-carolini.medium.com/modern-python-code-quality-setup-uv-ruff-and-mypy-8038c6549dcc

### Git hooks / dev tools

- https://prek.j178.dev/
- https://devtoolbox.dedyn.io/blog/git-hooks-complete-guide
- https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
- https://github.com/topics/git-analytics

### Claude skills & CLAUDE.md

- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- https://www.humanlayer.dev/blog/writing-a-good-claude-md
- https://www.groff.dev/blog/implementing-claude-md-agent-skills
- https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/

### Game design (scope, MVP, cut darlings)

- https://www.wayline.io/blog/scope-creep-solo-indie-game-development
- https://www.wayline.io/blog/solo-game-dev-scope-creep-stay-on-track
- https://www.codecks.io/blog/2025/how-to-avoid-scope-creep-in-game-development/
- https://www.universityxp.com/blog/2025/2/13/game-design-constraints-and-scope-creep
- https://www.manuelsanchezdev.com/blog/scope-vs-future-creep-game-development
- https://www.gamedeveloper.com/design/scope-choose-a-target-focus-shoot-
- https://medium.com/@doandaniel/gamedev-protips-how-to-kick-scope-creep-in-the-ass-and-ship-your-indie-game-8fa3051500d1

### Git analytics / companions

- https://dev.to/ohmygod/building-gitmood-a-cli-that-analyzes-your-commit-emotions-with-github-copilot-cli-3lgm
- https://dev.to/julsr_mx/cli-tool-that-analyzes-git-repos-and-generates-beautiful-documentation-4e47
- https://axify.io/blog/git-analytics

---

_Questo file è aggiornato periodicamente. Se vedi che sta invecchiando, apri
una issue o aggiornalo tu — è un documento vivo._
