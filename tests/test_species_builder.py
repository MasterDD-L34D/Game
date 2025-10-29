import json
import unittest
from pathlib import Path

from services.generation.species_builder import SpeciesBuilder, TraitCatalog

REPO_ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_PATH = REPO_ROOT / "tests" / "snapshots" / "species_builder_predatore.json"


class SpeciesBuilderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = TraitCatalog.load()
        self.builder = SpeciesBuilder(self.catalog)

    def test_catalog_contains_core_trait_metadata(self) -> None:
        trait = self.catalog.require("artigli_sette_vie")
        self.assertEqual(trait.label, "Artigli a Sette Vie")
        self.assertIn("Locomotorio", " ".join(trait.families) or trait.usage or "")
        self.assertIn("data/traits/glossary.json", trait.dataset_sources)
        self.assertIn("caverna_risonante", trait.environments)

    def test_species_blueprint_matches_snapshot(self) -> None:
        profile = self.builder.build(
            [
                "artigli_sette_vie",
                "coda_frusta_cinetica",
                "scheletro_idro_regolante",
            ],
            seed=42,
            base_name="Predatore",
        )
        snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
        self.assertDictEqual(profile, snapshot)


if __name__ == "__main__":  # pragma: no cover - esecuzione manuale
    unittest.main()
