#!/usr/bin/env python3
"""Flint auto-install script.

Copia file Flint nelle location giuste del repo target + user-level memory
Claude Code. Vedi INSTALL.md per documentazione completa.

Usage:
    python3 flint/install.py --target-repo . --project-name "My Proj"
    python3 flint/install.py --help
    python3 flint/install.py --dry-run

Pre-requisiti: Python 3.10+, git repo target, (opzionale) uv/pipx.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def compute_repo_hash(path: Path) -> str:
    """Claude Code convention: absolute path con separatori → "-".

    Su Windows: `C:\\Users\\X\\Desktop\\Proj` → `C--Users-X-Desktop-Proj`
    Su Unix:    `/home/x/proj` → `home-x-proj` (leading `/` stripped)
    """
    abs_path = str(path.resolve())
    hashed = abs_path.replace("\\", "-").replace("/", "-").replace(":", "-")
    return hashed.lstrip("-")


def flint_root() -> Path:
    """Path della cartella flint/ (questo script sta dentro)."""
    return Path(__file__).parent.resolve()


def copy_file(src: Path, dst: Path, *, dry_run: bool, overwrite: bool = False) -> str:
    """Copia src → dst. Ritorna status string."""
    if dst.exists() and not overwrite:
        return f"SKIP {dst} (exists)"
    if dry_run:
        return f"DRY-RUN cp {src} → {dst}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return f"OK   cp {src.name} → {dst}"


def append_or_skip(src: Path, dst: Path, *, dry_run: bool) -> str:
    """Append contenuto di src a dst se dst non contiene già marker."""
    marker = "## Session workflow patterns (Claude Code + Flint)"
    if dst.exists() and marker in dst.read_text(encoding="utf-8", errors="ignore"):
        return f"SKIP {dst} (section already present)"
    if dry_run:
        return f"DRY-RUN append {src.name} → {dst}"
    content = src.read_text(encoding="utf-8")
    if dst.exists():
        existing = dst.read_text(encoding="utf-8")
        new = existing.rstrip() + "\n\n---\n\n" + content
    else:
        new = content
    dst.write_text(new, encoding="utf-8")
    return f"OK   append section → {dst}"


def install(args: argparse.Namespace) -> int:
    target = Path(args.target_repo).resolve()
    flint_dir = flint_root()
    home = Path.home()
    repo_hash = compute_repo_hash(target)

    print(f"Flint install — target: {target}")
    print(f"                flint:  {flint_dir}")
    print(f"                hash:   {repo_hash}")
    print(f"                mode:   {'DRY-RUN' if args.dry_run else 'APPLY'}")
    print()

    results: list[str] = []

    # 1. stdlib fallback → tools/py/ del target
    results.append(
        copy_file(
            flint_dir / "tools" / "flint_status_stdlib.py",
            target / "tools" / "py" / "flint_status_stdlib.py",
            dry_run=args.dry_run,
            overwrite=args.force,
        )
    )

    # 2. Slash commands → target/.claude/commands/
    commands_dir = flint_dir / "claude-integration" / "commands"
    if commands_dir.exists():
        for cmd_file in commands_dir.glob("*.md"):
            results.append(
                copy_file(
                    cmd_file,
                    target / ".claude" / "commands" / cmd_file.name,
                    dry_run=args.dry_run,
                    overwrite=args.force,
                )
            )

    # 3. Memory files → ~/.claude/projects/<hash>/memory/
    if not args.skip_memory:
        memory_target = home / ".claude" / "projects" / repo_hash / "memory"
        memory_src = flint_dir / "claude-integration" / "memory"
        for mem_file in memory_src.glob("*.md"):
            if mem_file.name == "MEMORY.md.template":
                # Template → MEMORY.md (solo se non esiste)
                results.append(
                    copy_file(
                        mem_file,
                        memory_target / "MEMORY.md",
                        dry_run=args.dry_run,
                        overwrite=False,  # mai sovrascrivere MEMORY.md
                    )
                )
            else:
                results.append(
                    copy_file(
                        mem_file,
                        memory_target / mem_file.name,
                        dry_run=args.dry_run,
                        overwrite=args.force,
                    )
                )

    # 4. CLAUDE.md section append
    claude_md = target / "CLAUDE.md"
    section_template = flint_dir / "claude-integration" / "CLAUDE.md-section-template.md"
    if section_template.exists():
        results.append(append_or_skip(section_template, claude_md, dry_run=args.dry_run))

    # 5. Report
    print("Results:")
    for r in results:
        print(f"  {r}")
    print()

    # 6. Manual steps promemoria
    print("Manual follow-up:")
    print("  1. Personalizza CLAUDE.md: sostituisci <PROJECT_NAME> e <MEMORY_PATH>")
    print(f"  2. Personalizza MEMORY.md: ~{(memory_target / 'MEMORY.md').relative_to(home)}")
    print("  3. Edit tools/py/flint_status_stdlib.py → COMMIT_PATTERNS per tuo dominio")
    print("  4. (Opzionale) CLI install: `cd flint && uv tool install .`")
    print("  5. Test: `python3 tools/py/flint_status_stdlib.py --output docs/flint-status.json`")
    print()
    print("Canonical doc: flint/PROJECT.md")
    print("Troubleshooting: flint/INSTALL.md")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Flint auto-install — copy files into target repo + user memory.",
        epilog="Esempio: python3 flint/install.py --target-repo . --project-name MyProj",
    )
    parser.add_argument("--target-repo", default=".", help="Path del repo target (default: cwd)")
    parser.add_argument("--project-name", default=None, help="Nome progetto (default: basename dir)")
    parser.add_argument(
        "--project-type",
        default="custom",
        choices=["gamedev-solo", "webapp", "data-ops", "custom"],
        help="Tipo progetto per personalizzazioni future (v0.3)",
    )
    parser.add_argument("--skip-memory", action="store_true", help="Non copiare user memory files")
    parser.add_argument("--skip-cli", action="store_true", help="Non installare CLI flint (manuale)")
    parser.add_argument("--force", action="store_true", help="Sovrascrivi file esistenti")
    parser.add_argument("--dry-run", action="store_true", help="Mostra cosa farebbe senza eseguire")
    args = parser.parse_args()

    try:
        return install(args)
    except KeyboardInterrupt:
        print("\nAborted.")
        return 130
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
