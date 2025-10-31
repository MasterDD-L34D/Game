# QA & KPI

## Test Monte Carlo (per bioma/tier)
- 10k offerte simulate
- KPI:
  - ≥95% offerte con ≥1 sinergica
  - ≤10% offerte con 3 carte stesso tag
  - Skip-rate mediano ∈ [18%, 32%]
  - Entropia di tag medio-alta (0.85–1.10 normalizzato)
  - Nessuna carta con pick-rate >55% nelle prime 3 offerte

## Failure-modes & Contromisure
- Dry offers → rimpiazzo peggiore con “ancora di build”
- Skip-spam → cap per atto + decay consecutivi
- Combo snowball → max_copies=1 + duplicate_penalty + cooldown
- Run-rigidity → 10% wildcard da tag non dominanti
