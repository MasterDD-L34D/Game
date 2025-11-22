# Evo Tactics — TV/d20 (Design + Data)

Tattica cooperativa a turni dove **come giochi** modella **ciò che diventi**.

## Quickstart

### 1) Documentazione
- Apri `docs/00-INDEX.md` (indice navigabile).
- Le appendici contengono i canvas integrali (incolla 1:1 i testi in `/appendici`).

### 2) Dati di gioco
- `data/species.yaml` — Catalogo Specie & Parti (v0.3 esteso, cross-canvas).
- `data/forms.yaml` — 16 Forme Base con innate + pacchetti PI (7 punti).

### 3) Validator
Python:
```bash
python3 tools/py/validate_species.py data/species.yaml
python3 tools/py/validate_forms.py   data/forms.yaml
```

Node/TypeScript:
```bash
cd tools/ts
npm i
npm run validate:species
npm run validate:forms
```

### 4) UI TV (linee guida)
- Mostra budget usato/max; blocca salvataggio se over-budget.
- Evidenzia sinergie attive, counter noti, warning validator.
- Carta Temperamentale + Albero Evolutivo reattivo (telemetria → suggerimenti).

## Struttura
- `/docs`: Design doc scompattato.
- `/appendici`: canvas integrali (testo incollato 1:1).
- `/data`: YAML di gioco (species, forms).
- `/tools`: validator Python/TS + guide.

## Prossimi step consigliati
- Incollare i canvas integrali in `/appendici`.
- Aggiungere `data/jobs.yaml` (alberi Job compatti) e `data/traits.yaml` (separato).
- Integrare generatori NPG/bioma in una toolchain (`tools/gen/*`).

Licenza: WIP.
