# auto_eval_from_yaml.py
# Genera punteggi di valutazione automatica da un blocco YAML

import yaml
from ascii_matrix_methods import evaluate_block
import sys

WEIGHTS = {
    "keywords": {"innovation": ["nuovo", "inedito", "ibrido"],
                  "drift_risk": ["sperimentale", "anomalia", "random"]},
    "fields": ["biome", "mutation", "interaction", "intent"]
}


def score_block(data):
    scores = [0, 0, 0, 0, 0]  # Coerenza, Innovazione, Compatibilità, Drift Risk, Elasticità

    # 1. Coerenza (field match + intent presence)
    if all(field in data for field in WEIGHTS["fields"]):
        scores[0] = 4
    if "intent" in data and "target" in data["intent"]:
        scores[0] += 1

    # 2. Innovazione (keyword scan)
    if any(k in str(data).lower() for k in WEIGHTS["keywords"]["innovation"]):
        scores[1] = 4

    # 3. Compatibilità Telemetria
    if "interaction" in data and "VC" in str(data["interaction"]):
        scores[2] = 5

    # 4. Drift Risk
    if any(k in str(data).lower() for k in WEIGHTS["keywords"]["drift_risk"]):
        scores[3] = 3

    # 5. Elasticità
    if "mutation" in data and type(data["mutation"]) == list:
        scores[4] = 4 if len(data["mutation"]) > 1 else 2

    return scores


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python auto_eval_from_yaml.py <file.yaml>")
        sys.exit(1)

    with open(sys.argv[1], 'r') as f:
        data = yaml.safe_load(f)

    block_name = data.get("name", "Unnamed Block")
    scores = score_block(data)
    print(evaluate_block(block_name, scores))
