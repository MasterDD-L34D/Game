#!/usr/bin/env bash
set -euo pipefail
AJV=${AJV:-ajv}
$AJV -s templates/trait.schema.json   -d traits/*.json   --spec=draft2020
$AJV -s templates/species.schema.json -d species/*.json  --spec=draft2020
echo "✅ Validazione completata"
