---
title: Skiv Playtest Launcher — Windows one-click guide
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: true
language: it
review_cycle_days: 30
tags: [skiv, launcher, windows, playtest]
---

# Skiv Playtest Launcher

> **Goal**: zero PowerShell mistakes — un click avvia tutto il setup playtest Skiv.

## Quick start (Windows)

### Opzione A — Doppio-click `.cmd` (Windows classico)

1. Vai a `C:\Users\VGit\Desktop\Game\`
2. **Doppio-click** `start-skiv-playtest.cmd`
3. Aspetta ~15s → browser apre `http://localhost:5180`
4. Click 🦎 Skiv overlay → playtest pronto

### Opzione B — Right-click `.ps1` (PowerShell modern + colors)

1. Vai a `C:\Users\VGit\Desktop\Game\`
2. **Right-click** `start-skiv-playtest.ps1` → **Run with PowerShell**
3. Se chiede execution policy: rispondi `Y` (run-once bypass)
4. Aspetta ~15s → browser apre

### Opzione C — Da terminale

```powershell
cd C:\Users\VGit\Desktop\Game
.\start-skiv-playtest.cmd
# OR
pwsh -ExecutionPolicy Bypass -File start-skiv-playtest.ps1
```

## Cosa fa il launcher

| Step | Azione                                                   | Tempo     |
| ---- | -------------------------------------------------------- | --------- |
| 1    | Preflight check (node, npm, python, gh CLI)              | <1s       |
| 2    | Backfill Skiv state da GitHub events (skip se state <1h) | 30-90s    |
| 3    | Start backend `:3334` in nuova finestra cmd              | ~10s boot |
| 4    | Health probe `/api/skiv/status` (max 20s wait)           | 1-20s     |
| 5    | Start frontend Vite `:5180` in nuova finestra cmd        | ~5s       |
| 6    | Mostra LAN IP per phone clients                          | instant   |
| 7    | Apre browser `http://localhost:5180`                     | instant   |

## Requisiti

- **Node 22+** (`node --version` >= 22.0)
- **Python 3.10+** (`python --version` >= 3.10)
- **gh CLI** installato + autenticato (`gh auth status`)
- Dependencies installate:
  ```powershell
  npm ci
  pip install -r tools/py/requirements.txt
  ```

## Test checklist (post-launch)

Click bottone 🦎 Skiv in header browser, verifica:

- [ ] Sprite SVG/PNG 5 fasi visibili (sprite-frame ocra glow)
- [ ] Status chip `Lv 4 · Predatore Maturo · ts`
- [ ] Phase progression bar 5-cell con current "Predatore Maturo" highlight
- [ ] Next gate panel: `Manca Lv 6 · 2 mutazioni · 3 pensieri · polarità`
- [ ] Bond hearts: `vega ♥♥♥ rhodo ♥♥`
- [ ] Feed eventi recenti scroll (8 ultimi)
- [ ] Digest box italic gold border (se settimanale presente)
- [ ] Responsive: riduci finestra 400px → mobile layout ok

## Phone clients (multi-amici)

Stesso laptop = host. Phone amici:

1. Stessa rete WiFi
2. Apri browser phone su URL LAN mostrato dal launcher (es. `http://192.168.1.42:5180/lobby.html`)
3. Inserisci 4-letter code dalla lobby host

## Stop

Chiudi finestre titolate:

- "Skiv Backend :3334" → ferma backend
- "Skiv Frontend :5180" → ferma Vite

Oppure `Ctrl+C` in ognuna.

## Troubleshooting

### `gh CLI not authenticated`

```powershell
gh auth login
# Browser flow → autenticazione GitHub
```

### `python not in PATH`

Reinstall Python 3.10+ con flag "Add to PATH" durante setup.

### `npm dependencies missing`

```powershell
npm ci
cd apps/backend
npm ci
cd ../play
npm ci
```

### Backend non risponde dopo 20s

Apri manualmente finestra "Skiv Backend" → leggi log errori. Tipici:

- Port `:3334` già occupato → kill processo (`netstat -ano | findstr :3334`)
- Database error → controlla `DATABASE_URL` env (default NeDB OK)

### Browser apre pagina vuota

Aspetta altri 5-10s — Vite warm boot. Refresh pagina.

### Skiv overlay non appare

Console browser (F12) → cerca errori JS. Riferisci a [docs/skiv/CANONICAL.md](CANONICAL.md).

## Cross-references

- Persona: [docs/skiv/CANONICAL.md](CANONICAL.md)
- Live monitor: [docs/skiv/MONITOR.md](MONITOR.md)
- ADR: [docs/adr/ADR-2026-04-25-skiv-as-monitor.md](../adr/ADR-2026-04-25-skiv-as-monitor.md)
- Plan: [docs/planning/2026-04-25-skiv-monitor-plan.md](../planning/2026-04-25-skiv-monitor-plan.md)

🦎 _Sabbia segue. Doppio-click. Skiv vive._
