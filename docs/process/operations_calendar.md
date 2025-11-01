# Calendario Operazioni

Questo calendario consolida le principali attività ricorrenti di manutenzione e controllo operative. Le finestre temporali sono espresse in UTC salvo indicazioni differenti.

## Panoramica mensile

| Frequenza | Finestra | Attività | Automazione | Owner principale | Output | Checklist |
|-----------|----------|----------|-------------|------------------|--------|-----------|
| Mensile (1° giorno) | 06:00 UTC | Manutenzione dataset trait | Workflow GitHub Actions `Traits Monthly Maintenance` | Data Operations (rotazione: @biome-lead, @traits-curator) | `logs/monthly_trait_maintenance/` (report + status) | Vedi [Checklist manutenzione trait](#checklist-manutenzione-trait) |

## Dettaglio attività

### Manutenzione mensile trait

- **Trigger**: pianificazione automatica il primo giorno di ogni mese alle 06:00 UTC (`cron: 0 6 1 * *`).
- **Script eseguito**: [`scripts/cron/traits_monthly_maintenance.sh`](../../scripts/cron/traits_monthly_maintenance.sh) (richiama audit principali, pulizia cache e verifica campi deprecati).
- **Output**:
  - Report Markdown time-stamped in `logs/monthly_trait_maintenance/`.
  - File di stato JSON con contatore anomalie (`status-*.json`).
  - Report dettagliato degli audit (`trait_audit_*.md` + log runtime).
- **Notifiche**:
  - In caso di anomalie il workflow apre automaticamente un'issue etichettata `maintenance`, `automation`, `needs-triage` con il riepilogo e i link al report.
  - Gli owner sono responsabili di triagare l'issue entro 48 ore.

#### Checklist manutenzione trait

1. Verificare l'issue automatica (se presente) e confermare le anomalie nel report Markdown più recente.
2. Aggiornare o riparare i dataset (`data/traits/` e fonti correlate) secondo le indicazioni dell'audit.
3. Rieseguire localmente lo script se sono stati applicati fix correttivi importanti per confermare la risoluzione.
4. Chiudere l'issue automatica annotando le azioni intraprese e allegando eventuali patch aggiuntive.

### Note su responsabilità e escalation

- **Owner primari**: Data Operations segue una rotazione mensile fra i referenti `@biome-lead` e `@traits-curator` che devono garantire la revisione del report.
- **Backup**: in caso di assenza degli owner, il referente `@operations-squad` assume la responsabilità di triage.
- **Escalation**: anomalie bloccanti che impattano la pipeline di pubblicazione vanno riportate nel canale `#ops-critical` con link al report e issue automatica.

### Checklist generale operazioni mensili

- [ ] Confermare che la workflow `Traits Monthly Maintenance` abbia completato l'ultima run programmata.
- [ ] Archiviare gli artefatti dei report rilevanti nel drive condiviso operativo (cartella `Traits/Manutenzione`).
- [ ] Aggiornare questo calendario se cambiano frequenze, owner o checklist.
