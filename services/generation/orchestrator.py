"""Orchestratore centrale per la generazione di specie sintetiche.

Il modulo coordina il builder narrativo/meccanico e i validator runtime del
pack Evo Tactics esponendo un'unica interfaccia da utilizzare dal backend HTTP
e dai test di integrazione.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from packs.evo_tactics_pack.validators import runtime_api  # noqa: E402
from packs.evo_tactics_pack.validators.rules.base import (  # noqa: E402
    ValidationMessage,
    format_messages,
    has_errors,
)
from services.generation.species_builder import (  # noqa: E402
    PathfinderProfileTranslator,
    SpeciesBuilder,
    TraitCatalog,
    build_trait_diagnostics,
)


DEFAULT_FALLBACK_TRAITS: Sequence[str] = (
    "artigli_sette_vie",
    "coda_frusta_cinetica",
    "scheletro_idro_regolante",
)


class StructuredLogger:
    """Piccolo helper per emettere log JSON strutturati."""

    def __init__(self, logger: logging.Logger, *, base: Optional[Mapping[str, Any]] = None) -> None:
        self._logger = logger
        self._base: Dict[str, Any] = dict(base or {})

    def bind(self, **fields: Any) -> "StructuredLogger":
        base = dict(self._base)
        base.update(fields)
        return StructuredLogger(self._logger, base=base)

    def info(self, event: str, **fields: Any) -> None:
        self._emit(logging.INFO, event, fields)

    def warning(self, event: str, **fields: Any) -> None:
        self._emit(logging.WARNING, event, fields)

    def error(self, event: str, **fields: Any) -> None:
        self._emit(logging.ERROR, event, fields)

    def _emit(self, level: int, event: str, fields: MutableMapping[str, Any]) -> None:
        payload = dict(self._base)
        payload.update(fields)
        payload["event"] = event
        self._logger.log(level, json.dumps(payload, ensure_ascii=False, sort_keys=True))


@dataclass(slots=True)
class SpeciesGenerationRequest:
    """Rappresenta una richiesta di generazione proveniente dall'UI."""

    trait_ids: Sequence[str]
    biome_id: Optional[str] = None
    seed: Optional[int | str] = None
    base_name: Optional[str] = None
    request_id: Optional[str] = None
    fallback_trait_ids: Sequence[str] = field(default_factory=tuple)
    dataset_id: Optional[str] = None
    profile_id: Optional[str] = None

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> "SpeciesGenerationRequest":
        trait_ids = _normalise_string_sequence(payload.get("trait_ids"))
        fallback = _normalise_string_sequence(payload.get("fallback_trait_ids"))
        request_id = payload.get("request_id")
        return cls(
            trait_ids=trait_ids,
            biome_id=_normalise_optional_string(payload.get("biome_id")),
            seed=payload.get("seed"),
            base_name=_normalise_optional_string(payload.get("base_name")),
            request_id=_normalise_optional_string(request_id) or None,
            fallback_trait_ids=fallback,
            dataset_id=_normalise_optional_string(payload.get("dataset_id")),
            profile_id=_normalise_optional_string(payload.get("profile_id")),
        )


@dataclass(slots=True)
class ValidationBundle:
    corrected: Optional[Mapping[str, Any]]
    messages: List[Mapping[str, Any]]
    discarded: List[str]

    def to_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "messages": self.messages,
            "discarded": self.discarded,
        }
        if self.corrected is not None:
            payload["corrected"] = self.corrected
        return payload


@dataclass(slots=True)
class GenerationResult:
    blueprint: Mapping[str, Any]
    validation: ValidationBundle
    meta: Mapping[str, Any]

    def to_payload(self) -> Dict[str, Any]:
        return {
            "blueprint": dict(self.blueprint),
            "validation": self.validation.to_payload(),
            "meta": dict(self.meta),
        }


@dataclass(slots=True)
class SpeciesBatchRequest:
    entries: List[SpeciesGenerationRequest]

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> "SpeciesBatchRequest":
        batch = payload.get("batch")
        entries: List[SpeciesGenerationRequest] = []
        if isinstance(batch, Sequence):
            for item in batch:
                if isinstance(item, Mapping):
                    entries.append(SpeciesGenerationRequest.from_payload(item))
        return cls(entries=entries)


@dataclass(slots=True)
class BatchEntryError:
    index: int
    error: str
    request_id: Optional[str]

    def to_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"index": self.index, "error": self.error}
        if self.request_id:
            payload["request_id"] = self.request_id
        return payload


@dataclass(slots=True)
class GenerationBatchResult:
    results: List[GenerationResult]
    errors: List[BatchEntryError]

    def to_payload(self) -> Dict[str, Any]:
        return {
            "results": [result.to_payload() for result in self.results],
            "errors": [error.to_payload() for error in self.errors],
        }


def _normalise_string_sequence(value: Any) -> List[str]:
    if not value:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    result: List[str] = []
    for entry in value:  # type: ignore[assignment]
        if isinstance(entry, str) and entry.strip():
            result.append(entry.strip())
    return result


