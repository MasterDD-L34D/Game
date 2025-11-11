# Proposte merge trait Evo

## Sintesi esecuzione
- Copiati 50 JSON da `incoming/lavoro_da_classificare/traits/` in `data/external/evo/traits/`, verificando corrispondenza tra `trait_code` e nome file.
- Eseguito `python incoming/lavoro_da_classificare/scripts/trait_review.py --input data/external/evo/traits/ --baseline data/core/traits/glossary.json --out reports/evo/traits_anomalies.csv` dopo aver esteso lo script con modalità di confronto `--input/--baseline/--out`.
- Il CSV risultante non evidenzia duplicati con il glossario esistente; tutte le righe marcate con `action=add`.

## Nuovi slug generati
- `rostro_emostatico_litico` ← TR-1101 Rostro Emostatico-Litico
- `scheletro_idraulico_a_pistoni` ← TR-1102 Scheletro Idraulico a Pistoni
- `ipertrofia_muscolare_massiva` ← TR-1103 Ipertrofia Muscolare Massiva
- `ectotermia_dinamica` ← TR-1104 Ectotermia Dinamica
- `organi_sismici_cutanei` ← TR-1105 Organi Sismici Cutanei
- `pelage_idrorepellente_avanzato` ← TR-1201 Pelage Idrorepellente Avanzato
- `scudo_gluteale_cheratinizzato` ← TR-1202 Scudo Gluteale Cheratinizzato
- `articolazioni_multiassiali` ← TR-1203 Articolazioni Multiassiali
- `coda_prensile_muscolare` ← TR-1204 Coda Prensile Muscolare
- `rostro_linguale_prensile` ← TR-1205 Rostro Linguale Prensile
- `ermafroditismo_cronologico` ← TR-1301 Ermafroditismo Cronologico
- `locomozione_miriapode_ibrida` ← TR-1302 Locomozione Miriapode Ibrida
- `estroflessione_gastrica_acida` ← TR-1303 Estroflessione Gastrica Acida
- `artiglio_cinetico_a_urto` ← TR-1304 Artiglio Cinetico a Urto
- `sistemi_chimio_sonici` ← TR-1305 Sistemi Chimio-Sonici
- `scheletro_pneumatico_a_maglie` ← TR-1401 Scheletro Pneumatico a Maglie
- `cinghia_iper_ciliare` ← TR-1402 Cinghia Iper-Ciliare
- `rete_filtro_polmonare` ← TR-1403 Rete Filtro-Polmonare
- `canto_infrasonico_tattico` ← TR-1404 Canto Infrasonico Tattico
- `siero_anti_gelo_naturale` ← TR-1405 Siero Anti-Gelo Naturale
- `zanne_idracida` ← TR-1501 Zanne Idracida
- `seta_conduttiva_elettrica` ← TR-1502 Seta Conduttiva Elettrica
- `articolazioni_a_leva_idraulica` ← TR-1503 Articolazioni a Leva Idraulica
- `filtrazione_osmotica` ← TR-1504 Filtrazione Osmotica
- `occhi_analizzatori_di_tensione` ← TR-1505 Occhi Analizzatori di Tensione
- `membrana_plastica_continua` ← TR-1601 Membrana Plastica Continua
- `flusso_ameboide_controllato` ← TR-1602 Flusso Ameboide Controllato
- `fagocitosi_assorbente` ← TR-1603 Fagocitosi Assorbente
- `moltiplicazione_per_fusione` ← TR-1604 Moltiplicazione per Fusione
- `cisti_di_ibernazione_minerale` ← TR-1605 Cisti di Ibernazione Minerale
- `ali_fono_risonanti` ← TR-1701 Ali Fono-Risonanti
- `cannone_sonico_a_raggio` ← TR-1702 Cannone Sonico a Raggio
- `campo_di_interferenza_acustica` ← TR-1703 Campo di Interferenza Acustica
- `cervello_a_bassa_latenza` ← TR-1704 Cervello a Bassa Latenza
- `occhi_cinetici` ← TR-1705 Occhi Cinetici
- `integumento_bipolare` ← TR-1801 Integumento Bipolare
- `elettromagnete_biologico` ← TR-1802 Elettromagnete Biologico
- `scivolamento_magnetico` ← TR-1803 Scivolamento Magnetico
- `filtro_metallofago` ← TR-1804 Filtro Metallofago
- `bozzolo_magnetico` ← TR-1805 Bozzolo Magnetico
- `vello_di_assorbimento_totale` ← TR-1901 Vello di Assorbimento Totale
- `visione_multi_spettrale_amplificata` ← TR-1902 Visione Multi-Spettrale Amplificata
- `motore_biologico_silenzioso` ← TR-1903 Motore Biologico Silenzioso
- `artigli_ipo_termici` ← TR-1904 Artigli Ipo-Termici
- `comunicazione_fotonica_coda_coda` ← TR-1905 Comunicazione Fotonica Coda-Coda
- `corna_psico_conduttive` ← TR-2001 Corna Psico-Conduttive
- `coscienza_dalveare_diffusa` ← TR-2002 Coscienza d’Alveare Diffusa
- `aura_di_dispersione_mentale` ← TR-2003 Aura di Dispersione Mentale
- `metabolismo_di_condivisione_energetica` ← TR-2004 Metabolismo di Condivisione Energetica
- `unghie_a_micro_adesione` ← TR-2005 Unghie a Micro-Adesione

## Aggiornamenti glossario
- Aggiunti 50 nuovi entry in `data/core/traits/glossary.json` con traduzioni inglesi sintetiche derivate dalla funzione d’uso.
- Ordinamento alfabetico confermato con slug snake_case e timestamp `updated_at` aggiornato.

## Esiti verifica duplicati
- Nessuna collisione con slug o label esistenti nel glossario core.
- `reports/evo/traits_anomalies.csv` conservato come log di revisione con `action=add` per ciascun trait.

## Prossimi passi suggeriti
- Validare le nuove descrizioni nel game design meeting dedicato.
- Pianificare traduzioni estese (lore) in `docs/evo-tactics/` ora che il glossario è completo.
