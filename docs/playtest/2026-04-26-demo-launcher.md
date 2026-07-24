---
title: 'Demo launcher 1-click — setup ngrok + desktop shortcut'
workstream: playtest
category: playbook
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - launcher
  - demo
  - ngrok
  - windows
related:
  - docs/playtest/2026-04-26-demo-one-command.md
---

# Demo launcher 1-click

Zero terminali. Doppio clic icona Desktop → backend + ngrok + URL amici.

## Setup one-time

1. Installa ngrok: https://ngrok.com/download
2. Account ngrok free: https://dashboard.ngrok.com/signup
3. Authtoken: https://dashboard.ngrok.com/get-started/your-authtoken → copia
4. PowerShell:
   ```powershell
   ngrok config add-authtoken <TOKEN>
   ```

## Crea shortcut Desktop

**Opzione A**: copia `Evo-Tactics-Demo.bat` sul Desktop. Doppio clic = go.

**Opzione B** (shortcut vero):

1. Tasto destro Desktop → Nuovo → **Collegamento**
2. Percorso: `C:\Users\VGit\Desktop\Game\Evo-Tactics-Demo.bat`
3. Nome: `Evo-Tactics Demo`
4. Icona custom: tasto destro → Proprietà → Cambia icona

## Uso quotidiano

1. Doppio clic `Evo-Tactics-Demo` sul Desktop
2. Attendi ~15-30s setup (prima volta builda frontend, poi istantaneo)
3. Banner ASCII grande stampa URL tipo:

   ```
   ========================================================================
     🦴 EVO-TACTICS DEMO LIVE

     Host (tu): https://abcd.ngrok-free.dev/play/lobby.html
     Share amici: https://abcd.ngrok-free.dev/play/lobby.html
   ========================================================================
   ```

4. Copia URL → share WhatsApp/Discord amici
5. Tu entri come host, amici come player con codice 4-letter
6. Fine playtest: `Ctrl+C` nella finestra = stop tutto

## Troubleshooting

| Sintomo                          | Fix                                             |
| -------------------------------- | ----------------------------------------------- |
| `ngrok non trovato`              | Installa da ngrok.com, riavvia PowerShell dopo  |
| `Impossibile recuperare URL` 90s | Controlla http://localhost:4040 dashboard ngrok |
| Build `play` fail al primo run   | Verifica `npm ci` fatto almeno una volta        |
| Amici vedono warning page ngrok  | Click `Visit site`, normale per free tier       |

## Limiti ngrok free

- URL cambia ogni restart
- Max 40 connessioni/min (OK per 4-8 player)
- Tunnel muore se spegni laptop

## Alternative

- Script equivalente: `npm run demo:tunnel` da terminale
- Stack cloud stabile: Render + CF Pages (ADR-2026-04-26), URL fisso 24/7

## Note security

- Token ngrok è personal — mai commitare in repo. `~/.ngrok2/ngrok.yml` lo tiene.
- Lobby state `*` CORS = OK per demo playtest. Tighten in prod.
