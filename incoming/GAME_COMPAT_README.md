
# GAME — Hook Enneagramma (integrazione)

**Target repo:** `MasterDD-L34D/Game`

## Dove agganciare
- `tools/ts/validate_species.ts` — punto probabile per leggere/validare schemi (aggiungere validazione `personality.enneagram` o loader).
- `tools/py/validate_species.py` — equivalente Python (se usi pipeline Py).
- `tools/py/game_cli.py` — eventuale comando per `apply-hooks` o `generate-effects`.

## Passi consigliati
1. **Estrarre STAT/EVENTI canonici** presenti nel repo (naming reale).
2. **Aggiornare `compat_map.json`** (sezione `stats` e `events`) con nomi reali.
3. **Abilitare gli hook** del file `personality_module.v1.json` nel tuo orchestratore (scene/combat loop):
   - core_emotion / hornevian / harmonic / object_rel: max 1–2 hook attivi alla volta (vedi limiti).
   - instints & stacking: passivi; lo stacking sostituisce la variante base.
4. **Test rapidi**: 9 tipi × 2 ali × 6 stackings (108 profili) — smoke test.
5. **Bilanciamento**: resta su +5%/+2flat/1T finché non emergono dati di playtest.

## Snippet di pseudo‑codice (TS)
```ts
import personalityModule from './personality_module.v1.json';
import compat from './compat_map.json';

function applyEnneagramHooks(pc, encounter) {
  const profile = pc.personality?.enneagram;
  if (!profile) return;

  const hooks = personalityModule.mechanics_registry.hooks;

  for (const h of hooks) {
    if (!eligible(h, profile)) continue;
    if (!eventTriggered(h.trigger, encounter)) continue;
    for (const eff of h.effects) {
      const stat = resolveStat(eff.stat, compat.stats);
      applyEffect(pc, stat, eff);
    }
  }
}
```
> Sostituisci `resolveStat/applyEffect/eventTriggered` con le tue funzioni e nomi reali di STAT/EVENTI.
