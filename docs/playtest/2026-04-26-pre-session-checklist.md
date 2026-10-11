---
title: 'Pre-session checklist — demo playtest M11 co-op'
workstream: playtest
category: checklist
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - playtest
  - m11
  - coop
  - demo
  - tkt-m11b-06
related:
  - docs/playtest/2026-04-26-demo-one-command.md
  - docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md
---

# Pre-session checklist — demo playtest co-op

Da eseguire **prima che arrivino gli amici** (~10 min).

## T-30 min · ambiente

- [ ] `git pull origin main` → demo one-tunnel PR mergiata
- [ ] `npm ci` se package.json cambiato
- [ ] `npm run demo` gira → log `[play-static] serving`, `[lobby-ws] shared mode`, `API online`
- [ ] Apri `http://localhost:3334/play/lobby.html` in browser host → UI carica senza errori console
- [ ] Crea stanza test local → codice 4-char visibile
- [ ] Apri 2nd browser Incognito → join stanza con codice → overlay composer compare
- [ ] `Ctrl+C` demo → server chiude pulito

## T-15 min · network

- [ ] `ngrok http 3334` in terminal separato
- [ ] Copia `https://<rand>.ngrok-free.app` → salva in clipboard manager
- [ ] `curl https://<rand>.ngrok-free.app/play/runtime-config.js` → ritorna `window.LOBBY_WS_SAME_ORIGIN=true;`
- [ ] Apri `https://<rand>.ngrok-free.app/play/lobby.html` da phone/rete esterna → UI carica
- [ ] Verifica latenza: ping tunnel <100ms preferibile

## T-10 min · TV/host

- [ ] TV/monitor fullscreen browser (F11)
- [ ] Disabilita notifiche desktop (slack/email/discord)
- [ ] Backup audio: speaker esterni se TV muto
- [ ] Apri tab separato con logs backend (monitor crash)

## T-5 min · playtest

- [ ] Player 1-4 ricevono share URL `https://<rand>.../play/lobby.html?code=XXXX`
- [ ] Ciascun player inserisce nome + click Entra
- [ ] Roster host-side mostra 4 player verdi
- [ ] Host seleziona scenario `enc_tutorial_01` + modulation `quartet`
- [ ] Click "Nuova sessione" → world bootstrap broadcast

## Durante sessione

- [ ] Cronometra RTT primo intent player → broadcast
- [ ] Note bug/confusion real-time (usa bug-report template sottostante)
- [ ] Screenshot momenti chiave (onboarding, combat, fine)
- [ ] Registra audio commenti (opzionale, con consenso)

## Post-sessione

- [ ] Compila `2026-04-XX-playtest-session-report.md` (template in kit)
- [ ] Raccogli form feedback da ciascun player (link `/api/feedback`)
- [ ] Se 3+ round completati senza crash + ≥4 player + fun ≥4/5 → **bump P5 🟢**
- [ ] Update `CLAUDE.md` sprint context + memory file session

## Troubleshooting fast lane

| Sintomo                          | Fix rapido                                           |
| -------------------------------- | ---------------------------------------------------- |
| Player banner `chiuso` subito    | Check ngrok tunnel alive; riavvia `ngrok http 3334`  |
| WS handshake 502 via ngrok       | Account ngrok free limits → riavvia tunnel           |
| Overlay `in attesa dell'host`    | Host click "Nuova sessione"                          |
| Share URL copia `localhost:3334` | Host deve aprire URL ngrok, non locale               |
| Roster player mancanti           | Player deve fare refresh dopo ngrok restart          |
| Backend crash metà sessione      | Salva log → `kill -0 $(pgrep node)` + `npm run demo` |
