"""CLI flint — Typer + Rich."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from . import __version__
# Achievements removed (kill 60% 2026-04-18): Sam Liberty + NTNU research —
# tangible rewards undermine intrinsic motivation for solo devs.
from .engine import generate, mark_spoke, should_speak
from .repo import snapshot
from .seeds import Category

app = typer.Typer(
    name="flint",
    help="🦴 Caveman companion per il repo Evo-Tactics.",
    no_args_is_help=False,
    rich_markup_mode="rich",
    add_completion=True,
)

console = Console(stderr=False)


def _version_callback(value: bool) -> None:
    if value:
        console.print(f"🦴 flint v{__version__}")
        raise typer.Exit


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    version: Annotated[
        bool,
        typer.Option("--version", "-V", callback=_version_callback, is_eager=True, help="Mostra versione."),
    ] = False,
) -> None:
    """Se invocato senza subcomando, chiama `speak` di default."""
    if ctx.invoked_subcommand is None:
        speak()


@app.command()
def speak(
    repo: Annotated[
        Path,
        typer.Option("--repo", "-r", help="Root del repo (default: cwd)."),
    ] = Path("."),
    category: Annotated[
        Category | None,
        typer.Option("--category", "-c", help="Forza categoria specifica."),
    ] = None,
    seed: Annotated[
        int | None,
        typer.Option("--seed", "-s", help="Seed random per output riproducibile."),
    ] = None,
    plain: Annotated[
        bool,
        typer.Option("--plain", help="Output testo semplice, niente colori/box."),
    ] = False,
) -> None:
    """🦴 Fa parlare il caveman in base allo stato del repo."""
    snap = snapshot(repo.resolve())
    output = generate(snap, force_category=category, seed=seed)

    if plain:
        print(output.render_plain())
        return

    # Rich panel
    body = Text()
    body.append(output.opening + ": ", style="bold italic yellow")
    body.append(output.body, style="italic")
    body.append("  " + output.closer, style="italic dim")

    panel = Panel(
        body,
        title=f"{output.emoji} caveman — {output.category.value} · ~{output.minutes} min",
        border_style="bright_yellow",
        padding=(0, 1),
    )
    console.print(panel)


@app.command()
def check(
    repo: Annotated[Path, typer.Option("--repo", "-r")] = Path("."),
    force: Annotated[bool, typer.Option("--force", help="Ignora il throttling.")] = False,
) -> None:
    """🔍 Decide se il caveman DEBBA parlare adesso (per hook). Exit 0 = parla, 1 = zitto."""
    snap = snapshot(repo.resolve())
    speak_now, reason = should_speak(snap, respect_throttle=not force)

    console.print(f"[dim]{reason}[/dim]")
    if speak_now:
        console.print()
        output = generate(snap)
        body = Text()
        body.append(output.opening + ": ", style="bold italic yellow")
        body.append(output.body, style="italic")
        body.append("  " + output.closer, style="italic dim")
        console.print(
            Panel(
                body,
                title=f"{output.emoji} caveman — {output.category.value} · ~{output.minutes} min",
                border_style="bright_yellow",
                padding=(0, 1),
            )
        )
        mark_spoke(snap.root)
        raise typer.Exit(0)
    raise typer.Exit(1)


@app.command()
def status(
    repo: Annotated[Path, typer.Option("--repo", "-r")] = Path("."),
) -> None:
    """📊 Mostra la lettura del repo dal punto di vista del caveman."""
    snap = snapshot(repo.resolve())

    if not snap.recent_commits:
        console.print("[red]Nessun commit trovato (o non è un repo git).[/red]")
        raise typer.Exit(1)

    # Tabella commit
    table = Table(title="🦴 Repo status (ultimi commit)", show_lines=False)
    table.add_column("SHA", style="dim", no_wrap=True)
    table.add_column("Tipo", style="bold")
    table.add_column("Messaggio")

    kind_colors = {
        "GAMEPLAY": "green",
        "INFRA": "red",
        "TOOLING": "yellow",
        "DOCS": "blue",
        "DATA": "cyan",
        "ALTRO": "white",
    }
    for c in snap.recent_commits:
        color = kind_colors.get(c.kind, "white")
        table.add_row(c.sha, f"[{color}]{c.kind}[/{color}]", c.message[:60])

    console.print(table)
    console.print()

    # Metriche
    gp = snap.gameplay_ratio()
    infra_chain = snap.consecutive_infra_commits()
    drifting = snap.is_drifting()

    drift_style = "red bold" if drifting else "green"
    drift_text = "IN DERIVA 🚨" if drifting else "sulla rotta ✅"

    console.print(f"  Gameplay ratio: [bold]{gp:.0%}[/bold]")
    console.print(f"  INFRA consecutivi: [bold]{infra_chain}[/bold]")
    console.print(f"  Stato: [{drift_style}]{drift_text}[/{drift_style}]")
    console.print(f"  Pilastri fisici: [cyan]{', '.join(sorted(snap.pillar_dirs)) or '(nessuno)'}[/cyan]")
    console.print(f"  File dirty: [yellow]{len(snap.dirty_files)}[/yellow]")


@app.command()
def install_hook(
    repo: Annotated[Path, typer.Option("--repo", "-r")] = Path("."),
    force: Annotated[bool, typer.Option("--force", "-f", help="Sovrascrivi hook esistente.")] = False,
) -> None:
    """🔧 Installa il post-commit hook opzionale. Il caveman parlerà solo quando serve."""
    repo_root = repo.resolve()
    hook_dir = repo_root / ".git" / "hooks"

    if not hook_dir.exists():
        console.print(f"[red]Non trovo {hook_dir}. Sei sicuro che sia un repo git?[/red]")
        raise typer.Exit(1)

    hook_path = hook_dir / "post-commit"
    if hook_path.exists() and not force:
        console.print(f"[yellow]Hook già presente in {hook_path}. Usa --force per sovrascrivere.[/yellow]")
        raise typer.Exit(1)

    hook_content = """#!/usr/bin/env bash
