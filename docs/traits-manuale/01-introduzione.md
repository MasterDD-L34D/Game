# Introduzione e fonti dati

I trait rappresentano la spina dorsale del catalogo di Evo Tactics: definiscono abilità, vincoli narrativi e interazioni sistemiche ed ereditano la struttura tecnica descritta dallo schema JSON pubblicato nel repository. Il pacchetto principale abbina lo schema canonicale, il catalogo aggregato e i validatori CI dedicati così da mantenere allineate tutte le copie presenti nei pack e negli strumenti di authoring.【F:docs/README_TRAITS.md†L1-L26】

Il template ufficiale esplicita campi obbligatori, vincoli di formato e sezioni opzionali che possono essere attivate in base alle esigenze di design. Questo framework garantisce coerenza editoriale (glossario, localizzazioni) e interoperabilità con le pipeline di sincronizzazione e audit.【F:docs/traits_template.md†L1-L99】

Dal punto di vista operativo, la guida "How To" definisce il flusso end-to-end per gli autori: dalla preparazione del glossario alla compilazione dei file trait, passando per la validazione con gli script Python dedicati e la check-list PR finale.【F:README_HOWTO_AUTHOR_TRAIT.md†L1-L72】 La guida "Contributing" complementa il percorso fornendo la panoramica sugli strumenti, sulle dipendenze e sulle procedure di audit manuale o tramite editor UI, così da integrare rapidamente i nuovi contributi nel catalogo condiviso.【F:docs/contributing/traits.md†L1-L142】

L'obiettivo del manuale è consolidare queste fonti in un'unica vista organizzata per capitoli tematici: le sezioni successive approfondiscono il modello dati, la tassonomia, le correlazioni con specie/eventi/regole ambientali e i workflow che orchestrano le attività quotidiane.
