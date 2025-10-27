# Guida al dataset dei Biomi

Questa guida descrive lo schema dei biomi usato dalla dashboard di test (`docs/test-interface`) e i passaggi consigliati per mantenere allineati dati, interfaccia e script di verifica.

## Struttura del file `data/biomes.yaml`

Ogni voce è indicizzata dal nome tecnico del bioma e include i campi seguenti:

- **label** e **summary** – titolo in lingua e riassunto narrativo mostrati nelle card della dashboard.
- **diff_base** e **mod_biome** – valori numerici usati per i chip di difficoltà/pressione.
- **affixes** – elenco di tag sintetici resi come pill di riferimento rapido.
- **hazard** – blocco obbligatorio composto da:
  - `description` – testo breve visualizzato in evidenza.
  - `severity` – livello normalizzato (`low`, `medium`, `high`) che guida badge e suggerimenti VC.
  - `stress_modifiers` – coppie chiave/valore mostrate in lista (p.es. `sandstorm: 0.06`).
- **npc_archetypes** – suddivisi in `primary` e `support`; le liste vengono renderizzate in colonne distinte.
- **stresswave** – parametri quantitativi (`baseline`, `escalation_rate`, `event_thresholds`) che alimentano il pannello dedicato.
- **narrative** – contiene `tone` e almeno un elemento in `hooks`, presentati come “stress hooks”.
- **vc_adapt_refs** (opzionale) – array di chiavi che collegano il bioma a elementi di `vc_adapt`; in assenza viene usata un’inferenza basata su `hazard.severity`.

La sezione finale del file raccoglie inoltre le tabelle condivise:

- `vc_adapt` – mappa di adattamenti Venture Capital resi nella colonna laterale con ancore navigabili (`#vc-adapt-<chiave>`).
- `mutations` – liste SG/T0/T1 mostrate come elenco gerarchico.
- `frequencies` – distribuzioni statistiche affiancate agli altri riferimenti.

## Flusso di aggiornamento suggerito

1. **Allineare i dati** – modificare `data/biomes.yaml`, assicurandosi che ogni bioma disponga dei blocchi obbligatori indicati sopra.
2. **Eseguire lo smoke test** – lanciare `scripts/cli_smoke.sh` (con o senza profilo specifico). Lo script include un controllo YAML che valida la presenza di hazard, archetipi e stress hooks; in caso di mancanze fallisce con un report dettagliato.
3. **Verificare la dashboard** – aprire `docs/test-interface/index.html` (ad esempio via `python3 -m http.server`) e controllare:
   - la barra di overview dei biomi (conteggio totale e copertura campi);
   - le card dei singoli biomi con hazard, archetipi e stresswave;
   - i link verso gli adattamenti VC (`VC Adapt`).
4. **Aggiornare la documentazione** – riportare variazioni di schema o nomenclatura in questa guida e, se necessario, nel changelog dei playtest.

## Convenzioni di nomenclatura

- Usare chiavi snake_case per le proprietà tecniche (`stresswave`, `vc_adapt_refs`).
- I tag in `affixes` dovrebbero rimanere brevi (max 2 parole) e descrittivi dell’effetto.
- Gli hook narrativi vanno formulati come azioni o problemi da risolvere, pronti per essere letti durante la preparazione di una sessione.
- Gli adattamenti VC seguono il pattern `<focus>_<intensità>` (`aggro_high`, `explore_high`, ecc.) così da poter essere referenziati con ancore stabili.

Seguendo questo flusso i biomi rimangono consistenti tra dataset, interfaccia di revisione e strumenti di validazione, riducendo il rischio di regressioni durante gli aggiornamenti rapidi prima dei playtest.
