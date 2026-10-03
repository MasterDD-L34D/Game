import json
from pathlib import Path

import importlib.util
import json
import sys
from pathlib import Path


MODULE_PATH = Path("tools/importers/pathfinder_bestiary.py").resolve()
spec = importlib.util.spec_from_file_location("pathfinder_bestiary", MODULE_PATH)
assert spec and spec.loader
pathfinder_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = pathfinder_module
spec.loader.exec_module(pathfinder_module)

AXES = pathfinder_module.AXES
load_index = pathfinder_module.load_index
transform_creatures = pathfinder_module.transform_creatures


DATASET_PATH = Path("data/external/pathfinder_bestiary_1e.json")
INDEX_PATH = Path("incoming/pathfinder/bestiary1e_index.csv")
REQUIRED_FIELDS = {
    "id",
    "name",
    "type",
    "subtype",
    "cr",
    "environment_tags",
    "movement",
    "special_abilities",
    "axes",
    "visual_description",
    "biology",
    "genetic_traits",
}


def _load_dataset() -> dict:
    with DATASET_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_record_count_matches_index() -> None:
    dataset = _load_dataset()
    rows = load_index(INDEX_PATH)

    assert dataset["meta"]["record_count"] == len(dataset["creatures"]) == len(rows)
    assert list(dataset["meta"]["axes"]) == list(AXES)


def test_records_have_normalized_axes() -> None:
    dataset = _load_dataset()
    computed = transform_creatures(load_index(INDEX_PATH))

    for stored, recalculated in zip(dataset["creatures"], computed, strict=True):
        assert set(stored.keys()) >= REQUIRED_FIELDS
        assert stored["id"] == recalculated["id"]
        assert stored["axes"] == recalculated["axes"]
        axes = stored["axes"]
        assert set(axes.keys()) == set(AXES)
        for value in axes.values():
            assert 0.0 <= value <= 1.0
        assert isinstance(stored["cr"], (int, float))
        assert stored["environment_tags"]
        assert isinstance(stored["movement"], dict)
        assert isinstance(stored["special_abilities"], list)
        assert isinstance(stored["visual_description"], str) and stored["visual_description"].strip()
        biology = stored["biology"]
        assert isinstance(biology, dict)
        assert set(biology.keys()) == set(pathfinder_module.BIOLOGY_KEYS)
        for key in pathfinder_module.BIOLOGY_KEYS[:-1]:  # bool fields
            assert isinstance(biology[key], bool)
        assert isinstance(biology["life_cycle"], str)
        genetics = stored["genetic_traits"]
        assert isinstance(genetics, list)
        assert genetics
        for trait in genetics:
            assert isinstance(trait, str) and trait
