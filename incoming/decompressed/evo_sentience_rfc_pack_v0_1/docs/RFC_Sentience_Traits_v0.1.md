# RFC — Sentience Traits & Evolution Mapping (Ancestors → Evo Tactics) v0.1

**Data freeze:** 2025-10-29

## 1) Scopo
Mettere a fuoco *perché* e *come* usiamo Ancestors: The Humankind Odyssey come matrice per definire una **scala di Sensienza (T1…T6)**, un set di **Tratti** e degli **hook meccanici** per il nostro gioco.
L’estrazione completa dei 297 neuroni può avvenire in iterazioni successive; questo RFC abilita subito un **MVP** giocabile e compatibile con il repo.

## 2) Base di verità (fonti minime)
- **Neurons (panoramica e conteggi):** rami, struttura e totali (Senses = 37; Ambulation = 26; totale 297).  
  - Ancestors Wiki — Neurons: https://ancestors.fandom.com/wiki/Neurons
  - Ancestors Wiki — Senses (neuronal branch): https://ancestors.fandom.com/wiki/Senses_%28neuronal_branch%29
  - Ancestors Wiki — Dexterity (interconn. con Ambulation / Carrying Endurance): https://ancestors.fandom.com/wiki/Dexterity_%28neuronal_branch%29
  - Ambulation (esempi di pagine per‑nodo): Endurance (AB 01), Carrying Endurance (AB 07‑09), Pain Endurance (AB 11).
    - Endurance (AB 01): https://ancestors.fandom.com/wiki/Endurance_%28AB_01%29
    - Carrying Endurance (AB 07): https://ancestors.fandom.com/wiki/Carrying_Endurance_%28AB_07%29
    - Carrying Endurance (AB 08): https://ancestors.fandom.com/wiki/Carrying_Endurance_%28AB_08%29
    - Carrying Endurance (AB 09): https://ancestors.fandom.com/wiki/Carrying_Endurance_%28AB_09%29
    - Pain Endurance (AB 11): https://ancestors.fandom.com/wiki/Pain_Endurance_%28AB_11%29
  - **Stand Up / Motricity (WA 02/03/05):** https://ancestors.fandom.com/wiki/Stand_Up
- **Meteoriti (mutazioni generazionali):**
  - Meteorite: https://ancestors.fandom.com/wiki/Meteorite
  - Meteorite Site: https://ancestors.fandom.com/wiki/Meteorite_Site
- **Interocezione (cornice scientifica):**
  - Proprioception (Britannica): https://www.britannica.com/science/proprioception
  - Vestibular system (Britannica): https://www.britannica.com/science/vestibular-system
  - Nociception/Nociceptor (Britannica): https://www.britannica.com/science/nociception — https://www.britannica.com/science/nociceptor
  - Thermoreception (Britannica): https://www.britannica.com/science/thermoreception
- **Cornice antroposofica (ispirazionale):**
  - Rudolf Steiner, *Theosophy (GA 9), Body–Soul–Spirit* — “sentient soul / soul body”: https://rsarchive.org/Books/GA009/English/AP1971/GA009_c01_4.html

> Nota licenze: la wiki di Ancestors è CC BY‑NC‑SA; Britannica è enciclopedia editoriale; rsarchive è archivio online delle opere di Steiner.

---

## 3) Modello a **Tiers di Sensienza**
Ogni Tier dà tag comportamentali e bonus “di specie”; indica anche milestone *ispirate* a nodi Ancestors (linee guida, non vincoli duri).

**T1 — Proto‑Sentiente (Stimolo→Risposta)**  
- *Flags:* socialità minima; strumenti incidentali; linguaggio: nessuno.  
- *Milestone:* basi sensoriali (Senses core).

**T2 — Pre‑Sociale**  
- *Flags:* bande piccole; richiami vocali; strumenti opportunistici.  
- *Milestone:* detection/identificazione più ampia; **Endurance (AB 01)**.

**T3 — Emergente**  
- *Flags:* ruoli embrionali; strumenti deliberati; attenzione condivisa.  
- *Milestone:* catene Sound/Odor a medio raggio; **Movement/Carry progress**.

**T4 — Civico**  
- *Flags:* ruoli sociali; craft strutturato; protocanoni.  
- *Milestone:* **Sound Awareness / Chemotopy** completi; **Carrying/Climb Endurance (AB 05–09)**.

**T5 — Avanzato**  
- *Flags:* istituzioni; linguaggio semantico; archivi.  
- *Milestone:* memorie (Echoic/Iconic) multiple; **Pain Endurance (AB 11)**.

**T6 — Sapiente (Civiltà)**  
- *Flags:* scrittura; diritto; scienza.  
- *Milestone:* **Senses 37/37** + **Ambulation 26/26**; sinergie Dexterity↔Ambulation (es. DE 04 → AB 07).

---

## 4) Tratti interocettivi (meccaniche)
Tratti fisiologici graduali che si agganciano a prove/clock del sistema:
- **Propriocezione** → bonus equilibrio/posizione; riduzione affaticamento sprint.  
- **Equilibrio (Vestibolare)** → vantaggio contro cadute; minori malus da carico.  
- **Nocicezione** → gestione “ferito”: ritardi d’azione ridotti; trigger difensivi. (Distinta dal dolore cosciente.)  
- **Termocezione** → clock ambientali caldo/freddo; resistenze e mitigazioni.

---

## 5) Dati **MVP** da congelare ORA
- **Senses 37/37** come ramo stand‑alone (gating T1→T4).  
- **Stand Up / Motricity** (WA 02/03/05) per la transizione posturale.  
- **Ambulation (spina dorsale):** AB 01, 02–03, 04–06, 07–09, 11.  
- **Meteoriti:** 12 siti fissi + beneficio generazionale (policy di campagna).

Con questo perimetro: i Tratti di Sensienza sono **giocabili** e scalabili senza il dump 297/297.

---

## 6) Modello dati (repo‑ready)
- `data/traits_sensienza.yaml` — definisce **T1..T6** (flags, descrittori, milestone) + 4 **Tratti interocettivi**.  
- `data/neurons_bridge.csv` — tabella leggera di hook (colonne: `tier, hint_ancestors_node, effect_short, notes, source_slug`).  
- `docs/sources.md` — link permanenti alle fonti.

---

## 7) Hook meccanici rapidi
- **Energia/Affaticamento**: Endurance/Movement/Climb/Carry/Pain (AB) modulano costo azioni e recovery.  
- **Percezione**: catene Senses sbloccano livelli di “rilevanza” in AI/tracking.  
- **Mutazioni**: meteore pianificate per “burst” generazionali (per‑linea).

---

## 8) Roadmap (criteri di accettazione)
**Fase A (MVP)** — T1–T4 + Tratti interocettivi; Senses completo; Ambulation base; policy meteoriti.  
**Fase B (Motorio & Sociale)** — Ambulation 26/26 + Dexterity/Communication; T5.  
**Fase C (Civiltà)** — Metabolism/Settlement/Intelligence → T6.

---

## 9) Rischi & gestione
- Divergenze terminologiche (tooltip vs wiki) → `effect_short` neutrali + link.  
- Incompletezza Ambulation → marcata “later”, non blocca T1–T4.  
- Bilanciamento → Tratti come modificatori lievi (+/−1 step) e soglie per Tier.

— Fine RFC —
