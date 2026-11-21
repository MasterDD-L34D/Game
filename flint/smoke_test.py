"""Smoke test standalone: simula un repo vero e verifica tutta la pipeline v0.2."""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

# Aggiungo src al path senza installare il pacchetto
sys.path.insert(0, str(Path(__file__).parent / "src"))

from flint.engine import decide_category, generate, should_speak
from flint.repo import snapshot
from flint.seeds import Category


def make_fake_repo(path: Path, commits: list[tuple[str, str, str]]) -> None:
    """Crea un repo git con commit simulati. commits = [(message, filepath, content), ...]"""
    subprocess.run(["git", "init", "-q"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.email", "t@t.t"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.name", "test"], cwd=path, check=True)
    subprocess.run(["git", "config", "commit.gpgsign", "false"], cwd=path, check=True)

    for msg, filepath, content in commits:
        fp = path / filepath
        fp.parent.mkdir(parents=True, exist_ok=True)
        fp.write_text(content)
        subprocess.run(["git", "add", "."], cwd=path, check=True)
        subprocess.run(["git", "commit", "-qm", msg], cwd=path, check=True)


def run_scenario(name: str, commits: list[tuple[str, str, str]], extra_dirty: list[str] | None = None) -> None:
    # Rinominato da test_scenario per evitare collection pytest (helper, non test).
    print(f"\n{'=' * 70}")
    print(f"SCENARIO: {name}")
    print("=" * 70)

    with tempfile.TemporaryDirectory() as tmp:
        repo = Path(tmp)
        make_fake_repo(repo, commits)

        # Aggiungi file dirty senza committarli
        if extra_dirty:
            for f in extra_dirty:
                (repo / f).parent.mkdir(parents=True, exist_ok=True)
                (repo / f).write_text("dirty")

        snap = snapshot(repo)
        print(f"Commits trovati: {len(snap.recent_commits)}")
        for c in snap.recent_commits:
            print(f"  [{c.kind:>9}] {c.sha} {c.message}")
        print(f"Gameplay ratio: {snap.gameplay_ratio():.0%}")
        print(f"INFRA consecutivi: {snap.consecutive_infra_commits()}")
        print(f"In deriva? {snap.is_drifting()}")
        print(f"Pilastri: {sorted(snap.pillar_dirs)}")
        print(f"Dirty files: {snap.dirty_files}")

        # Test should_speak (senza throttle, siamo in test)
        speak, reason = should_speak(snap, respect_throttle=False)
        print(f"\nshould_speak: {speak} — {reason}")

        # Test generate
        cat = decide_category(snap)
        print(f"Categoria scelta: {cat.value}")

        out = generate(snap, seed=42)
        print(f"\n>>> OUTPUT CAVEMAN:")
        print(f"    {out.render_plain()}")
        print(f"    (categoria: {out.category.value}, ~{out.minutes} min, seed_id: {out.seed_id})")

        # Achievements removed 2026-04-18 (kill 60%).


# SCENARIO 1: repo in deriva (troppi INFRA)
run_scenario(
    "Repo in deriva — 6 INFRA di fila",
    [
        ("add trait fire", "traits/fire.yaml", "name: fire\n"),
        ("init docker", "Dockerfile", "FROM python\n"),
        ("ci setup", ".github/workflows/ci.yml", "name: CI\n"),
        ("prisma migration", "prisma/schema.prisma", "model X {}\n"),
        ("docker compose", "docker-compose.yml", "version: 3\n"),
        ("fix ci permissions", ".github/workflows/ci.yml", "name: CI fixed\n"),
        ("add deploy script", "scripts/deploy.sh", "#!/bin/bash\n"),
    ],
)

# SCENARIO 2: appena chiuso un commit gameplay
run_scenario(
    "Fresh gameplay commit",
    [
        ("refactor auth", "src/auth.py", "x = 1\n"),
        ("update readme", "README.md", "# Game\n"),
        ("add species wolf", "species/wolf.yaml", "name: wolf\n"),
    ],
)

# SCENARIO 3: WIP selvaggio (molti dirty)
run_scenario(
    "WIP selvaggio — molti file dirty",
    [
        ("initial", "README.md", "# game\n"),
    ],
    extra_dirty=["a.py", "b.py", "c.py", "d.py", "e.py", "f.py"],
)

# SCENARIO 4: repo sano
run_scenario(
    "Repo sano — mix bilanciato",
    [
        ("add trait ice", "traits/ice.yaml", "name: ice\n"),
        ("add job warrior", "jobs/warrior.yaml", "name: warrior\n"),
        ("fix ci", ".github/workflows/ci.yml", "v: 1\n"),
        ("add biome forest", "biomes/forest.yaml", "name: forest\n"),
        ("species cat", "species/cat.yaml", "name: cat\n"),
    ],
)

print(f"\n{'=' * 70}")
print("✓ Tutti gli scenari girati senza errori.")
print("=" * 70)
