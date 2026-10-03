---
title: Claude Code P1 Skills Install Guide — MCP + Plugin
workstream: cross-cutting
status: draft
owners:
  - eduardo
created: 2026-04-24
tags:
  - claude-code
  - mcp
  - plugins
  - setup
  - p1-tooling
summary: >
  Step-by-step install guide per i top 5 skills/plugin/MCP server P0 identificati
  in docs/planning/2026-04-24-claude-skills-shopping-list.md. Non esegue install
  automatico — richiede tua approvazione per ogni step (settings.json modify,
  token auth, plugin marketplace interaction).
---

# Claude Code P1 Skills — Install Guide

**Scope**: install 5 MCP server + plugin identificati come **P0** (install first) dalla shopping list. Ogni step richiede **tua** approvazione esplicita per via della natura persistente dei settings.

**Pre-requisito**: Claude Code CLI configurato, `gh auth login` già fatto.

---

## Top 5 P0 da installare (ordine raccomandato)

|  #  | Nome                                      | Tipo   | Install command                                  | Auth           | Tempo  | Priorità |
| :-: | ----------------------------------------- | ------ | ------------------------------------------------ | -------------- | :----: | :------: |
|  1  | `@modelcontextprotocol/server-filesystem` | MCP    | `npx -y @modelcontextprotocol/server-filesystem` | scope path     | 5 min  |    P0    |
|  2  | `@modelcontextprotocol/server-git`        | MCP    | `uvx mcp-server-git`                             | repo path      | 5 min  |    P0    |
|  3  | `@modelcontextprotocol/server-github`     | MCP    | `npx -y @modelcontextprotocol/server-github`     | `GITHUB_TOKEN` | 10 min |    P0    |
|  4  | `superpowers` (obra) plugin               | Plugin | `/plugin install superpowers`                    | none           | 5 min  |    P0    |
|  5  | `serena` (oraios) MCP                     | MCP    | `uvx serena-mcp-server`                          | project path   | 10 min |    P0    |

**Total setup time**: ~35 min. Tutti sono additivi, reversibili (rimuovi dal `.mcp.json` o `/plugin uninstall`).

---

## Step 1 — `@modelcontextprotocol/server-filesystem`

**Cosa fa**: read/write/edit/search file locali con scope directory-limited (sicuro).

**Perché**: baseline per workflow agentico su monorepo polyglot. Scope-limited previene accidental modification fuori repo.

**Install**:

