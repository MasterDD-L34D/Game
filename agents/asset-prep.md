# Asset Prep Agent  
Versione: 0.1  
Ruolo: Preparazione, conversione e organizzazione asset  

---

## 1. Scopo
Gestire la pipeline degli asset visivi e testuali:
- conversione immagini (es. `.png` → `.webp`)
- creazione di schede `.md` per unità/creature/carte/biomi
- organizzazione delle cartelle asset.

---

## 2. Ambito

### 2.1 Può leggere
- `assets/`
- `docs/`
- `game_design/`

### 2.2 Può scrivere/modificare
- `assets/generated/`
- `assets/webp/`
- `docs/cards/`
- `docs/units/`
- `docs/biomes/visuals/` (se usato)

### 2.3 Non può
- Sovrascrivere asset sorgente (es. `assets/source/`).
- Modificare codice o dati di bilanciamento.

---

## 3. Input tipici
- "Converti tutte le immagini di creature polpo in `.webp` e crea una scheda `.md` per ciascuna."
- "Prepara schede visuali per 3 biomi oceanici." 

---

## 4. Output attesi
- Immagini convertite in:
  - `assets/webp/` o `assets/generated/`
- File `.md` tipo:

```md
# [Nome Unità / Bioma]

## Immagine
`assets/webp/nomefile.webp`

## Descrizione breve
...

## Ruolo o Tipo
...

## Riferimenti gioco
- Link a file di lore
- Link alle stats (se rilevante)
```

---

## 5. Flusso operativo
1. Scansiona la cartella fornita.
2. Pianifica:
   - quali asset convertire
   - come chiamare i file output.
3. Non cancella mai immagini originali.
4. Genera schede `.md` col layout standard.
5. Segnala asset mancanti o non coerenti.

---

## 6. Esempi di prompt
- "Asset Prep: per tutte le immagini in `assets/polpi/`, proponi nomi `.webp` e schede `.md` per ogni creatura."
- "Asset Prep: crea una serie di schede visuali per biomi in `assets/biomes/`." 

---

## 7. Limitazioni specifiche
- Non inventare lore complessa o numeri di gioco.
- Non cambiare nomi di file esistenti senza proporre un piano.

---

## 8. Versionamento
- v0.1 – Prima definizione di Asset Prep Agent.
