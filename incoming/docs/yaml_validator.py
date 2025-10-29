# yaml_validator.py
# Validatore per dataset YAML usati nel sistema di telemetria Evo-Tactics

import yaml
import sys

REQUIRED_FIELDS = ["biome", "mutation", "outcome", "mbti"]


def validate_yaml(path):
    try:
        with open(path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)

        if not isinstance(data, list):
            print("❌ Il file deve contenere una lista di elementi YAML.")
            return False

        for i, entry in enumerate(data):
            for field in REQUIRED_FIELDS:
                if field not in entry:
                    print(f"❌ Entry {i + 1} manca il campo obbligatorio: {field}")
                    return False

        print("✅ Validazione completata: tutti i campi sono presenti.")
        return True

    except Exception as e:
        print(f"❌ Errore durante la lettura del file YAML: {e}")
        return False


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Uso: python yaml_validator.py <percorso_file.yaml>")
    else:
        validate_yaml(sys.argv[1])
