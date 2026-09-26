# ERMES Lab

**E.R.M.E.S. — Ecosystem Research, Measurement & Evolution System**

Prototype isolato per simulazione, misurazione e tuning ecosistemico.

## Comandi

```bash
python prototypes/ermes_lab/ermes_sim.py --test
python prototypes/ermes_lab/ermes_sim.py --cli
python prototypes/ermes_lab/scoring.py --runs 25
```

Dashboard opzionale:

```bash
pip install streamlit
streamlit run prototypes/ermes_lab/ermes_dashboard.py
```

## Output

```text
outputs/latest_eco_pressure_report.json
outputs/latest_history.csv
outputs/experiment_results.csv
outputs/best_config.json
```
