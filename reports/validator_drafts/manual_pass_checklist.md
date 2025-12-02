# Checklist pre-patch – validator drafts

## Rischi su slug e naming
- Gli otto trait in `data/traits/_drafts` usano slug con suffisso `_2` che duplicano slug già presenti (es. `artigli_sette_vie` vs `artigli_sette_vie_2`). Servono decisioni su alias/reskin per evitare collisioni di riferimento e i18n al momento dell’import definitivo.
- Nel draft trait di Frattura Abissale Sinaptica non è stato risolto il naming `voidsong` vs `void_song`; bisogna normalizzare lo slug prima della patch per evitare doppie varianti.

## Allineamento trait/specie/bioma
- I trait `_2` sono placeholder: mancano requisiti ambientali, usage_tags, sinergie/conflitti e non sono agganciati a specie o pool bioma; così restano orfani rispetto ai piani specie/bioma.
- I pool e i trait della Frattura Abissale Sinaptica sono citati nei draft specie/bilanciamento, ma i temp_traits richiamati non hanno ancora gating o flag di applicazione bioma/specie; serve completare la modellazione prima della scrittura dati.

## Stacking e sinergie
- Il draft stesso segnala rischio di stacking per i temp_traits (es. `riverbero_memetico`, `canto_risonante`), ma nei dati i campi `sinergie`/`conflitti` sono vuoti: aggiungere mutual exclusivity, stack cap o diminishing returns.
- Altri temp_traits del bioma (`pelle_piezo_satura`, `scintilla_sinaptica`, `vortice_nera_flash`) non hanno note di stacking o cooldown codificate, pur essendo richieste nel bilanciamento: vanno specificati prima di applicare patch.

## Azioni consigliate prima della patch
- Definire slug definitivi per i trait `_2` o trasformarli in revisioni dell’esistente con mapping chiaro (index + i18n). 
- Allineare i trait `_2` a biomi/specie con requisiti ambientali e usage_tags minimi, per chiuderne i completion_flags.
- Normalizzare lo slug voidsong/void_song e aggiornare eventuali reference nei draft.
- Integrare nei temp_traits le regole di stacking richieste (cooldown, stack_max, esclusioni) per evitare exploit quando saranno legati ai pool/specie.
