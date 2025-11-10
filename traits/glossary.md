# Glossario trait – consolidamento TRT-02

Questo documento raccoglie i risultati del controllo duplicati (`TRT-01`) e
normalizza i cinquanta nuovi trait consegnati nel pacchetto
`incoming/lavoro_da_classificare/traits`. I dati sono stati nuovamente
verificati con lo script [`traits/scripts/audit_duplicates.py`](scripts/audit_duplicates.py)
e riassunti per agevolare l'integrazione nel glossario canonico.

## Sintesi audit duplicati (TRT-01)

- **Comando eseguito**: `python traits/scripts/audit_duplicates.py`
- **Data ultima esecuzione**: 2025-11-10T19:30:29Z (UTC)
- **Esito**: nessun gruppo di etichette duplicate individuato.
- **Output strutturato**: `reports/traits/duplicates.csv` (solo intestazione,
  nessuna riga di conflitto).

## Copertura del dataset

| Tier | Conteggio |
| --- | --- |
| T3 | 26 |
| T2 | 14 |
| T4 | 10 |

| Fattore energetico | Conteggio |
| --- | --- |
| Medio | 24 |
| Basso | 22 |
| Alto | 4 |

| Famiglia | Conteggio |
| --- | --- |
| Locomotivo/Terrestre | 7 |
| Cognitivo/Sociale | 3 |
| Difensivo/Camuffamento | 3 |
| Fisiologico/Metabolico | 3 |
| Offensivo/Controllo | 3 |
| Sensoriale/Visivo | 3 |
| Alimentazione/Digestione | 2 |
| Difensivo/Resistenze | 2 |
| Fisiologico/Termico | 2 |
| Locomotivo/Arboricolo | 2 |
| Offensivo/Chimico | 2 |
| Offensivo/Elettrico | 2 |
| Riproduttivo/Cicli | 2 |
| Cognitivo/Apprendimento | 1 |
| Difensivo/Corazza | 1 |
| Difensivo/Termoregolazione | 1 |
| Fisiologico/Idrico | 1 |
| Fisiologico/Respiratorio | 1 |
| Locomotivo/Aereo | 1 |
| Locomotivo/Balistico | 1 |
| Manipolativo/Alimentare | 1 |
| Offensivo/Contusivo | 1 |
| Offensivo/Perforante | 1 |
| Offensivo/Termico | 1 |
| Sensoriale/Magneto-ricettivo | 1 |
| Sensoriale/Tatto-Vibro | 1 |
| Sensoriale/Uditivo-Olfattivo | 1 |

## Trait normalizzati

