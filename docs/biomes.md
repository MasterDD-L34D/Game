# Guida al dataset dei Biomi

Questa guida descrive lo schema dei biomi usato dalla dashboard di test (`docs/test-interface`) e i passaggi consigliati per mantenere allineati dati, interfaccia e script di verifica.

## Struttura del file `data/core/biomes.yaml`

Ogni voce è indicizzata dal nome tecnico del bioma e include i campi seguenti:

- **label** e **summary** – titolo in lingua e riassunto narrativo mostrati nelle card della dashboard.
- **diff_base** e **mod_biome** – valori numerici usati per i chip di difficoltà/pressione.
- **affixes** – elenco di tag sintetici resi come pill di riferimento rapido.
- **aliases** (opzionale) – lista di slug legacy utili a risolvere riferimenti storici o file importati; se presenti vanno
  sincronizzati con `data/core/biome_aliases.yaml`.
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

## Biomi attualmente definiti (dataset `data/core/biomes.yaml`)

| ID canonico         | Etichetta             | Hazard severity | Diff/Mod | Hook narrativi |
|---------------------|-----------------------|-----------------|----------|----------------|
| `savana`            | Savana Ionizzata      | medium          | 2 / 1    | 2              |
| `caverna`           | Caverna Risonante     | high            | 3 / 2    | 2              |
| `palude`            | Palude Tossica        | medium          | 3 / 1    | 2              |
| `canyons_risonanti` | Canyons Risonanti     | high            | 4 / 2    | 2              |
| `foresta_miceliale` | Foresta Miceliale     | medium          | 3 / 2    | 2              |
| `atollo_obsidiana`  | Atollo Obsidiana      | high            | 4 / 3    | 2              |
| `stratosfera_tempestosa` | Stratosfera Tempestosa | high      | 5 / 4    | 2              |
| `mezzanotte_orbitale` | Mezzanotte Orbitale | high            | 4 / 3    | 2              |

Tutte le voci includono i blocchi obbligatori (`hazard`, `npc_archetypes`, `narrative.hooks`). I valori `Diff/Mod`
riportano rispettivamente `diff_base` e `mod_biome`, mentre la colonna dei hook indica il numero di spunti narrativi
presenti. In assenza di `vc_adapt_refs` espliciti, la dashboard userà le raccomandazioni predefinite basate sulla
severità dell'hazard.

## Alias legacy e merge dei dataset

Le migrazioni da dataset più vecchi sfruttano `data/core/biome_aliases.yaml`, che mappa gli identificativi storici verso gli ID
canonici riportati sopra. Quando si integra un aggiornamento massivo proveniente da un branch esterno:

1. **Allinea i nomi** – verificare che eventuali nuovi slug o modifiche negli ID siano riflessi sia nella sezione `aliases`
   delle singole voci, sia nel file `data/core/biome_aliases.yaml`.
   - Esempio: lo slug abbreviato `stratosfera` ora reindirizza verso `stratosfera_tempestosa` mantenendo la compatibilità con i
     vecchi snapshot dati.
2. **Normalizza le strutture** – assicurarsi che ogni bioma mantenga i blocchi obbligatori e che le nuove proprietà siano
   documentate in questa guida.
3. **Esegui i controlli** – lanciare `scripts/cli_smoke.sh` per validare la presenza di hazard, archetipi e hook; quindi
   aprire la dashboard per confermare che badge e link VC funzionino con i dati aggiornati.
4. **Documenta le differenze** – riportare in questa guida variazioni di schema, nuovi alias o cambiamenti nelle tabelle
   condivise (`vc_adapt`, `mutations`, `frequencies`).

## Flusso di aggiornamento suggerito

1. **Allineare i dati** – modificare `data/core/biomes.yaml`, assicurandosi che ogni bioma disponga dei blocchi obbligatori indicati sopra.
2. **Eseguire lo smoke test** – lanciare `scripts/cli_smoke.sh` (con o senza profilo specifico). Lo script include un controllo YAML che verifica label, summary, difficoltà/modificatori, affissi, hazard (con severità normalizzata), archetipi, stresswave e tono/hook narrativi; in caso di mancanze fallisce con un report dettagliato e stampa le metriche di copertura rilevate.
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
