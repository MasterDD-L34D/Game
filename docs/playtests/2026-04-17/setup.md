# Setup — First Documented Session

**Data**: 2026-04-17
**Formato**: single-player (Master vs Master, 2 squadre controllate)
**Durata stimata**: 30-45 min partita + 10 min note
**Griglia**: 8×8 (compatibile `enc_tutorial_01.yaml`)

## Scelta setup (compatibile RESEARCH_TODO M1: 2 specie + 1 bioma + 1 job)

### Bioma: Savana

- Fonte: `data/core/biomes.yaml` § savana
- Motivo: bioma di partenza tutorial, meccaniche basilari, nessun hazard complesso, nessun FoW

### Job: Skirmisher (Schermidore)

- Fonte: `data/core/jobs.yaml` § skirmisher
- Ruolo: damage mobile, hit-and-run
- Motivo: primo job insegnato, meno regole reattive (rimandate a playtest futuri)
- Ability R1: movimento + attacco nello stesso turno

### Specie (2)

**Squadra A (controllata PG)**

- **Predone Nomade** × 2 — baseline da `enc_tutorial_01.yaml`
  - HP 10, AP 2, attack_range 2
  - Trait: nessuno (base)

**Squadra B (controllata da Master come "Sistema")**

- **Echo Wing** × 1 + **Dune Stalker** × 1 — da `packs/evo_tactics_pack/data/species/badlands/`
  - Echo Wing: volante, skirmish, trait leggero
  - Dune Stalker: melee, corazza leggera
  - Asimmetria intenzionale: 2 vs 2 ma tratti diversi

## Regole in uso

1. **d20** per attacchi: `d20 + bonus vs CD`
2. **MoS** (Margin of Success): ≥10 = critico, danno ×2
3. **Movement**: massimo 3 celle/turno (AP 2 = 1 move + 1 attack, oppure 2 move)
4. **Parata reattiva**: 1 PT, ignora se troppo complesso al primo turno
5. **Fine partita**: wipe di una squadra o 12 turni elapsed

## Setup fisico suggerito

- Foglio A4 con griglia 8×8 disegnata a matita
- 4 monete / post-it / miniature come segnalini unità
- Dado d20 fisico (o tiratore random da telefono)
- Block-notes per tracciare HP/PT durante la partita

## Cosa osservare durante la partita

(Queste sono le 3 domande a cui rispondere in `notes.md`.)

1. **Cosa funzionava?** → regole chiare, momenti di decisione interessanti
2. **Cosa era confuso in <30 secondi?** → regole che ho dovuto rileggere
3. **Cosa ho tagliato mentalmente?** → regole che ho saltato perché troppo pesanti

## Post-game checklist

- [ ] Foto del setup/campo finale in `setup.jpg`
- [ ] `notes.md` compilato (entro 10 min dalla fine)
- [ ] Aggiornato `docs/playtests/README.md` tabella index
- [ ] Commit `playtest: [2026-04-17] first documented session`
- [ ] Spunta checkbox M1 in `RESEARCH_TODO.md` → `[x]`
- [ ] `caveman achievements` per celebrare

## Fonti referenziate

- `docs/core/01-VISIONE.md`
- `docs/core/02-PILASTRI.md` (§1 Tattica leggibile)
- `data/core/jobs.yaml` (skirmisher)
- `data/core/biomes.yaml` (savana)
- `docs/planning/encounters/enc_tutorial_01.yaml` (baseline unità)
- `packs/evo_tactics_pack/data/species/badlands/` (echo wing, dune stalker)
