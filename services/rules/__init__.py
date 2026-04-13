"""Rules engine d20 per Evo-Tactics.

Modulo puro: nessun I/O globale, nessun state. Tutte le funzioni prendono
input espliciti e restituiscono dict conformi agli schemi di
``packages/contracts/schemas/``. Consumer principale: il worker bridge
(Fase 6) chiamato dall'orchestratore Node via stdin/stdout JSON line.

Vedi ADR-2026-04-13-rules-engine-d20.md per il design complessivo.
"""
