# Trait Reference Manual (SSoT)

Questo file rappresenta il punto di ingresso unico per il manuale dei tratti. Il contenuto esteso rimane nei capitoli già presenti in `docs/traits-manuale/`.

## Struttura del manuale

- [01 — Introduzione](traits-manuale/01-introduzione.md)
- [02 — Modello dati](traits-manuale/02-modello-dati.md)
- [03 — Tassonomia famiglie](traits-manuale/03-tassonomia-famiglie.md)
- [04 — Collegamenti cross-dataset](traits-manuale/04-collegamenti-cross-dataset.md)
- [05 — Workflow e strumenti](traits-manuale/05-workflow-strumenti.md)
- [06 — Standalone Trait Editor](traits-manuale/06-standalone-trait-editor.md)
- [README del manuale](traits-manuale/README.md)

### Nuovi trait ambientali – Frattura Abissale Sinaptica

- fotofase_synaptic_ridge: core [coralli_sinaptici_fotofase, membrane_fotoconvoglianti, nodi_sinaptici_superficiali, impulsi_bioluminescenti]; support [filamenti_guidalampo, sensori_planctonici, squame_diffusori_ionici].
- crepuscolo_synapse_bloom: core [nebbia_mnesica, lobi_risonanti_crepuscolo, placca_diffusione_foschia, spicole_canalizzatrici]; support [secrezioni_antistatiche, organi_metacronici, ghiandole_mnemoniche].
- frattura_void_choir: core [camere_risonanza_abyssal, corazze_ferro_magnetico, bioantenne_gravitiche, emettitori_voidsong]; support [emolinfa_conducente, placche_pressioniche, filamenti_echo].

### Trait temporanei – Correnti Elettroluminescenti

- scintilla_sinaptica (temp): +1 priorità reazioni, +5% crit elettrico, durata 2, stack 2.
- riverbero_memetico (temp): duplica prossimo buff al 50%, -10% difesa mentale, durata 1, stack 1, no duplicazione canto/pelle.
- pelle_piezo_satura (temp): -15% danni fisici, 5 danni elettrici da contatto, durata 3, stack 1.
- canto_risonante (temp): vantaggio concentrazione, -0.02 stress incoming, durata 2, stack 1.
- vortice_nera_flash (temp): teletrasporto breve + azzeramento minaccia, +5 stress, durata 1, stack 1.

## Note operative

- Il manuale resta suddiviso in capitoli per compatibilità con le referenze storiche; questo indice fornisce il percorso canonico richiesto dalla struttura SSoT.
- I riferimenti allo schema dei tratti e alle pipeline di validazione rimandano ai file in `packs/evo_tactics_pack/docs/catalog/` e agli script in `tools/py/`.
- Per modifiche a slug/id o allo schema di template coordinarsi con il Trait Curator; per collegamenti specie-trait e requisiti ambientali rimandare rispettivamente a Species Curator e Biome & Ecosystem Curator.
