# Mating, Reclutamento & Nido — Canvas D

## Intento

- Dare peso narrativo/meccanico alle relazioni con NPG e compagni, trasformando il Nido in hub evolutivo che influenza mutazioni, reclutamento e economia sociale.【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L1-L31】

## Affinità & Fiducia

- Scala -3..+3 distinta per Affinità (empatia) e Fiducia (affidabilità). Azioni sociali: `Dialogo mirato` (check d20 con mod Charisma PI), `Supporto tattico` (token assist), `Condivisione risorse` (sacrifica loot). Eventi negativi: fallimento obiettivi, tradimenti, StressWave >0.70.【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L17-L45】
- Compatibilità minima: Affinità ≥1 e Fiducia ≥0. Trigger romance richiede consenso via companion app e assegna bonus `Bond Link` (reroll cooperativo) e `Shared Resilience` (-0.05 StressWave su fallimento condiviso).【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L33-L60】

## Reclutamento ex-nemici

1. Individua NPG `convertible` dal Canvas C.
2. Completa due prove narrative → +1 Affinità.
3. Missione `Trust Trial` come opzionale durante la stessa incursione.
4. Con Fiducia ≥1 l'NPG diventa `Recruit` per il Nido; fallimento → ritorno ostile e StressWave globale +0.08.【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L45-L82】【F:docs/SistemaNPG-PF-Mutazioni.md†L31-L70】

## Standard di Nido

- Moduli base: `Dormitori`, `Bio-Lab`, `Resonance Anchor`, `Hangar`, ciascuno con tier 0-3, costi in risorse + Resonance Shards e impatto telemetrico.【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L83-L104】
- Nido itinerante richiede due Anchor e consente spostamento ogni 3 turni campagna; il Security Rating deve superare minaccia bioma per evitare raid.【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L83-L110】
- Gestione risorse: `Nutrienti`, `Energia`, `Legami`, `Reattori Aeon`, `Shards`. Il cruscotto HUD mostra trend; se una risorsa <2 applicare penalità alla missione successiva. Rituali di coesione riducono StressWave globale spendendo Legami.【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L105-L124】【F:docs/Telemetria-VC.md†L61-L100】

## Ereditarietà & Mutazioni

- Nuove Forme selezionano 2 gene slots dai genitori + 1 mutazione ambientale; `form_seed_bias` determina preferenze tratti. Tabelle per struttura/funzione/memorie sbloccano missioni story-driven; mutazioni T1/T2 richiedono moduli Nido ≥2.【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L111-L140】【F:data/core/mating.yaml†L1-L160】
- Dataset `data/core/mating.yaml` documenta archetipi Forma, likes/dislikes, collaboration hooks e base_scores usati per calcolare compatibilità e stress triggers durante sessioni VC.【F:data/core/mating.yaml†L1-L160】

## Rituali & Eventi

- **Convergenza**: lega due membri, fornisce buff `Bond Shield` (assorbe 1 fallimento critico).【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L141-L160】
- **Veglia Resonance**: riduce StressWave di 0.05 se partecipano ≥3 membri con Affinità positiva.
- **Consiglio del Nido**: decisione mensile che impatta reputazione e priorità risorse. Tutti gli eventi vengono registrati nella companion app modulo Relazioni (tracker Affinità/Fiducia, timeline, alert mismatch >2, export `relations-log.yaml`).【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L141-L180】

## KPI & Stato

- KPI: media Affinità/Fiducia, numero rituali completati, tasso successo `Trust Trial`, impatto risorse Nido su completamento missioni. Companion app Relazioni v0.7 sincronizza dati con backend; Nido itinerante testato ma richiede UI per cooldown spostamento; da ridurre penalty StressWave cumulativa durante fallimenti romance.【F:docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt†L161-L204】【F:docs/piani/roadmap.md†L61-L90】
