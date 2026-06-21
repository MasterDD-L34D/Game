#!/usr/bin/env python3
"""Unit test per scripts/verify-swarm-claims.py.

Test isolati: fixture canonical inline, no Game repo richiesto.
"""
# encoding-non-ascii-ok: vendored upstream evo-swarm test (ADR-0042); Italian
# comments preserved for upstream-sync parity.
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_PATH = REPO_ROOT / "scripts" / "verify-swarm-claims.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("verify_swarm_claims", SCRIPT_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class LooksLikeEntityTest(unittest.TestCase):
    def setUp(self):
        self.mod = _load_module()

    def test_kebab_case_is_entity(self):
        self.assertTrue(self.mod._looks_like_entity("abisso-vulcanico"))

    def test_snake_case_is_entity(self):
        self.assertTrue(self.mod._looks_like_entity("dune_stalker"))
        self.assertTrue(self.mod._looks_like_entity("polpo_araldo_sinaptico"))

    def test_single_word_not_entity(self):
        self.assertFalse(self.mod._looks_like_entity("geothermal"))
        self.assertFalse(self.mod._looks_like_entity("luminescente"))
        self.assertFalse(self.mod._looks_like_entity("aggiungere"))

    def test_hyphenated_short_is_entity(self):
        # Edge case: 'follow-up' is hyphenated → considered entity-shaped.
        # Trade-off accettato: noise occasionale vs miss di entity reali.
        self.assertTrue(self.mod._looks_like_entity("follow-up"))


class ExtractMentionsTest(unittest.TestCase):
    def setUp(self):
        self.mod = _load_module()

    def test_extracts_from_summary_field(self):
        artifact = {"summary": "creata sezione per dune_stalker e polpo_araldo"}
        mentions = self.mod.extract_mentions(artifact)
        self.assertIn("dune_stalker", mentions)
        self.assertIn("polpo_araldo", mentions)

    def test_extracts_from_response_findings(self):
        artifact = {
            "response": json.dumps({
                "findings": ["Il bioma abisso_vulcanico ha trait impulsi_bioluminescenti"],
                "summary": "guida per abisso_vulcanico",
            })
        }
        mentions = self.mod.extract_mentions(artifact)
        self.assertIn("abisso_vulcanico", mentions)
        self.assertIn("impulsi_bioluminescenti", mentions)

    def test_handles_invalid_response_json(self):
        artifact = {"summary": "ok", "response": "not valid json {"}
        # Non deve crashare
        mentions = self.mod.extract_mentions(artifact)
        self.assertIsInstance(mentions, set)

    def test_handles_dict_response(self):
        artifact = {
            "response": {"findings": ["dune_stalker e altri"]},
            "summary": "test"
        }
        mentions = self.mod.extract_mentions(artifact)
        self.assertIn("dune_stalker", mentions)

    def test_drops_stopwords(self):
        artifact = {"summary": "questo specie agente nuovo design"}
        mentions = self.mod.extract_mentions(artifact)
        # Tutti i token sopra sono stopword
        self.assertNotIn("questo", mentions)
        self.assertNotIn("specie", mentions)
        self.assertNotIn("agente", mentions)


