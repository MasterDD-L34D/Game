
# Flow di allineamento STAT/EVENTI (repo Game)

1. **Esegui lo scanner** sul tuo checkout locale di `Game`:
   ```bash
   python scan_engine_idents.py --root /path/to/Game --out scan_results.json
   ```
2. **Apri `scan_results.json`** e verifica:
   - Nomi **STAT** (es. `initiative`, `evasion`, `hp_max`, ecc.).
   - Nomi **EVENTI** (es. `onFirstBlood`, `on_first_blood_received`, `onInitiativeWin`).
3. **Aggiorna `compat_map.json`**:
   - Inserisci i nomi reali come **canonici** e sposta i nostri in `aliases` se diverso.
4. **(TS) Integra `hook_bindings.ts`** nell’orchestratore:
   - Leggi il profilo `personality.enneagram` del PG e chiama `bindHooks(profile)` per ottenere gli hook attivi con STAT risolte.
5. **Test** su 3–4 casi tipo, poi estendi.

> Questo flusso permette di mappare l'Enneagramma senza toccare logiche di combattimento: basta collegare gli **eventi** esistenti e applicare piccoli effetti *per 1 turno*.
