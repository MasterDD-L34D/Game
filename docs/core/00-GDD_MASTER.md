---
title: GDD Master — Entrypoint Canonico Evo Tactics
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-28'
source_of_truth: true
language: it
review_cycle_days: 30
---

# GDD Master — Entrypoint Canonico

Questo documento e' il **punto di ingresso unico** per il game design di Evo Tactics. Non duplica i contenuti dei doc specialistici: li sintetizza in 1-3 paragrafi e linka la fonte canonica.

**Autorita'**: livello **A1** (hub). In caso di conflitto, prevale la gerarchia definita in [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md): A0 governance → A1 ADR/hub → A2 core data → A3 freeze.

**Documenti compagni**:

- [`00-SOURCE-OF-TRUTH.md`](00-SOURCE-OF-TRUTH.md) — ricostruzione narrativa completa (19 sezioni, v4)
- [`90-FINAL-DESIGN-FREEZE.md`](90-FINAL-DESIGN-FREEZE.md) — scope shipping e sistemi congelati (A3)
- [`00B-CANONICAL_PROMOTION_MATRIX.md`](00B-CANONICAL_PROMOTION_MATRIX.md) — classificazione ufficiale 10 sistemi

---

## 1. Tesi di design

> **"Tattica profonda a turni in cui come giochi modella cio' che diventi."**

Evo Tactics e' un gioco tattico cooperativo a turni con progressione evolutiva leggibile, pensato per il salotto TV con companion app. Il combat d20 e' il nucleo; la progressione **Specie x Job x Forma x Telemetry/Unlock** e' il secondo asse.

→ [`01-VISIONE.md`](01-VISIONE.md) | [`90-FINAL-DESIGN-FREEZE.md`](90-FINAL-DESIGN-FREEZE.md) §1

---

## 2. Prima partita / onboarding

La prima esperienza e' un **tutorial giocato** (non manuale): preset di creature, briefing 2-3 frasi, si impara facendo. Onboarding sotto i 10 minuti. Primo encounter: 6 turni, savana, niente hazard, focus su movimento/attacco/copertura/MoS.

→ [`00-SOURCE-OF-TRUTH.md`](00-SOURCE-OF-TRUTH.md) §2 | [`17-SCREEN_FLOW.md`](17-SCREEN_FLOW.md) | [`enc_tutorial_01.yaml`](../planning/encounters/enc_tutorial_01.yaml)

---

## 3. Worldgen — 4 livelli ecologici

Il mondo e' una **rete di ecosistemi collegati** con regole ecologiche e propagazioni:

1. **Bioma** — etichetta, difficulty, hazard, affissi. → [`biomes.yaml`](../../data/core/biomes.yaml)
2. **Ecosistema** — nodi specie + ruoli trofici, interazioni ecologiche, stabilita'. → `packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml`
3. **Meta-ecosistema** — network cross-bioma con corridoi, spillover stagionali, bridge. → `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml`
4. **Eventi dinamici** — propagazioni inter-ecosistema, stagionalita'. → `cross_events.yaml`

→ [`00-SOURCE-OF-TRUTH.md`](00-SOURCE-OF-TRUTH.md) §3

---

## 4. Foodweb come sistema ecologico centrale

La foodweb non e' una nota laterale: e' l'**infrastruttura ecologica** che determina quali specie coesistono, come interagiscono, e come il bioma reagisce a pressioni. 5 foodweb attive (badlands, cryosteppe, deserto caldo, foresta temperata, rovine planari). Nodi = specie/produttori/consumatori. Archi = herbivory, predation, mutualism, dispersal, scavenging, suppression. Ruoli trofici (predatore apex, ingegnere ecosistema, dispersore ponte) influenzano encounter generation e bilancio.

→ [`00-SOURCE-OF-TRUTH.md`](00-SOURCE-OF-TRUTH.md) §4 | `packs/evo_tactics_pack/data/foodwebs/*` | `packs/evo_tactics_pack/validators/rules/foodweb.py`

---

## 5. Catena evolutiva: biomi → ecosistemi → specie → morph → trait → Forme

L'asse di progressione collega tutti i livelli:

