# Art Direction — DRAFT (SUPERSEDED)

> **Bozza promossa** in [`docs/core/41-ART-DIRECTION.md`](../core/41-ART-DIRECTION.md) (sprint M3.6, 2026-04-18). Questo draft resta come reference storica pre-canonicizzazione.
>
> **Non editare questo file** — modifiche devono andare nel canonical doc.

## Scopo

Definire i pilastri visivi di Evo-Tactics: estetica, leggibilità, creature design language e gerarchia visiva UI. Documento di riferimento per chiunque produca asset visivi.

## Pilastri visivi

### 1. Leggibilità tattica (priorità assoluta)

- Ogni unità, terreno e status deve essere **distinguibile a colpo d'occhio** su TV a 3 metri.
- Silhouette > dettaglio: creature riconoscibili dalla forma, non dal colore.
- Griglia sempre visibile. Altezze comunicano con ombre e scale, non solo colore.
- Status visibili come icone sopra la creatura (no tooltip-only).

### 2. Bio-fantastico plausibile

- Creature devono sembrare "possibili in un ecosistema alieno", non magiche.
- Riferimenti: creature abissali reali, insetti, organismi estremofili, biologia convergente.
- No armature metalliche, no vestiti, no oggetti umani. Tutto è biologico.
- Tratti visivamente evidenti: artigli visibili se ha attacco melee, membrane se vola, corazza se tank.

### 3. Ambiente vivo

- Biomi non sono sfondi statici: particelle, movimenti ambientali, cambi luce.
- StressWave visivamente comunicata: terreno che cambia colore/texture, particelle intensificate.
- Contrasto figura/sfondo: creature sempre leggibili contro qualsiasi bioma.

## Palette e mood per bioma

| Bioma             | Palette dominante                         | Mood                 | Luce              |
| ----------------- | ----------------------------------------- | -------------------- | ----------------- |
| Frattura Abissale | Blu profondo, bioluminescenza cyan        | Tensione, mistero    | Bassa, puntiforme |
| Zone Geotermiche  | Arancio/rosso, basalto grigio scuro       | Pericolo, calore     | Calda, dal basso  |
| Correnti Zefiri   | Bianco/azzurro, trasparenze               | Libertà, instabilità | Diffusa, fredda   |
| Foresta Radicale  | Verde scuro, marrone, spore gialle        | Densità, imboscata   | Filtrata, chiazze |
| Hub/Menu          | Neutro scuro, accenti colore bioma attivo | Calma, preparazione  | Controllata       |

## Creature design language

### Principi morfologici

- **Modularità visiva**: parti del corpo (testa, torso, arti, appendici) mix-and-match come il sistema di tratti.
- **Scala di complessità**: creature base = forme semplici, pochi dettagli. Creature evolute = più appendici, texture complesse, bioluminescenza.
- **Job leggibile**: tank = massiccio e largo; DPS = snello e angoloso; support = organico e simmetrico; scout = piccolo e aerodinamico.

### Evoluzione visiva

- Sblocco tratto = cambiamento visivo (nuova appendice, cambio texture, glow).
- Mutazione rara = modifica strutturale evidente (simmetria rotta, colore anomalo).
- VC riflesso: creature giocate in modo aggressivo sviluppano estetica più "predatoria" nel tempo.

## UI visual hierarchy (TV-first)

| Livello     | Elemento                    | Priorità visiva                     |
| ----------- | --------------------------- | ----------------------------------- |
| 1 (massima) | Unità + HP bar              | Sempre visibile, centro schermo     |
| 2           | Terreno griglia + coperture | Layer base, basso contrasto         |
| 3           | Intents/preview azioni      | Overlay temporaneo durante planning |
| 4           | HUD (AP, PT, turno, status) | Bordi schermo, sempre leggibile     |
| 5           | Log testuale                | Laterale, scrollabile, opzionale    |
| 6           | Minimap                     | Angolo, toggle on/off               |

### Font e testo

- Font sans-serif ad alta leggibilità (tipo Inter, Noto Sans).
- Corpo minimo: 24px equivalente su TV 1080p a 3m.
- Numeri danno: grande, bold, colore coded (bianco = base, giallo = critico, rosso = subito).

### Colori funzionali (indipendenti da bioma)

| Funzione         | Colore                 | Note               |
| ---------------- | ---------------------- | ------------------ |
| Alleato          | Blu                    | Outline/highlight  |
| Nemico (Sistema) | Rosso                  | Outline/highlight  |
| Neutro/NPC       | Giallo                 | Reclutabile        |
| Selezione attiva | Bianco bright          | Glow               |
| Zona AoE         | Rosso semi-trasparente | Overlay griglia    |
| Path preview     | Verde/azzurro          | Linea tratteggiata |
| Status negativo  | Rosso icona            | Sopra creatura     |
| Status positivo  | Verde icona            | Sopra creatura     |

## Accessibilità visiva

- Colorblind mode: pattern/shape oltre al colore per ogni distinzione critica.
- High contrast mode: bordi rinforzati, sfondi opacizzati sotto testo.
- Scalabilità font: almeno 3 livelli (S/M/L).
- Nessuna informazione comunicata SOLO con colore.

## Decisione: Pixel Art (confermata 2026-04-16)

**Stile rendering: pixel art** — stile Into the Breach / AncientBeast.

Motivazioni:

- Leggibile su TV a 3m (silhouette chiare a bassa risoluzione).
- Asset producibili da team piccolo (1-2 artisti).
- Coerente con griglia tattica (1 tile = 1 sprite, nessuna ambiguità).
- Tool: **Aseprite** per sprite, **Pyxel Edit** per tileset, export PNG.

### Implicazioni

| Aspetto          | Decisione                                                           |
| ---------------- | ------------------------------------------------------------------- |
| Risoluzione tile | 32×32 o 48×48 (da testare su TV 1080p)                              |
| Animazioni       | Sprite sheet (4-8 frame per azione: idle, walk, attack, hit, death) |
| Palette          | Limitata per bioma (16-32 colori) + colori funzionali universali    |
| Creature evolute | Più frame + dettagli pixel + glow overlay                           |
| Upscaling        | Integer scaling (2x, 3x, 4x) — mai filtri bilineari                 |

## Gap aperti residui

- [ ] Budget asset per creatura: quanti frame per specie base vs evoluta?
- [ ] Risoluzione tile definitiva: 32×32 o 48×48?
- [ ] Reference board: moodboard Aseprite con 3-4 creature prototipo
- [ ] Tileset prototipo per bioma savana (enc_tutorial_01)

## Riferimenti

- `docs/core/30-UI_TV_IDENTITA.md` — UI carte e albero evolutivo
- `docs/core/02-PILASTRI.md` — "tattica leggibile" come pilastro #1
- `draft-target-audience.md` — TV-first, 3 metri di distanza
- `draft-screen-flow.md` — schermate da vestire visivamente
- Chris Taylor GDD Template — sezione Art Bible
