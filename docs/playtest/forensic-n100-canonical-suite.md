# Canonical AI-driven playtest suite -- forensic-n100

Manifest: `C:\dev\Game-forensic\docs\playtest\canonical-suite.yaml` | N=100 (ratify) | all_in_band: **False**

| scenario                          | key         | band       | WR (N)      | in-band | knob                                        |
| --------------------------------- | ----------- | ---------- | ----------- | ------- | ------------------------------------------- |
| enc_tutorial_06_hardcore          | hardcore_06 | [15%, 25%] | 53.0% (100) | NO      | `{"boss_hp_multiplier": 0.65}`              |
| enc_tutorial_07_hardcore_pod_rush | hardcore_07 | [30%, 50%] | 52.0% (100) | NO      | `{"enemy_damage_multiplier_override": 2.1}` |

Method SoT: `docs/process/CANONICAL-AI-PLAYTEST.md`. Repro: host 127.0.0.1, LOBBY_WS_ENABLED=false, DAMAGE_CURVES_PATH pinned.
