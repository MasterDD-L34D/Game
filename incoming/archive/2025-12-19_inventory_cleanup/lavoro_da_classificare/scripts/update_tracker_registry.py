#!/usr/bin/env python3
"""
Script per aggiornare il file `tracker_registry.yaml` con nuovi documenti di design e sicurezza.

Questo script aggiunge una sezione "design" e/o "sicurezza" nelle tabelle del registry se non esistono,
inserendo i percorsi dei file specificati tramite variabili d'ambiente.

Requisiti:
  - PyYAML (`pip install pyyaml`)

Variabili d'ambiente richieste:
  - `REGISTRY_FILE`: percorso a `config/tracker_registry.yaml`.
  - `DESIGN_DOC`: percorso del Game Design Document da registrare (facoltativo).
  - `SECURITY_DIR`: directory che contiene i file di sicurezza da registrare (facoltativo).

Esempio di esecuzione:
```bash
export REGISTRY_FILE=config/tracker_registry.yaml
export DESIGN_DOC=docs/GDD.md
export SECURITY_DIR=docs/security
python3 scripts/update_tracker_registry.py
```
"""

import os
import sys
import yaml
from pathlib import Path


def load_yaml(path: str) -> dict:
    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def save_yaml(data: dict, path: str) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, sort_keys=False, allow_unicode=True)


def ensure_table(data: dict, slug: str, title: str) -> dict:
    tables = data.setdefault('tables', [])
    for table in tables:
        if table.get('slug') == slug:
            return table
    # Se non esiste, creare nuova tabella
    new_table = {'slug': slug, 'title': title, 'entries': []}
    tables.append(new_table)
    return new_table


def add_entry(table: dict, path: str, title: str, purpose: str, owner: str = 'N/D') -> None:
    # Controlla se l'entry esiste già
    for entry in table.get('entries', []):
        if entry.get('path') == path:
            return
    table['entries'].append({
        'path': path,
        'title': title,
        'purpose': purpose,
        'owner': owner,
    })


def main() -> None:
    registry_file = os.environ.get('REGISTRY_FILE')
    if not registry_file:
        print("Errore: REGISTRY_FILE non specificato")
        sys.exit(1)
    data = load_yaml(registry_file)

    design_doc = os.environ.get('DESIGN_DOC')
    security_dir = os.environ.get('SECURITY_DIR')

    if design_doc:
        table = ensure_table(data, 'design', 'Design')
        add_entry(table, design_doc, 'Game Design Document', 'Documento di design completo del gioco')

    if security_dir:
        sec_table = ensure_table(data, 'sicurezza', 'Sicurezza')
        sec_path = Path(security_dir)
        for file_path in sec_path.glob('*.md'):
            title = file_path.stem.replace('_', ' ').title()
            purpose = 'Documento di sicurezza'
            add_entry(sec_table, str(file_path), title, purpose)

    save_yaml(data, registry_file)
    print(f"Registry aggiornato: {registry_file}")


if __name__ == '__main__':
    main()