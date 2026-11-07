# Sistema di Accoppiamento (Mating) — Bozza

**Principi dal progetto:**
- Non esiste sesso “rigido”: compatibilità ampia tra forme/specie.
- È possibile accoppiarsi con ex-nemici (NPG del *Regista*), previa **Recruit** e soddisfazione requisiti Nest.
- Attrazione e disponibilità basate su **MBTI** + **Enneagramma** + **Tabelle Piace/Non Piace** + **Trust**.

## Flusso
1. **Affinity/Attraction Check** (scena sociale o a fine incontro)
   - Tira 1d20 + modificatori da *MBTI match*, *Ennea themes*, *Piace/Non Piace*.
   - CD base 12; CD ±2 in base al contesto (bioma, esito battaglia, regista).
2. **Convincimento/Interazione**
   - Supera 2 prove narrative (dialogo/aiuto/salvataggio) per convertire l'NPG a **Recruit** (vedi social/affinity_trust.md).
3. **Requisiti Nest**
   - Verifica `nest/requirements.yaml`. Se soddisfatti e **Trust ≥ 3**, sblocchi **Mating**.
4. **Deporre Uovo/Prole**
   - Richiede standard del partner (cultura/comfort/risorse). Se rispettati, ottieni 1 **uovo** (o equivalente).
   - L'uovo matura in **seed epigenetici** o in **nuovo membro** (campagna decide).

## Modificatori (esempi rapidi)
- **MBTI**: coppie complementari (es. ENTP↔ISFJ) +2; similari (ENTP↔ENTP) +1; conflittuali -2.
- **Enneagramma**: temi sinergici (7 con 3) +1; antagonismo -1.
- **Piace/Non Piace**: +1/-1 a seconda delle tabelle bioma/cultura.
- **Telemetry**: `cohesion ≥ 0.6` +1; `tilt ≥ 0.6` -1.

## Esito e Ricompense
- Mating riuscito: ottieni 1–2 **seed**; opzionale: nuovo alleato reclutabile.
- Fallimento critico: Trust -1 e *cooldown* di 1 missione.
