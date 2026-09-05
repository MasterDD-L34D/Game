import pytest

from services.generation.orchestrator import (
    GenerationError,
    GenerationOrchestrator,
    SpeciesGenerationRequest,
)
from services.generation.species_builder import (
    PathfinderProfileTranslator,
    PathfinderTraitFormula,
)


@pytest.fixture(scope="module")
def pathfinder_translator() -> PathfinderProfileTranslator:
    return PathfinderProfileTranslator()


@pytest.fixture
def orchestrator(pathfinder_translator: PathfinderProfileTranslator) -> GenerationOrchestrator:
    return GenerationOrchestrator(
        fallback_traits=[],
        dataset_translators={"pathfinder": pathfinder_translator},
    )


def test_pathfinder_generation_matches_statblock(
    orchestrator: GenerationOrchestrator, pathfinder_translator: PathfinderProfileTranslator
) -> None:
    profile_id = "aboleth"
    request = SpeciesGenerationRequest(
        trait_ids=[],
        dataset_id="pathfinder",
        profile_id=profile_id,
        biome_id="mare_profondo",
    )

    result = orchestrator.generate_species(request)
    entry = pathfinder_translator.get_profile(profile_id)
    expected_blueprint, _ = pathfinder_translator.build_blueprint(profile_id, biome_id="mare_profondo")

    assert result.meta["dataset_id"] == "pathfinder"
    assert result.meta["profile_id"] == profile_id
    assert result.meta["source_cr"] == entry.get("cr")

    assert result.blueprint["statistics"]["threat_tier"] == expected_blueprint["statistics"]["threat_tier"]
    assert result.blueprint["balance"]["rarity"] == expected_blueprint["balance"]["rarity"]
    assert set(result.blueprint["special_abilities"]) >= set(entry.get("special_abilities", [])[:3])
    assert result.blueprint["environment_affinity"]["source_tags"] == [
        tag for tag in entry.get("environment_tags", []) if tag
    ]


def test_pathfinder_trait_formula_extracts_signature_traits(
    pathfinder_translator: PathfinderProfileTranslator,
) -> None:
    formula: PathfinderTraitFormula = pathfinder_translator.trait_formula

    balor_profile = pathfinder_translator.get_profile("balor")
    balor_traits = formula.extract(balor_profile)
    assert "mantello_meteoritico" in balor_traits["core"]
    assert "frusta_fiammeggiante" in balor_traits["core"]
    assert "carapace_fase_variabile" in balor_traits["optional"]

    solar_profile = pathfinder_translator.get_profile("solar")
    solar_traits = formula.extract(solar_profile)
    assert "aura_scudo_radianza" in solar_traits["core"]
    assert "empatia_coordinativa" in solar_traits["core"]
    assert "risonanza_di_branco" in solar_traits["synergy"]


def test_missing_profile_raises(orchestrator: GenerationOrchestrator) -> None:
    request = SpeciesGenerationRequest(trait_ids=[], dataset_id="pathfinder", biome_id="foresta_miceliale")
    with pytest.raises(GenerationError):
        orchestrator.generate_species(request)


def test_unknown_dataset_raises(pathfinder_translator: PathfinderProfileTranslator) -> None:
    orchestrator = GenerationOrchestrator(
        fallback_traits=[],
        dataset_translators={"pathfinder": pathfinder_translator},
    )
    request = SpeciesGenerationRequest(trait_ids=[], dataset_id="sconosciuto", profile_id="aboleth")
    with pytest.raises(GenerationError):
        orchestrator.generate_species(request)
