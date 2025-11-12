# Tools (validator)

## Species
Python:
```bash
python3 tools/py/validate_species.py data/species.yaml
```
TypeScript:
```bash
cd tools/ts
npm i
npm run validate:species
```

## Forms
Python:
```bash
python3 tools/py/validate_forms.py data/forms.yaml
```
TypeScript:
```bash
cd tools/ts
npm i
npm run validate:forms
```

Output: JSON con `ui_summary` (Species) / `forms_ui` (Forms) per widget TV (budget, sinergie/counter, warning).
