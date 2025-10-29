# Modelli di Riferimento — Evo Tactics (2025-10-24)

Di seguito i **principali modelli** con template riutilizzabili e **esempi** applicati a Evo Tactics.

---

## 1) Diagramma ASCII (flow_ascii)

**Struttura:** blocchi `[Step]` collegati con frecce `-->`  
**Uso:** spiegare pipeline (es. risoluzione di un attacco).

**Template**
```
[Inizio] --> [Scelta Azione] --> [Check Risorse] --> [Tiro/Confronto] --> [Esito] --> [Aggiornamenti]
```

**Esempio — Attacco in Evo Tactics**
```
[Dichiara Attacco] 
  --> [Valuta Stance/Tag/Surge]
  --> [Converti PT↔PP? (ENTP: Baratto Tecnico)]
  --> [Spesa Risorse: PT (+PP/SG se serve)]
  --> [Tiro per Colpire] --> [Critico?] --> [Danni Base + Mod + Surge]
  --> [Applica Effetti (corrode/stagger/posizionamento)]
  --> [Telemetry VC update] --> [Carica SG (ogni 2 colpi = +1)]
  --> [Fine Step]
```

---

## 2) Schema “First Principles”

**Struttura:** scomposizione in **principi di base** (invarianti, risorse, timing, vincoli, edge-case).  
**Uso:** chiarire regole complesse.

**Template**
- **Obiettivo:** cosa risolve la regola?
- **Entità & Risorse:** liste minime (stat, PT/PP/SG, tag, condizioni).
- **Timing:** quando si applica (prima/dopo tiri/azioni).
- **Vincoli:** limiti, cap, stacking.
- **Invarianti:** ciò che non cambia.
- **Edge case:** casi limite e precedenze.

**Esempio — *Baratto Tecnico* (Form ENTP)**
- **Obiettivo:** flessibilità momentanea tra budget azioni (**PT**) e potenza (**PP**).
- **Entità & Risorse:** PT, PP; cap turno da scheda (es. `pt_per_turn: 3`, PP max 3).
- **Timing:** **1/turno**, prima o dopo un’azione.
- **Vincoli:** non superare i cap; non riduce costi già ridotti da *Tecnico* (si calcola prima lo scambio, poi gli sconti tag).
- **Invarianti:** non crea azioni “extra” oltre i cap; non retroagisce su spese già fatte nel turno.
- **Edge case:** se la prima Surge del turno ha costo PP ridotto a 0 da *Tecnico*, lo scambio PP→PT non è obbligatorio; sommatoria sconti non scende sotto 0 (min 0).

---

## 3) Mappa a Blocchi Logici (se/allora)

**Struttura:** condizioni nidificate con esito.  
**Uso:** verificare **applicabilità** di talenti/capacità/effetti.

**Template**
```
SE [condizione A] E/O [condizione B]
  ALLORA [applica effetto X]
ALTRIMENTI
  [fall-back Y]
```

**Esempio — *Backstab* / *Flank Mastery***
```
SE (entri da fuori adiacenza) E ((bersaglio è fiancheggiato) O (bersaglio è inconsapevole))
  ALLORA: +10% a colpire e +1 danno (1/round)
ALTRIMENTI SE (bersaglio è fiancheggiato) E (hai *flank_mastery*)
  ALLORA: +10% a colpire; +5% extra se percepisci con *echolocate* entro 10 m e senza LoS visiva
ALTRIMENTI
  nessun bonus di posizionamento
```

---

## 4) MDA Didattico (Multidimensional Analysis)

**Struttura:** matrice 3×3 (o triangolo) per **Costo / Potenza / Flessibilità**.  
**Uso:** confronto tra opzioni (talenti, surge, job ability).

**Template (scala: Basso/Medio/Alto)**

| Opzione | Costo (PT/PP/SG) | Potenza (Danni/Effetto) | Flessibilità (Range/Posizione) |
|---|---|---|---|

**Esempio — *dash_cut* vs *shoulder_rush* vs *pulse_cone***
| Opzione         | Costo              | Potenza            | Flessibilità                   |
|---              |---                 |---                 |---                             |
| dash_cut        | **Basso** (PT)     | **Medio**          | **Alto** (move+hit, flanking)  |
| shoulder_rush   | **Medio** (PT)     | **Medio** (+spinta)| **Medio** (linee/contatto)     |
| pulse_cone      | **Medio** (PT+PP)  | **Alto** (area/TS) | **Basso** (cono, posizionamento)|

> Nota: valori qualitativi **playtest-needed** per tuning fine.

---

## 5) Visualizzazione per Analogia

**Struttura:** metafora visiva per rendere intuitivo un sistema di risorse/regole.  
**Uso:** onboarding e comunicazione veloce.

**Template**
- **Concetto ⇒ Metafora**
- **Elementi corrispondenti**
- **Impatti tattici**

**Esempio — PT/PP/SG**
- **PT ⇒ “Carburante base”**: ciò che ti fa muovere/attaccare ogni turno (serbatoio stabile).
- **PP ⇒ “Nitro”**: potenziamenti brevi (Surge, tag *Tecnico*), ricarica limitata.
- **SG ⇒ “Modalità Overdrive”**: barra che si carica a colpi e abilita burst (*overdrive*, ultimate).
- **Impatti tattici:** gestisci **ritmo** (PT), **picchi** (PP), **finestra super** (SG) senza esaurire tutto nello stesso turno.

---

### Come usare questi modelli
- Inserisci i **diagrammi ASCII** nelle schede regole per pipeline ripetitive (attacco, iniziativa, uso stance).  
- Applica **First Principles** alle regole più controverse prima del playtest.  
- Usa **Blocchi Logici** per chiarire attivazioni/condizioni (trait, surge, tag).  
- Porta in sessione l’**MDA** per decidere velocemente tra opzioni.  
- Impacchetta l’**Analogia** nelle intro per nuovi giocatori/design doc.