Crea/aggiorna `.mcp.json` al **root del progetto** (NON commit — è configurazione locale):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:/Users/edusc/Desktop/gioco/Game"]
    }
  }
}
```

**Aggiungi a `.gitignore`** (se non già fatto):

```gitignore
.mcp.json
```

**Restart Claude Code** per caricare il server.

**Verifica**: in una nuova sessione Claude Code, prova prompt "list files in apps/backend/services/coop/" — deve usare il nuovo tool filesystem invece di Bash.

---

## Step 2 — `@modelcontextprotocol/server-git`

**Cosa fa**: git read/search/blame/log tool senza shell overhead.

**Perché**: diff semantico per review pre-PR + "chi ha introdotto X" rapido su 1700+ PR.

**Install** (aggiungi a `.mcp.json` Step 1):

```json
{
  "mcpServers": {
    "filesystem": { ... },
    "git": {
      "command": "uvx",
      "args": [
        "mcp-server-git",
        "--repository",
        "C:/Users/edusc/Desktop/gioco/Game"
      ]
    }
  }
}
```

**Pre-requisito**: `uvx` installato (`pip install uv` o `winget install astral-sh.uv`).

**Verifica**: prompt "who introduced function X in session.js?" — usa git blame semantico.

---

## Step 3 — `@modelcontextprotocol/server-github`

**Cosa fa**: GitHub API (issues, PRs, releases) tramite MCP invece di `gh` CLI.

**Perché**: batch operations (list all open issues with label X), workflow semantico (suggest PR review).

**Install**:

1. **Genera GitHub token** con scope `repo` + `read:org`: https://github.com/settings/tokens/new
2. Aggiungi a `~/.bashrc` o `.env`:
   ```bash
   export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
   ```
3. Aggiungi a `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
         }
       }
     }
   }
   ```

**Security check**: NON committare `.mcp.json` se contiene token in chiaro. Usa env var reference `${GITHUB_TOKEN}`.

**Verifica**: prompt "list open issues labeled 'bug'" — deve usare MCP GitHub.

---

## Step 4 — `superpowers` plugin (Jesse Vincent / obra)

**Cosa fa**: 14 skill agentici che impongono disciplina clarify → design → plan → code → verify. Riduce token ~14% media, 40-60% su refactor multi-file.

**Perché**: matcha perfettamente il nostro sprint workflow (M11/M12/M13 multi-branch parallelo).

**Install**:

```
/plugin install superpowers
```

(dentro Claude Code CLI, invocato come slash command).

**Source**: https://github.com/obra/superpowers

**Restart** Claude Code per caricare.

**Verifica**: `/help` deve mostrare nuove skill prefixate `superpowers:*`.

---

## Step 5 — `serena` MCP (oraios)

**Cosa fa**: semantic code retrieval + persistent memory cross-session su monorepo large (700K+ LOC).

**Perché**: single biggest token optimization per un monorepo polyglotta. Salva token rispetto a `grep + Read` batch.

**Install**:

1. **Pre-requisito**: `uvx` installato (Step 2)
2. Aggiungi a `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "serena": {
         "command": "uvx",
         "args": [
           "--from",
           "git+https://github.com/oraios/serena",
           "serena-mcp-server",
           "--project",
           "C:/Users/edusc/Desktop/gioco/Game"
         ]
       }
     }
   }
   ```

**Source**: https://github.com/oraios/serena

**Verifica**: prompt "find all places that reference phaseMachine" — deve usare semantic retrieval (più preciso di grep).

---

## Reference: `.mcp.json` completo (tutti e 5)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:/Users/edusc/Desktop/gioco/Game"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "C:/Users/edusc/Desktop/gioco/Game"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "serena": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena-mcp-server",
        "--project",
        "C:/Users/edusc/Desktop/gioco/Game"
      ]
    }
  }
}
```

`superpowers` NON è nel `.mcp.json` — è un plugin installato via `/plugin install`.

---

## Post-install smoke test

Dopo tutti e 5 gli install, verifica con una sessione Claude Code:

1. Prompt: "list all files in apps/backend/services/coop/ and show me the first 20 lines of coopOrchestrator.js"
   - Deve usare `filesystem:list_directory` + `filesystem:read_text_file`, NON Bash
2. Prompt: "what's the last 5 commits affecting coopOrchestrator.js?"
   - Deve usare `git:log`, NON Bash
3. Prompt: "find all files that reference the PHASES constant"
   - Deve usare `serena:find_symbol`, NON Grep
4. Prompt: "/plugin list"
   - Deve mostrare `superpowers` installato

Se tutti e 4 passano → P1 install **COMPLETO**, ambient Claude Code potenziato ~30% efficienza.

---

## Rollback

**Per MCP server** (filesystem/git/github/serena):

- Rimuovi entry dal `.mcp.json`
- Restart Claude Code

**Per superpowers plugin**:

- `/plugin uninstall superpowers`

**Zero effetti collaterali**: non tocca repo, non tocca dependencies, non tocca test. Completamente reversibile.

---

## Riferimenti

- Shopping list completa: `docs/planning/2026-04-24-claude-skills-shopping-list.md`
- MCP docs: https://modelcontextprotocol.io/
- `superpowers` source: https://github.com/obra/superpowers
- `serena` source: https://github.com/oraios/serena

## Deferred (P1 future session)

- `Game Balance & Economy Tuning` skill (mcpmarket.com) — da install separato post playtest round 2
- `wshobson/agents` mega-bundle — cherry-pick non bulk
- Prettier + lint-staged pre-commit hooks aggiuntivi (via skill `update-config`)
