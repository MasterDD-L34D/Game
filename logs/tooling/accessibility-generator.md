# Audit accessibilità – generator

- **Data esecuzione**: 2025-10-27
- **Strumento**: Lighthouse (accessibility, Chromium 140)
- **Punteggio complessivo**: 0.97

## Contrasto
- ✅ Nessuna violazione rilevata dai controlli automatici.

## Focus e dimensione target
- ⚠️ I link della navigazione ancora (`.anchor-nav__link`) e i pulsanti per esportazione/azzeramento log sotto i 24×24 px minimi. Lighthouse segnala tre occorrenze legate al criterio [WCAG 2.5.8 Target Size (Minimum)].

## ARIA e struttura
- ✅ Tutti i controlli ARIA e landmark hanno superato i test automatici.

## Azioni intraprese
- Ampliate le hit-area e il padding dei link rapidi e dei pulsanti primari per rispettare i requisiti touch/focus.
- Introdotto un messaggio di fallback per la selezione preset quando il manifest non è disponibile, migliorando lo stato annunciato via ARIA.
