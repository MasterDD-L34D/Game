"""Spatial module for Evo-Tactics grid combat.

Pure functions operating on unit dicts with ``position: {x, y, z}`` and
``facing: str``.  No dependency on resolver or hydration.

Grid defaults to 6×6 (matching Node session engine ``GRID_SIZE = 6``).
Elevation layer: z=0 ground, z=1 elevated (volante), z=-1 underground.

All functions are deterministic and side-effect free.
"""
from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

# ---------------------------------------------------------------------------
# Constants (aligned with Node sessionConstants.js)
# ---------------------------------------------------------------------------

DEFAULT_WIDTH = 6
DEFAULT_HEIGHT = 6

FACING_N = "N"
FACING_S = "S"
FACING_E = "E"
FACING_W = "W"
VALID_FACINGS = frozenset({FACING_N, FACING_S, FACING_E, FACING_W})

#: Default attack range (melee).
DEFAULT_ATTACK_RANGE = 1

#: Threshold for "surrounded" condition.
SURROUNDED_THRESHOLD = 3

#: Elevation bonuses.
ELEVATION_ATTACK_BONUS = 1  # +1 attack_mod when elevated vs ground target
ELEVATION_DEFENSE_BONUS = 1  # +1 defense_mod when elevated

#: Backstab bonus (aligned with Node +1 damage).
BACKSTAB_DAMAGE_BONUS = 1

#: Adjacency bonus (aligned with Node +1 damage at distance 1).
ADJACENCY_DAMAGE_BONUS = 1


# ---------------------------------------------------------------------------
# Position helpers
# ---------------------------------------------------------------------------


def pos(x: int, y: int, z: int = 0) -> Dict[str, int]:
    """Create a position dict."""
    return {"x": x, "y": y, "z": z}


def get_pos(unit: Mapping[str, Any]) -> Dict[str, int]:
    """Extract position from unit, defaulting z to 0."""
    p = unit.get("position") or {"x": 0, "y": 0}
    return {"x": int(p.get("x", 0)), "y": int(p.get("y", 0)), "z": int(p.get("z", 0))}


def get_facing(unit: Mapping[str, Any]) -> str:
    """Extract facing from unit, default S."""
    f = unit.get("facing", FACING_S)
    return f if f in VALID_FACINGS else FACING_S


# ---------------------------------------------------------------------------
# Distance & range
# ---------------------------------------------------------------------------


def manhattan(a: Mapping[str, int], b: Mapping[str, int]) -> int:
    """Manhattan distance on XY plane (ignores Z)."""
    return abs(int(a.get("x", 0)) - int(b.get("x", 0))) + abs(int(a.get("y", 0)) - int(b.get("y", 0)))


def distance_3d(a: Mapping[str, int], b: Mapping[str, int]) -> int:
    """Manhattan distance including elevation difference."""
    return manhattan(a, b) + abs(int(a.get("z", 0)) - int(b.get("z", 0)))


def is_adjacent(a: Mapping[str, Any], b: Mapping[str, Any]) -> bool:
    """Two units are adjacent if Manhattan distance == 1 on XY."""
    return manhattan(get_pos(a), get_pos(b)) == 1


def in_range(attacker: Mapping[str, Any], target: Mapping[str, Any], attack_range: int = DEFAULT_ATTACK_RANGE) -> bool:
    """Target within attacker's range (XY only)."""
    return manhattan(get_pos(attacker), get_pos(target)) <= attack_range


def get_attack_range(unit: Mapping[str, Any]) -> int:
    """Derive attack range from unit. Check unit field first, then default."""
    return int(unit.get("attack_range", DEFAULT_ATTACK_RANGE))


# ---------------------------------------------------------------------------
# Elevation
# ---------------------------------------------------------------------------


def is_elevated(unit: Mapping[str, Any]) -> bool:
    """Unit at z > 0 (flying/elevated)."""
    return int(get_pos(unit).get("z", 0)) > 0


