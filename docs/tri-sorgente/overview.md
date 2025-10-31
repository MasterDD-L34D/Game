# Tri-Sorgente (Roll + Personalità + Azioni)

**Scopo:** dare 3 scelte + Skip post-scontro minore, guidate da:
- **Roll (Contesto):** bioma/tier -> tabella a dado -> grants carta
- **Personalità:** Enneagram/MBTI -> pesi preferenze
- **Azioni recenti:** telemetria -> affinità carte

## Pipeline (riassunto)
1) Selezione tabella (contesto) → 2) Tiro → 3) Pool R/A/P → 4) Merge → 5) Scoring
→ 6) Diversità/Sinergia → 7) Sampling softmax(T) → 8) Skip con Frammenti Genetici.

## Formula punteggio (per carta c)
```
score(c) = base(c)
+ w_roll*roll_comp + w_pers*pers_comp + w_actions*act_comp
+ w_syn*syn_boost - w_dup*dup_pen - w_excl*excl_pen
```
- `base(c)` per rarità; `roll_comp` se dalla entry centrata/adiacente;
- `pers_comp` somma dei personality_weights compatibili (Enneagram/MBTI);
- `act_comp` somma clampata affinità azioni;
- `syn_boost` se `synergy_tags` ∩ tag dominanti;
- `dup_pen` se oltre max_copies; `excl_pen` per esclusioni hard.

## Motivazioni Design
- **Agency senza overload:** 3 scelte curate + Skip
- **Varianza controllata:** roll + softmax
- **Coerenza build:** ≥1 sinergica garantita
- **Antipower-creep:** cooldown offerte, max_copies, cap FG
