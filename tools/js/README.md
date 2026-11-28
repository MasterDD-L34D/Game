# tools/js — Node CLI Tools

## play.js — Interactive CLI player

Consuma `/api/session/*` e rende grid ASCII + unità con color. Input con sintassi canonica (FRICTION #1 resolution).

### Usage

```bash
# 1. Start backend in another shell
npm run start:api

# 2. Run CLI
node tools/js/play.js

# Custom scenario / URL
node tools/js/play.js --scenario enc_tutorial_02 --url http://localhost:3334

# Via env
PLAY_SCENARIO=enc_tutorial_02 PLAY_URL=http://localhost:3334 node tools/js/play.js
```

### Sintassi input (canonical)

```
<actor_id>: move [x,y]                   # muovi actor a coord
<actor_id>: atk <target_id>              # attacca target
<actor_id>: ability <id> target=<tid>    # usa ability (es. dash_strike)
end                                       # termina turno (SIS agisce)
state                                     # refresh stato
help                                      # mostra comandi
quit                                      # exit
```

Sinonimi:

- `mv` = `move`
- `attack`/`attacca` = `atk`
- `ab` = `ability`
- `fine`/`end-turn` = `end`
- `stato` = `state`
- `q`/`exit` = `quit`

### Esempio sessione

```
> help
...
> p_scout: atk e_nomad_1
━━━ Turn 1 · active: p_scout ━━━
    0  1  2  3  4  5
 5  .  .  .  .  .  .
 4  .  .  .  e_ .  .
 3  .  p_ .  .  .  .
 2  .  p_ .  ☠  .  .
 1  .  .  .  .  .  .
 0  .  .  .  .  .  .

▶ p_scout      PG  10/10   AP 2/3  [1,2] skirmisher
  p_tank       PG  12/12   AP 3/3  [1,3] vanguard
  e_nomad_1    SIS 0/3     AP 2/2  [3,2] skirmisher DEAD
  e_nomad_2    SIS 5/5     AP 2/2  [3,4] skirmisher
> end
⏭  Turno terminato. SIS agisce...
...
> quit
🦴 caveman dire: Master finire turno. ugh bunga.
```

### Color legenda

- `PG` cyan · `SIS` red
- HP: verde ≥60%, giallo 30-60%, rosso <30%
- AP: magenta
- `▶` marker unità attiva
- `☠` unità morta

### Test

```bash
node --test tests/tools/play.test.js
```

21 test (parser + renderer pure functions, no HTTP mock needed).

## validate_encounter_difficulty.js

Vedi commit message del file stesso.
