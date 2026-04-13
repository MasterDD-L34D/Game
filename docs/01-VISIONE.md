# Visione

"Tattica profonda a turni in cui **come giochi** modella **cio' che diventi**."

## Il gioco

Evo-Tactics e' un gioco tattico cooperativo a turni basato sul sistema d20, con progressione evolutiva modulare. I giocatori guidano creature che si evolvono in risposta al loro stile di gioco: ogni scelta tattica, ogni azione in combattimento alimenta un profilo comportamentale (la Telemetria VC) che determina quali tratti si sbloccano e come la creatura si trasforma. Non esiste un albero di sviluppo fisso — la progressione emerge dal gioco stesso.

## Architettura e contenuti

Il progetto e' organizzato come monorepo poliglotta: dataset YAML canonici descrivono specie, biomi, tratti ed encounter; CLI Python e TypeScript validano, generano e simulano; un backend Express ("Idea Engine") serve le API; una dashboard Vue/Vite visualizza lo stato del mondo di gioco. Il sistema di combattimento d20 (resolver in `services/rules/`) traduce le regole tattiche documentate in codice eseguibile e deterministico, testabile con snapshot JSON.

## Direzione

L'obiettivo e' un loop giocabile completo: generazione di encounter, risoluzione tattica turno per turno, accumulo di Punti Tecnica, evoluzione guidata dalla telemetria. I pilastri di design privilegiano la profondita' tattica accessibile, l'emergenza dal comportamento del giocatore e la trasparenza delle meccaniche — ogni formula e' documentata e ogni valore e' ancorato a fonti tracciabili nel repository.