- **Specie** definite con stat base, ruoli ecologici, trait pool. → [`species.yaml`](../../data/core/species.yaml), [`20-SPECIE_E_PARTI.md`](20-SPECIE_E_PARTI.md)
- **Trait** attivi idratati dal resolver d20. Solo in `active_effects.yaml`, mai hardcoded. → [`data/core/traits/active_effects.yaml`](../../data/core/traits/active_effects.yaml)
- **Forme base 16** — sistema identitario con 4 assi MBTI e seed innata. → [`22-FORME_BASE_16.md`](22-FORME_BASE_16.md), [`mbti_forms.yaml`](../../data/core/forms/mbti_forms.yaml)
- **Morph/Mutazioni** — sbloccati via Nido (gene slot, ambient mutation). → [`27-MATING_NIDO.md`](27-MATING_NIDO.md) §Eredita'
- **Job base 6+1** — Skirmisher, Vanguard, Warden, Artificer, Invoker, Harvester (base) + Ranger (extended). Ogni job e' un ruolo che l'organismo assume nel team e nell'ecosistema di missione, non una classe fantasy tradizionale. → [`jobs.yaml`](../../data/core/jobs.yaml)

→ [`00-SOURCE-OF-TRUTH.md`](00-SOURCE-OF-TRUTH.md) §5

---

## 6. Framing TV-first + companion app

Il gioco e' progettato per il **salotto**: TV come schermo principale (griglia, creature, azioni), companion app su cellulare (info dettagliate, draft, inventario, telemetria personale). Esperienza condivisa, non single-screen.

→ [`11-REGOLE_D20_TV.md`](11-REGOLE_D20_TV.md) | [`30-UI_TV_IDENTITA.md`](30-UI_TV_IDENTITA.md) | [`00-SOURCE-OF-TRUTH.md`](00-SOURCE-OF-TRUTH.md) §6

---

## 7. Premessa narrativa — il Sistema

Il mondo e' governato da un'entita' antagonista (il **Sistema**) che rappresenta ordine soffocante e conformita'. Le creature (e i giocatori) cooperano _contro_ il Sistema. La narrativa emerge dal gameplay — non cutscene, ma conseguenze ecologiche e sociali delle azioni tattiche. Narrative service con inkjs per briefing/debrief con scelte.

→ [`00-SOURCE-OF-TRUTH.md`](00-SOURCE-OF-TRUTH.md) §7 | [`draft-narrative-lore.md`](../planning/draft-narrative-lore.md) | `services/narrative/narrativeEngine.js`

---

## 8. Tri-Sorgente — progressione a carte post-scontro

Sistema centrale di progressione run-based. Dopo ogni scontro/evento vengono offerte **3 carte + Skip**:

- **Roll** — bioma/tier determinano tabella e grant
- **Personalita'** — Enneagram/MBTI → pesi di preferenza
- **Azioni recenti** — telemetria → bonus affinita'

Pipeline: merge pool R/A/P → scoring composito → softmax (T=0.7) → 3 pick + Skip. Lo Skip accumula **Frammenti Genetici** spendibili nel Nido. Il Tri-Sorgente e' il **ponte tra la tattica run-based e la progressione evolutiva Spore-like**.

KPI target: ≥95% offerte con ≥1 sinergica, skip-rate 18-32%, tag entropy 0.85-1.10.

→ [`docs/architecture/tri-sorgente/overview.md`](../architecture/tri-sorgente/overview.md) | [`tri-sorgente/qa.md`](../architecture/tri-sorgente/qa.md) | [`engine/tri_sorgente/tri_sorgente_config.yaml`](../../engine/tri_sorgente/tri_sorgente_config.yaml)

---

## 9. Nido / Recruit / Mating — meta-loop controllato

Il Freeze lo include come **meta-slice controllata** (non simulazione totale):

