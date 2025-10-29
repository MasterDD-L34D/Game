# Web Handoff · Foodweb Archetypes 2025-11-05

Questa nota supporta il passaggio di consegne verso il team web/UI dopo il
ciclo di bilanciamento dedicato agli archetipi `ruolo_trofico × biome_class`.
La documentazione integra la matrice `docs/catalog/species_trait_matrix.json` e
il mock-up rapido `docs/catalog/mockups/foodweb_roles.yaml`.

## Nuove coppie ruolo × bioma

| Ruolo trofico | Bioma | Specie giocabile | Specie ambientale | Tratti firma |
| --- | --- | --- | --- | --- |
| Predatore terziario apex | dorsale_termale_tropicale | magneto-ridge-hunter | slag-veil-ambusher | coda_frusta_cinetica · scheletro_idro_regolante · artigli_sette_vie |
| Ingegneri ecosistema | foresta_miceliale | myco-spire-warden | glowcap-weaver | filamenti_digestivi_compattanti · empatia_coordinativa · struttura_elastica_amorfa |
| Dispersore ponte | mezzanotte_orbitale | aurora-bridge-runner | zephyr-spore-courier | sacche_galleggianti_ascensoriali · mimetismo_cromatico_passivo · eco_interno_riflesso |

### Implicazioni UI

- **Catalogo specie**: esporre badge “foodweb ready” quando il conteggio nel
  nuovo report `foodweb_coverage` rispetta la soglia ≥2 specie/bioma/ruolo.
- **Schede trait**: evidenziare i tratti firma sopra elencati con tag “core
  foodweb” per favorire la lettura rapida negli strumenti di deckbuilding.
- **Telemetria live**: sincronizzare il widget playtest con il nuovo campo
  `playable_count` per separare fauna controllabile da quella ambientale.

## QA & Telemetria

- Il report `data/derived/analysis/trait_coverage_report.json` espone ora la sezione
  `foodweb_coverage` con soglia esplicita `species_per_role_biome = 2`.
- Durante i playtest settimanali registrare i difetti di copertura direttamente
  in `logs/web_status.md` (sezione web_log). Evidenziare biomi che non raggiungono
  la soglia prima di introdurre un nuovo archetipo.
- In caso di regressioni, ri-eseguire `python tools/py/report_trait_coverage.py`
  per aggiornare la matrice e allegare il diff al recap web.

## Suggerimenti di follow-up

1. Generare concept art rapidi per i tre archetipi per allineare marketing e UI.
2. Integrare i nuovi badge “foodweb ready” nel design system (`public/ui-kit`).
3. Estendere la checklist QA con un passo dedicato alla verifica delle soglie
   per ruolo/bioma, usando i conteggi di `foodweb_coverage`.
