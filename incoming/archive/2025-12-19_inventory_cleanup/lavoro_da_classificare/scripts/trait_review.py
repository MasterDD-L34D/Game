#!/usr/bin/env python3
"""
trait_review.py - Analizza il glossario dei tratti di Evo‑Tactics e genera
report automatici.

Il programma legge il file `data/core/traits/glossary.json`, raggruppa i tratti
per prefisso, identifica possibili anomalie (nomi descrittivi, placeholder,
traduzioni mancanti o mismatching, refusi) e rileva duplicati nei nomi.

Output:
- trait_categories.csv: elenco dei prefissi con il numero di tratti associati.
- trait_anomalies_auto.csv: elenco dei tratti anomali con tipo di problema e note.
- trait_duplicates.csv: elenco di etichette duplicate con i relativi trait_id.

Uso:
    python trait_review.py --glossary /path/to/glossary.json --outdir /path/to/outdir

Se non vengono forniti parametri, il programma cerca `data/core/traits/glossary.json`
rispetto alla directory di esecuzione e salva i file di output nella directory corrente.
"""
import argparse
import json
import os
import re
import csv
from collections import defaultdict, Counter


def load_glossary(path: str) -> dict:
    """Carica il glossario da un file JSON."""
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('traits', {})


def get_prefix(trait_id: str) -> str:
    """Estrae il prefisso dal trait_id (prima parte prima dell'underscore)."""
    return trait_id.split('_')[0] if '_' in trait_id else trait_id


def detect_anomalies(trait_id: str, trait: dict) -> list:
    """Applica una serie di regole per individuare anomalie."""
    issues = []
    label_it = trait.get('label_it', '')
    label_en = trait.get('label_en', '')
    # Placeholder: id espliciti
    placeholders = {'random', 'pathfinder'}
    if trait_id in placeholders:
        issues.append(('placeholder', 'Trait appears to be a placeholder'))
    # Label descriptive (troppe parole o presenza di punteggiatura insolita)
    for lbl, lang in [(label_it, 'it'), (label_en, 'en')]:
        if lbl:
            words = lbl.strip().split()
            if len(words) > 4 or ',' in lbl or '...' in lbl:
                issues.append(('descriptive', f'label_{lang} appears to be a description rather than a name'))
    # Missing translation: se label_en==label_it oppure label_en==trait_id
    if label_en and (label_en == label_it or label_en.lower() == trait_id.lower()):
        issues.append(('missing_translation', 'English label identical to Italian or trait_id'))
    # Translation mismatch: grande differenza di lunghezza tra label_it e label_en
    if label_it and label_en:
        len_it = len(label_it.split())
        len_en = len(label_en.split())
        if abs(len_it - len_en) >= 3:
            issues.append(('translation_mismatch', 'Significant difference in length between Italian and English names'))
    # Specific refusi conosciuti
    if 'sghiaccio' in label_it.lower() or 'sghiaccio' in label_en.lower():
        issues.append(('typo', 'Potential typo "sghiaccio" instead of "ghiaccio"'))
    # Colloquial phrases detection (ha caratteri come 'ti' 'ti nutri')
    if any(phrase in label_it.lower() for phrase in ['ti nutri', 'uovo', 'denti']):
        issues.append(('colloquial', 'Italian label contains colloquial phrasing'))
    return issues


def find_duplicates(traits: dict) -> dict:
    """Trova etichette duplicate tra i tratti."""
    label_it_map = defaultdict(list)
    label_en_map = defaultdict(list)
    for tid, t in traits.items():
        label_it_map[t.get('label_it', '').strip()].append(tid)
        label_en_map[t.get('label_en', '').strip()].append(tid)
    duplicates = {}
    for label, ids in label_it_map.items():
        if label and len(ids) > 1:
            duplicates[label] = ids
    for label, ids in label_en_map.items():
        if label and len(ids) > 1:
            # Unisci se già esiste
            if label in duplicates:
                duplicates[label] = list(set(duplicates[label] + ids))
            else:
                duplicates[label] = ids
    return duplicates


def main():
    parser = argparse.ArgumentParser(description='Review Evo‑Tactics trait glossary')
    parser.add_argument('--glossary', type=str, default='data/core/traits/glossary.json',
                        help='Path to glossary JSON')
    parser.add_argument('--outdir', type=str, default='.',
                        help='Output directory for CSV reports')
    args = parser.parse_args()

    traits = load_glossary(args.glossary)

    # Calcola categorie
    prefix_counts = Counter(get_prefix(tid) for tid in traits.keys())

    # Scrivi categorie
    cat_path = os.path.join(args.outdir, 'trait_categories.csv')
    with open(cat_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['prefix', 'count'])
        for prefix, count in sorted(prefix_counts.items(), key=lambda x: -x[1]):
            writer.writerow([prefix, count])

    # Rileva anomalie
    anomalies = []
    for tid, trait in traits.items():
        issues = detect_anomalies(tid, trait)
        for issue_type, note in issues:
            anomalies.append({
                'trait_id': tid,
                'label_it': trait.get('label_it', ''),
                'label_en': trait.get('label_en', ''),
                'issue_type': issue_type,
                'notes': note,
            })
    # Scrivi anomalie
    anomaly_path = os.path.join(args.outdir, 'trait_anomalies_auto.csv')
    with open(anomaly_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['trait_id','label_it','label_en','issue_type','notes'])
        writer.writeheader()
        for row in anomalies:
            writer.writerow(row)

    # Duplicati
    duplicates = find_duplicates(traits)
    dup_path = os.path.join(args.outdir, 'trait_duplicates.csv')
    with open(dup_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['label', 'trait_ids'])
        for label, ids in duplicates.items():
            if len(ids) > 1:
                writer.writerow([label, ';'.join(ids)])

    print(f'Report generati in {args.outdir}')

if __name__ == '__main__':
    main()
