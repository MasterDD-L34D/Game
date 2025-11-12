# Branch: `ancestors/rfc-sentience-v0.1`

**Purpose.** Questa branch introduce il **MVP per i Tratti di Sensienza (T1–T6)** e l’ossatura dati ispirata ad *Ancestors: The Humankind Odyssey*, per migliorare specie e comportamenti nel progetto **Evo Tactics**.

## Contenuti previsti nella branch
- `docs/RFC_Sentience_Traits_v0.1.md` — Documento di intenti (RFC).
- `data/traits_sensienza.yaml` — Tiers T1..T6 + interocezione (proprio-, vestibolo-, noci-, termo-cezione).
- `data/neurons_bridge.csv` — Hook leggeri tra tier e nodi di Ancestors (unlock/effects).
- `docs/sources.md` — Fonti permanenti (wiki, scientifiche, antroposofia).
- `docs/CHECKLIST_TODO.md` — Tracker con legenda ☑ / ☐→☑ / ☐ (leggibile su schermi stretti).
- `docs/ROADMAP.md` — Fasi A/B/C, criteri di accettazione e gate.
- `.github/pull_request_template.md` — Template PR per QA e gate di approvazione.
- `CHANGELOG.md` — Changelog in formato *Keep a Changelog*.

## Come creare e popolare la branch
```bash
# 1) creare la branch
git checkout -b ancestors/rfc-sentience-v0.1

# 2) copiare nella branch i pacchetti già preparati
#   - ancestors_evo_pack_v1_3.zip (Senses 37/37 + seed Ambulation)
#   - evo_sentience_rfc_pack_v0_1.zip (RFC + traits + bridge + sources)
# (scompatta entrambi nella root della branch)

# 3) commit con Conventional Commits
git add .
git commit -m "feat(sentience): add RFC v0.1 + traits and neurons bridge (MVP)"
git push -u origin ancestors/rfc-sentience-v0.1
```

> **Note GitHub:** il **pull request template** deve esistere nella *default branch* (o nella directory `.github/` della repo) per essere proposto automaticamente quando apri la PR. In alternativa, mantienilo qui e copialo poi in `main`/`default`. 

## Standard e convenzioni
- **Commit:** [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- **PR Template:** GitHub supporta `.github/pull_request_template.md` e `.github/PULL_REQUEST_TEMPLATE/*.md`.
- **Changelog:** formato *Keep a Changelog* con SemVer.

## Struttura suggerita
```
/docs
  RFC_Sentience_Traits_v0.1.md
  CHECKLIST_TODO.md
  ROADMAP.md
/data
  traits_sensienza.yaml
  neurons_bridge.csv
/.github
  pull_request_template.md
CHANGELOG.md
README.md
```

---

**Data:** 2025-10-29  
**Owner:** Team Evo Tactics — Sentience Track
