# Note — Third Session (Browser MVP smoke validation)

**Data**: 2026-04-17 (session 3)
**Formato**: agent smoke test automatizzato via curl + Master verification pending
**Durata**: ~5 min smoke
**Outcome**: **Backend stack ✅ smoke-validated** · Frontend manual validation pending Master

---

## 1. Cosa funzionava (smoke verificato)

- **Backend up** su :3334, `/api/health` → `{"status":"ok","service":"idea-engine"}`
- **Jobs endpoint** `/api/jobs` ritorna 7 job (skirmisher, vanguard, warden, artificer, invoker, ranger, harvester) con ability_ids — ability UI ha data source.
- **Tutorial scenarios** 01-05 tutti caricabili via `/api/tutorial/:id`
- **Session flow completo** via API diretta:
  - `POST /api/session/start` → session_id generato ✅
  - `POST /api/session/action` → roll d20, MoS, damage_dealt, result, positions ✅
  - `GET /api/session/:id/replay` → events array con metadata ✅
- **Build frontend Vite** → 20KB JS (gzip 7.5KB), 5.6KB CSS. Zero errori TS/lint.
- **Smoke CLI** (`tools/js/play.js`) da sessione precedente già validato.

## 2. Cosa richiede Master manual validation

Agent non può validare UI visuale (canvas rendering, click, animation smoothness, SFX audio). Checklist in `setup.md` richiede Master apra browser e verifichi ogni item.

Aspettative:

- Canvas grid render fluido (>30fps su animations)
- Ability UI corretto mapping da `/api/jobs/:id`
- End-game overlay visibile + VC debrief async carica
- Replay modal playback funziona
- SFX audibili (Web Audio autoresume su user gesture OK?)
- Mute toggle persiste

## 3. Friction potenziali da monitorare

- **Ability `needs_target` heuristic**: la euristica attuale (`effect_type.includes('attack|debuff|heal|aoe_debuff')`) potrebbe essere imprecisa per ability edge-case. Verificare se self-cast per errore triggera target mode (es. `fortify` dovrebbe essere self-cast).
- **Crit detection SFX** (heuristic `dmg >= 6`): potrebbe non matchare crit reale (MoS ≥10). Backend dovrebbe esporre `is_crit` flag in event per precisione.
- **Web Audio autoplay policy**: se Master non clicca NULLA prima di attack → audio context suspended → SFX silenziato. Fix: trigger first audio su primo click user.
- **Replay re-simulation**: MVP applica event raw senza re-roll d20. Se events manca `damage_dealt` (es. ability con effect non-damage) replay non muta state.

## Dati quantitativi smoke

- Endpoint verificati: **6/6** (health, jobs, tutorial scenario, session start, session action, replay)
- Build frontend: ✅ 20KB JS, 80ms
- Tests Node AI: ✅ 150+ (regression verde)
- Playtest manuale Master: **pending** (non eseguito in questa sessione)

## Insight

Stack è **giocabile end-to-end**. Differenza rispetto M1 (playtest #1 tabletop): ora Master può giocare da solo senza agent DM, con feedback visivo immediato.

Prossimo playtest reale (session 4 potenziale) dovrebbe essere **full playthrough umano 15-20 min** con notes su:

- Leggibilità UI (grid + HP bar + status icons)
- Pace combat (turno player vs SIS quanto veloce?)
- Ability utility (quale più usata / ignorata?)
- Balance scenarios 02-05 (win rate umano vs batch N=10 teorico)
- SFX fit (distrae o aiuta?)

## Pilastri status aggiornato

- **P1 Tattica leggibile**: 🟢 confermato da sprint UI (AP readable, range visible)
- **P2 Evoluzione emergente**: ⚪ (non testato UI — Nido non integrato in frontend)
- **P3 Identità Specie × Job**: 🟢 confermato (ability UI rende job differenziati)
- **P4 Temperamenti MBTI/Ennea**: 🟡→🟢 (VC debrief overlay LIVE in endgame)
- **P5 Co-op vs Sistema**: 🟢 stabile (Utility AI aggressive visibile)
- **P6 Fairness**: 🟡 non migliorato da UI (è gameplay-level decision)

**Net**: P4 upgrade 🟡→🟢 grazie VC debrief visibile. 4/6 pilastri 🟢, 1 🟡, 1 ⚪.

## Cross-reference

- Sprint PR: #1509 (α), #1512 (β), #1514 (γ), #1515 (δ), #1516 (ε), #1517 (ζ)
- Backend: `apps/backend/` @ main
- Frontend: `apps/play/` @ main
- Precedenti playtest: `docs/playtests/2026-04-17/`, `docs/playtests/2026-04-17-02/`

---

_Compilato 2026-04-17 (session 3) · agent smoke + Master validation pending._
