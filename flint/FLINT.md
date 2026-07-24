# 🦴 CAVEMAN.md

> Rituale di lavoro + tool CLI per tenere **Evo-Tactics** sulla rotta giusta.

Questo repo ha un companion CLI chiamato `caveman` che legge lo stato del progetto
e ricorda di **mettere il gioco prima del codice**.

## Quick start

```bash
# Install (una volta)
cd flint && uv tool install .

# Uso manuale
caveman              # parlata contestuale
caveman status       # lettura dello stato del repo
caveman speak -c scope_check  # forza una categoria

# Hook automatico (opt-in, parla solo quando serve)
caveman install-hook
```

## Le 5 categorie di parlata

| Categoria      | Quando                       | Esempio                                                 |
| -------------- | ---------------------------- | ------------------------------------------------------- |
| `micro_sprint` | dopo GAMEPLAY, o molti dirty | _"hai 7 file dirty, committa UNO solo adesso"_          |
| `design_hint`  | repo in deriva               | _"counter visibile PRIMA della mossa, non dopo"_        |
| `mini_game`    | su richiesta, pausa creativa | _"apri Spotify shuffle. prossimo titolo = nuovo trait"_ |
| `evo_twist`    | per playtest guidato         | _"'Regola del 2': gioca con solo 2 specie e 2 job"_     |
| `scope_check`  | se non fatto da un po'       | _"MoSCoW: l'ultima feature è MUST? se no, rimandala"_   |

Esempi: 🎯 Game-First Striker (3 GAMEPLAY di fila), ✂️ Ruthless Cutter
(commit di rimozione), ⚠️ Docker Addict (troppi INFRA), 🦴 Unga Bunga
(gameplay ratio ≥60%).

## Regole del Caveman (valgono anche senza il tool)

1. **Se un bambino non capisce una regola in 30 secondi, la regola è rotta.**
2. **Se l'infra va avanti senza il gioco, il gioco muore.**
3. **Un playtest con post-it batte dieci dashboard.**
4. **Cancellare roba vale più che aggiungerla.**
5. **Un pilastro 🟡 (teorizzato) per troppo tempo diventa 🔴 (bloccato).**
6. **Scope creep = silent killer.** Future creep = suo fratello peggiore.

## 3 domande del venerdì

Se non vuoi usare il tool, ogni venerdì chiediti:

1. **Cosa farebbe il Caveman adesso in 10 minuti?** → prossimo commit
2. **Quale pilastro è più solo questa settimana?** → dove scavare
3. **Se spegnessi Docker per 48 ore, cosa resterebbe del gioco?** → il core

Se rispondere richiede più di 2 minuti, stai lavorando troppo "in alto".

## Stato files

Lo state del caveman vive in `.git/` (non versionato):

- `.git/caveman_state.json` — seed usati di recente (anti-ripetizione)
- `.git/caveman_last_spoke` — timestamp ultima parlata (throttle hook)

Sono file locali, sicuri, rimossi da `git clean -fdx`.

## Disinstallazione

```bash
caveman uninstall-hook
uv tool uninstall flint
rm .git/caveman_state.json .git/caveman_last_spoke
```

---

_File volutamente informale. Non passarlo al linter. Se lo rendi "professionale", perde la sua funzione._
