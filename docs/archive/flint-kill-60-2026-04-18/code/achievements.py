"""Achievements: unlocked dall'analisi dei pattern di commit.

Ispirato al pattern GitMood (devchallenge 2026) ma ancorato a obiettivi di
game design, non a sentiment analysis. Achievements celebrano i comportamenti
virtuosi (gameplay-first, cut darlings, shipping) e segnalano anti-pattern.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from .repo import RepoSnapshot


@dataclass(frozen=True, slots=True)
class Achievement:
    emoji: str
    title: str
    description: str
    unlocked: bool = True


def compute_achievements(snap: RepoSnapshot) -> list[Achievement]:
    """Calcola achievement basandosi sullo stato del repo."""
    if not snap.recent_commits:
        return []

    achievements: list[Achievement] = []

    # 🎯 Game-First Striker — ultimi 3 commit sono tutti GAMEPLAY
    if len(snap.recent_commits) >= 3 and all(c.is_gameplay for c in snap.recent_commits[:3]):
        achievements.append(Achievement(
            emoji="🎯",
            title="Game-First Striker",
            description="3 commit GAMEPLAY di fila. core è il focus.",
        ))

    # ✂️ Ruthless Cutter — commit con "remove" / "delete" / "cut" / "clean"
    cut_keywords = ("remove", "delete", "cut", "clean", "rimuov", "cancell", "elimin")
    cuts = sum(1 for c in snap.recent_commits if any(k in c.message.lower() for k in cut_keywords))
    if cuts >= 2:
        achievements.append(Achievement(
            emoji="✂️",
            title="Ruthless Cutter",
            description=f"{cuts} commit di pulizia. caveman fiero.",
        ))

    # 🏔️ Pillar Diversifier — commit su 3+ pilastri diversi tra gli ultimi 5
    pillar_dirs_hit: set[str] = set()
    for c in snap.recent_commits[:5]:
        for f in c.files:
            for pillar in ("traits", "biomes", "rules", "jobs", "species"):
                if f.startswith(pillar + "/"):
                    pillar_dirs_hit.add(pillar)
    if len(pillar_dirs_hit) >= 3:
        achievements.append(Achievement(
            emoji="🏔️",
            title="Pillar Diversifier",
            description=f"{len(pillar_dirs_hit)} pilastri diversi toccati. equilibrio buono.",
        ))

    # 🔁 Docker Addict (anti-achievement, warning) — 5+ INFRA nelle ultime 10
    infra_count = sum(1 for c in snap.recent_commits if c.kind == "INFRA")
    if infra_count >= 5:
        achievements.append(Achievement(
            emoji="⚠️",
            title="Docker Addict",
            description=f"{infra_count}/10 commit INFRA. il gioco ti aspetta.",
            unlocked=False,  # è un warning, non una celebrazione
        ))

    # 📜 Wordy Committer — messaggi lunghi >80 char
    long_msgs = sum(1 for c in snap.recent_commits if len(c.message) > 80)
    if long_msgs >= 3:
        achievements.append(Achievement(
            emoji="📜",
            title="Wordy Committer",
            description=f"{long_msgs} messaggi >80 char. caveman dire: messaggio corto, pensiero chiaro.",
            unlocked=False,
        ))

    # 🌱 Fresh Breath — 1° commit GAMEPLAY dopo 3+ INFRA di fila (rottura della deriva)
    if len(snap.recent_commits) >= 4:
        last = snap.recent_commits[0]
        others = snap.recent_commits[1:4]
        if last.is_gameplay and all(c.kind == "INFRA" for c in others):
            achievements.append(Achievement(
                emoji="🌱",
                title="Fresh Breath",
                description="hai rotto una streak INFRA con un commit GAMEPLAY. caveman applaude.",
            ))

    # 🧹 Clean Workspace — zero file dirty
    if not snap.dirty_files and snap.recent_commits:
        achievements.append(Achievement(
            emoji="🧹",
            title="Clean Workspace",
            description="zero WIP. niente distrae dal prossimo turno.",
        ))

    # 🦴 Unga Bunga — gameplay_ratio >= 60%
    if snap.gameplay_ratio() >= 0.6:
        achievements.append(Achievement(
            emoji="🦴",
            title="Unga Bunga",
            description=f"{snap.gameplay_ratio():.0%} gameplay ratio. caveman felice felice.",
        ))

    return achievements


# Lista di achievement potenziali (per `caveman achievements --all`)
ALL_ACHIEVEMENTS: Final[tuple[dict[str, str], ...]] = (
    {"emoji": "🎯", "title": "Game-First Striker", "how": "3 commit GAMEPLAY di fila"},
    {"emoji": "✂️", "title": "Ruthless Cutter", "how": "2+ commit di rimozione negli ultimi 10"},
    {"emoji": "🏔️", "title": "Pillar Diversifier", "how": "3+ pilastri toccati negli ultimi 5 commit"},
    {"emoji": "🌱", "title": "Fresh Breath", "how": "1° GAMEPLAY dopo 3+ INFRA di fila"},
    {"emoji": "🧹", "title": "Clean Workspace", "how": "zero file dirty"},
    {"emoji": "🦴", "title": "Unga Bunga", "how": "gameplay ratio >= 60%"},
    {"emoji": "⚠️", "title": "Docker Addict", "how": "WARN: 5+/10 commit INFRA"},
    {"emoji": "📜", "title": "Wordy Committer", "how": "WARN: 3+ messaggi >80 char"},
)
