# Achievement table (rimossa da flint/README.md)

Originale table achievement system Flint (rimossa in PR #1556 su motivazione Liberty/NTNU tangible rewards research).

| Emoji | Titolo             | Condizione                             |
| ----- | ------------------ | -------------------------------------- |
| 🎯    | Game-First Striker | 3 commit GAMEPLAY di fila              |
| ✂️    | Ruthless Cutter    | 2+ commit di rimozione negli ultimi 10 |
| 🏔️    | Pillar Diversifier | 3+ pilastri toccati in 5 commit        |
| 🌱    | Fresh Breath       | 1° GAMEPLAY dopo 3+ INFRA di fila      |
| 🧹    | Clean Workspace    | zero file dirty                        |
| 🦴    | Unga Bunga         | gameplay ratio ≥ 60%                   |
| ⚠️    | Docker Addict      | WARN: 5+/10 commit INFRA               |
| 📜    | Wordy Committer    | WARN: 3+ messaggi >80 char             |

## Hook automatico (sezione rimossa FLINT.md)

Descriveva setup `caveman install-hook` / `uninstall-hook` + post-commit throttling 90min.

**Motivazione kill**: Stackdevflow 2026 — hooks a volte più lenti del commit stesso; friction 500ms × 20 commit/giorno senza ROI misurabile.

## Implementation code

Il modulo Python completo `achievements.py` (8 achievement + compute_achievements + ALL_ACHIEVEMENTS) è preservato in `../code/achievements.py` con logica pattern-matching su snapshot repo.