class VerifyArtifactTest(unittest.TestCase):
    def setUp(self):
        self.mod = _load_module()
        # Canonical inline (mimica run #5 stato post-rewrite, post-Tier 3
        # con field_names harvested popolati per replicare comportamento prod)
        self.canonical = {
            "species": {"dune_stalker", "polpo_araldo_sinaptico"},
            "biomes_primary": {"abisso_vulcanico"},
            "biomes_alias": {"atollo_ossidiana"},
            "traits": {"impulsi_bioluminescenti", "nodi_sinaptici_superficiali"},
            "parts_known": {"echolocation", "sand_digest"},
            # Tier 3 — field_names common in Game schema (anche se test
            # canonical e' inline non harvested, simulo per realismo)
            "field_names": {"default_parts", "biome_affinity", "trait_plan",
                            "legacy_slug", "biome_class"},
            "species_biome_affinity": {"dune_stalker": "savana"},
            "meta": {},
        }

    def test_verified_species_and_trait(self):
        artifact = {
            "agent": "species-curator",
            "cycle": 26,
            "summary": "dune_stalker ha trait impulsi_bioluminescenti",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        verified_tokens = [t for t, _ in report["by_status"]["verified"]]
        self.assertIn("dune_stalker", verified_tokens)
        self.assertIn("impulsi_bioluminescenti", verified_tokens)

    def test_partial_default_parts_misclassified_as_trait(self):
        # Pattern noto: il swarm chiama 'echolocation' un trait, ma e' default_parts
        artifact = {
            "agent": "species-curator",
            "cycle": 26,
            "summary": "dune_stalker usa trait echolocation e sand_digest",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        partial_tokens = [t for t, note in report["by_status"]["partial"]]
        self.assertIn("echolocation", partial_tokens)
        self.assertIn("sand_digest", partial_tokens)
        # E il note deve indicare default_parts
        partial_notes = {t: note for t, note in report["by_status"]["partial"]}
        self.assertIn("default_parts", partial_notes["echolocation"])

    def test_partial_alias_only_biome(self):
        artifact = {
            "agent": "biome-ecosystem-curator",
            "cycle": 29,
            "summary": "guida per atollo_ossidiana",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        partial_tokens = [t for t, _ in report["by_status"]["partial"]]
        self.assertIn("atollo_ossidiana", partial_tokens)

    def test_hallucinated_unknown_entity(self):
        artifact = {
            "agent": "lore-designer",
            "cycle": 25,
            "summary": "trait fictional_xyz_made_up_thing_test serve",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        halluc_tokens = [t for t, _ in report["by_status"]["hallucinated"]]
        self.assertIn("fictional_xyz_made_up_thing_test", halluc_tokens)

    def test_score_aggregation(self):
        artifact = {
            "agent": "species-curator",
            "cycle": 26,
            "summary": (
                "dune_stalker e polpo_araldo_sinaptico in abisso_vulcanico, "
                "trait impulsi_bioluminescenti e nodi_sinaptici_superficiali, "
                "default_parts echolocation e sand_digest, "
                "biome alias atollo_ossidiana, "
                "halluc fake_invented_xyz_test"
            ),
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        self.assertEqual(report["score_verified"], 5)  # dune, polpo, abisso, 2 trait
        self.assertEqual(report["score_partial"], 3)  # echolocation, sand_digest, atollo
        self.assertEqual(report["score_hallucinated"], 1)  # fake_invented_xyz_test


class HarvestFieldNamesTest(unittest.TestCase):
    """Tier 3 — field name auto-extraction."""

    def setUp(self):
        self.mod = _load_module()

    def test_extracts_yaml_dict_keys(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / "schema.yaml").write_text(
                "version: 1\n"
                "biomes:\n"
                "  some_biome:\n"
                "    biome_class: geothermal\n"
                "    legacy_slug: some_biome\n"
                "    display_name_it: Test\n",
                encoding="utf-8"
            )
            fields = self.mod.harvest_field_names(tmp_path)
            # Field names with underscore o dash devono essere harvested
            self.assertIn("biome_class", fields)
            self.assertIn("legacy_slug", fields)
            self.assertIn("display_name_it", fields)

    def test_skips_simple_word_keys(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / "x.yaml").write_text(
                "name: X\nlabel: Y\nversion: 1\n",
                encoding="utf-8"
            )
            fields = self.mod.harvest_field_names(tmp_path)
            # Simple single-word keys (no separator) NON harvested
            self.assertNotIn("name", fields)
            self.assertNotIn("label", fields)
            self.assertNotIn("version", fields)

    def test_returns_empty_for_missing_dir(self):
        fields = self.mod.harvest_field_names(Path("/nonexistent/xyz"))
        self.assertEqual(fields, set())


class CuratedStopwordsTest(unittest.TestCase):
    """Tier 3 — curated whitelist da scripts/data/verify_stopwords.txt."""

    def setUp(self):
        self.mod = _load_module()
        # Reset cache per test isolation
        self.mod._CURATED_STOPWORDS_CACHE = None

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_loads_curated_file_if_exists(self):
        # Il file canonical esiste — deve contenere almeno follow-up
        words = self.mod._curated_stopwords()
        self.assertIn("follow-up", words)
        self.assertIn("end-to-end", words)

    def test_load_from_custom_path(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            custom = Path(tmp) / "custom_stops.txt"
            custom.write_text(
                "# this is a comment\n"
                "\n"
                "test-token-1\n"
                "test-token-2\n",
                encoding="utf-8"
            )
            words = self.mod.load_curated_stopwords(custom)
            self.assertEqual(words, {"test-token-1", "test-token-2"})

    def test_handles_missing_file(self):
        words = self.mod.load_curated_stopwords(Path("/nonexistent/xyz.txt"))
        self.assertEqual(words, set())


class HeuristicTier3Test(unittest.TestCase):
    """Tier 3 — heuristic _looks_like_entity migliorato."""

    def setUp(self):
        self.mod = _load_module()

    def test_three_segment_token_is_entity(self):
        self.assertTrue(self.mod._looks_like_entity("polpo_araldo_sinaptico"))
        self.assertTrue(self.mod._looks_like_entity("a_b_c"))  # 2 separators

    def test_short_two_segment_filtered(self):
        # `co-02`, `ad-hoc`, `e-mail` — 1 separator, < 8 char → non entity
        self.assertFalse(self.mod._looks_like_entity("co-02"))
        self.assertFalse(self.mod._looks_like_entity("ad-hoc"))
        self.assertFalse(self.mod._looks_like_entity("e-mail"))

    def test_long_two_segment_is_entity(self):
        # `dune_stalker` — 1 separator, ≥ 8 char → entity
        self.assertTrue(self.mod._looks_like_entity("dune_stalker"))
        self.assertTrue(self.mod._looks_like_entity("foresta_acida"))

    def test_no_separator_not_entity(self):
        self.assertFalse(self.mod._looks_like_entity("geothermal"))
        self.assertFalse(self.mod._looks_like_entity("aggiungere"))


class ExtractMentionsTier3Test(unittest.TestCase):
    """Tier 3 — extract_mentions con extra_stopwords."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_extra_stopwords_filtered(self):
        artifact = {"summary": "trait dune_stalker e biome_affinity savana"}
        # extra_stopwords contiene biome_affinity → deve essere filtrato
        mentions = self.mod.extract_mentions(
            artifact, extra_stopwords={"biome_affinity"}
        )
        self.assertNotIn("biome_affinity", mentions)
        self.assertIn("dune_stalker", mentions)

    def test_curated_stopwords_filtered_default(self):
        # `follow-up` è nella curated whitelist → sempre filtrato
        artifact = {"summary": "trigger follow-up del ciclo per dune_stalker"}
        mentions = self.mod.extract_mentions(artifact)
        self.assertNotIn("follow-up", mentions)
        self.assertIn("dune_stalker", mentions)


class IntegrationTier3Test(unittest.TestCase):
    """Tier 3 integration: verify_artifact con canonical che ha field_names."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": {"abisso_vulcanico"},
            "biomes_alias": set(),
            "traits": {"impulsi_bioluminescenti"},
            "parts_known": set(),
            "field_names": {"biome_affinity", "trait_plan", "default_parts"},
            "species_biome_affinity": {},
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_field_names_from_canonical_filtered(self):
        artifact = {
            "agent": "test", "cycle": 1,
            "summary": "Update biome_affinity di dune_stalker, modifica default_parts",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        # dune_stalker verified, biome_affinity + default_parts filtered (NON in nessun status)
        verified = [t for t, _ in report["by_status"]["verified"]]
        halluc = [t for t, _ in report["by_status"]["hallucinated"]]
        self.assertIn("dune_stalker", verified)
        self.assertNotIn("biome_affinity", halluc)
        self.assertNotIn("default_parts", halluc)


class NormalizeForMatchTest(unittest.TestCase):
    """Tier 1 — _normalize_for_match generates variants."""

    def setUp(self):
        self.mod = _load_module()

    def test_snake_to_kebab(self):
        v = self.mod._normalize_for_match("dune_stalker")
        self.assertIn("dune_stalker", v)
        self.assertIn("dune-stalker", v)

    def test_kebab_to_snake(self):
        v = self.mod._normalize_for_match("dune-stalker")
        self.assertIn("dune-stalker", v)
        self.assertIn("dune_stalker", v)

    def test_spaces_to_separators(self):
        v = self.mod._normalize_for_match("Dune Stalker")
        self.assertIn("dune stalker", v)
        self.assertIn("dune_stalker", v)
        self.assertIn("dune-stalker", v)

    def test_empty(self):
        self.assertEqual(self.mod._normalize_for_match(""), set())
        self.assertEqual(self.mod._normalize_for_match("  "), set())


class LevenshteinTest(unittest.TestCase):
    """Tier 1 — Levenshtein within max_dist."""

    def setUp(self):
        self.mod = _load_module()

    def test_identical(self):
        self.assertTrue(self.mod._levenshtein_within("abc", "abc", 0))

    def test_substitution(self):
        # 'kitten' → 'kitten' typo→'kittan' = 1
        self.assertTrue(self.mod._levenshtein_within("kitten", "kittan", 1))

    def test_three_diff_exceeds_max_2(self):
        self.assertFalse(self.mod._levenshtein_within("kitten", "sittin", 1))
        # 2 substitutions (k→s, e→i): edit distance = 2
        self.assertTrue(self.mod._levenshtein_within("kitten", "sittin", 2))

    def test_length_difference_too_big(self):
        self.assertFalse(self.mod._levenshtein_within("abc", "abcdefgh", 2))


class FuzzyMatchTest(unittest.TestCase):
    """Tier 1 — fuzzy matching contro canonical set."""

    def setUp(self):
        self.mod = _load_module()
        self.canonical = {"dune_stalker", "polpo_araldo_sinaptico", "abisso_vulcanico"}

    def test_exact_match(self):
        self.assertEqual(self.mod._fuzzy_match("dune_stalker", self.canonical), "dune_stalker")

    def test_typo_match(self):
        # 'dunestalker' (no separator) → fuzzy con dune_stalker: edit dist = 1
        self.assertEqual(self.mod._fuzzy_match("dunestalker", self.canonical), "dune_stalker")

    def test_short_token_skipped(self):
        # token < 8 char non viene matched (prevenzione false positive)
        self.assertIsNone(self.mod._fuzzy_match("abc", self.canonical))

    def test_too_far_no_match(self):
        self.assertIsNone(self.mod._fuzzy_match("totally_different_xyz", self.canonical))


class DisplayNameLookupTest(unittest.TestCase):
    """Tier 1 — display_name match via phrase regex + canonical lookup."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": set(),
            "biomes_alias": set(),
            "traits": set(),
            "parts_known": set(),
            "field_names": set(),
            "display_names": {
                "dune_stalker": "dune_stalker",
                "dune-stalker": "dune_stalker",
                "dune stalker": "dune_stalker",
            },
            "species_biome_affinity": {},
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_phrase_extracted_and_matched(self):
        artifact = {
            "agent": "test", "cycle": 1,
            "summary": "Lavoro su Dune Stalker creature",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        verified = [t for t, _ in report["by_status"]["verified"]]
        # 'Dune Stalker' phrase → 'dune_stalker' → species verified
        self.assertIn("dune_stalker", verified)


class FuzzyVerifyArtifactTest(unittest.TestCase):
    """Tier 1 — verify_artifact con fuzzy=True."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": set(),
            "biomes_alias": set(),
            "traits": set(),
            "parts_known": set(),
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {},
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_fuzzy_off_by_default(self):
        # 'dune_stalkr' (typo, distance 1) NON matchato senza fuzzy
        artifact = {"agent": "t", "cycle": 1, "summary": "trait dune_stalkr custode", "response": "{}"}
        report = self.mod.verify_artifact(artifact, self.canonical, fuzzy=False)
        halluc = [t for t, _ in report["by_status"]["hallucinated"]]
        self.assertIn("dune_stalkr", halluc)

    def test_fuzzy_on_matches_typo(self):
        artifact = {"agent": "t", "cycle": 1, "summary": "trait dune_stalkr custode", "response": "{}"}
        report = self.mod.verify_artifact(artifact, self.canonical, fuzzy=True)
        partial = [t for t, _ in report["by_status"]["partial"]]
        # fuzzy match → partial, non hallucinated
        self.assertIn("dune_stalkr", partial)


class AlienaSpeciesBiomeTest(unittest.TestCase):
    """Tier 2.a — A.L.I.E.N.A. relational check (specie ↔ biome_affinity).

    Implementa l'asse A (Ambiente) del canvas A.L.I.E.N.A.
    """

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker", "polpo_araldo_sinaptico"},
            "biomes_primary": {"savana", "abisso_vulcanico"},
            "biomes_alias": set(),
            "traits": set(),
            "parts_known": set(),
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {
                "dune_stalker": "savana",
                # polpo_araldo_sinaptico mancante per testare UNVERIFIED
            },
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_verify_relation_match(self):
        status, note = self.mod.verify_species_biome_relation(
            "dune_stalker", "savana", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_relation_contradicted(self):
        # Esempio canonico run #5: dune_stalker claimed in abisso_vulcanico
        status, note = self.mod.verify_species_biome_relation(
            "dune_stalker", "abisso_vulcanico", self.canonical
        )
        self.assertEqual(status, "contradicted")
        self.assertIn("savana", note)
        self.assertIn("abisso_vulcanico", note)

    def test_verify_relation_unverified(self):
        # canonical no biome_affinity per polpo_araldo
        status, note = self.mod.verify_species_biome_relation(
            "polpo_araldo_sinaptico", "abisso_vulcanico", self.canonical
        )
        self.assertEqual(status, "unverified")

    def test_verify_relation_normalized(self):
        # Variants kebab/snake matchano
        status, note = self.mod.verify_species_biome_relation(
            "dune_stalker", "SAVANA", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_extract_species_biome_tuples_proximity(self):
        artifact = {
            "summary": "dune_stalker adatto al bioma abisso_vulcanico per termico",
            "response": "{}",
        }
        tuples = self.mod.extract_species_biome_tuples(artifact, self.canonical)
        self.assertIn(("dune_stalker", "abisso_vulcanico"), tuples)

    def test_verify_artifact_full_chain_contradicted(self):
        """End-to-end: artifact -> CONTRADICTED segnalato."""
        artifact = {
            "agent": "test", "cycle": 1,
            "summary": "Lavoro su dune_stalker che e' adatto al bioma abisso_vulcanico",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        contradicted = [t for t, _ in report["by_status"]["contradicted"]]
        self.assertIn("dune_stalker→abisso_vulcanico", contradicted)
        self.assertEqual(report["score_contradicted"], 1)

    def test_verify_artifact_skips_when_no_affinity_data(self):
        # Senza species_biome_affinity, Tier 2.a no-op
        canonical_minimal = dict(self.canonical)
        canonical_minimal["species_biome_affinity"] = {}
        artifact = {
            "agent": "test", "cycle": 1,
            "summary": "dune_stalker in abisso_vulcanico",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, canonical_minimal)
        self.assertEqual(report["score_contradicted"], 0)
        self.assertEqual(report["score_unverified"], 0)


class AlienaAxisNTest(unittest.TestCase):
    """Asse N — Norme socioculturali (sentience_tier coherence)."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": set(),
            "biomes_alias": set(),
            "traits": set(),
            "parts_known": set(),
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {},
            "species_data": {
                "dune_stalker": {
                    "biome_affinity": "savana",
                    "default_parts": {},
                    "trait_plan": {},
                    "sentience_tier": "T2",
                    "synergy_hints": [],
                    "display_name": "Dune Stalker",
                },
            },
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_extract_tier_tuples(self):
        artifact = {"summary": "dune_stalker tier T2 in savana", "response": "{}"}
        tuples = self.mod.extract_species_tier_tuples(artifact, self.canonical)
        self.assertIn(("dune_stalker", "T2"), tuples)

    def test_verify_tier_match(self):
        status, _ = self.mod.verify_species_tier_relation(
            "dune_stalker", "T2", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_tier_contradicted(self):
        status, _ = self.mod.verify_species_tier_relation(
            "dune_stalker", "T5", self.canonical
        )
        self.assertEqual(status, "contradicted")

    def test_full_chain_tier_contradicted(self):
        artifact = {
            "agent": "test", "cycle": 1,
            "summary": "dune_stalker e' una specie tier T5 estremamente avanzata",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        contradicted = [t for t, _ in report["by_status"]["contradicted"]]
        self.assertIn("dune_stalker@T5", contradicted)


class AlienaAxisITest(unittest.TestCase):
    """Asse I — Impianto morfo-fisiologico (default_parts coherence)."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": set(),
            "biomes_alias": set(),
            "traits": set(),
            "parts_known": {"sand_digest", "echolocation"},
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {},
            "species_data": {
                "dune_stalker": {
                    "default_parts": {
                        "metabolism": "sand_digest",
                        "senses": ["echolocation"],
                        "offense": ["sand_claws"],
                        "locomotion": "burrower",
                    },
                    "sentience_tier": "T2",
                    "trait_plan": {},
                    "synergy_hints": [],
                },
            },
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_verify_part_in_default_parts(self):
        status, _ = self.mod.verify_species_part_relation(
            "dune_stalker", "sand_digest", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_part_not_in_default_parts(self):
        status, _ = self.mod.verify_species_part_relation(
            "dune_stalker", "fictional_metabolism", self.canonical
        )
        self.assertEqual(status, "contradicted")

    def test_extract_part_tuple(self):
        artifact = {
            "summary": "dune_stalker default_parts sand_digest e burrower",
            "response": "{}",
        }
        tuples = self.mod.extract_species_part_tuples(artifact, self.canonical)
        # Deve catturare almeno la prima part dopo default_parts keyword
        self.assertTrue(any(t[0] == "dune_stalker" for t in tuples))


class AlienaAxisLTest(unittest.TestCase):
    """Asse L — Linee evolutive (trait_plan coherence)."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": set(),
            "biomes_alias": set(),
            "traits": {"sensori_geomagnetici"},
            "parts_known": set(),
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {},
            "species_data": {
                "dune_stalker": {
                    "trait_plan": {
                        "core": ["sensori_geomagnetici", "artigli_sette_vie"],
                        "optional": ["coda_frusta_cinetica"],
                        "synergies": ["focus_frazionato"],
                    },
                    "default_parts": {},
                    "sentience_tier": "T2",
                    "synergy_hints": [],
                },
            },
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_verify_trait_in_core(self):
        status, _ = self.mod.verify_species_trait_relation(
            "dune_stalker", "sensori_geomagnetici", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_trait_in_synergies(self):
        status, _ = self.mod.verify_species_trait_relation(
            "dune_stalker", "focus_frazionato", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_trait_not_in_plan(self):
        status, _ = self.mod.verify_species_trait_relation(
            "dune_stalker", "fictional_invented_trait", self.canonical
        )
        self.assertEqual(status, "contradicted")

    def test_extract_trait_tuple(self):
        artifact = {
            "summary": "dune_stalker ha trait sensori_geomagnetici",
            "response": "{}",
        }
        tuples = self.mod.extract_species_trait_tuples(artifact, self.canonical)
        self.assertIn(("dune_stalker", "sensori_geomagnetici"), tuples)


class AlienaAxisETest(unittest.TestCase):
    """Asse E — Ecologia (synergy_hints coherence)."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": set(),
            "biomes_alias": set(),
            "traits": set(),
            "parts_known": set(),
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {},
            "species_data": {
                "dune_stalker": {
                    "synergy_hints": ["echo_backstab", "pack_tactic"],
                    "default_parts": {},
                    "trait_plan": {},
                    "sentience_tier": "T2",
                },
            },
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_verify_synergy_in_hints(self):
        status, _ = self.mod.verify_species_synergy_relation(
            "dune_stalker", "echo_backstab", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_synergy_not_in_hints(self):
        status, _ = self.mod.verify_species_synergy_relation(
            "dune_stalker", "fictional_synergy_xyz", self.canonical
        )
        self.assertEqual(status, "contradicted")

    def test_extract_synergy_tuple(self):
        artifact = {
            "summary": "dune_stalker synergy echo_backstab e pack_tactic",
            "response": "{}",
        }
        tuples = self.mod.extract_species_synergy_tuples(artifact, self.canonical)
        self.assertTrue(any(t[0] == "dune_stalker" for t in tuples))


class AlienaAxisA2Test(unittest.TestCase):
    """Asse A2 — Ancoraggio narrativo (display_name consistency)."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": set(),
            "biomes_alias": set(),
            "traits": set(),
            "parts_known": set(),
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {},
            "species_data": {
                "dune_stalker": {
                    "display_name": "Dune Stalker",
                    "default_parts": {},
                    "trait_plan": {},
                    "sentience_tier": "T2",
                    "synergy_hints": [],
                },
            },
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_verify_display_match(self):
        status, _ = self.mod.verify_species_display_relation(
            "dune_stalker", "Dune Stalker", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_display_variant_partial(self):
        status, _ = self.mod.verify_species_display_relation(
            "dune_stalker", "Dune Predator", self.canonical
        )
        self.assertEqual(status, "partial")

    def test_unverified_when_no_canonical_display(self):
        canonical_minimal = dict(self.canonical)
        canonical_minimal["species_data"] = {
            "dune_stalker": {"default_parts": {}, "trait_plan": {},
                              "sentience_tier": None, "synergy_hints": [],
                              "display_name": None},
        }
        status, _ = self.mod.verify_species_display_relation(
            "dune_stalker", "Some Display", canonical_minimal
        )
        self.assertEqual(status, "unverified")


class ErmesParseTest(unittest.TestCase):
    """Tier 2.b — parse_ermes_demands da GDScript file."""

    def setUp(self):
        self.mod = _load_module()

    def test_returns_empty_for_missing_file(self):
        result = self.mod.parse_ermes_demands(Path("/nonexistent/xyz"))
        self.assertEqual(result, {})

    def test_parses_block_correctly(self):
        import tempfile
        gd_content = '''
class_name ErmesRoleGap
extends RefCounted

const BIOME_ROLE_DEMANDS: Dictionary = {
	"savana": {"esploratore": 1, "guerriero": 1},
	"foresta_miceliale": {"tessitore": 2},
	"caldera_glaciale": {"custode": 1, "guerriero": 1},
}

# more code below
const FALLBACK = {}
'''
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / "scripts" / "session").mkdir(parents=True)
            (tmp_path / "scripts" / "session" / "ermes_role_gap.gd").write_text(
                gd_content, encoding="utf-8"
            )
            result = self.mod.parse_ermes_demands(tmp_path)
            self.assertEqual(result["savana"], {"esploratore": 1, "guerriero": 1})
            self.assertEqual(result["foresta_miceliale"], {"tessitore": 2})
            self.assertEqual(result["caldera_glaciale"], {"custode": 1, "guerriero": 1})

    def test_parses_real_ermes_file(self):
        # Smoke su file canonical reale (se disponibile)
        result = self.mod.parse_ermes_demands(Path("C:/dev/Game-Godot-v2"))
        if not result:
            self.skipTest("Game-Godot-v2 non disponibile in test env")
        # 13 biomi attesi per spec roadmap doc
        self.assertEqual(len(result), 13)
        self.assertIn("savana", result)
        self.assertIn("foresta_miceliale", result)
        # foresta_miceliale ha solo tessitore demand (esempio canonical)
        self.assertEqual(result["foresta_miceliale"], {"tessitore": 2})


class ExtractRoleBiomeTuplesTest(unittest.TestCase):
    """Tier 2.b — extract_role_biome_tuples da artifact text."""

    def setUp(self):
        self.mod = _load_module()
        self.demands = {
            "savana": {"esploratore": 1, "guerriero": 1},
            "foresta_miceliale": {"tessitore": 2},
            "caverna": {"esploratore": 1, "custode": 1},
        }

    def test_extracts_tuple_co_occurrence(self):
        artifact = {
            "summary": "Proposta agente custode in foresta_miceliale per regenerazione",
            "response": "{}",
        }
        tuples = self.mod.extract_role_biome_tuples(artifact, self.demands)
        self.assertIn(("custode", "foresta_miceliale"), tuples)

    def test_no_tuple_when_far_apart(self):
        # custode mentioned all'inizio, foresta_miceliale alla fine — fuori proximity
        long_text = "trait custode interessante per il gameplay. " + ("filler text " * 30) + "discussione di foresta_miceliale."
        artifact = {"summary": long_text, "response": "{}"}
        tuples = self.mod.extract_role_biome_tuples(artifact, self.demands)
        self.assertEqual(tuples, [])

    def test_multiple_tuples_from_artifact(self):
        artifact = {
            "summary": "Esploratore in savana ottimo. Custode in caverna ok.",
            "response": "{}",
        }
        tuples = self.mod.extract_role_biome_tuples(artifact, self.demands)
        self.assertIn(("esploratore", "savana"), tuples)
        self.assertIn(("custode", "caverna"), tuples)


class VerifyRoleCoherenceTest(unittest.TestCase):
    """Tier 2.b — verify_role_coherence dispatch."""

    def setUp(self):
        self.mod = _load_module()
        self.demands = {
            "savana": {"esploratore": 1, "guerriero": 1},
            "foresta_miceliale": {"tessitore": 2},
        }

    def test_role_in_demand_returns_match(self):
        status, note = self.mod.verify_role_coherence("esploratore", "savana", self.demands)
        self.assertEqual(status, "role_demand_match")
        self.assertIn("count 1", note)

    def test_role_not_in_demand_returns_overrep(self):
        status, note = self.mod.verify_role_coherence("custode", "foresta_miceliale", self.demands)
        self.assertEqual(status, "role_overrep_risk")
        self.assertIn("NON in demand", note)
        self.assertIn("tessitore", note)

    def test_biome_unknown_returns_unknown(self):
        status, note = self.mod.verify_role_coherence("esploratore", "marte_polare", self.demands)
        self.assertEqual(status, "biome_unknown")


class VerifyArtifactErmesIntegrationTest(unittest.TestCase):
    """Tier 2.b — verify_artifact integra ermes_demands."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": set(),
            "biomes_primary": {"foresta_miceliale", "savana"},
            "biomes_alias": set(),
            "traits": set(),
            "parts_known": set(),
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {},
            "meta": {},
        }
        self.demands = {
            "savana": {"esploratore": 1, "guerriero": 1},
            "foresta_miceliale": {"tessitore": 2},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_skip_when_no_demands(self):
        artifact = {
            "agent": "test", "cycle": 1,
            "summary": "custode in foresta_miceliale",
            "response": "{}",
        }
        report = self.mod.verify_artifact(artifact, self.canonical, ermes_demands=None)
        self.assertEqual(report["score_role_match"], 0)
        self.assertEqual(report["score_role_overrep"], 0)
        self.assertEqual(report["score_biome_unknown"], 0)

    def test_overrep_detected_when_demands_provided(self):
        artifact = {
            "agent": "test", "cycle": 1,
            "summary": "custode in foresta_miceliale per regenerazione",
            "response": "{}",
        }
        report = self.mod.verify_artifact(
            artifact, self.canonical, ermes_demands=self.demands
        )
        self.assertEqual(report["score_role_overrep"], 1)
        overrep = [t for t, _ in report["by_status"]["role_overrep_risk"]]
        self.assertIn("custode+foresta_miceliale", overrep)

    def test_match_detected(self):
        artifact = {
            "agent": "test", "cycle": 1,
            "summary": "esploratore in savana, ottimo per il bioma",
            "response": "{}",
        }
        report = self.mod.verify_artifact(
            artifact, self.canonical, ermes_demands=self.demands
        )
        self.assertEqual(report["score_role_match"], 1)


class CanonicalRefTest(unittest.TestCase):
    """Tier 4 — canonical_refs explicit citation (post Game OD-022)."""

    def setUp(self):
        self.mod = _load_module()
        self.mod._CURATED_STOPWORDS_CACHE = None
        self.canonical = {
            "species": {"dune_stalker"},
            "biomes_primary": {"abisso_vulcanico", "savana"},
            "biomes_alias": set(),
            "traits": {"impulsi_bioluminescenti"},
            "parts_known": set(),
            "field_names": set(),
            "display_names": {},
            "species_biome_affinity": {"dune_stalker": "savana"},
            "species_data": {
                "dune_stalker": {
                    "biome_affinity": "savana",
                    "default_parts": {"metabolism": "sand_digest", "senses": ["echolocation"]},
                    "trait_plan": {"core": ["sensori_geomagnetici"]},
                    "sentience_tier": "T2",
                    "synergy_hints": ["echo_backstab"],
                    "display_name": "Dune Stalker",
                },
            },
            "meta": {},
        }

    def tearDown(self):
        self.mod._CURATED_STOPWORDS_CACHE = None

    def test_parse_canonical_ref_well_formed(self):
        result = self.mod.parse_canonical_ref(
            "data/core/species.yaml#dune_stalker.biome_affinity"
        )
        self.assertEqual(result, ("data/core/species.yaml", "dune_stalker", "biome_affinity"))

    def test_parse_canonical_ref_nested_field(self):
        result = self.mod.parse_canonical_ref(
            "data/core/species.yaml#dune_stalker.default_parts.metabolism"
        )
        self.assertEqual(result, ("data/core/species.yaml", "dune_stalker", "default_parts.metabolism"))

    def test_parse_canonical_ref_malformed_no_anchor(self):
        self.assertIsNone(self.mod.parse_canonical_ref("data/core/species.yaml"))

    def test_parse_canonical_ref_malformed_no_field(self):
        self.assertIsNone(self.mod.parse_canonical_ref("data/core/species.yaml#dune_stalker"))

    def test_lookup_top_level_field(self):
        v = self.mod.lookup_canonical_value(
            "data/core/species.yaml", "dune_stalker", "biome_affinity", self.canonical
        )
        self.assertEqual(v, "savana")

    def test_lookup_nested_field(self):
        v = self.mod.lookup_canonical_value(
            "data/core/species.yaml", "dune_stalker", "default_parts.metabolism", self.canonical
        )
        self.assertEqual(v, "sand_digest")

    def test_lookup_missing_entity(self):
        v = self.mod.lookup_canonical_value(
            "data/core/species.yaml", "fictional_xyz", "biome_affinity", self.canonical
        )
        self.assertIsNone(v)

    def test_verify_canonical_ref_match(self):
        status, _ = self.mod.verify_canonical_ref(
            "data/core/species.yaml#dune_stalker.biome_affinity", "savana", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_canonical_ref_contradicted(self):
        status, note = self.mod.verify_canonical_ref(
            "data/core/species.yaml#dune_stalker.biome_affinity", "abisso_vulcanico", self.canonical
        )
        self.assertEqual(status, "contradicted")
        self.assertIn("savana", note)

    def test_verify_canonical_ref_list_membership(self):
        status, _ = self.mod.verify_canonical_ref(
            "data/core/species.yaml#dune_stalker.synergy_hints", "echo_backstab", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_canonical_ref_list_not_member(self):
        status, _ = self.mod.verify_canonical_ref(
            "data/core/species.yaml#dune_stalker.synergy_hints", "fictional_synergy", self.canonical
        )
        self.assertEqual(status, "contradicted")

    def test_verify_canonical_ref_unverified_missing_entity(self):
        status, _ = self.mod.verify_canonical_ref(
            "data/core/species.yaml#fictional_xyz.biome_affinity", "savana", self.canonical
        )
        self.assertEqual(status, "unverified")

    def test_verify_canonical_ref_malformed(self):
        status, _ = self.mod.verify_canonical_ref(
            "no-hash-no-dot", "anything", self.canonical
        )
        self.assertEqual(status, "malformed_ref")

    def test_extract_canonical_refs_from_artifact(self):
        artifact = {
            "response": '{"summary":"x","canonical_refs":[{"ref":"data/core/species.yaml#dune_stalker.biome_affinity","claim":"savana"}]}'
        }
        refs = self.mod.extract_canonical_refs_from_artifact(artifact)
        self.assertEqual(len(refs), 1)
        self.assertEqual(refs[0]["ref"], "data/core/species.yaml#dune_stalker.biome_affinity")
        self.assertEqual(refs[0]["claim"], "savana")

    def test_extract_canonical_refs_alt_string_format(self):
        # Format alternativo 'ref=claim'
        artifact = {
            "response": '{"canonical_refs":["data/core/species.yaml#dune_stalker.biome_affinity=savana"]}'
        }
        refs = self.mod.extract_canonical_refs_from_artifact(artifact)
        self.assertEqual(len(refs), 1)
        self.assertEqual(refs[0]["claim"], "savana")

    def test_extract_canonical_refs_missing_returns_empty(self):
        artifact = {"response": '{"summary": "no canonical_refs field"}'}
        refs = self.mod.extract_canonical_refs_from_artifact(artifact)
        self.assertEqual(refs, [])

    def test_full_chain_with_canonical_refs(self):
        """End-to-end: artifact con canonical_refs → verified + contradicted detection."""
        artifact = {
            "agent": "test", "cycle": 1, "summary": "test",
            "response": '{"summary":"test","canonical_refs":['
                        '{"ref":"data/core/species.yaml#dune_stalker.biome_affinity","claim":"savana"},'
                        '{"ref":"data/core/species.yaml#dune_stalker.sentience_tier","claim":"T5"}'
                        ']}',
        }
        report = self.mod.verify_artifact(artifact, self.canonical)
        self.assertEqual(report["score_verified"], 1)  # biome_affinity savana ok
        self.assertEqual(report["score_contradicted"], 1)  # sentience_tier T5 ≠ T2
        self.assertEqual(report["canonical_refs_count"], 2)
        self.assertTrue(report["has_explicit_refs"])


class IsInventedEntityTest(unittest.TestCase):
    """is_invented_entity -- pure-invention detection companion to verify_canonical_ref.

    Catches refs that verify_canonical_ref classifies merely 'unverified' (lookup
    miss) because the entity is wholly absent from a NON-EMPTY canon set of its kind.
    Fail-open: an empty/partial canon set -> never flagged invented.
    """

    def setUp(self):
        self.mod = _load_module()
        self.canonical = {
            "species_data": {"dune_stalker": {"biome_affinity": "savana"}},
            "biomes_primary": {"abisso_vulcanico"},
            "biomes_alias": {"savana_secca"},
            "traits": {"impulsi_bioluminescenti"},
        }

    def test_invented_trait_true(self):
        # thermal_resistance absent from a non-empty traits set -> invented.
        self.assertTrue(self.mod.is_invented_entity(
            "data/core/traits/glossary.json#thermal_resistance.exists", self.canonical
        ))

    def test_present_trait_false(self):
        # impulsi_bioluminescenti is present -> not invented.
        self.assertFalse(self.mod.is_invented_entity(
            "data/core/traits/glossary.json#impulsi_bioluminescenti.exists", self.canonical
        ))

    def test_empty_traits_set_fail_open_false(self):
        # Empty traits set (partial/failed canon load) -> fail-open, never flagged.
        canon = dict(self.canonical, traits=set())
        self.assertFalse(self.mod.is_invented_entity(
            "data/core/traits/glossary.json#thermal_resistance.exists", canon
        ))

    def test_biome_alias_present_false(self):
        # savana_secca lives in biomes_alias (not primary) -> still present, not invented.
        self.assertFalse(self.mod.is_invented_entity(
            "data/core/biomes.yaml#savana_secca.id", self.canonical
        ))

    def test_invented_biome_true(self):
        # cloud_city absent from both primary and alias biome sets -> invented.
        self.assertTrue(self.mod.is_invented_entity(
            "data/core/biomes.yaml#cloud_city.id", self.canonical
        ))

    def test_present_species_false(self):
        # dune_stalker present in species_data -> not invented.
        self.assertFalse(self.mod.is_invented_entity(
            "data/core/species.yaml#dune_stalker.biome_affinity", self.canonical
        ))

    def test_invented_species_true(self):
        # fictional_xyz absent from species_data -> invented.
        self.assertTrue(self.mod.is_invented_entity(
            "data/core/species.yaml#fictional_xyz.biome_affinity", self.canonical
        ))

    def test_tolerant_match_separator_variant_false(self):
        # Present entity must not be falsely flagged on a separator variant.
        canon = dict(self.canonical, traits={"echo_locate"})
        self.assertFalse(self.mod.is_invented_entity(
            "data/core/traits/glossary.json#echo-locate.exists", canon
        ))

    def test_malformed_ref_false(self):
        # Unparsable ref -> never invented (defers to malformed handling upstream).
        self.assertFalse(self.mod.is_invented_entity("no-hash-no-dot", self.canonical))


class CollectArtifactsTest(unittest.TestCase):
    def setUp(self):
        self.mod = _load_module()

    def test_single_file(self):
        # Punta a se stesso come "artifact" — verifica solo che ritorni lista len=1
        result = self.mod.collect_artifacts(SCRIPT_PATH)
        self.assertEqual(result, [SCRIPT_PATH])

    def test_directory(self):
        # tests/ ha file .py non .json, ma il glob filtra
        result = self.mod.collect_artifacts(REPO_ROOT / "tests")
        self.assertEqual(result, [])

    def test_nonexistent(self):
        result = self.mod.collect_artifacts(Path("/nonexistent/path/xyz"))
        self.assertEqual(result, [])


class LoadCanonicalIndexSpeciesSubdirTest(unittest.TestCase):
    """load_canonical_index deve leggere species da data/core/species/.

    Game canonical tiene le specie in `data/core/species/species_catalog.json`
    (lista sotto key `catalog`, entry con `species_id`), NON in un file
    `data/core/species*.yaml` a livello core_dir. Pre-fix il glob caricava 0
    specie -> ALIENA axes + enrichment no-op.
    """

    def setUp(self):
        self.mod = _load_module()

    def _make_repo(self, tmp: str) -> Path:
        root = Path(tmp)
        species_dir = root / "data" / "core" / "species"
        species_dir.mkdir(parents=True)
        catalog = {
            "version": "0.4.1",
            "catalog": [
                {
                    "species_id": "dune_stalker",
                    "legacy_slug": "dune_stalker",
                    "biome_affinity": "savana",
                    "default_parts": {
                        "metabolism": "sand_digest",
                        "senses": ["echolocation"],
                    },
                    "trait_refs": ["sensori_geomagnetici", "artigli_sette_vie"],
                    "sentience_index": "T2",
                    "clade_tag": "Threat",
                    "common_names": ["Skiv"],
                },
                {
                    "species_id": "polpo_araldo_sinaptico",
                    "legacy_slug": "polpo_sinaptico",
                    "biome_affinity": "abisso_vulcanico",
                    "default_parts": {},
                    "trait_refs": [],
                    "sentience_index": "T4",
                },
            ],
        }
        (species_dir / "species_catalog.json").write_text(
            json.dumps(catalog), encoding="utf-8"
        )
        return root

    def test_loads_species_from_catalog(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertGreater(len(out["species"]), 0)
            self.assertIn("dune_stalker", out["species"])
            self.assertIn("polpo_araldo_sinaptico", out["species"])

    def test_adds_legacy_slug_to_species(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertIn("polpo_sinaptico", out["species"])

    def test_populates_biome_affinity(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertEqual(out["species_biome_affinity"]["dune_stalker"], "savana")

    def test_populates_species_data_default_parts(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            parts = out["species_data"]["dune_stalker"]["default_parts"]
            self.assertEqual(parts["metabolism"], "sand_digest")

    def test_maps_sentience_index_to_sentience_tier(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertEqual(
                out["species_data"]["dune_stalker"]["sentience_tier"], "T2"
            )

    def test_maps_trait_refs_to_trait_plan_core(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            core = out["species_data"]["dune_stalker"]["trait_plan"]["core"]
            self.assertIn("sensori_geomagnetici", core)

    def test_harvests_parts_known(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertIn("sand_digest", out["parts_known"])
            self.assertIn("echolocation", out["parts_known"])

    def test_records_catalog_in_files_loaded(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertIn("species_catalog.json", out["meta"]["files_loaded"])


class LoadCanonicalIndexTraitSourcesTest(unittest.TestCase):
    """load_canonical_index must UNION trait ids from ALL canonical trait sources.

    Pre-fix the `traits` set was harvested ONLY from data/core/traits/glossary.json.
    A trait authored solely in data/core/traits/active_effects.yaml (runtime mechanic)
    or data/traits/index.json (descriptive index) but not back-filled into glossary.json
    was absent from the set -> is_invented_entity falsely flagged it invented -> a legit
    swarm artifact referencing it would be hard-rejected pre-score (latent P2, harsh-
    review 2026-06-19). The gate must not depend on the glossary back-fill invariant.
    """

    def setUp(self):
        self.mod = _load_module()

    def _make_repo(self, tmp: str) -> Path:
        root = Path(tmp)
        core_traits = root / "data" / "core" / "traits"
        core_traits.mkdir(parents=True)
        data_traits = root / "data" / "traits"
        data_traits.mkdir(parents=True)
        # glossary.json: descriptive metadata; holds ONLY `aculei_velenosi`.
        glossary = {
            "schema_version": "2.0",
            "traits": {
                "aculei_velenosi": {"label_it": "Aculei Velenosi"},
            },
        }
        (core_traits / "glossary.json").write_text(
            json.dumps(glossary), encoding="utf-8"
        )
        # active_effects.yaml: runtime mechanic; `zampe_a_molla` lives ONLY here.
        # Note the scalar top-level keys (schema_version/version) must NOT be
        # harvested as traits -- only the keys under the `traits:` mapping.
        active_effects = (
            'schema_version: "2.0"\n'
            "version: 1\n"
            "traits:\n"
            "  zampe_a_molla:\n"
            "    tier: T1\n"
            "    category: fisiologico\n"
        )
        (core_traits / "active_effects.yaml").write_text(
            active_effects, encoding="utf-8"
        )
        # data/traits/index.json: descriptive index; `fagocitosi_assorbente` ONLY here.
        index = {
            "schema_version": "2.0",
            "trait_glossary": "data/core/traits/glossary.json",
            "traits": {
                "fagocitosi_assorbente": {"id": "fagocitosi_assorbente", "tier": "T3"},
            },
        }
        (data_traits / "index.json").write_text(
            json.dumps(index), encoding="utf-8"
        )
        return root

    def test_glossary_trait_loaded(self):
        # Baseline: existing glossary harvest still works.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertIn("aculei_velenosi", out["traits"])

    def test_active_effects_trait_unioned(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertIn("zampe_a_molla", out["traits"])

    def test_index_json_trait_unioned(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertIn("fagocitosi_assorbente", out["traits"])

    def test_active_effects_scalar_keys_not_harvested(self):
        # The union must take ONLY the `traits:` mapping keys, not sibling scalars.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertNotIn("schema_version", out["traits"])
            self.assertNotIn("version", out["traits"])

    def test_active_effects_only_trait_not_flagged_invented(self):
        # Regression (P2): a canonical trait authored ONLY in active_effects.yaml
        # must NOT be reported invented by the entity-grounding gate.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertFalse(self.mod.is_invented_entity(
                "data/core/traits/glossary.json#zampe_a_molla.exists", out
            ))

    def test_index_only_trait_not_flagged_invented(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertFalse(self.mod.is_invented_entity(
                "data/core/traits/glossary.json#fagocitosi_assorbente.exists", out
            ))

    def test_genuinely_invented_trait_still_flagged(self):
        # Guard: the union must not blunt true-positive detection. A trait in NONE
        # of the three sources is still invented.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertTrue(self.mod.is_invented_entity(
                "data/core/traits/glossary.json#thermal_resistance.exists", out
            ))

    def test_trait_source_files_recorded(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = self._make_repo(tmp)
            out = self.mod.load_canonical_index(root)
            self.assertIn("active_effects.yaml", out["meta"]["files_loaded"])
            self.assertIn("index.json", out["meta"]["files_loaded"])


class TraitFieldValueLookupTest(unittest.TestCase):
    """Trait field-value resolution (follow-up to PR #125 trait-id union).

    Pre-fix the trait branch of lookup_canonical_value was membership-only: any
    field != 'id' returned the literal string 'exists'. So a trait field-value
    ref like glossary.json#zampe_a_molla.tier with claim 'T1' compared 'T1' vs
    'exists' -> verify_canonical_ref classified it 'contradicted' -> the
    entity_grounding_gate hard-rejected the whole artifact (codex bot PR #125).

    Fix: navigate traits_data[entity][field...] (dotted path, mirroring the
    species branch) and return the real value; fall back to a membership
    sentinel ONLY for field == 'id' (-> id) or field == 'exists' (-> 'exists').
    """

    def setUp(self):
        self.mod = _load_module()
        self.canonical = {
            "traits": {"zampe_a_molla", "fagocitosi_assorbente", "aculei_velenosi"},
            "traits_data": {
                # tier authored only in active_effects.yaml (codex bot example)
                "zampe_a_molla": {"tier": "T1", "category": "fisiologico"},
                # tier + list field authored only in index.json
                "fagocitosi_assorbente": {
                    "tier": "T3",
                    "sinergie": ["cisti_di_ibernazione_minerale"],
                },
                # labels authored only in glossary.json (no tier)
                "aculei_velenosi": {
                    "label_it": "Aculei Velenosi",
                    "label_en": "Venomous Spines",
                },
            },
        }

    def test_lookup_trait_tier_field(self):
        v = self.mod.lookup_canonical_value(
            "data/core/traits/glossary.json", "zampe_a_molla", "tier", self.canonical
        )
        self.assertEqual(v, "T1")

    def test_lookup_trait_label_field(self):
        v = self.mod.lookup_canonical_value(
            "data/core/traits/glossary.json", "aculei_velenosi", "label_it", self.canonical
        )
        self.assertEqual(v, "Aculei Velenosi")

    def test_lookup_trait_list_field(self):
        v = self.mod.lookup_canonical_value(
            "data/traits/index.json", "fagocitosi_assorbente", "sinergie", self.canonical
        )
        self.assertEqual(v, ["cisti_di_ibernazione_minerale"])

    def test_lookup_trait_id_membership(self):
        v = self.mod.lookup_canonical_value(
            "data/core/traits/glossary.json", "zampe_a_molla", "id", self.canonical
        )
        self.assertEqual(v, "zampe_a_molla")

    def test_lookup_trait_exists_membership(self):
        v = self.mod.lookup_canonical_value(
            "data/core/traits/glossary.json", "zampe_a_molla", "exists", self.canonical
        )
        self.assertEqual(v, "exists")

    def test_lookup_trait_unharvested_field_returns_none(self):
        # Trait is canonical but this field was not harvested -> None (so
        # verify_canonical_ref yields 'unverified', NOT a spurious 'contradicted'
        # against the 'exists' sentinel -- the P2 bug this fix removes).
        v = self.mod.lookup_canonical_value(
            "data/core/traits/glossary.json", "aculei_velenosi", "tier", self.canonical
        )
        self.assertIsNone(v)

    def test_lookup_trait_missing_entity_none(self):
        v = self.mod.lookup_canonical_value(
            "data/core/traits/glossary.json", "fictional_xyz", "tier", self.canonical
        )
        self.assertIsNone(v)

    def test_verify_trait_tier_value_verified(self):
        # The exact codex-bot scenario: glossary path, tier field, claim T1.
        status, _ = self.mod.verify_canonical_ref(
            "data/core/traits/glossary.json#zampe_a_molla.tier", "T1", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_trait_tier_wrong_contradicted(self):
        status, note = self.mod.verify_canonical_ref(
            "data/core/traits/glossary.json#zampe_a_molla.tier", "T9", self.canonical
        )
        self.assertEqual(status, "contradicted")
        self.assertIn("T1", note)

    def test_verify_trait_exists_membership_verified(self):
        status, _ = self.mod.verify_canonical_ref(
            "data/core/traits/glossary.json#zampe_a_molla.exists", "exists", self.canonical
        )
        self.assertEqual(status, "verified")

    def test_verify_trait_label_resolves_verified(self):
        status, _ = self.mod.verify_canonical_ref(
            "data/core/traits/glossary.json#aculei_velenosi.label_it",
            "Aculei Velenosi",
            self.canonical,
        )
        self.assertEqual(status, "verified")


class LoadCanonicalIndexTraitsDataTest(unittest.TestCase):
    """load_canonical_index must harvest FULL trait data dicts (not just ids) into
    a `traits_data` key, unioned across all three canonical trait sources, so a
    trait field-value canonical_ref resolves to the real value end-to-end.

    Precedence (fill-missing): glossary -> active_effects -> index. Labels come
    from glossary; tier/category from active_effects (runtime mechanic) with
    index as fallback; slot/sinergie from index.
    """

    def setUp(self):
        self.mod = _load_module()

    def _make_repo(self, tmp: str) -> Path:
        root = Path(tmp)
        core_traits = root / "data" / "core" / "traits"
        core_traits.mkdir(parents=True)
        data_traits = root / "data" / "traits"
        data_traits.mkdir(parents=True)
        glossary = {
            "schema_version": "2.0",
            "sources": {"trait_reference": "data/traits/index.json"},
            "traits": {
                "aculei_velenosi": {
                    "label_it": "Aculei Velenosi",
                    "label_en": "Venomous Spines",
                    "description_it": "Aculei rivestiti di tossine.",
                },
            },
        }
        (core_traits / "glossary.json").write_text(
            json.dumps(glossary), encoding="utf-8"
        )
        active_effects = (
            'schema_version: "2.0"\n'
            "version: 1\n"
            "traits:\n"
            "  zampe_a_molla:\n"
            "    tier: T1\n"
            "    category: fisiologico\n"
            "    trigger:\n"
            "      action_type: attack\n"
            "    effect:\n"
            "      kind: extra_damage\n"
            "      amount: 1\n"
        )
        (core_traits / "active_effects.yaml").write_text(
            active_effects, encoding="utf-8"
        )
        index = {
            "schema_version": "2.0",
            "trait_glossary": "data/core/traits/glossary.json",
            "traits": {
                "fagocitosi_assorbente": {
                    "id": "fagocitosi_assorbente",
                    "label": "Fagocitosi Assorbente",
                    "tier": "T3",
                    "slot": [],
                    "sinergie": ["cisti_di_ibernazione_minerale"],
                },
            },
        }
        (data_traits / "index.json").write_text(
            json.dumps(index), encoding="utf-8"
        )
        return root

    def test_traits_data_from_active_effects(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertEqual(out["traits_data"]["zampe_a_molla"]["tier"], "T1")
            self.assertEqual(
                out["traits_data"]["zampe_a_molla"]["category"], "fisiologico"
            )

    def test_traits_data_from_glossary_labels(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertEqual(
                out["traits_data"]["aculei_velenosi"]["label_it"], "Aculei Velenosi"
            )

    def test_traits_data_from_index(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertEqual(
                out["traits_data"]["fagocitosi_assorbente"]["tier"], "T3"
            )
            self.assertEqual(
                out["traits_data"]["fagocitosi_assorbente"]["sinergie"],
                ["cisti_di_ibernazione_minerale"],
            )

    def test_traits_data_skips_scalar_top_level_keys(self):
        # Only keys under each `traits:` mapping are harvested -- sibling scalars
        # (schema_version/version/sources) must NOT become trait entries.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertNotIn("schema_version", out["traits_data"])
            self.assertNotIn("version", out["traits_data"])
            self.assertNotIn("sources", out["traits_data"])

    def test_verify_active_effects_only_tier_verified(self):
        # codex-bot regression: glossary path + tier field for a trait whose tier
        # lives ONLY in active_effects.yaml -> verified, not contradicted.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            status, _ = self.mod.verify_canonical_ref(
                "data/core/traits/glossary.json#zampe_a_molla.tier", "T1", out
            )
            self.assertEqual(status, "verified")

    def test_verify_wrong_tier_contradicted(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            status, _ = self.mod.verify_canonical_ref(
                "data/core/traits/glossary.json#zampe_a_molla.tier", "T9", out
            )
            self.assertEqual(status, "contradicted")

    def test_verify_index_tier_verified(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            status, _ = self.mod.verify_canonical_ref(
                "data/traits/index.json#fagocitosi_assorbente.tier", "T3", out
            )
            self.assertEqual(status, "verified")

    def test_verify_glossary_label_verified(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            status, _ = self.mod.verify_canonical_ref(
                "data/core/traits/glossary.json#aculei_velenosi.label_it",
                "Aculei Velenosi",
                out,
            )
            self.assertEqual(status, "verified")


class LoadCanonicalIndexRootDictGlossaryTest(unittest.TestCase):
    """Root-dict glossary format must also feed traits_data (codex P2, PR #126).

    load_canonical_index still accepts a legacy glossary.json shaped as a root
    dict of {trait_id -> metadata} (no `traits:` wrapper). Pre-fix those entries
    were added to the `traits` set but never passed through _merge_trait_data, so
    glossary-only fields (label_it/descriptions) were absent from traits_data ->
    a label_it canonical_ref resolved to 'unverified' though the value exists.
    Wrapper/metadata keys (e.g. `sources`) and scalars must stay excluded.
    """

    def setUp(self):
        self.mod = _load_module()

    def _make_repo(self, tmp: str) -> Path:
        root = Path(tmp)
        core_traits = root / "data" / "core" / "traits"
        core_traits.mkdir(parents=True)
        # ROOT-DICT format: top-level trait ids, no `traits:` wrapper. `sources`
        # is metadata (a dict) and must NOT become a trait entry; schema_version
        # is a scalar and must be ignored.
        glossary = {
            "schema_version": "2.0",
            "sources": {"trait_reference": "data/traits/index.json"},
            "aculei_velenosi": {
                "label_it": "Aculei Velenosi",
                "label_en": "Venomous Spines",
            },
            "ali_ioniche": {
                "label_it": "Ali Ioniche",
            },
        }
        (core_traits / "glossary.json").write_text(
            json.dumps(glossary), encoding="utf-8"
        )
        return root

    def test_root_dict_trait_in_traits_data(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertEqual(
                out["traits_data"]["aculei_velenosi"]["label_it"], "Aculei Velenosi"
            )
            self.assertEqual(
                out["traits_data"]["ali_ioniche"]["label_it"], "Ali Ioniche"
            )

    def test_root_dict_excludes_metadata_and_scalars(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertNotIn("sources", out["traits_data"])
            self.assertNotIn("schema_version", out["traits_data"])

    def test_root_dict_label_ref_verified(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            status, _ = self.mod.verify_canonical_ref(
                "data/core/traits/glossary.json#aculei_velenosi.label_it",
                "Aculei Velenosi",
                out,
            )
            self.assertEqual(status, "verified")


class BiomeAliasNestedHarvestTest(unittest.TestCase):
    """OD-007: biome_aliases.yaml schema is {aliases: {<alias>: {canonical, ...}}}.

    Pre-fix load_canonical_index iterated the TOP-LEVEL keys -> it harvested ONLY the
    wrapper key 'aliases' (a phantom sentinel) into biomes_alias and NEVER read the
    nested real aliases. Result: alias biome forms (savanna, deserto_caldo,
    caverna_risonante, sinaptic_trench, ...) were absent from the resolvable set ->
    false-rejected as invented (the #2813 alias-resolution class). Fix: read the nested
    `aliases:` mapping, never the wrapper key. (OD-007, divergence found 2026-06-20.)
    """

    def setUp(self):
        self.mod = _load_module()

    def _make_repo(self, tmp: str) -> Path:
        root = Path(tmp)
        core = root / "data" / "core"
        core.mkdir(parents=True)
        # biomes.yaml: one primary biome with biome_class (so biomes_primary populates).
        (core / "biomes.yaml").write_text(
            "biomes:\n  savana:\n    biome_class: arid\n", encoding="utf-8"
        )
        # biome_aliases.yaml: real schema nests the alias map under a single
        # top-level `aliases:` key (mirrors Game data/core/biome_aliases.yaml).
        aliases = (
            "aliases:\n"
            "  savanna:\n"
            "    canonical: savana\n"
            "  deserto_caldo:\n"
            "    canonical: abisso_vulcanico\n"
            "    status: migrated\n"
            "  caverna_risonante:\n"
            "    canonical: caverna\n"
        )
        (core / "biome_aliases.yaml").write_text(aliases, encoding="utf-8")
        return root

    def test_nested_aliases_harvested(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertIn("savanna", out["biomes_alias"])
            self.assertIn("deserto_caldo", out["biomes_alias"])
            self.assertIn("caverna_risonante", out["biomes_alias"])

    def test_wrapper_key_not_harvested_as_biome(self):
        # The literal wrapper key 'aliases' must NOT pollute the biome sets (sentinel bug).
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertNotIn("aliases", out["biomes_alias"])
            self.assertNotIn("aliases", out["biomes_primary"])

    def test_alias_biome_not_flagged_invented(self):
        # Regression: an alias biome form must resolve (not invented) after the fix.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertFalse(self.mod.is_invented_entity(
                "data/core/biomes.yaml#deserto_caldo.id", out
            ))

    def test_alias_canonical_map_built(self):
        # The nested `canonical:` targets become the alias->canonical map (OD-007 P2).
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = self.mod.load_canonical_index(self._make_repo(tmp))
            self.assertEqual(out["biome_alias_canonical"].get("savanna"), "savana")
            self.assertEqual(
                out["biome_alias_canonical"].get("deserto_caldo"), "abisso_vulcanico"
            )
            self.assertNotIn("aliases", out["biome_alias_canonical"])


class BiomeAliasCanonicalizationTest(unittest.TestCase):
    """OD-007 P2 (codex bot #128): a biome_affinity claim in alias form (savanna) must
    VERIFY against the canonical (savana), not be marked contradicted. Without this,
    the alias-harvest fix would only move the false-reject from is_invented to the
    value-comparison path -- the exact alias forms it unblocks.
    """

    def setUp(self):
        self.mod = _load_module()
        self.canon = {
            "species_data": {"dune_stalker": {"biome_affinity": "savana"}},
            "biome_alias_canonical": {
                "savanna": "savana",
                "deserto_caldo": "abisso_vulcanico",
            },
            "biomes_primary": {"savana", "abisso_vulcanico"},
            "biomes_alias": {"savanna", "deserto_caldo"},
        }

    def test_alias_biome_affinity_verified(self):
        status, _ = self.mod.verify_canonical_ref(
            "data/core/species.yaml#dune_stalker.biome_affinity", "savanna", self.canon
        )
        self.assertEqual(status, "verified")

    def test_canonical_form_still_verified(self):
        # The canonical form itself must keep verifying (no regression).
        status, _ = self.mod.verify_canonical_ref(
            "data/core/species.yaml#dune_stalker.biome_affinity", "savana", self.canon
        )
        self.assertEqual(status, "verified")

    def test_wrong_biome_still_contradicted(self):
        # A genuinely different biome (not an alias of savana) must stay contradicted.
        status, _ = self.mod.verify_canonical_ref(
            "data/core/species.yaml#dune_stalker.biome_affinity",
            "abisso_vulcanico", self.canon
        )
        self.assertEqual(status, "contradicted")

    def test_biome_affinity_substring_field_not_canonicalized(self):
        # Over-reach guard: a field whose name merely CONTAINS "biome_affinity"
        # (here "biome_affinity_note") must NOT enter the alias-canonicalization
        # branch, even when lookup_canonical_value returns a navigable value for
        # it. We make the value navigable (species_data sub-field) and use an
        # alias claim ("savanna") whose canonical is "savana". With the loose
        # substring scope this verified via alias; with the exact-set scope the
        # alias branch is skipped, so savanna vs savana no longer match and the
        # claim is contradicted -- proving the alias path stayed out.
        canon = {
            "species_data": {
                "dune_stalker": {"biome_affinity_note": "savana"}
            },
            "biome_alias_canonical": {"savanna": "savana"},
        }
        status, _ = self.mod.verify_canonical_ref(
            "data/core/species.yaml#dune_stalker.biome_affinity_note",
            "savanna", canon
        )
        self.assertEqual(status, "contradicted")


# ── Markdown adapter (Game CI integration: lint design-doc / PR prose) ──
# These exercise the markdown front-end added when vendoring into Game, so the
# entity-grounding gate can lint .md content (design docs, PR bodies) and not
# only artifact-shaped JSON. Hermetic: empty --game-repo => empty canon => an
# entity-shaped prose token is unmatched => hallucinated, which drives the
# tier exit-code semantics (default warn / --advisory / --strict).


class MarkdownAdapterTest(unittest.TestCase):
    def setUp(self):
        self.mod = _load_module()

    def test_build_artifact_strips_frontmatter(self):
        text = (
            "---\n"
            "doc_status: active\n"
            "doc_owner: docs-team\n"
            "---\n\n"
            "Guida per dune_stalker nel bioma savana.\n"
        )
        art = self.mod.build_artifact_from_markdown(text, name="mydoc")
        self.assertIn("dune_stalker", art["summary"])
        self.assertNotIn("doc_status", art["summary"])
        self.assertEqual(art["agent"], "mydoc")

    def test_build_artifact_plain_prose(self):
        text = "Specie polpo_araldo_sinaptico con trait impulsi_bioluminescenti."
        art = self.mod.build_artifact_from_markdown(text)
        self.assertIn("polpo_araldo_sinaptico", art["summary"])

    def test_build_artifact_extracts_embedded_canonical_refs(self):
        text = (
            "Proposta di design.\n\n"
            "```json\n"
            '[{"ref": "data/core/species.yaml#dune_stalker.biome_affinity", '
            '"claim": "savana"}]\n'
            "```\n"
        )
        art = self.mod.build_artifact_from_markdown(text)
        refs = self.mod.extract_canonical_refs_from_artifact(art)
        self.assertEqual(len(refs), 1)
        self.assertEqual(
            refs[0]["ref"], "data/core/species.yaml#dune_stalker.biome_affinity"
        )
        self.assertEqual(refs[0]["claim"], "savana")

    def test_mentions_extracted_from_markdown_artifact(self):
        text = "Il bioma abisso_vulcanico contiene la specie dune_stalker."
        art = self.mod.build_artifact_from_markdown(text)
        mentions = self.mod.extract_mentions(art)
        self.assertIn("abisso_vulcanico", mentions)
        self.assertIn("dune_stalker", mentions)

    def test_heading_does_not_create_false_positive(self):
        # Regression: '# Proposta' + 'La ...' previously merged (post
        # whitespace-collapse) into the bigram 'proposta_la' -> false
        # HALLUCINATED. Heading lines are now stripped from the prose summary.
        text = "# Proposta\nLa specie dune_stalker abita il bioma savana.\n"
        art = self.mod.build_artifact_from_markdown(text)
        mentions = self.mod.extract_mentions(art)
        self.assertNotIn("proposta_la", mentions)
        # the real prose entities survive
        self.assertIn("dune_stalker", mentions)

    def test_code_fence_stripped_from_prose_but_refs_kept(self):
        text = (
            "Prosa con dune_stalker.\n\n"
            "```json\n"
            '[{"ref": "data/core/species.yaml#dune_stalker.biome_affinity", '
            '"claim": "savana"}]\n'
            "```\n"
        )
        art = self.mod.build_artifact_from_markdown(text)
        # canonical_refs are still harvested from the full body
        self.assertEqual(len(self.mod.extract_canonical_refs_from_artifact(art)), 1)
        # but the fence's structural text is gone from the prose summary
        self.assertNotIn("```", art["summary"])
        self.assertNotIn("biome_affinity", art["summary"])


class LoadArtifactTest(unittest.TestCase):
    def setUp(self):
        self.mod = _load_module()

    def test_load_json(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "a.json"
            p.write_text('{"summary": "dune_stalker"}', encoding="utf-8")
            art = self.mod.load_artifact(p)
            self.assertEqual(art["summary"], "dune_stalker")

    def test_load_markdown(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "b.md"
            p.write_text("---\nx: 1\n---\nprose dune_stalker", encoding="utf-8")
            art = self.mod.load_artifact(p)
            self.assertIn("dune_stalker", art["summary"])
            self.assertNotIn("x: 1", art["summary"])

    def test_load_bad_json_returns_none(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "c.json"
            p.write_text("{not valid", encoding="utf-8")
            self.assertIsNone(self.mod.load_artifact(p))


class CollectArtifactsMarkdownTest(unittest.TestCase):
    def setUp(self):
        self.mod = _load_module()

    def test_dir_excludes_md_by_default(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "a.json").write_text("{}", encoding="utf-8")
            (Path(d) / "b.md").write_text("x", encoding="utf-8")
            result = self.mod.collect_artifacts(Path(d))
            self.assertEqual([p.name for p in result], ["a.json"])

    def test_dir_includes_md_when_requested(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "a.json").write_text("{}", encoding="utf-8")
            (Path(d) / "b.md").write_text("x", encoding="utf-8")
            result = self.mod.collect_artifacts(Path(d), include_md=True)
            self.assertEqual(sorted(p.name for p in result), ["a.json", "b.md"])


class AdvisoryExitTest(unittest.TestCase):
    def setUp(self):
        self.mod = _load_module()

    def _doc(self, d):
        p = Path(d) / "proposal.md"
        p.write_text(
            "Nuova specie inventata_non_canonica_xyz proposta nel design.",
            encoding="utf-8",
        )
        return p

    def test_default_warns_exit_2(self):
        with tempfile.TemporaryDirectory() as d:
            p = self._doc(d)
            rc = self.mod.main(
                [str(p), "--game-repo", str(Path(d) / "norepo"), "--no-ermes"]
            )
            self.assertEqual(rc, 2)

    def test_advisory_exit_0(self):
        with tempfile.TemporaryDirectory() as d:
            p = self._doc(d)
            rc = self.mod.main(
                [
                    str(p),
                    "--game-repo",
                    str(Path(d) / "norepo"),
                    "--no-ermes",
                    "--advisory",
                ]
            )
            self.assertEqual(rc, 0)

    def test_strict_exit_1(self):
        with tempfile.TemporaryDirectory() as d:
            p = self._doc(d)
            rc = self.mod.main(
                [
                    str(p),
                    "--game-repo",
                    str(Path(d) / "norepo"),
                    "--no-ermes",
                    "--strict",
                ]
            )
            self.assertEqual(rc, 1)


class StrictSkipTest(unittest.TestCase):
    """--strict must FAIL on a file it could not parse (un-verified gap), not
    silently pass. Non-strict tolerates the skip (warn-only)."""

    def setUp(self):
        self.mod = _load_module()

    def test_strict_fails_on_unparsable(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "broken.json"
            p.write_text("{not valid json", encoding="utf-8")
            rc = self.mod.main(
                [str(p), "--game-repo", str(Path(d) / "norepo"), "--no-ermes",
                 "--strict"]
            )
            self.assertEqual(rc, 1)

    def test_nonstrict_tolerates_unparsable(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "broken.json"
            p.write_text("{not valid json", encoding="utf-8")
            rc = self.mod.main(
                [str(p), "--game-repo", str(Path(d) / "norepo"), "--no-ermes"]
            )
            self.assertEqual(rc, 0)


def main() -> int:
    suite = unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