| Trait | Etichetta | Famiglia | Tier | Sinergie | Conflitti |
| --- | --- | --- | --- | --- | --- |
| TR-1101 | Rostro Emostatico-Litico | Offensivo/Perforante | T4 | TR-1102 | — |
| TR-1102 | Scheletro Idraulico a Pistoni | Locomotivo/Balistico | T4 | TR-1101, TR-1103 | — |
| TR-1103 | Ipertrofia Muscolare Massiva | Fisiologico/Metabolico | T3 | TR-1102 | TR-1105 |
| TR-1104 | Ectotermia Dinamica | Fisiologico/Termico | T3 | TR-1103 | — |
| TR-1105 | Organi Sismici Cutanei | Sensoriale/Tatto-Vibro | T2 | TR-1101 | TR-1103 |
| TR-1201 | Pelage Idrorepellente Avanzato | Difensivo/Termoregolazione | T2 | TR-1202, TR-1204 | — |
| TR-1202 | Scudo Gluteale Cheratinizzato | Difensivo/Corazza | T3 | TR-1201 | — |
| TR-1203 | Articolazioni Multiassiali | Locomotivo/Terrestre | T3 | TR-1204 | — |
| TR-1204 | Coda Prensile Muscolare | Locomotivo/Arboricolo | T3 | TR-1203, TR-1205 | — |
| TR-1205 | Rostro Linguale Prensile | Manipolativo/Alimentare | T3 | TR-1204 | — |
| TR-1301 | Ermafroditismo Cronologico | Riproduttivo/Cicli | T3 | TR-1302 | — |
| TR-1302 | Locomozione Miriapode Ibrida | Locomotivo/Terrestre | T3 | TR-1304 | — |
| TR-1303 | Estroflessione Gastrica Acida | Offensivo/Chimico | T4 | TR-1304 | TR-1305 |
| TR-1304 | Artiglio Cinetico a Urto | Offensivo/Contusivo | T4 | TR-1302 | — |
| TR-1305 | Sistemi Chimio-Sonici | Sensoriale/Uditivo-Olfattivo | T3 | TR-1302 | TR-1303 |
| TR-1401 | Scheletro Pneumatico a Maglie | Locomotivo/Terrestre | T3 | TR-1402 | — |
| TR-1402 | Cinghia Iper-Ciliare | Locomotivo/Terrestre | T3 | TR-1401 | — |
| TR-1403 | Rete Filtro-Polmonare | Fisiologico/Respiratorio | T3 | TR-1401 | — |
| TR-1404 | Canto Infrasonico Tattico | Offensivo/Controllo | T4 | TR-1401 | — |
| TR-1405 | Siero Anti-Gelo Naturale | Fisiologico/Termico | T2 | TR-1401 | — |
| TR-1501 | Zanne Idracida | Offensivo/Chimico | T4 | TR-1502, TR-1503 | — |
| TR-1502 | Seta Conduttiva Elettrica | Offensivo/Elettrico | T4 | TR-1501 | — |
| TR-1503 | Articolazioni a Leva Idraulica | Locomotivo/Terrestre | T3 | TR-1501 | — |
| TR-1504 | Filtrazione Osmotica | Fisiologico/Idrico | T2 | TR-1501 | — |
| TR-1505 | Occhi Analizzatori di Tensione | Sensoriale/Visivo | T2 | TR-1502 | — |
| TR-1601 | Membrana Plastica Continua | Difensivo/Camuffamento | T3 | TR-1602 | — |
| TR-1602 | Flusso Ameboide Controllato | Locomotivo/Terrestre | T2 | TR-1601 | — |
| TR-1603 | Fagocitosi Assorbente | Alimentazione/Digestione | T3 | TR-1601 | — |
| TR-1604 | Moltiplicazione per Fusione | Riproduttivo/Cicli | T2 | TR-1601 | — |
| TR-1605 | Cisti di Ibernazione Minerale | Difensivo/Resistenze | T2 | TR-1604 | — |
| TR-1701 | Ali Fono-Risonanti | Locomotivo/Aereo | T3 | TR-1702, TR-1703 | — |
| TR-1702 | Cannone Sonico a Raggio | Offensivo/Controllo | T4 | TR-1701 | — |
| TR-1703 | Campo di Interferenza Acustica | Difensivo/Camuffamento | T3 | TR-1701 | — |
| TR-1704 | Cervello a Bassa Latenza | Cognitivo/Apprendimento | T3 | TR-1701 | — |
| TR-1705 | Occhi Cinetici | Sensoriale/Visivo | T2 | TR-1702 | — |
| TR-1801 | Integumento Bipolare | Sensoriale/Magneto-ricettivo | T3 | TR-1803 | — |
| TR-1802 | Elettromagnete Biologico | Offensivo/Elettrico | T4 | TR-1801 | — |
| TR-1803 | Scivolamento Magnetico | Locomotivo/Terrestre | T3 | TR-1801 | — |
| TR-1804 | Filtro Metallofago | Alimentazione/Digestione | T2 | TR-1802 | — |
| TR-1805 | Bozzolo Magnetico | Difensivo/Resistenze | T2 | TR-1801 | — |
| TR-1901 | Vello di Assorbimento Totale | Difensivo/Camuffamento | T3 | TR-1902 | — |
| TR-1902 | Visione Multi-Spettrale Amplificata | Sensoriale/Visivo | T3 | TR-1901 | — |
| TR-1903 | Motore Biologico Silenzioso | Fisiologico/Metabolico | T2 | TR-1901 | — |
| TR-1904 | Artigli Ipo-Termici | Offensivo/Termico | T3 | TR-1902 | — |
| TR-1905 | Comunicazione Fotonica Coda-Coda | Cognitivo/Sociale | T2 | TR-1901 | — |
| TR-2001 | Corna Psico-Conduttive | Cognitivo/Sociale | T3 | TR-2002 | — |
| TR-2002 | Coscienza d’Alveare Diffusa | Cognitivo/Sociale | T4 | TR-2001 | — |
| TR-2003 | Aura di Dispersione Mentale | Offensivo/Controllo | T3 | TR-2001 | — |
| TR-2004 | Metabolismo di Condivisione Energetica | Fisiologico/Metabolico | T3 | TR-2001 | — |
| TR-2005 | Unghie a Micro-Adesione | Locomotivo/Arboricolo | T2 | TR-2001 | — |

Le etichette sono pronte per essere mappate a identificatori canonicali nel
`data/core/traits/glossary.json` (es. conversione in slug kebab-case) durante la
fase di import.
