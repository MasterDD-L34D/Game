# ascii_matrix_methods.py
# Tool: Matrici ASCII per valutazione di moduli, branch, inserimenti

from tabulate import tabulate

# Esempio di schema per valutare un nuovo blocco o branch
criteria = ["Coerenza", "Innovazione", "Compatibilità Telemetria", "Drift Risk", "Elasticità"]


def evaluate_block(name, scores):
    if len(scores) != len(criteria):
        raise ValueError("Score count mismatch")

    table = [[criteria[i], scores[i]] for i in range(len(scores))]
    return f"\n📊 Valutazione: {name}\n" + tabulate(table, headers=["Criterio", "Punteggio (0–5)"], tablefmt="fancy_grid")


# Uso d'esempio
if __name__ == "__main__":
    new_branch = "VC-Hook-Beta"
    scores = [4, 3, 5, 1, 4]  # esempio: buoni valori tranne rischio drift
    print(evaluate_block(new_branch, scores))