# 🦴 flint post-commit hook — parla solo quando serve
# Installato da: flint install-hook
# Per disinstallare: rm .git/hooks/post-commit

if command -v flint >/dev/null 2>&1; then
    flint check 2>/dev/null || true
elif command -v python >/dev/null 2>&1 && python -c "import flint" 2>/dev/null; then
    python -m flint check 2>/dev/null || true
fi
"""
    hook_path.write_text(hook_content)
    hook_path.chmod(0o755)
    console.print(f"[green]✓[/green] Hook installato in {hook_path}")
    console.print("  Il caveman parlerà solo quando il repo è in deriva o chiudi un commit GAMEPLAY.")
    console.print("  Per disattivarlo: [dim]rm .git/hooks/post-commit[/dim]")


@app.command()
def uninstall_hook(
    repo: Annotated[Path, typer.Option("--repo", "-r")] = Path("."),
) -> None:
    """🧹 Rimuovi il post-commit hook."""
    hook_path = repo.resolve() / ".git" / "hooks" / "post-commit"
    if not hook_path.exists():
        console.print("[yellow]Nessun hook da rimuovere.[/yellow]")
        raise typer.Exit
    hook_path.unlink()
    console.print(f"[green]✓[/green] Hook rimosso da {hook_path}")


@app.command()
def export(
    output: Annotated[
        Path | None,
        typer.Option(
            "--output",
            "-o",
            help="Destinazione JSON (default: docs/flint-status.json).",
        ),
    ] = None,
) -> None:
    """Esporta stato corrente + metriche in JSON (per skill evo-tactics).

    Produce file committabile con snapshot dei commit recenti, ultimo spoke,
    e metriche aggregate (``gameplay_ratio``, ``consecutive_infra_commits``,
    ``is_drifting``). Achievements non inclusi: subsystem rimosso in
    kill-60 2026-04-18 (vedi cli.py:16).

    Il file è letto dalla skill `evo-tactics-monitor` prima di fare web fetch,
    per briefing offline più accurati.
    """
    import json
    from datetime import datetime, timezone

    repo_root = Path.cwd()
    snap = snapshot(repo_root)

    last_spoke_path = repo_root / ".git" / "flint_last_spoke"
    last_spoke = None
    if last_spoke_path.exists():
        try:
            last_spoke = float(last_spoke_path.read_text().strip())
        except (ValueError, OSError):
            last_spoke = None

    payload = {
        "_meta": {
            "generator": "flint export",
            "version": __version__,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "repo_root": str(repo_root),
        },
        "snapshot": {
            "dirty_files_count": len(snap.dirty_files),
            "recent_commits_count": len(snap.recent_commits),
            "gameplay_ratio": snap.gameplay_ratio(),
            "consecutive_infra_commits": snap.consecutive_infra_commits(),
            "is_drifting": snap.is_drifting(),
            "recent_commits": [
                {
                    "sha": c.sha[:8],
                    "kind": c.kind,
                    "message_first_line": c.message.splitlines()[0] if c.message else "",
                    "files_count": len(c.files),
                }
                for c in snap.recent_commits
            ],
        },
        "last_spoke_unix": last_spoke,
    }

    dest = output or (repo_root / "docs" / "flint-status.json")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    console.print(f"[green]✓[/green] Esportato stato flint in [bold]{dest}[/bold]")
    console.print(
        f"  commits={len(snap.recent_commits)} gameplay_ratio={snap.gameplay_ratio():.0%}"
    )


if __name__ == "__main__":
    app()
