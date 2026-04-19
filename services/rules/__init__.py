# @deprecated (M6-#4 Phase 1, 2026-04-19)
# Python rules engine deprecated in favour of Node runtime canonical.
# User direction "1 solo gioco online, senza master" → tabletop DM feature
# morta. Node session engine (apps/backend/) = single source of truth.
# Vedi services/rules/DEPRECATED.md + docs/adr/ADR-2026-04-19-kill-python-rules-engine.md
# NO new features. NO bug fixes non-blocking. Porting a Node.

"""Rules engine d20 per Evo-Tactics.

Modulo puro: nessun I/O globale, nessun state. Tutte le funzioni prendono
input espliciti e restituiscono dict conformi agli schemi di
``packages/contracts/schemas/``. Consumer principale: il worker bridge
(Fase 6) chiamato dall'orchestratore Node via stdin/stdout JSON line.

Vedi ADR-2026-04-13-rules-engine-d20.md per il design complessivo.
"""
