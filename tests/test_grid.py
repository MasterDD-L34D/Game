"""Unit tests for services.rules.grid spatial module."""
from __future__ import annotations

import pytest
from services.rules.grid import (
    pos,
    get_pos,
    get_facing,
    manhattan,
    distance_3d,
    is_adjacent,
    in_range,
    is_elevated,
    is_underground,
    elevation_advantage,
    auto_face,
    is_backstab,
    count_adjacent_enemies,
    is_surrounded,
    is_in_bounds,
    clamp_position,
    is_cell_free,
    step_towards,
    step_away,
    render_grid,
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,
)


def _unit(uid, x, y, z=0, side="party", facing="S", hp=10):
    return {
        "id": uid,
        "side": side,
        "position": {"x": x, "y": y, "z": z},
        "facing": facing,
        "hp": {"current": hp, "max": hp},
    }


# --- Distance ---

class TestManhattan:
    def test_same_point(self):
        assert manhattan(pos(2, 3), pos(2, 3)) == 0

    def test_adjacent(self):
        assert manhattan(pos(0, 0), pos(1, 0)) == 1
        assert manhattan(pos(0, 0), pos(0, 1)) == 1

    def test_diagonal(self):
        assert manhattan(pos(0, 0), pos(1, 1)) == 2

    def test_far(self):
        assert manhattan(pos(0, 0), pos(5, 5)) == 10


class TestDistance3D:
    def test_same_elevation(self):
        assert distance_3d(pos(0, 0, 0), pos(1, 1, 0)) == 2

    def test_different_elevation(self):
        assert distance_3d(pos(0, 0, 0), pos(1, 1, 1)) == 3

    def test_underground(self):
        assert distance_3d(pos(0, 0, -1), pos(0, 0, 1)) == 2


# --- Range ---

class TestRange:
    def test_adjacent_units(self):
        a = _unit("a", 0, 0)
        b = _unit("b", 1, 0)
        assert is_adjacent(a, b)

    def test_not_adjacent(self):
        a = _unit("a", 0, 0)
        b = _unit("b", 2, 0)
        assert not is_adjacent(a, b)

    def test_in_range_melee(self):
        a = _unit("a", 0, 0)
        b = _unit("b", 1, 0)
        assert in_range(a, b, 1)

    def test_out_of_range_melee(self):
        a = _unit("a", 0, 0)
        b = _unit("b", 2, 0)
        assert not in_range(a, b, 1)

    def test_in_range_ranged(self):
        a = _unit("a", 0, 0)
        b = _unit("b", 3, 0)
        assert in_range(a, b, 3)


# --- Elevation ---

class TestElevation:
    def test_elevated(self):
        assert is_elevated(_unit("a", 0, 0, z=1))

    def test_not_elevated(self):
        assert not is_elevated(_unit("a", 0, 0, z=0))

    def test_underground(self):
        assert is_underground(_unit("a", 0, 0, z=-1))

    def test_elevation_advantage(self):
        high = _unit("a", 0, 0, z=1)
        low = _unit("b", 1, 0, z=0)
        assert elevation_advantage(high, low) == 1

    def test_no_elevation_advantage(self):
        same = _unit("a", 0, 0, z=0)
        other = _unit("b", 1, 0, z=0)
        assert elevation_advantage(same, other) == 0


# --- Facing & Backstab ---

class TestFacing:
    def test_auto_face_east(self):
        assert auto_face(pos(0, 0), pos(1, 0)) == "E"

    def test_auto_face_west(self):
        assert auto_face(pos(1, 0), pos(0, 0)) == "W"

    def test_auto_face_south(self):
        assert auto_face(pos(0, 0), pos(0, 1)) == "S"

    def test_auto_face_north(self):
        assert auto_face(pos(0, 1), pos(0, 0)) == "N"

    def test_auto_face_no_movement(self):
        assert auto_face(pos(0, 0), pos(0, 0)) == "S"  # default


class TestBackstab:
    def test_backstab_from_behind_north_facing(self):
        target = _unit("t", 2, 2, facing="N")
        attacker = _unit("a", 2, 3)
        assert is_backstab(attacker, target)

    def test_no_backstab_from_front_north_facing(self):
        target = _unit("t", 2, 2, facing="N")
        attacker = _unit("a", 2, 1)
        assert not is_backstab(attacker, target)

    def test_backstab_from_behind_east_facing(self):
        target = _unit("t", 2, 2, facing="E")
        attacker = _unit("a", 1, 2)
        assert is_backstab(attacker, target)

    def test_backstab_south_facing(self):
        target = _unit("t", 2, 2, facing="S")
        attacker = _unit("a", 2, 1)  # above = behind south-facing
        assert is_backstab(attacker, target)


# --- Surrounded ---

class TestSurrounded:
    def test_surrounded(self):
        center = _unit("c", 2, 2, side="party")
        enemies = [
            _unit("e1", 1, 2, side="hostile"),
            _unit("e2", 3, 2, side="hostile"),
            _unit("e3", 2, 1, side="hostile"),
        ]
        all_units = [center] + enemies
        assert is_surrounded(center, all_units, threshold=3)

    def test_not_surrounded(self):
        center = _unit("c", 2, 2, side="party")
        enemies = [_unit("e1", 1, 2, side="hostile")]
        all_units = [center] + enemies
        assert not is_surrounded(center, all_units, threshold=3)


# --- Movement ---

class TestMovement:
    def test_in_bounds(self):
        assert is_in_bounds(pos(0, 0))
        assert is_in_bounds(pos(5, 5))
        assert not is_in_bounds(pos(-1, 0))
        assert not is_in_bounds(pos(6, 0))

    def test_clamp(self):
        assert clamp_position(pos(-1, 7)) == {"x": 0, "y": 5, "z": 0}

    def test_cell_free(self):
        units = [_unit("a", 2, 2)]
        assert not is_cell_free(pos(2, 2), units)
        assert is_cell_free(pos(3, 3), units)

    def test_cell_free_dead_unit(self):
        units = [_unit("a", 2, 2, hp=0)]
        assert is_cell_free(pos(2, 2), units)

    def test_step_towards(self):
        assert step_towards(pos(0, 0), pos(5, 0)) == {"x": 1, "y": 0, "z": 0}
        assert step_towards(pos(0, 0), pos(0, 5)) == {"x": 0, "y": 1, "z": 0}

    def test_step_away(self):
        result = step_away(pos(2, 2), pos(1, 2))
        assert result is not None
        assert result["x"] == 3  # away from threat at x=1

    def test_step_away_cornered(self):
        result = step_away(pos(0, 0), pos(1, 1), width=1, height=1)
        assert result is None


# --- Rendering ---

class TestRender:
    def test_render_grid_basic(self):
        units = [_unit("party-01", 0, 0), _unit("hostile-01", 5, 0, side="hostile")]
        grid = render_grid(units)
        assert "P1" in grid
        assert "H1" in grid

    def test_render_dead_unit(self):
        units = [_unit("party-01", 0, 0, hp=0)]
        grid = render_grid(units)
        assert "p1" in grid  # lowercase for dead
