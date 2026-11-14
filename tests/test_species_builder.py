import json
import unittest
from pathlib import Path

from services.generation.species_builder import SpeciesBuilder, TraitCatalog
from services.generation.species_builder import build_trait_diagnostics

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
        self.assertIn("data/core/traits/glossary.json", trait.dataset_sources)
        self.assertIn("caverna_risonante", trait.environments)

    def test_trait_profile_includes_new_metadata(self) -> None:
        trait = self.catalog.require("pathfinder")
        self.assertIn("scout", trait.usage_tags)
        affinity_ids = {entry.species_id for entry in trait.species_affinity}
        self.assertIn("sentinella-radice", affinity_ids)
        self.assertTrue(trait.completion_flags.get("has_species_link"))

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

    def test_species_blueprint_includes_trait_metadata(self) -> None:
        profile = self.builder.build(["pathfinder", "artigli_sette_vie"], seed=7, base_name="Scout")
        metadata = profile["traits"]["metadata"]
        self.assertIn("usage_tags", metadata)
        self.assertIn("scout", metadata["usage_tags"])
        per_trait = metadata["per_trait"]
        self.assertIn("pathfinder", per_trait)
        self.assertTrue(per_trait["pathfinder"]["completion_flags"].get("has_species_link"))

    def test_trait_diagnostics_summary(self) -> None:
        diagnostics = build_trait_diagnostics()
        self.assertIn("summary", diagnostics)
        summary = diagnostics["summary"]
        self.assertGreater(summary.get("total_traits", 0), 0)
        self.assertIn("traits", diagnostics)
        self.assertIsInstance(diagnostics["traits"], list)


if __name__ == "__main__":  # pragma: no cover - esecuzione manuale
    unittest.main()
