# Evo-Tactics — Progetto Gioco Evolutivo Tattico (Repo Starter)

Repository avviabile per il progetto: tattico co-op su TV/app con sistema d20, evoluzione alla *Spore*, Forme MBTI→16, Enneagram Themes, telemetria VC, tratti/mutazioni, pacchetti PI, NPG reattivi per bioma, Mating/Nido.

> Questo è uno **starter** pronto all’uso: dati YAML, script CLI (TS/Python), e struttura CI. È progettato per essere caricato su **GitHub** e condiviso su **Google Drive**.

## Struttura
```
evo-tactics/
├─ docs/                 # Note progettuali (da Canvas A–D), checklist, piani
├─ data/                 # Dataset YAML (telemetria, pack PI, biomi, mutazioni, ecc.)
├─ tools/
│  ├─ ts/                # CLI TypeScript (roll_pack)
│  └─ py/                # CLI Python (roll_pack, generate_encounter)
├─ .github/workflows/    # CI su push
├─ scripts/              # Utility (Drive, pubblicazione)
└─ README.md
```

## Quick Start — Node/TypeScript
```bash
cd tools/ts
npm install
npm run build
node dist/roll_pack.js ENTP invoker ../../data/packs.yaml
```

## Quick Start — Python
```bash
cd tools/py
python3 roll_pack.py ENTP invoker ../../data/packs.yaml
python3 generate_encounter.py savana ../../data/biomes.yaml
```

## Pubblicazione su GitHub
```bash
cd /path/alla/cartella/evo-tactics
git init
git add .
git commit -m "chore: bootstrap repo starter"
git branch -M main
git remote add origin https://github.com/<tuo-utente>/<repo>.git
git push -u origin main
```

## Condivisione su Google Drive
- Carica lo **zip** generato da ChatGPT su Drive (o estrai e carica la cartella).
- (Opzionale) Usa lo script `scripts/driveSync.gs` come **Apps Script** su una cartella Drive per trasformare alcuni YAML in Google Sheet.

## Licenza
MIT — vedi `LICENSE`.
