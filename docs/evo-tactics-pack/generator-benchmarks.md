# Generatore Ecosystem Pack · Benchmark e Metriche Qualità

## Benchmark visivi e funzionali

| Benchmark | Tipo | Evidenza chiave | Implicazioni per il generatore |
| --- | --- | --- | --- |
| Compilazione seed su *Aurora Playkit* | Funzionale | Roll completo in 5 click medi, export JSON immediato | Targetare pari o migliore efficienza con preset e profili salvataggio | 
| Dashboard riepilogo *Gaea Suite* | Visivo | Layout a schede con stati, storico e CTA in vista unica | Convergere su vista flow map + riepilogo per minimizzare il contesto perso |
| Cronologia snapshot *ArcForge* | Funzionale | Timeline filtrabile, export csv in < 2s | Allineare pipeline export e filtro tag timeline |

## Metriche di qualità e criteri di verifica

### Click per roll completo
- **Definizione**: numero di interazioni necessarie per generare biomi, specie e seed partendo da una scheda vuota.
- **Target**: ≤ 4 click medi, con deviazione standard ≤ 1.
- **Verifica**: sessione di 10 roll monitorata con log strumenti (registro attività + osservazione). Flag rosso se > 5 click medi.

### Tempo medio roll
- **Definizione**: intervallo medio tra avvio generazione e ultimo seed disponibile.
- **Target**: ≤ 3.5 s con catalogo locale, ≤ 5 s con fetch remoto.
- **Verifica**: cronometro automatico (metriche `avg-roll`) confrontato con tempi osservati manualmente. Deviazione ammessa ±0.5 s.

### Leggibilità riepilogo
- **Definizione**: facilità di interpretazione di summary, narrative hook e cronologia.
- **Target**: punteggio ≥ 4/5 in sondaggio rapido con team design (scala Likert) e 0 errori critici di comprensione.
- **Verifica**: walkthrough guidato + checklist linguaggio chiaro, accompagnato da test contrasto (WCAG AA).

## Visione, stakeholder e checkpoint

- **Stakeholder coinvolti**: Lead Design (vision), Narrative Lead (hook), Tech Lead (pipeline export), QA (metriche), PM (roadmap).
- **Allineamento visione**: workshop con stakeholder programmato per 22 maggio 2024, review flow map e metriche.
- **Primo checkpoint**: retrospettiva rapida al giorno 29 maggio 2024 con consegna prototipo interattivo e misurazione iniziale metriche.
- **Deliverable checkpoint**: screenshot flow map, report tempi roll, log cronologia annotato.
