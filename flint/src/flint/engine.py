"""Motore caveman: decide QUALE categoria usare in base al contesto e rende output."""

from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from .repo import RepoSnapshot
from .seeds import ALL_SEEDS, Category, Seed, pick_seed

# Emoji a rotazione
_EMOJIS: Final[tuple[str, ...]] = ("🦴", "🪨", "🔥")

# Aperture caveman (italiano rotto, brevissime)
_OPENINGS: Final[tuple[str, ...]] = (
    "caveman guardare repo",
    "ugh, caveman pensare",
    "caveman rosicchiare osso mentre dire",
    "caveman contento, ma",
    "caveman battere pietra e poi",
    "unga bunga, caveman vedere che",
    "caveman annusare aria",
)

_CLOSERS: Final[tuple[str, ...]] = (
    "unga.",
    "ugh bunga.",
    "poi continuare battere pietra.",
    "caveman crede in te.",
    "piccolo passo, grande fuoco.",
    "poi tornare a scavare.",
)


@dataclass(frozen=True, slots=True)
class CavemanOutput:
    emoji: str
    opening: str
    body: str
    closer: str
    category: Category
    seed_id: int
    minutes: int

    def render_plain(self) -> str:
        """Output testuale semplice (per hook git, no colori)."""
        return f"{self.emoji} {self.opening}: {self.body} {self.closer}"

    def render_markdown(self) -> str:
        """Output markdown italicizzato (per chat / docs)."""
        return f"{self.emoji} *{self.opening}: {self.body} {self.closer}*"


# ---------- Decisione categoria ----------


def decide_category(snap: RepoSnapshot, *, force: Category | None = None) -> Category:
    """Scegli la categoria giusta in base al contesto del repo.

    Regole:
    - Se il repo è in deriva (troppi INFRA di fila, poco gameplay) → DESIGN_HINT per schiaffare
    - Se l'utente ha appena finito qualcosa (ultimo commit GAMEPLAY) → MICRO_SPRINT prossimo passo
    - Se molti file dirty non committati → MICRO_SPRINT (ridurre WIP)
    - Altrimenti → scelta ponderata con varietà (MICRO_SPRINT > TWIST > MINI_GAME > HINT)
    """
    if force is not None:
        return force

    # PRIORITÀ 1: troppi file dirty → serve sprint di pulizia (non predica)
    if len(snap.dirty_files) >= 5:
        return Category.MICRO_SPRINT

    # PRIORITÀ 2: repo in deriva → schiaffo di design
    if snap.is_drifting():
        return Category.DESIGN_HINT

    # PRIORITÀ 3: troppi commit consecutivi (>= 6) senza SCOPE_CHECK → tempo di ripasso
    if len(snap.recent_commits) >= 6 and random.random() < 0.3:
        return Category.SCOPE_CHECK

    # PRIORITÀ 4: appena chiuso gameplay → prossimo micro-sprint
    if snap.recent_commits and snap.recent_commits[0].is_gameplay:
        return Category.MICRO_SPRINT

    # Default: pesata, ma randomica per varietà
    weights = {
        Category.MICRO_SPRINT: 0.35,
        Category.EVO_TWIST: 0.20,
        Category.MINI_GAME: 0.18,
        Category.DESIGN_HINT: 0.15,
        Category.SCOPE_CHECK: 0.12,  # NEW v0.2
    }
    r = random.random()
    acc = 0.0
    for cat, w in weights.items():
        acc += w
        if r <= acc:
            return cat
    return Category.MICRO_SPRINT  # fallback


# ---------- Memoria seed usati (anti-ripetizione tra invocazioni) ----------


def _state_file(repo_root: Path) -> Path:
    return repo_root / ".git" / "flint_state.json"


def _load_used_seeds(repo_root: Path) -> dict[str, list[int]]:
    f = _state_file(repo_root)
    if not f.exists():
        return {}
    try:
        return json.loads(f.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _save_used_seeds(repo_root: Path, state: dict[str, list[int]]) -> None:
    f = _state_file(repo_root)
    try:
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(state))
    except OSError:
        pass  # non-fatale


_MAX_REMEMBERED: Final[int] = 8  # ricordiamo solo gli ultimi N per categoria
_HOOK_THROTTLE_MINUTES: Final[int] = 90  # hook non parla più di 1 volta ogni N minuti


# ---------- API principale ----------


def generate(
    snap: RepoSnapshot,
    *,
    force_category: Category | None = None,
    seed: int | None = None,
) -> CavemanOutput:
    """Genera un blocco caveman completo dallo stato del repo."""
    rng = random.Random(seed)
    category = decide_category(snap, force=force_category)

    # Recupera seed già usati per evitare ripetizioni
    used = _load_used_seeds(snap.root)
    exclude = frozenset(used.get(category.value, []))

    chosen_seed, seed_id = pick_seed(category, snap, exclude_ids=exclude, rng=rng)

    # Aggiorna memoria (mantieni solo ultimi N)
    history = used.get(category.value, [])
    history = [*history, seed_id][-_MAX_REMEMBERED:]
    used[category.value] = history
    _save_used_seeds(snap.root, used)

    # Componi
    emoji = rng.choice(_EMOJIS)
    opening = rng.choice(_OPENINGS)
    closer = rng.choice(_CLOSERS)
    body = chosen_seed.render(snap)

    return CavemanOutput(
        emoji=emoji,
        opening=opening,
        body=body,
        closer=closer,
        category=category,
        seed_id=seed_id,
        minutes=chosen_seed.minutes,
    )


def should_speak(snap: RepoSnapshot, *, respect_throttle: bool = True) -> tuple[bool, str]:
    """Decide se il caveman DEBBA parlare (usato dal post-commit hook).

    Ritorna (parla?, motivo). Il caveman parla solo quando serve davvero.
    Se `respect_throttle=True`, rispetta l'ultima volta che ha parlato (default per hook).
    """
    if not snap.recent_commits:
        return False, "nessun commit ancora"

    # Throttling: non parlare se ha parlato da poco (solo per hook automatico)
    if respect_throttle:
        last_spoke = _load_last_spoke(snap.root)
        if last_spoke is not None:
            elapsed_min = (time.time() - last_spoke) / 60
            if elapsed_min < _HOOK_THROTTLE_MINUTES:
                return False, f"caveman ha appena parlato ({elapsed_min:.0f} min fa, throttle={_HOOK_THROTTLE_MINUTES}min)"

    if snap.is_drifting():
        return True, f"deriva rilevata: {snap.gameplay_ratio():.0%} gameplay / {snap.consecutive_infra_commits()} INFRA consecutivi"
    last = snap.recent_commits[0]
    if last.kind == "GAMEPLAY":
        return True, "commit GAMEPLAY → celebrare + prossimo sprint"
    return False, "commit di routine, caveman sta zitto"


def _last_spoke_file(repo_root: Path) -> Path:
    return repo_root / ".git" / "flint_last_spoke"


def _load_last_spoke(repo_root: Path) -> float | None:
    f = _last_spoke_file(repo_root)
    if not f.exists():
        return None
    try:
        return float(f.read_text().strip())
    except (ValueError, OSError):
        return None


def mark_spoke(repo_root: Path) -> None:
    """Registra che il caveman ha parlato ora (per throttling)."""
    f = _last_spoke_file(repo_root)
    try:
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(str(time.time()))
    except OSError:
        pass
