# No Direct Import Policy

## Divieto

Non copiare direttamente file del legacy pack in `Game-Godot-v2`.

Esempi vietati:

- copiare `legacy/jobs/*.yaml` dentro `Game-Godot-v2/data/`;
- trasformare automaticamente `legacy/morph/*.yaml` in `active_effects.json` senza design review;
- usare spawn pack VTT legacy come encounter canonici;
- reintrodurre ID inglesi legacy se il progetto moderno usa tassonomia italiana/canonica.

## Motivo

Il legacy pack usa ID, assunzioni e regole precedenti al port moderno. Importarlo direttamente puo' generare:

- doppioni semantici;
- collisioni ID;
- regole parallele non testate;
- drift tra `Game` e `Game-Godot-v2`;
- regressioni nei test GUT/backend.

## Pipeline consentita

1. Leggi file legacy.
2. Cerca equivalente in `Game`.
3. Cerca equivalente in `Game-Godot-v2`.
4. Classifica.
5. Proponi design card.
6. Solo dopo approvazione, crea modifica in `Game` o doc ADR.
7. Solo dopo canonizzazione, porta/sincronizza in Godot.

## Frase standard da usare nelle PR

> Questo PR non importa dati legacy direttamente. Promuove un'idea legacy tramite design review e la allinea alla fonte canonica prima del port Godot.