def _normalise_optional_string(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return str(value)


def _render_messages(messages: Iterable[ValidationMessage]) -> List[Mapping[str, Any]]:
    return [message.to_dict() for message in messages]


class GenerationError(RuntimeError):
    """Errore generico del processo di generazione."""


class GenerationOrchestrator:
    """Coordina generatore e validator con logging strutturato."""

    def __init__(
        self,
        *,
        trait_catalog: Optional[TraitCatalog] = None,
        species_builder: Optional[SpeciesBuilder] = None,
        runtime_resources: Optional[runtime_api.RuntimeResources] = None,
        fallback_traits: Sequence[str] = DEFAULT_FALLBACK_TRAITS,
        logger: Optional[StructuredLogger] = None,
        dataset_translators: Optional[Mapping[str, PathfinderProfileTranslator]] = None,
    ) -> None:
        catalog = trait_catalog or TraitCatalog.load()
        self.catalog = catalog
        self.builder = species_builder or SpeciesBuilder(catalog)
        self.resources = runtime_resources or runtime_api.load_resources()
        self.fallback_traits = list(fallback_traits)
        self.datasets: Dict[str, PathfinderProfileTranslator] = (
            dict(dataset_translators)
            if dataset_translators
            else {"pathfinder": PathfinderProfileTranslator()}
        )
        base_logger = logger or StructuredLogger(
            logging.getLogger(__name__), base={"component": "generation-orchestrator"}
        )
        self.logger = base_logger

    def generate_species(self, request: SpeciesGenerationRequest) -> GenerationResult:
        request_id = request.request_id or self._compute_request_id(request)
        logger = self.logger.bind(request_id=request_id)

        if request.dataset_id:
            return self._generate_from_dataset(request, logger)

        candidates = self._prepare_candidates(request)
        if not candidates:
            logger.error(
                "generation.input_missing",
                trait_ids=list(request.trait_ids),
                message="Nessun tratto valido disponibile per la generazione",
            )
            raise GenerationError("Impossibile generare specie: nessun tratto valido")

        invalid_traits = [trait for trait in request.trait_ids if not self.catalog.get(trait)]
        if invalid_traits:
            logger.warning(
                "generation.invalid_traits",
                invalid_traits=invalid_traits,
                fallback_traits=candidates[0]["traits"],
            )

        for attempt, candidate in enumerate(candidates, start=1):
            attempt_logger = logger.bind(attempt=attempt, traits=candidate["traits"])
            attempt_logger.info("generation.attempt", source=candidate["source"])
            try:
                blueprint = self.builder.build(
                    candidate["traits"],
                    seed=request.seed,
                    base_name=request.base_name,
                )
            except ValueError as error:
                attempt_logger.warning(
                    "generation.builder_failure",
                    error=str(error),
                )
                continue

            validation = runtime_api.validate_species_entries(
                [blueprint],
                resources=self.resources,
                biome_id=request.biome_id,
            )
            messages = [
                ValidationMessage(**message)
                if not isinstance(message, ValidationMessage)
                else message
                for message in validation["messages"]
            ]
            if has_errors(messages):
                attempt_logger.warning(
                    "generation.validation_failed",
                    discarded=validation.get("discarded", []),
                    messages=format_messages(messages),
                )
                continue

            attempt_logger.info(
                "generation.success",
                warnings=[msg.message for msg in messages if msg.level != "error"],
                fallback_used=candidate["source"] != "requested",
            )
            corrected_entries = validation.get("corrected") or []
            corrected = corrected_entries[0] if corrected_entries else None
            bundle = ValidationBundle(
                corrected=corrected,
                messages=_render_messages(messages),
                discarded=validation.get("discarded", []),
            )
            meta = {
                "request_id": request_id,
                "attempts": attempt,
                "fallback_used": candidate["source"] != "requested",
                "biome_id": request.biome_id,
            }
            return GenerationResult(blueprint=blueprint, validation=bundle, meta=meta)

        logger.error(
            "generation.exhausted_fallbacks",
            attempts=len(candidates),
            trait_sets=[candidate["traits"] for candidate in candidates],
        )
        raise GenerationError("Impossibile generare specie valida dopo i fallback")

    def generate_species_batch(
        self, requests: Sequence[SpeciesGenerationRequest]
    ) -> GenerationBatchResult:
        results: List[GenerationResult] = []
        errors: List[BatchEntryError] = []
        for index, request in enumerate(requests):
            request_id = request.request_id or self._compute_request_id(request)
            try:
                result = self.generate_species(request)
            except GenerationError as error:
                self.logger.bind(request_id=request_id, batch_index=index).error(
                    "generation.batch_entry_failed",
                    error=str(error),
                    traits=list(request.trait_ids),
                )
                errors.append(
                    BatchEntryError(index=index, error=str(error), request_id=request_id)
                )
                continue
            results.append(result)
        return GenerationBatchResult(results=results, errors=errors)

    def _prepare_candidates(self, request: SpeciesGenerationRequest) -> List[Dict[str, Any]]:
        candidates: List[Dict[str, Any]] = []
        requested = [trait for trait in request.trait_ids if self.catalog.get(trait)]
        if requested:
            candidates.append({"traits": requested, "source": "requested"})

        fallback_sequence = request.fallback_trait_ids or self.fallback_traits
        fallback = [trait for trait in fallback_sequence if self.catalog.get(trait)]
        if fallback and (not candidates or fallback != requested):
            candidates.append({"traits": fallback, "source": "fallback"})
        return candidates

    def _compute_request_id(self, request: SpeciesGenerationRequest) -> str:
        parts = list(request.trait_ids or [])
        parts.extend(request.fallback_trait_ids or [])
        if request.dataset_id:
            parts.append(f"dataset:{request.dataset_id}")
        if request.profile_id:
            parts.append(f"profile:{request.profile_id}")
        seed = request.seed
        if seed is not None:
            parts.append(str(seed))
        if request.biome_id:
            parts.append(request.biome_id)
        if not parts:
            return uuid.uuid4().hex
        digest_source = "|".join(parts)
        return uuid.uuid5(uuid.NAMESPACE_DNS, digest_source).hex

    def _generate_from_dataset(
        self,
        request: SpeciesGenerationRequest,
        logger: StructuredLogger,
    ) -> GenerationResult:
        dataset_id = request.dataset_id or ""
        translator = self.datasets.get(dataset_id)
        if not translator:
            logger.error(
                "generation.dataset_unknown",
                dataset_id=dataset_id,
                available=list(self.datasets.keys()),
            )
            raise GenerationError(f"Dataset non supportato: {dataset_id}")
        profile_id = request.profile_id
        if not profile_id:
            logger.error(
                "generation.dataset_profile_missing",
                dataset_id=dataset_id,
            )
            raise GenerationError("Profilo dataset mancante per la generazione")

        blueprint, adapter_meta = translator.build_blueprint(
            profile_id,
            biome_id=request.biome_id,
            fallback_traits=request.fallback_trait_ids or self.fallback_traits,
        )

        validation = runtime_api.validate_species_entries(
            [blueprint],
            resources=self.resources,
            biome_id=request.biome_id,
        )
        messages = [
            ValidationMessage(**message)
            if not isinstance(message, ValidationMessage)
            else message
            for message in validation["messages"]
        ]
        if has_errors(messages):
            logger.error(
                "generation.dataset_validation_failed",
                dataset_id=dataset_id,
                profile_id=profile_id,
                messages=format_messages(messages),
            )
            raise GenerationError(
                f"Validazione fallita per profilo '{profile_id}' del dataset '{dataset_id}'"
            )

        corrected_entries = validation.get("corrected") or []
        corrected = corrected_entries[0] if corrected_entries else None
        bundle = ValidationBundle(
            corrected=corrected,
            messages=_render_messages(messages),
            discarded=validation.get("discarded", []),
        )
        meta = {
            "request_id": request.request_id or self._compute_request_id(request),
            "attempts": 1,
            "fallback_used": False,
            "biome_id": request.biome_id,
        }
        meta.update(adapter_meta)
        logger.info(
            "generation.dataset_success",
            dataset_id=dataset_id,
            profile_id=profile_id,
        )
        return GenerationResult(blueprint=blueprint, validation=bundle, meta=meta)


def _load_input_payload(path: Optional[Path]) -> Mapping[str, Any]:
    if path is None:
        raw = sys.stdin.read()
        if not raw.strip():
            return {}
        return json.loads(raw)
    return json.loads(path.read_text(encoding="utf-8"))


def _write_output_payload(path: Optional[Path], payload: Mapping[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if path is None:
        sys.stdout.write(text)
        sys.stdout.write("\n")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + "\n", encoding="utf-8")


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Orchestratore generazione specie")
    parser.add_argument(
        "--action",
        required=True,
        choices=["generate-species", "generate-species-batch", "trait-diagnostics"],
    )
    parser.add_argument("--input", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--log-level", default=os.environ.get("ORCHESTRATOR_LOG_LEVEL", "INFO"))
    args = parser.parse_args(argv)

    logging.basicConfig(level=args.log_level.upper(), stream=sys.stderr)

    payload = _load_input_payload(args.input)
    orchestrator = GenerationOrchestrator()

    try:
        if args.action == "generate-species":
            request = SpeciesGenerationRequest.from_payload(payload)
            result = orchestrator.generate_species(request)
            _write_output_payload(args.output, result.to_payload())
            return 0
        if args.action == "generate-species-batch":
            batch = SpeciesBatchRequest.from_payload(payload)
            result = orchestrator.generate_species_batch(batch.entries)
            _write_output_payload(args.output, result.to_payload())
            return 0
        if args.action == "trait-diagnostics":
            diagnostics = build_trait_diagnostics()
            _write_output_payload(args.output, diagnostics)
            return 0
    except GenerationError as error:
        logging.getLogger(__name__).error(
            "generation.request_failed",
            extra={"error": str(error)},
        )
        return 1

    raise SystemExit(f"Azione non supportata: {args.action}")


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
