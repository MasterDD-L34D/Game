# Setup — Second Documented Session (Utility AI + Abilities)

**Data**: 2026-04-17 (session 2)
**Formato**: tabletop testuale guidato (agent DM, Master player)
**Seed d20**: 2027 (deterministico)
**Scenario**: `enc_tutorial_02` (Pattuglia Asimmetrica, 2v3)

## Contesto

Playtest #2 post-FRICTION resolutions dal playtest #1 (2026-04-17 session 1). Validazione:

- ✅ FRICTION #2+#3 (AP budget canonico, 2 attack valid)
- ✅ FRICTION #4 (Skirmisher ability discovery via `/api/jobs`)
- 🔴 Utility AI aggressive LIVE su `e_hunter` (prima volta in playtest)
- 🔴 Syntax canonico mosse (proposta FRICTION #1 resolution testata)

**Nota storica**: playtest eseguito manualmente (agent DM). Ability risolte manualmente perché ability executor (`action_type='ability'`) era deferred quando il playtest è iniziato. PR #1499-#1501 hanno wirato l'executor durante la sessione — prossimo playtest potrà usarlo live via API.

## Squadre

**Player (Master controlla)**:

- **p_scout** · dune_stalker · skirmisher · HP 10 · AP 3 · mod +3 · DC 12 · guardia 1 · @ [1,2] · trait: zampe_a_molla
- **p_tank** · dune_stalker · vanguard · HP 12 · AP 3 · mod +2 · DC 13 · guardia 1 · @ [1,3] · trait: pelle_elastomera

**Sistema (agent + AI)**:

- **e_nomad_1** · predoni_nomadi · skirmisher · HP 3 · AP 2 · mod +3 · DC 12 · @ [4,1] · legacy AI
- **e_nomad_2** · predoni_nomadi · skirmisher · HP 3 · AP 2 · mod +3 · DC 12 · @ [4,4] · legacy AI
- **e_hunter** · cacciatore_corazzato · vanguard · HP 6 · AP 2 · mod +2 · DC 13 · @ [3,3] · **ai_profile: aggressive → Utility AI LIVE**

## Grid

6×6 (origin 0,0 basso-sx)

## Initiative

p_scout → p_tank → e_nomad_1 → e_nomad_2 → e_hunter (declarative order)

## Regole attive

- ✅ d20 + mod vs DC (MoS ≥10 crit)
- ✅ AP budget canonico (PR #1491): 3 AP = 3 azioni qualunque
- ✅ Ability manual resolve (pre #1499): DM applica move+atk+move per compound
- ✅ Utility AI aggressive per hunter (retreat_hp_pct=0.15, threshold basso)
- ✅ Taunt: forced target override (status `taunted_by_X`, 1 turn)

## Regole disattivate

- Parata reattiva / PT economy
- MBTI/Ennea (non testato questa sessione)
- Status avanzati (panic/rage/stunned/bleeding)
- Trait attivi (escluso zampe_a_molla, pelle_elastomera come sola flavor)
- Cover/elevation (griglia piatta)

## Sintassi canonica mosse (testata)

```
<actor>: <action> <args>
```

Esempi testati:

- `p_scout: move [2,1]` — move to coord
- `p_scout: atk e_nomad_1` — attack by ID
- `p_scout: ability dash_strike target=e_hunter`
- `p_tank: ability shield_bash target=e_nomad_2`
- `p_tank: ability taunt target=e_hunter`

FRICTION #1 resolution: funziona ma richiede Master memorizzi ability_id. Mitigation: `GET /api/jobs` per discovery.

## Cosa osservare

1. **Utility AI comportamento** vs legacy nomadi (hunter vs nomad_2)
2. **AP budget**: tripla ability/atk mix fluisce o rompe?
3. **Ability manual resolution**: intuitiva o confusa?
4. **Taunt**: forced override legit o sgraziato?
5. **Bilanciamento**: encounter 2v3 vs #1 (2v2) migliore?
