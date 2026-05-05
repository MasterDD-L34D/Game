# Recommended First Sprint: Legacy Job Recovery Pass

## Obiettivo

Recuperare il valore dei 6 job legacy senza importare direttamente le vecchie schede YAML.

Job:

- skirmisher
- vanguard
- warden
- artificer
- invoker
- harvester

## Output atteso

Una tabella moderna per ogni job:

| Job | Ruolo tattico | Fantasy | Core loop | Trait synergy | Dipendenze | Rischio | Prossimo passo |
| --- | ------------- | ------- | --------- | ------------- | ---------- | ------- | -------------- |

## Criteri di qualita'

- Non duplicare sistemi esistenti.
- Non introdurre ID legacy se esiste tassonomia canonica moderna.
- Ogni job deve avere una ragione tattica chiara.
- Ogni proposta deve indicare se appartiene a `Game` dataset/spec o a `Game-Godot-v2` UI/runtime.
- Nessuna modifica codice nel primo pass salvo richiesta esplicita.

## Priorita' stimata

| Job        | Priorita'  | Perche'                                                 |
| ---------- | ---------- | ------------------------------------------------------- |
| skirmisher | alta       | mobile/flank, facile da integrare con posizione e trait |
| vanguard   | alta       | tank/frontline, utile per co-op tattico                 |
| warden     | media      | controllo/protezione, richiede zone/terrain             |
| artificer  | media-alta | apre gear/tag/surge, ma rischio alto                    |
| invoker    | media      | bioma/hazard/status, dipende da encounter runtime       |
| harvester  | media-alta | collega loot/evoluzione/lineage, ma va controllato      |
