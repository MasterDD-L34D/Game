# Prontuario metriche & unità **UCUM** — Evo Tactics

Selezione di **metriche tipiche** per trait, con unità **UCUM** consigliate. Usa `1` per grandezze
adimensionali; preferisci unità SI (m, s, kg, Pa, J, W, V, A, Hz, dB, K) e derivate.

> Riferimenti rapidi: **UCUM** (The UCUM Organization) e **HL7 THO — Common UCUM units**
> confermano codici come `Cel` (grado Celsius), `L` (litro), `dB` (decibel), ecc.

---

## 1) Locomotivo

- `velocita_max`: **m/s** — velocità massima sostenibile/sprint.
- `accelerazione_0_10`: **m/s2** — accelerazione lineare breve.
- `raggio_di_volta`: **m** — manovrabilità (aria/acqua).
- `tasso_di_salita`: **m/s** — climb rate (aereo/sub).
- `salto_verticale`: **m** — altezza massima singolo impulso.
- `range_di_volo`: **km** — autonomia (nota: converti in **m** per coerenza SI se serve).

## 2) Sensoriale

- `acuita_visiva`: **1** — indice adimensionale (0–1 o scala proprietaria).
- `soglia_udito`: **dB** — soglia o discomfort.
- `banda_uditiva_max`: **Hz** — frequenza massima percepita.
- `rilevabilita_visiva`: **1** — frazione (0–1) visibilità residua (camo).
- `sens_magnetica`: **T** — Tesla (soglia/precisione).
- `sens_elettrica`: **V/m** — sensibilità campo elettrico.

## 3) Fisiologico

- `temperatura_fiato`: **Cel** — grado Celsius del getto/fiato.
- `tolleranza_termica`: **K** — delta termico tollerato.
- `metabolic_rate`: **W/kg** — spesa energetica specifica.
- `consumo_O2`: **L/min** — ventilo‑metria.
- `pressione_getto`: **Pa** — idro/areo‑getto pressurizzato.
- `disidratazione_onset`: **1** — frazione perdita massa (es. 0.03 = 3%).

## 4) Offensivo

- `energia_impattiva`: **J** — work/danno cinetico.
- `velocita_proiettile`: **m/s** — balistica.
- `tensione_picco`: **V** — scarica elettrica.
- `corrente_picco`: **A** — impulso elettrico.
- `dose_acustica`: **dB·s** — esposizione sonora cumulativa (se usato).
- `area_cono`: **m2** — area effettiva attacco a cono.

## 5) Difensivo

- `spessore_corazza`: **mm** — (nota: use **m** internamente, esporta mm se UI).
- `SPL_riduzione`: **dB** — attenuazione sonora passiva.
- `trasmittanza_ottica`: **1** — frazione passante (0–1).
- `rigenerazione_tasso`: **1/h** — frazione tessuto/ora.
- `res_termica`: **K/W** — isolamento termico.

## 6) Cognitivo/Sociale

- `cohesion_index`: **1** — indice coesione (0–1).
- `intimidazione_index`: **1** — deterrenza (0–1).
- `tempo_apprendimento`: **s** — per skill task standard.
- `errore_navigazione`: **1** — drift relativo su rotta (es. 0.01 = 1%).

## 7) Riproduttivo/Ecologico

- `tasso_propaguli`: **1/season** — propaguli per stagione (se modelli stagioni).
- `germinazione_t50`: **h** — tempo al 50% germinazione.
- `disseminazione_raggio`: **m** — dispersione media semi/propaguli.
- `impollinazione_tasso`: **1/h** — interazioni efficaci/ora.

---

## Note pratiche

- **Adimensionale (`1`)**: usa per indici, percentuali (0–1), probabilità, moltiplicatori.
- **`Cel`** (°C): UCUM ufficiale; evitare simboli non UCUM in JSON.
- **`L`** (litro): ammesso; per standard SI puro usa `m3` o `mL` quando serve precisione.
- **Derivate**: `m/s2`, `K/W`, `V/m`, `dB·s` sono lecite; valida sempre con un parser UCUM.
- **Interoperabilità**: in UI/handout puoi visualizzare `mm`/`km` ma **archivia** in SI base se devi fare calcoli globali.

---

## Mini‑tabella UCUM (estratto utile)

| Quantità        | Codice UCUM | Nota             |
| --------------- | ----------- | ---------------- |
| temperatura     | `Cel`       | grado Celsius    |
| lunghezza       | `m`         | metro            |
| massa           | `kg`        | chilogrammo      |
| tempo           | `s`         | secondo          |
| velocità        | `m/s`       | —                |
| accelerazione   | `m/s2`      | —                |
| forza           | `N`         | Newton           |
| pressione       | `Pa`        | Pascal           |
| energia         | `J`         | Joule            |
| potenza         | `W`         | Watt             |
| tensione        | `V`         | Volt             |
| corrente        | `A`         | Ampere           |
| frequenza       | `Hz`        | Hertz            |
| suono (livello) | `dB`        | decibel          |
| volume          | `L`         | litro            |
| area            | `m2`        | —                |
| adimensionale   | `1`         | frazioni, indici |

---

## Esempi di metriche per trait (rapidi)

- **Idro‑Cannoni Pressurizzati** → `pressione_getto: "altissima" (1)` _oppure_ misurato: `pressione_getto: 5e6 (Pa)`
- **Peli‑Ago Elettrostatici** → `tensione_picco: 10000 (V)`; `velocita_proiettile: 60 (m/s)`
- **Mimesi Idromolecolare** → `rilevabilita_visiva: 0.3 (1)`; condizione `acqua|limpida`
