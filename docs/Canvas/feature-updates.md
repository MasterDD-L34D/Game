# Canvas — Aggiornamenti Rapidi

## Nuove feature
- **CLI Pack Rolling (TS/Python)** — Gli script `tools/ts/roll_pack` e `tools/py/roll_pack.py` permettono di simulare l'assegnazione dei pacchetti PI usando `data/packs.yaml`, mantenendo parità funzionale tra stack tecnologici.
- **Generatore Encounter Python** — `tools/py/generate_encounter.py` sfrutta `data/biomes.yaml` per derivare difficoltà, affissi dinamici e adattamenti VC, utile per playtest veloci.

## Regole di gioco evidenziate
- **Economia PI** — I costi e i massimali (`pi_shop.costs`/`caps`) definiscono la cadenza di progressione e i limiti per i pack iniziali.【F:data/packs.yaml†L1-L17】
- **Bias per Forma** — Le tabelle `bias_d12` forniscono controllo sullo skew dei pacchetti in base al MBTI scelto, abilitando tuning mirato delle build iniziali.【F:data/packs.yaml†L18-L88】
- **Adattamenti VC per Bioma** — I flag `vc_adapt` determinano come gli encounter scalano controlli, guardia, imboscate e burst secondo i segnali di telemetria della squadra.【F:data/biomes.yaml†L6-L13】
- **Regole Ibride di Mating** — Le combinazioni in `hybrid_rules` chiariscono le fusioni locomozione/sensi quando due forme condividono caratteristiche uniche.【F:data/mating.yaml†L25-L32】

## Dati YAML aggiornati
- **Biomi** — Ogni voce contiene difficoltà base, modificatori e affissi tematici (es. `savana`, `caverna`, `palude`).【F:data/biomes.yaml†L1-L5】
- **Telemetria VC** — Le finestre EMA, gli indici VC e le formule MBTI/Ennea supportano il nuovo layer di analytics live per sessioni co-op.【F:data/telemetry.yaml†L1-L25】
- **Standard di Nido** — I profili `dune_stalker` ed `echo_morph` specificano ambiente, struttura e risorse, fungendo da baseline per la progressione narrativa di clan.【F:data/mating.yaml†L13-L24】
