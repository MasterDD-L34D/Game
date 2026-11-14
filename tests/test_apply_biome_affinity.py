import sys, os, json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools", "py"))

import apply_biome_affinity as apply_ba

VALID = {"savana", "palude", "caverna"}


def test_select_approved_filters_and_validates():
    draft = [
        {"species_id": "a", "suggested_biome": "savana", "approved": True},
        {"species_id": "b", "suggested_biome": "palude"},  # not approved
        {"species_id": "c", "suggested_biome": "savana", "approved_biome": "caverna", "approved": True},
        {"species_id": "d", "suggested_biome": "nonbiome", "approved": True},  # invalid biome
        {"species_id": "e", "approved": True},  # no biome
    ]
    approved, problems = apply_ba.select_approved(draft, VALID)
    chosen = {c["species_id"]: c["biome"] for c in approved}
    assert chosen == {"a": "savana", "c": "caverna"}  # c override honored
    prob_ids = {p[0] for p in problems}
    assert "d" in prob_ids and "e" in prob_ids
    assert "b" not in chosen and "b" not in prob_ids  # silently skipped (not approved)


def test_plan_changes_skips_existing_and_missing():
    catalog = [
        {"species_id": "a"},  # missing biome -> apply
        {"species_id": "x", "biome_affinity": "savana"},  # already has -> never overwrite
    ]
    approved = [
        {"species_id": "a", "biome": "palude"},
        {"species_id": "x", "biome": "caverna"},  # skip (existing)
        {"species_id": "zzz", "biome": "savana"},  # skip (not in catalog)
    ]
    to_apply, skipped = apply_ba.plan_changes(catalog, approved)
    assert [(sp["species_id"], b) for sp, b in to_apply] == [("a", "palude")]
    assert {s[0] for s in skipped} == {"x", "zzz"}


def test_apply_changes_sets_field_and_provenance():
    sp = {"species_id": "a"}
    apply_ba.apply_changes([(sp, "savana")])
    assert sp["biome_affinity"] == "savana"
    assert sp["_provenance"]["biome_affinity"] == apply_ba.PROV_TAG


def test_apply_changes_preserves_existing_provenance():
    sp = {"species_id": "a", "_provenance": {"visual_description": "claude-polish"}}
    apply_ba.apply_changes([(sp, "savana")])
    assert sp["_provenance"]["visual_description"] == "claude-polish"  # untouched
    assert sp["_provenance"]["biome_affinity"] == apply_ba.PROV_TAG


def test_main_dry_run_does_not_write(tmp_path):
    cat_path = tmp_path / "cat.json"
    cat_path.write_text(json.dumps({"catalog": [{"species_id": "a"}]}), encoding="utf-8")
    draft_path = tmp_path / "draft.json"
    draft_path.write_text(
        json.dumps({"draft": [{"species_id": "a", "suggested_biome": "savana", "approved": True}]}),
        encoding="utf-8",
    )
    rc = apply_ba.main(["--catalog", str(cat_path), "--draft", str(draft_path)])
    assert rc == 0
    after = json.loads(cat_path.read_text(encoding="utf-8"))
    assert "biome_affinity" not in after["catalog"][0]  # dry-run = no write


def test_main_apply_writes_only_approved_missing(tmp_path):
    cat_path = tmp_path / "cat.json"
    cat_path.write_text(
        json.dumps({"catalog": [{"species_id": "a"}, {"species_id": "x", "biome_affinity": "savana"}]}),
        encoding="utf-8",
    )
    draft_path = tmp_path / "draft.json"
    draft_path.write_text(
        json.dumps({"draft": [
            {"species_id": "a", "suggested_biome": "savana", "approved": True},
            {"species_id": "x", "suggested_biome": "palude", "approved": True},  # existing -> skip
        ]}),
        encoding="utf-8",
    )
    rc = apply_ba.main(["--catalog", str(cat_path), "--draft", str(draft_path), "--apply"])
    assert rc == 0
    after = json.loads(cat_path.read_text(encoding="utf-8"))
    assert after["catalog"][0]["biome_affinity"] == "savana"
    assert after["catalog"][0]["_provenance"]["biome_affinity"] == apply_ba.PROV_TAG
    assert after["catalog"][1]["biome_affinity"] == "savana"  # NOT overwritten to palude


def test_load_draft_missing_returns_empty(tmp_path):
    assert apply_ba.load_draft(tmp_path / "nope.json") == []


def test_main_missing_draft_dry_run_safe(tmp_path):
    cat_path = tmp_path / "cat.json"
    cat_path.write_text(json.dumps({"catalog": [{"species_id": "a"}]}), encoding="utf-8")
    # default draft path won't exist here; explicit missing path -> no crash, no write
    rc = apply_ba.main(["--catalog", str(cat_path), "--draft", str(tmp_path / "nope.json")])
    assert rc == 0
    after = json.loads(cat_path.read_text(encoding="utf-8"))
    assert "biome_affinity" not in after["catalog"][0]


def test_main_apply_rejects_invalid_biome_no_write(tmp_path):
    cat_path = tmp_path / "cat.json"
    cat_path.write_text(json.dumps({"catalog": [{"species_id": "a"}]}), encoding="utf-8")
    draft_path = tmp_path / "draft.json"
    draft_path.write_text(
        json.dumps({"draft": [{"species_id": "a", "suggested_biome": "not_a_biome", "approved": True}]}),
        encoding="utf-8",
    )
    rc = apply_ba.main(["--catalog", str(cat_path), "--draft", str(draft_path), "--apply"])
    assert rc == 0
    after = json.loads(cat_path.read_text(encoding="utf-8"))
    assert "biome_affinity" not in after["catalog"][0]  # invalid -> nothing applied
