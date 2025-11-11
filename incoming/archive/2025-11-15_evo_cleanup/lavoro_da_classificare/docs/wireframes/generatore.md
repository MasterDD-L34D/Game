# Wireframe — Generatore (v1)

## URL
- /generatore
- /generatore/preset/<nome>
- /generatore?bioma=desert&ruolo=harvester&rank=r2
- /generatore/risultato/<id>

## Step UX
1) Preset (o vuoto)
2) Vincoli (bioma/ruolo/rank)
3) Sinergie (morph/traits compatibili)
4) Riepilogo (stats, tag, costi)
5) Export (json/pdf)

## Componenti
- Sidebar progress (stepper)
- Preview live a destra (sticky)
- Callout “Apri nel Generatore” su ogni entità (bestiario/morph/ruoli/tratti)

## Accettazione
- share URL con parametri
- export JSON valido (con schema)
- tempo generazione < 2s su dataset standard
