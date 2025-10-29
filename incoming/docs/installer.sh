#!/bin/bash
# EvoTactics — Installer & Integrator Script

set -e

REPO_ROOT="$(pwd)"
DEVKIT_SRC="./devkit"
SYNERGY_SRC="./evo_synergy_extracted"

# 1. Crea struttura repo unificata
mkdir -p scripts tools/devkit telemetry schemas docs .hashes

# 2. Sposta contenuti DevKit
mv "$DEVKIT_SRC"/*.py scripts/
mv "$DEVKIT_SRC"/*.js hooks/
mv "$DEVKIT_SRC"/*.yaml telemetry/
cp "$DEVKIT_SRC"/*.md tools/devkit/

# 3. Integra da Synergy ZIP
cp "$SYNERGY_SRC"/scripts/*.py scripts/ || true
cp "$SYNERGY_SRC"/tools/*.py tools/ || true
cp "$SYNERGY_SRC"/telemetry/*.yaml telemetry/ || true
cp "$SYNERGY_SRC"/schemas/*.json schemas/ || true
cp "$SYNERGY_SRC"/docs/*.md docs/ || true

# 4. Registra hook pre-commit
mkdir -p .git/hooks
cat > .git/hooks/pre-commit <<EOF
#!/bin/bash
node scripts/drift_check.js
EOF
chmod +x .git/hooks/pre-commit

# 5. Conferma completamento
echo "✅ EvoTactics repo integrata e pronta."
echo "📂 Struttura: scripts/, tools/devkit/, telemetry/, schemas/, docs/"
echo "⚙️ Hook drift_check attivato"
echo "📑 Puoi aprire docs/ in Obsidian o GitBook"
