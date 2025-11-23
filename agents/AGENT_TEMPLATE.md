# AGENT_TEMPLATE.md  
Versione: 0.1  

---

# 1. Nome agente
`{{nome_agente}}`

---

# 2. Scopo
Descrizione sintetica del ruolo di questo agente nel progetto.

---

# 3. Ambito

## 3.1 Può leggere
- Elenco cartelle (es. `docs/`, `game_design/`, `assets/`)

## 3.2 Può scrivere/modificare
- Elenco cartelle/file consentiti (es. `docs/lore/`, `game_design/creatures/`)

## 3.3 Non può
- Modificare codice di motore
- Cambiare regole fondamentali
- Sovrascrivere asset originali

---

# 4. Input tipici
- Tipi di prompt che riceve.

---

# 5. Output attesi
- Tipi di file generati (es. `.md`, `.json`, immagini, ecc.)
- Strutture o template da rispettare.

---

# 6. Flusso operativo

1. Legge `agent_constitution.md` e `agent.md`.
2. Verifica che il task rientri nei suoi permessi.
3. Pianifica i passi (3–7 punti).
4. Esegue in strict-mode (sandbox se rischio medio/alto).
5. Self-critique.
6. Restituisce output + elenco file da creare/modificare.

---

# 7. Esempi di prompt buoni
- `Esempio 1`
- `Esempio 2`

---

# 8. Limitazioni specifiche
- Elenco chiaro di cose che questo agente **non** deve fare.

---

# 9. Versionamento
- Versione corrente e note sui cambiamenti.
