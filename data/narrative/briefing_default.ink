// Briefing di default — prima missione / missione generica.
// Compilare con inklecate: inklecate -o briefing_default.ink.json briefing_default.ink
//
// Tags UI: #speaker:<id>, #mood:<stato>
// External functions (bind via narrativeEngine.bindSessionData):
//   getUnitName(unitId), getUnitHp(unitId), getVCScore(metric), getSessionVar(key)

Comandante, squadra pronta per la missione. #speaker:commander
Rapporto: bioma target con resistenze variabili. #speaker:commander

* [Assalto diretto]
  Assalto confermato. Formazione serrata. #speaker:commander #mood:determined
  -> debrief
* [Ricognizione prima]
  Ricognizione avviata. Scanner attivi, difensiva. #speaker:commander #mood:cautious
  -> debrief

== debrief ==
Missione completata. Analisi performance in corso. #speaker:analyst
Fine rapporto.
-> END
