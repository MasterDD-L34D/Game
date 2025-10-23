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

## Interfaccia test & recap via web
- [Apri la dashboard](docs/test-interface/index.html) per consultare rapidamente pacchetti PI,
  telemetria VC, biomi e compatibilità delle forme (funziona sia in locale sia online).
- **Online subito (GitHub Pages)**: abilita la pubblicazione da `Settings → Pages → Build and
  deployment → Deploy from a branch`, scegli `work` (o il branch desiderato) e la cartella `/docs/`.
  L'URL diventa `https://<tuo-utente>.github.io/<repo>/test-interface/`, con fetch automatico degli
  YAML via `raw`.
- **Uso locale**: avvia un server dalla radice (`python3 -m http.server 8000`) e visita
  `http://localhost:8000/docs/test-interface/` per lavorare offline.
- Premi "Ricarica dati YAML" dopo aver modificato i file in `data/`, quindi "Esegui test" per i
  controlli rapidi di integrità sui dataset caricati.
- Per aggiornamenti al volo, incolla l'URL di uno snapshot YAML/JSON nel form "Fetching manuale" e
  premi "Scarica & applica" per un merge immediato nel dataset di sessione. In hosting remoto puoi
  forzare sorgenti alternative con `?data-root=<url-assoluto-o-root-relative>` e cambiare branch `raw`
  con `?ref=<branch>`.

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

## Sincronizzazione contenuti ChatGPT
- Configura le fonti da monitorare in `data/chatgpt_sources.yaml` (URL del progetto, canvas esportati, ecc.).
- Installa le dipendenze Python richieste (`pip install requests pyyaml` se non già presenti).
- Esegui `python3 scripts/chatgpt_sync.py --config data/chatgpt_sources.yaml` per scaricare gli snapshot giornalieri.
- Controlla i diff generati in `docs/chatgpt_changes/<namespace>/<data>/` e il riepilogo in `logs/chatgpt_sync_last.json`.
- Aggiorna `docs/chatgpt_sync_status.md` con note operative e credenziali aggiornate.

## Licenza
MIT — vedi `LICENSE`.