- **Affinita' e Fiducia**: scale -3..+3, azioni sociali (dialogo, supporto, risorse)
- **Reclutamento**: ex-nemici → 2 prove narrative → join Nido (o penalita' StressWave)
- **Nido**: moduli base (Dormitori, Bio-Lab, Resonance Anchor, Hangar) tier 0-3, costi risorse, Security Rating vs threat bioma
- **Eredita' e Mutazioni**: 2 gene slot genitori + 1 mutazione ambiente. T1/T2 richiedono Nido ≥2
- **Rituali**: Convergenza, Veglia Resonance, Consiglio del Nido

→ [`27-MATING_NIDO.md`](27-MATING_NIDO.md) | [`Mating-Reclutamento-Nido.md`](Mating-Reclutamento-Nido.md) | [`mating.yaml`](../../data/core/mating.yaml)

---

## 10. Boundary: gameplay HUD vs Mission Console vs telemetry/debrief

Tre superfici UI distinte:

| Superficie                          | Cosa mostra                                                 | Dove vive                                                                                |
| ----------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Gameplay HUD** (TV)               | Griglia, creature, azioni, turni, status                    | Runtime (non nel repo)                                                                   |
| **Mission Console** (companion/web) | Flow validation, species preview, atlas, nebula             | [`docs/mission-console/`](../mission-console/index.html) — bundle Vue3 frozen            |
| **Telemetry/Debrief**               | VC scores, MBTI proiezione, albero evolutivo, Ennea trigger | [`30-UI_TV_IDENTITA.md`](30-UI_TV_IDENTITA.md), [`17-SCREEN_FLOW.md`](17-SCREEN_FLOW.md) |

→ [`ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md`](../adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md)

---

## 11. MBTI / PF / Enneagramma / Forme — asse identitario

La telemetria in-match (hit/miss/crit/heal/buff, formazione, LOS, coesione) alimenta indici EMA (Aggro, Risk, Cohesion, Setup, Explore, Tilt) che si proiettano su **4 assi MBTI** (E/I, S/N, T/F, J/P). Oltre soglia si attivano **archetipi Ennea** (Conquistatore, Coordinatore, Esploratore, Architetto, Stoico, Cacciatore) con buff meccanici e prompt UI. Le 16 Forme base sono seeded sulla personalita' innata + 7 pacchetti tematici PI.

→ [`22-FORME_BASE_16.md`](22-FORME_BASE_16.md) | [`24-TELEMETRIA_VC.md`](24-TELEMETRIA_VC.md) | [`PI-Pacchetti-Forme.md`](PI-Pacchetti-Forme.md) | `apps/backend/services/vcScoring.js`

---

## 12. Combat d20 (congelato)

Il combat loop usa d20 vs DC, Margin of Success, damage step, parata reattiva, status fisici/mentali (panic, rage, stunned, focused, confused, bleeding, fracture). Round model: shared planning → commit → ordered resolution.

→ [`docs/hubs/combat.md`](../hubs/combat.md) | [`ADR-2026-04-13-rules-engine-d20.md`](../adr/ADR-2026-04-13-rules-engine-d20.md) | [`ADR-2026-04-15-round-based-combat-model.md`](../adr/ADR-2026-04-15-round-based-combat-model.md)

---

## Sistemi non-core (appendix / research / historical)

| Sistema      | Classificazione | Dove                                                                                         | Note                                 |
| ------------ | --------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| A.L.I.E.N.A. | appendix        | [`docs/appendici/ALIENA_documento_integrato.md`](../appendici/ALIENA_documento_integrato.md) | Framework metodologico design specie |
| Sandbox      | appendix        | [`docs/appendici/sandbox/README.md`](../appendici/sandbox/README.md)                         | Pipeline di staging 7 fasi           |
| Sentience    | research        | [`docs/guide/README_SENTIENCE.md`](../guide/README_SENTIENCE.md)                             | Naming instabile, nessun backend     |
| EchoWake     | research        | [`docs/planning/EchoWake/`](../planning/EchoWake/)                                           | Narrative integrity, isolato         |
| GDD storici  | historical      | [`docs/archive/historical-snapshots/`](../archive/historical-snapshots/)                     | Superati da SoT v4 e Freeze v0.9     |

→ Classificazione completa in [`00B-CANONICAL_PROMOTION_MATRIX.md`](00B-CANONICAL_PROMOTION_MATRIX.md)

---

## Ordine di lettura consigliato

1. **Questo file** (overview sintetica)
2. [`90-FINAL-DESIGN-FREEZE.md`](90-FINAL-DESIGN-FREEZE.md) (scope shipping)
3. [`00-SOURCE-OF-TRUTH.md`](00-SOURCE-OF-TRUTH.md) (ricostruzione narrativa completa)
4. Hub del workstream di interesse: [`docs/hubs/`](../hubs/README.md)
5. ADR rilevanti: [`docs/adr/`](../adr/)

---

_Creato 2026-04-16. Prossima revisione entro 30 giorni._