def is_underground(unit: Mapping[str, Any]) -> bool:
    """Unit at z < 0 (burrowing/underground)."""
    return int(get_pos(unit).get("z", 0)) < 0


def elevation_advantage(attacker: Mapping[str, Any], target: Mapping[str, Any]) -> int:
    """Returns attack bonus from elevation difference.

    +ELEVATION_ATTACK_BONUS if attacker elevated and target on ground.
    0 otherwise.
    """
    az = int(get_pos(attacker).get("z", 0))
    tz = int(get_pos(target).get("z", 0))
    if az > tz:
        return ELEVATION_ATTACK_BONUS
    return 0


# ---------------------------------------------------------------------------
# Facing & backstab
# ---------------------------------------------------------------------------


def auto_face(from_pos: Mapping[str, int], to_pos: Mapping[str, int]) -> str:
    """Compute facing direction from movement vector (aligned with Node sessionHelpers)."""
    dx = int(to_pos.get("x", 0)) - int(from_pos.get("x", 0))
    dy = int(to_pos.get("y", 0)) - int(from_pos.get("y", 0))
    if dx == 0 and dy == 0:
        return FACING_S  # no movement → keep default
    if abs(dx) >= abs(dy):
        return FACING_E if dx > 0 else FACING_W
    return FACING_S if dy > 0 else FACING_N


def is_backstab(attacker: Mapping[str, Any], target: Mapping[str, Any]) -> bool:
    """Attacker is behind target's facing direction (aligned with Node sessionHelpers).

    N facing: backstab if attacker.y > target.y
    S facing: backstab if attacker.y < target.y
    E facing: backstab if attacker.x < target.x
    W facing: backstab if attacker.x > target.x
    """
    ap = get_pos(attacker)
    tp = get_pos(target)
    facing = get_facing(target)
    if facing == FACING_N:
        return ap["y"] > tp["y"]
    if facing == FACING_S:
        return ap["y"] < tp["y"]
    if facing == FACING_E:
        return ap["x"] < tp["x"]
    if facing == FACING_W:
        return ap["x"] > tp["x"]
    return False


# ---------------------------------------------------------------------------
# Tactical conditions
# ---------------------------------------------------------------------------


def count_adjacent_enemies(
    unit: Mapping[str, Any],
    all_units: Sequence[Mapping[str, Any]],
) -> int:
    """Count living enemy units adjacent to unit."""
    side = unit.get("side")
    uid = unit.get("id")
    count = 0
    for other in all_units:
        if other.get("id") == uid:
            continue
        if other.get("side") == side:
            continue
        hp = other.get("hp") or {}
        if int(hp.get("current", 0)) <= 0:
            continue
        if is_adjacent(unit, other):
            count += 1
    return count


def is_surrounded(
    unit: Mapping[str, Any],
    all_units: Sequence[Mapping[str, Any]],
    threshold: int = SURROUNDED_THRESHOLD,
) -> bool:
    """Unit has ≥threshold adjacent enemies."""
    return count_adjacent_enemies(unit, all_units) >= threshold


# ---------------------------------------------------------------------------
# Movement
# ---------------------------------------------------------------------------


def is_in_bounds(p: Mapping[str, int], width: int = DEFAULT_WIDTH, height: int = DEFAULT_HEIGHT) -> bool:
    """Position within grid bounds."""
    x, y = int(p.get("x", 0)), int(p.get("y", 0))
    return 0 <= x < width and 0 <= y < height


def clamp_position(p: Mapping[str, int], width: int = DEFAULT_WIDTH, height: int = DEFAULT_HEIGHT) -> Dict[str, int]:
    """Clamp position to grid bounds."""
    return {
        "x": max(0, min(width - 1, int(p.get("x", 0)))),
        "y": max(0, min(height - 1, int(p.get("y", 0)))),
        "z": int(p.get("z", 0)),
    }


