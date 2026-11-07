# Setup — Third Session (Browser MVP smoke validation)

**Data**: 2026-04-17 (session 3)
**Formato**: agent smoke test automatizzato via curl + Master verification attesa
**Durata**: ~5 min setup + Master manual validation
**Scope**: validazione integrazione frontend browser (sprint α-ε) + backend stack completo

## Contesto

Terzo playtest documentato post-sprint β (animations) + γ (VC debrief) + δ (replay) + ε (SFX). Verifica che l'integrazione browser → backend funzioni end-to-end su stack reale (non mock).

**Scopo smoke**: verificare che Master possa:

1. Avviare backend (`npm run start:api`)
2. Avviare frontend (`npm run play:dev`)
3. Aprire browser http://127.0.0.1:5180
4. Caricare scenario, giocare, terminare → overlay VC → replay

## Smoke test agent-eseguito

```bash
# Backend check
curl -s http://localhost:3334/api/health
# → {"status":"ok","service":"idea-engine"} ✅

# Jobs discovery (ability UI data source)
curl -s http://localhost:3334/api/jobs
# → {"version":"0.1.0","count":7,"jobs":[...]} ✅

# Tutorial scenario (browser auto-start target)
curl -s http://localhost:3334/api/tutorial/enc_tutorial_02
# → scenario complete con units, grid, initiative ✅

# Session flow end-to-end
POST /api/session/start → session_id ✅
POST /api/session/action (attack) → roll/mos/damage_dealt/result ✅
GET /api/session/:id/replay → events array + metadata ✅
```

Tutti endpoint rispondono correttamente.

## Validation attesa Master (manual)

Apri http://127.0.0.1:5180 e verifica:

- [ ] Canvas grid 6×6 visibile con unità cerchi
- [ ] Sidebar lista unità + HP bar
- [ ] Click `p_scout` → ring giallo + ability list appare (dash_strike, ecc.)
- [ ] Click ability `fortify` → esecuzione self-cast, log aggiornato
- [ ] Click ability `dash_strike` → cursor crosshair + border giallo
- [ ] Click enemy durante target mode → execute + damage popup rosso
- [ ] SFX click (`🔊` attivo): hit sound su attack, miss sound su miss
- [ ] Status icon overlay quando panic/rage etc attivi
- [ ] End turno → SIS animation + event log
- [ ] Wipe SIS → overlay "🏆 Vittoria" + VC debrief async (MBTI type visibile)
- [ ] Bottone "Prossimo encounter" → cambia scenario + restart
- [ ] Bottone "📽 Replay" → modal con controls ⏮◀▶▶⏭
- [ ] Replay play-through: unit posizioni aggiornate via events
- [ ] Mute 🔊→🔇: SFX cessano

## Expected outcome

Feature UI completamente wired. Nessun crash su load, navigation, end-game.

Eventuali friction emergenti:

- Log in `notes.md` come FRICTION #8+
- Report bug non fatali ma da pulire (ordine elementi, contrasto, typo)
- Performance fps > 30 su move/attack?

## Grid teorico (enc_tutorial_02 default)

```
    0  1  2  3  4  5
5 . . . . . . .
4 . . . . e_n2 . . .
3 . p_tank . e_hunt . . .
2 . p_scout . . . . .
1 . . . . e_n1 . .
0 . . . . . . .
```

## Obiettivi smoke

1. **Stack completo gira**: backend :3334 + vite :5180, proxy /api works
2. **Ability loop completo**: click unit → ability list → target → execute → damage
3. **End-game loop**: wipe → overlay → retry / next
4. **Replay**: viewer carica payload + scrub
5. **Feedback visivo**: animations + status icons + SFX

Se tutti ✅ → MVP gioco vero completo. Playtest full N+1 può partire.
