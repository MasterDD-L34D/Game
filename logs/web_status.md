# Programmazione riesami sito web

I riesami del sito avvengono settimanalmente (lunedì, ore 10:00 CET) con la
partecipazione di referente design, QA e devops. Durante il riesame si
analizzano:

- lo stato dell'ultima pipeline CI/staging;
- le regressioni aperte e le mitigazioni pianificate;
- la copertura funzionale rispetto ai target (≥80%);
- i feedback qualitativi raccolti da marketing/supporto.

Al termine del riesame, aggiornare gli obiettivi prioritari per la settimana
successiva e registrare eventuali task di follow-up in roadmap.

## Azioni periodiche

- [ ] Eseguire `python tools/py/update_web_checklist.py` entro il giorno del
      riesame per garantire dati aggiornati.
- [ ] Pianificare i test manuali cross-device e allegare gli esiti nel channel
      `#web-status`.
- [ ] Riesaminare i ticket aperti in `docs/process/qa_reporting_schema.md` e
      aggiornare stato/owner.

## Registro stato

<!-- web_log:start -->
Nessuna esecuzione registrata.
<!-- web_log:end -->
