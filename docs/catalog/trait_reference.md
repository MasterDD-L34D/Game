# Trait Reference & Glossario Allineato

Questo riferimento sintetizza un sottoinsieme rappresentativo dei trait con i
relativi ID, label approvate e descrizioni narrative nelle lingue attualmente
supportate (italiano ed inglese). Tutti i valori provengono dal glossario
centralizzato `data/core/traits/glossary.json` e sono utilizzati dagli script di
sincronizzazione per popolare i bundle di localizzazione.

## Mappatura rapida

| ID trait | Label IT | Label EN | Descrizione IT | Description EN |
| --- | --- | --- | --- | --- |
| `antenne_plasmatiche_tempesta` | Antenne Plasmatiche di Tempesta | Storm Plasma Antennae | Convoglia fulmini atmosferici in attacchi mirati o scudi ionici. | Channels storm lightning into psionic strikes or shields. |
| `filamenti_digestivi_compattanti` | Filamenti Digestivi Compattanti | Digestive Compaction Filaments | Filamenti digestivi che compattano scarti e liberano spazio vitale. | Digestive filaments compact waste to free vital space. |
| `circolazione_bifasica_palude` | Circolazione Bifasica di Palude | Swamp Biphase Circulation | Doppio circuito sanguigno che separa ossigeno e agenti tossici in ambienti stagnanti. | Dual blood circuits separating oxygen flow from toxins in stagnant wetlands. |
| `ali_ioniche` | Ali Ioniche | Ionic Wings | Membrane propulsive che rilasciano micro-scariche per scatti controllati. | Propulsive membranes that pulse micro-discharges for controlled bursts. |
| `ali_membrana_sonica` | Ali a Membrana Sonica | Sonic Membrane Wings | Piastre vibranti che dissipano energia e attenuano impatti corrosivi. | Vibrating plates that dissipate energy and blunt corrosive impacts. |

Le etichette e le descrizioni qui esposte costituiscono le stringhe approvate
da utilizzare nei bundle di localizzazione. Qualsiasi modifica deve essere
registrata nel glossario prima di eseguire gli script di sincronizzazione.

## Workflow di aggiornamento

1. Aggiorna o aggiungi l'entry corrispondente in
   `data/core/traits/glossary.json`, assicurandoti di compilare almeno
   `label_<lingua>` e `description_<lingua>`.
2. Esegui `python tools/py/collect_trait_fields.py --glossary data/core/traits/glossary.json --glossary-output reports/trait_texts.json`
   per generare un estratto dei testi approvati e verificare copertura e
   incongruenze.
3. Lancia `python scripts/sync_trait_locales.py --language it` (o la lingua di
   destinazione) per propagare le stringhe approvate nei bundle.
4. Riesamina i diff prodotti in `locales/<lingua>/traits.json` e conferma che i
   campi `label` e `description` corrispondano al glossario.

## Sinergia con gli altri documenti

- [Template dati trait](../traits_template.md) descrive i campi obbligatori e
  opzionali presenti nei file del catalogo.
- [Processo di localizzazione](../process/localization.md) dettaglia gli step
  operativi per estrarre, revisionare e consegnare i testi a traduttori e
  revisori.
- [Guida contributiva trait](../contributing/traits.md) fornisce checklist e
  strumenti da seguire prima di aprire una PR.

Seguendo il flusso qui sopra si garantisce che le varianti locali dei trait
restino allineate con i nomi e le descrizioni approvate dal team di design.
