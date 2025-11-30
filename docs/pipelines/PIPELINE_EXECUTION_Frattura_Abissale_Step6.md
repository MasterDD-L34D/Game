# Esecuzione Step 6 (Strict-Mode) – Frattura Abissale Sinaptica

## Titolo step

Bilanciamento e forme dinamiche – Agente previsto: balancer

## Input attesi

- Output Step 3–5 (scheda bioma, pool/trait proposti, trait_plan e affinity proposte).
- `data/core/game_functions.yaml` per curve di scaling.
- `docs/10-SISTEMA_TATTICO.md` e `docs/11-REGOLE_D20_TV.md` per vincoli di sistema.

## Output attesi

- Raccomandazioni numeriche su buff/debuff delle correnti e intensità per ciascun livello.
- Script/logiche proposte per variazione forma del Leviatano Risonante in base alla fase bioma.
- Checklist di tuning per i trait ambientali e specie, con indicazione di valori da validare in dataset.

## Blocklist e vincoli

- **Slug**: non modificare slug di specie o trait; lavorare su referenze esistenti/proposte.
- **Biome_tags**: non alterare set definiti nello step 3; evitare nuovi tag.
- **Trait temporanei**: non aggiungere nuovi trait; usare solo quelli proposti al passo 4.
- **Affinity**: non confermare affinity definitive; segnalare solo variazioni suggerite.

## Note operative

- Prodotti solo numerici/descrittivi; nessuna patch diretta ai file YAML/JSON.
- Evidenziare rischi di stacking o overflow per la validazione successiva (step 7).
