# Tutorial rapido — CLI Evo Tactics

![CLI quickstart](../../assets/tutorials/cli-quickstart.svg)

## Obiettivo
Eseguire un ciclo completo di setup, validazione e generazione demo per verificare che la CLI sia operativa.

## Passaggi
1. **Setup ambiente** — installa dipendenze Node e Python come indicato nel [Setup rapido](../../README.md#setup-rapido).
2. **Validazione dataset** — da `tools/py/` esegui `python3 game_cli.py validate-datasets` per assicurarti che gli YAML siano coerenti.
3. **Generazione encounter demo** — sempre da `tools/py/` lancia `python3 game_cli.py generate-encounter savana --party-power 18 --seed demo` e condividi l'output nel canale `#feedback-enhancements` se emergono anomalie.

## Consigli
- Attiva il virtualenv prima di eseguire i comandi Python (`source .venv/bin/activate`).
- Usa il flag `--json-out` con `validate-ecosystem-pack` per salvare il report in `packs/evo_tactics_pack/out/validation/`.