def is_cell_free(
    p: Mapping[str, int],
    units: Sequence[Mapping[str, Any]],
    exclude_id: Optional[str] = None,
) -> bool:
    """No living unit occupies cell (x, y). Ignores z layer."""
    px, py = int(p.get("x", 0)), int(p.get("y", 0))
    for u in units:
        if u.get("id") == exclude_id:
            continue
        hp = u.get("hp") or {}
        if int(hp.get("current", 0)) <= 0:
            continue
        up = get_pos(u)
        if up["x"] == px and up["y"] == py:
            return False
    return True


def step_towards(from_pos: Mapping[str, int], to_pos: Mapping[str, int]) -> Dict[str, int]:
    """Single step towards target (prioritize X axis like Node sessionHelpers)."""
    fx, fy = int(from_pos.get("x", 0)), int(from_pos.get("y", 0))
    tx, ty = int(to_pos.get("x", 0)), int(to_pos.get("y", 0))
    dx = tx - fx
    dy = ty - fy
    if dx == 0 and dy == 0:
        return {"x": fx, "y": fy, "z": int(from_pos.get("z", 0))}
    if abs(dx) >= abs(dy):
        return {"x": fx + (1 if dx > 0 else -1), "y": fy, "z": int(from_pos.get("z", 0))}
    return {"x": fx, "y": fy + (1 if dy > 0 else -1), "z": int(from_pos.get("z", 0))}


def step_away(
    from_pos: Mapping[str, int],
    threat_pos: Mapping[str, int],
    width: int = DEFAULT_WIDTH,
    height: int = DEFAULT_HEIGHT,
) -> Optional[Dict[str, int]]:
    """Single step away from threat. Returns None if cornered (aligned with Node policy.js)."""
    fx, fy = int(from_pos.get("x", 0)), int(from_pos.get("y", 0))
    tx, ty = int(threat_pos.get("x", 0)), int(threat_pos.get("y", 0))
    dx = fx - tx  # away direction
    dy = fy - ty
    fz = int(from_pos.get("z", 0))

    # Try primary axis first
    candidates = []
    if abs(dx) >= abs(dy):
        primary = {"x": fx + (1 if dx > 0 else (-1 if dx < 0 else 1)), "y": fy, "z": fz}
        secondary = {"x": fx, "y": fy + (1 if dy > 0 else (-1 if dy < 0 else 1)), "z": fz}
    else:
        primary = {"x": fx, "y": fy + (1 if dy > 0 else (-1 if dy < 0 else 1)), "z": fz}
        secondary = {"x": fx + (1 if dx > 0 else (-1 if dx < 0 else 1)), "y": fy, "z": fz}
    candidates.append(primary)
    candidates.append(secondary)

    for c in candidates:
        if is_in_bounds(c, width, height):
            return c
    return None


# ---------------------------------------------------------------------------
# ASCII rendering
# ---------------------------------------------------------------------------


def render_grid(
    units: Sequence[Mapping[str, Any]],
    width: int = DEFAULT_WIDTH,
    height: int = DEFAULT_HEIGHT,
) -> str:
    """Render ASCII grid with unit markers.

    Party: P1 P2 P3 (lowercase p if dead)
    Hostile: H1 H2 H3 (lowercase h if dead)
    Empty: ·
    """
    # Build cell map
    cells: Dict[Tuple[int, int], str] = {}
    for u in units:
        p = get_pos(u)
        hp = u.get("hp") or {}
        alive = int(hp.get("current", 0)) > 0
        uid = u.get("id", "?")
        side = u.get("side", "?")
        # Extract number from id (e.g., "party-01" → "1", "hostile-03" → "3")
        num = uid.split("-")[-1].lstrip("0") or "0"
        if side == "party":
            marker = f"P{num}" if alive else f"p{num}"
        else:
            marker = f"H{num}" if alive else f"h{num}"
        cells[(p["x"], p["y"])] = marker

    lines = []
    # Header
    header = "   " + " ".join(f"{x:>2}" for x in range(width))
    lines.append(header)
    for y in range(height):
        row = f"{y:>2} "
        for x in range(width):
            cell = cells.get((x, y), " .")
            row += f"{cell:>3}"
        lines.append(row)
    return "\n".join(lines)
