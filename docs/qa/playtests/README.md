# Playtest Log

Directory canonica per **playtest fisici documentati** di Evo-Tactics.

Ogni playtest vive in una sottocartella `YYYY-MM-DD/` e deve contenere:

1. **`setup.md`** — specie + bioma + job scelti, compilato PRIMA della partita
2. **`notes.md`** — 3 sezioni compilate DOPO la partita:
   - Cosa funzionava
   - Cosa era confuso in <30 secondi
   - Cosa hai tagliato mentalmente durante la partita
3. **`setup.jpg`** (opzionale ma raccomandato) — foto del setup fisico: griglia, segnalini, riferimenti a portata

Dopo aver compilato tutto, commit con messaggio:

```
playtest: [YYYY-MM-DD] first documented session
```

(oppure descrittore specifico per playtest successivi: `playtest: [data] boss encounter feedback`, ecc.)

## Perché

Dal deep research (RESEARCH*TODO M1): *"nessun playtest documentato" è il red flag principale. Wayline e UniversityXP sono unanimi: senza playtest reali, il design è un'ipotesi.\_

Un **playtest con post-it batte dieci dashboard** (Caveman Rule #3).

## Anti-regola

- Non validare playtest via test automatici come proxy (sono un'altra cosa)
- Non tagliare sezioni di `notes.md` — anche "cosa era confuso" deve essere scritto, soprattutto se sembra banale
- Non rimandare la compilazione note a "dopo": si scrive subito, entro 10 min dalla fine partita, altrimenti si perde il ricordo

## Index playtest storici

_(vuoto: questo è il primo setup. Aggiorna qui dopo ogni playtest chiuso.)_

| Data          | Titolo                                                     | Outcome                                              | Commit     |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------------- | ---------- |
| 2026-04-17    | First documented session (tabletop guidato)                | WIN PG R3 · 4 frictions                              | _a92f9a14_ |
| 2026-04-17-02 | Utility AI + abilities (tabletop, enc_tutorial_02)         | WIN PG R2 · 3 new frictions + P1/P3/P5 upgrade 🟡→🟢 | _08da5dc2_ |
| 2026-04-17-03 | Browser MVP smoke validation (agent curl + Master pending) | Backend 6/6 endpoints ✅ · P4 upgrade 🟡→🟢          | _TBD_      |
