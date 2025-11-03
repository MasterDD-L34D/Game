# Idea Engine — Changelog rilasci

> Aggiorna questo file ad ogni promozione di widget/backend per mantenere una traccia unica delle novità. Duplica lo scheletro
> qui sotto e collega sempre PR, issue o log operativi utili al review.

## 2025-12-12 · Percorso Idea Engine unificato

- Pubblicato il tutorial end-to-end in `docs/tutorials/idea-engine.md` con CTA condivise per onboarding, invio e raccolta feedback.
- Aggiornati `docs/README.md` e `README_IDEAS.md` con sezione dedicata, link rapidi e riferimenti alla tassonomia ufficiale.
- Allineati i link Support Hub per indirizzare i team verso `docs/ideas/index.html` e il modulo espresso.

## 2025-12-01 · Feedback sprint

- Introdotta la call to action finale nel report Codex con link diretto al modulo di feedback immediato.
- Allineati i README principali con procedura e link rapidi per l'ingestione del feedback.

## 2025-10-29 · Feedback nel widget

- Il widget `docs/public/embed.js` mostra un modulo "Feedback" post-submit per raccogliere commenti contestuali.
- Il backend accetta `POST /api/ideas/:id/feedback` e salva le note accanto alla proposta, includendole nel report Codex.

---

### Template per il prossimo rilascio

```
## AAAA-MM-GG · Nome rilascio
- Punto 1
- Punto 2
- Collegamenti utili: PR #, log, ticket
```
