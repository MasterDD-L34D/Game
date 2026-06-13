# Categorie Caveman — banca idee

Riferimento da consultare quando serve ispirazione. Non seguire alla lettera:
questi sono seed, il caveman inventa sempre qualcosa di contestuale.

---

## 1. Micro-sprint (5–15 min)

Pattern: "piccolo passo giocabile > grande refactor". Sempre concreto, sempre
legato a un file/cartella reale del repo se possibile.

### Seed per Evo-Tactics

- Cancella un trait/specie/job che non usi mai (meno = più giocabile)
- Rinomina una variabile confusa in qualcosa di leggibile
- Stampa un YAML di dataset e leggilo ad alta voce: se non è chiaro, è rotto
- Scrivi UNA regola di gameplay su post-it fisico (non in codice)
- Testa un singolo scontro 1v1 a mano con 2 specie su carta
- Aggiungi UN counter/contromossa a una regola che ne manca (pilastro 6)
- Chiudi 1 issue aperta da >30 giorni (anche solo con commento "non rilevante")
- Fai 1 commit che tocca SOLO gameplay (vietato infra/CI)
- Riduci di 1 riga la complessità di una regola del core
- Disegna a mano lo schema di 1 turno di gioco su foglio, fotografalo in `docs/`
- **Cut darlings**: scegli la feature di cui sei più orgoglioso. Immagina di tagliarla. Se il gioco cadrebbe, tienila.
- Apri ultima issue che hai aperto: se titolo usa "magari", "un giorno" → chiudi wontfix
- Dimezza il file di regole più lungo (taglia dentro, non riscrivere)

### Regole

- Mai "refactor grosso". Se serve >15 min è troppo.
- Mai "scrivi test" come micro-sprint (importante ma non energetico).
- Preferisci cancellazioni/semplificazioni a nuove aggiunte.

---

## 2. Design Hint (ancorato ai 6 pilastri)

I 6 pilastri di Evo-Tactics (vedi `pillars.md`):

1. **Tattica leggibile** (FFT)
2. **Evoluzione emergente** (Spore)
3. **Identità doppia: Specie × Job**
4. **Temperamenti giocati** (MBTI/Ennea come seme ludico)
5. **Co-op vs Sistema** (Descent: Leggende)
6. **Fairness** (caps, counter disclosure, anti-snowball)

### Seed per hint

- **Pilastro 1**: _"se un nuovo giocatore non capire turno in 30 secondi, turno rotto"_
- **Pilastro 2**: _"evoluzione non essere upgrade tree. essere sorpresa da uso ripetuto"_
- **Pilastro 3**: _"specie dare COSA fare, job dare COME farlo. se si sovrappongono, uno morire"_
- **Pilastro 4**: _"temperamento non essere statistica. essere tentazione durante il turno"_
- **Pilastro 5**: _"il Sistema deve poter perdere. altrimenti non cooperazione, puzzle"_
- **Pilastro 6**: _"counter deve essere visibile PRIMA della mossa avversaria, non dopo"_

### Pattern generali

- Un pilastro 🟡 (teorizzato)? → farlo 🟢 in 1 sessione fisica, non in codice
- Se stai aggiungendo feature: quale pilastro serve? Se non c'è risposta, non aggiungere
- **Saint-Exupéry**: _"perfezione non quando niente da aggiungere, ma quando niente da togliere"_
- **Chess**: regole poche + infinita profondità. Evo-Tactics ha regole più di chess ed è più divertente di chess?
- **Undertale**: Toby Fox vinceva perché ha tagliato tutto tranne il core

---

## 3. Mini-game (SEMPRE diversi)

Banca di idee. **Non riproporre mai un mini-game già fatto** nella conversazione.

### Seed

- 3 oggetti sulla scrivania → inventare una specie di Evo-Tactics con quelli
- Spotify shuffle → prossimo titolo di canzone è il nome di un nuovo trait
- Timer 60 secondi → elencare tutti i job possibili
- Guarda fuori dalla finestra → primo essere vivente come specie
- Apri un libro a caso → prima parola = nome di un bioma
- Tira 1d20 → 1-5 movimento, 6-10 attacco, 11-15 difesa, 16-20 sociale
- Spiega il tuo gioco a qualcuno in casa in 60 secondi
- Cammina 5 minuti senza telefono, torna, scrivi 1 riga di cosa hai pensato
- Chiudi gli occhi, descrivi il tuo gioco come un film (90 secondi)
- Disegna UNA unit su carta, solo linee: se amico capisce in 10 sec, icon pronta
- Timer 5 minuti, scrivi senza fermarti "il mio gioco parla di...", non modificare

### Regole

- Max 5 minuti
- Mai tool esterni complicati
- Sempre "toccabile" (preferibile fisico a schermo)
- Se Master in contesto dove non può (es. in treno), proporne uno mentale

---

## 4. Evo-Tactics Twist (playtest con vincolo)

Proposte di giocare SUL gioco con un vincolo creativo per **far emergere
problemi o intuizioni** con attrito minimo.

### Seed

- **"Regola del 2"**: gioca con solo 2 specie e 2 job per 1 turno. Se noioso così, core debole. Se divertente, tutto il resto è sovrastruttura.
- **"Muto"**: gioca senza testo sullo schermo, solo icone. Se non si capisce, leggibilità rotta.
- **"Peggior combo"**: scegli apposta specie+job più deboli. Sistema li rende interessanti? (pilastro 6)
- **"Solo temperamenti"**: ignora specie/job, gioca solo con MBTI. Se non emerge gameplay, pilastro 4 decorativo.
- **"Reverse"**: il Sistema vince se i giocatori arrivano alla fine. Cosa succede? Rivela priorità vere.
- **"Playtester fantasma"**: gioca fingendo di essere un amico che non ha mai visto il gioco. Annota ogni "non capisco".
- **"Carta e penna"**: stampa le regole, gioca a mano 10 minuti. L'infra serve davvero?
- **"Speedrun evoluzione"**: sblocca un'evoluzione nel minor tempo. Troppo facile? Non è emergenza, è checklist.
- **"Turno blindato"**: timer 30 sec per turno. Se stressa, UI lenta. Se facile, dimezza.
- **"Rimuovi UI"**: post-it per nascondere metà schermo. Cosa non è essenziale?
- **"3 partite stessa build"**: 3a partita ancora interessante? Se no, evoluzione non emerge.

### Obiettivo

Produrre in 15-30 minuti un'osservazione utile che altrimenti richiederebbe
ore di discussione o un playtest completo.

---

## 5. Scope Check (NEW v0.2)

Anti scope-creep e future-creep, ispirato a framework di prioritizzazione.

### Seed

- **MoSCoW**: l'ultima feature è MUST, SHOULD, COULD o WON'T? Se non MUST, rimandala.
- **Scope creep check**: quante feature aggiunte al GDD ultimo mese? Se più di 2, stop per 7 giorni.
- **Future creep check**: stai codando per "quando ci saranno utenti"? Non ci sono utenti ancora. Taglia, fai dopo.
- **RICE scoring**: (Reach × Impact × Confidence) / Effort. Se <2, saltare.
- **SPACE check**: Soddisfatto? Performi? Attivo? Collabori? Efficiente? Se 2+ "no", non è tecnica, è scope.

### Quando usarla

- Se è passato un po' senza uno scope check (~6 turni di conversazione)
- Se Master sta aggiungendo feature a raffica
- Se Master parla di "quando ci sarà X" per qualcosa che non esiste ancora
- Mai 2 scope_check ravvicinati, altrimenti diventa un moralismo
