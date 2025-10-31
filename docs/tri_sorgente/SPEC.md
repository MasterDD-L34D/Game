# Tri‑Sorgente — SPEC v1

## 1) Tavole di Tiro (Roll)
- **Formato:** YAML con campi `id`, `scope`, `dice`, `entries[]` (peso, label, effetto, tags).
- **Uso:** `roll -> seed -> map_to_cards(pool)`

## 2) Carte (Azione/Reticolo)
- **Formato:** YAML con `id`, `name`, `rank`, `type`, `cost`, `effect`, `tags[]`, `domains[]`, `prereq[]`, `reticolo:{upgrades[], synergies[]}`

## 3) Profili (Enneagram/MBTI)
- **Formato:** YAML con `id`, `axis`, `modifiers:{pool_weights, caps, unlocks, reroll, bans}`, `heuristics`.

## 4) Flusso (Fase: Onboarding/Interludio)
1. Determina **fase** (Onboarding/Interludio).
2. **Profilazione** (breve test o scelta guidata).
3. **Roll** su tavole appropriate alla fase.
4. **Genera pool carte** filtrato+pesato da `seed` e `profilo`.
5. **Draft**: scegli N carte tra M proposte; applica vincoli `caps/unlocks`.
6. **Commit**: registra `card_id[]` nel profilo PG + log mazzo.

## 5) Esempi di vincoli
- **Caps:** max 1 carta "Burst" al 1° Interludio.
- **Unlocks:** Tipo 7 (Ennea) sblocca "Scatto Opportunistico" Tier I.
- **Reroll:** MBTI N consente 1 reroll su tavole "Esplorazione".

## 6) Esempio minimal di schema YAML
```yaml
# TABLES.schema.yaml (conciso)
id: string
scope: [onboarding, interludio, missione]
dice: d100|d20
entries:
  - weight: int
    label: string
    effect: string
    tags: [string] 
```

```yaml
# CARDS.schema.yaml (conciso)
id: string
name: string
rank: I|II|III|IV
type: [azione, reazione, stance, tratto]
cost: {ap?: int, sp?: int}
effect: string
tags: [string]
domains: [combattimento, esplorazione, sociale, craft]
prereq: [string]
reticolo:
  upgrades: [string]
  synergies: [string]
```

```yaml
# PROFILES.schema.yaml (conciso)
id: string # enneagram:1..9 | mbti:INTJ...
axis: [enneagram|mbti]
modifiers:
  pool_weights: {tag: delta} # es. {audacia:+2, cautela:-1}
  caps: {tag: max}
  unlocks: [card_id]
  reroll: [table_id]
  bans: [tag]
heuristics: [string] # regole di scelta preferite
```

