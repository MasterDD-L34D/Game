import json
import logging

import pytest

from services.generation.orchestrator import (
    GenerationError,
    GenerationOrchestrator,
    SpeciesGenerationRequest,
    StructuredLogger,
)


def build_request(**overrides):
    base = {
        'trait_ids': ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'],
        'seed': 123,
        'biome_id': 'caverna_risonante',
        'base_name': 'Predatore Demo',
    }
    base.update(overrides)
    return SpeciesGenerationRequest(**base)


def test_generate_species_returns_blueprint_and_validation() -> None:
    orchestrator = GenerationOrchestrator(fallback_traits=[])
    request = build_request()

    result = orchestrator.generate_species(request)

    assert result.blueprint['id'].startswith('synthetic-')
    assert result.meta['fallback_used'] is False
    assert result.meta['biome_id'] == 'caverna_risonante'
    assert isinstance(result.validation.messages, list)
    assert result.validation.discarded == []


def test_generate_species_applies_fallback_on_invalid_traits() -> None:
    orchestrator = GenerationOrchestrator()
    request = build_request(trait_ids=['sconosciuto_trait'], fallback_trait_ids=['artigli_sette_vie'])

    result = orchestrator.generate_species(request)

    assert result.meta['fallback_used'] is True
    assert result.validation.discarded == []
    assert result.blueprint['traits']['core']


def test_generate_species_logs_structured_events(caplog: pytest.LogCaptureFixture) -> None:
    logger = StructuredLogger(logging.getLogger('test-orchestrator'), base={'component': 'test'})
    orchestrator = GenerationOrchestrator(logger=logger)
    request = build_request(trait_ids=['non_valido'], fallback_trait_ids=['artigli_sette_vie'])

    with caplog.at_level(logging.INFO):
        orchestrator.generate_species(request)

    events = []
    for record in caplog.records:
        try:
            events.append(json.loads(record.message))
        except json.JSONDecodeError:
            continue
    event_names = {entry.get('event') for entry in events}
    assert 'generation.invalid_traits' in event_names
    assert 'generation.success' in event_names


def test_generate_species_raises_on_missing_traits() -> None:
    orchestrator = GenerationOrchestrator(fallback_traits=[])
    request = SpeciesGenerationRequest(trait_ids=[], fallback_trait_ids=[])

    with pytest.raises(GenerationError):
        orchestrator.generate_species(request)
