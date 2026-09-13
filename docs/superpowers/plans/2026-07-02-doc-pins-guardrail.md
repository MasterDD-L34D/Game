---
title: 'Doc-pins guardrail -- implementation plan (broken_doc_pin)'
doc_status: draft
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-07-02'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Doc-pins Guardrail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `broken_doc_pin` check to `tools/check_docs_governance.py` that flags any `docs/` path referenced by code/config/workflows/root-md that no longer exists on disk, so a doc move/delete that breaks a code reference is caught in the CI-required `docs-governance` job instead of at runtime.

**Architecture:** A new scanner (git-tracked source files -> extract `docs/` string tokens, URL-stripped and placeholder-normalized -> existence-check on disk) mirrors the existing `find_unregistered_documents` sibling. Broken pins not in a decreasing-only baseline become `warning` Issues (`error` under `--pins-strict`). A reverse-map of all pins (healthy included) is written into the per-run drift report as the consultable pin-map. No `.github/workflows/` file is touched.

**Tech Stack:** Python 3.12+, stdlib only (`re`, `subprocess`, `pathlib`, `json`, `dataclasses`), pytest. Design ref: [`docs/superpowers/specs/2026-07-02-doc-pins-guardrail-design.md`](../specs/2026-07-02-doc-pins-guardrail-design.md).

---

## File Structure

- **Modify** `tools/check_docs_governance.py` -- add module constants, the pure extractor `extract_pins_from_line`, the scope filter `_is_scannable`, `git_tracked_files`, `scan_doc_pins`, `load_pins_baseline`, `find_broken_doc_pins`; extend `parse_args`, `write_report`, `main`. (~110 new LOC; > 50 LOC outside `apps/backend/` -> owner-gated, authorized by the 2026-07-02 design review.)
- **Create** `docs/governance/doc_pins_baseline.json` -- decreasing-only list of pre-existing broken pins (key `broken_known`), mirroring `registry_scan_baseline.json`.
- **Modify** `tests/test_check_docs_governance.py` -- +14 cases for the new functions.
- **Modify** `docs/guide/docs-governance-stale-lifecycle.md` -- 2-line mention of the new check + pin-map.
- **Modify** `docs/governance/docs_registry.json` -- add the registry entry for THIS plan doc (same-PR governance rule).

Constants live near the existing `SCAN_EXEMPT_PREFIXES` / `DEFAULT_SCAN_BASELINE` block (lines 44-47). New functions go after `find_unregistered_documents` (line 330).

---

### Task 1: Pure pin extractor `extract_pins_from_line`

The heart of the scanner: one line of source text in, a list of normalized `docs/` pins out. Handles URL-strip (regola 0), backslash normalization, placeholder/glob truncation, trailing-punctuation strip, and per-line dedup. Pure function -> heaviest test coverage, zero I/O.

**Files:**

- Modify: `tools/check_docs_governance.py` (constants after line 47; functions after line 330)
- Test: `tests/test_check_docs_governance.py`

- [ ] **Step 1: Write the failing tests**

Add at the end of `tests/test_check_docs_governance.py`:

```python
# ---------------------------------------------------------------------------
# broken_doc_pin: extract_pins_from_line
# ---------------------------------------------------------------------------


def test_extract_plain_pin():
    assert validator.extract_pins_from_line(
        'git add docs/skiv/MONITOR.md'
    ) == ["docs/skiv/MONITOR.md"]


def test_extract_strips_url_embedded_docs():
    # regola 0: docs/ inside a URL is an EXTERNAL ref, not a local pin.
    line = 'see https://github.com/x/y/blob/main/docs/godot-v2/PRD.md for status'
    assert validator.extract_pins_from_line(line) == []


def test_extract_bare_path_and_url_on_same_line():
    line = 'local docs/real.md vs https://host/docs/other.md'
    assert validator.extract_pins_from_line(line) == ["docs/real.md"]


def test_extract_placeholder_truncates_to_dir():
    line = 'cp report docs/playtest/playtest-2-${DATE}.md'
    assert validator.extract_pins_from_line(line) == ["docs/playtest/"]


def test_extract_glob_truncates_to_base_dir():
    line = "      - 'docs/research/swarm/**.json'"
    assert validator.extract_pins_from_line(line) == ["docs/research/swarm/"]


def test_extract_strips_trailing_prose_punctuation():
    assert validator.extract_pins_from_line(
        'vedi docs/core/00-SOURCE-OF-TRUTH.md.'
    ) == ["docs/core/00-SOURCE-OF-TRUTH.md"]
    assert validator.extract_pins_from_line(
        '(docs/hubs/combat.md)'
    ) == ["docs/hubs/combat.md"]


def test_extract_windows_backslash_normalized():
    assert validator.extract_pins_from_line(
        r'TEMPLATE = docs\templates\dossier.html'
    ) == ["docs/templates/dossier.html"]


def test_extract_dedups_within_line():
    line = 'docs/a.md and again docs/a.md'
    assert validator.extract_pins_from_line(line) == ["docs/a.md"]


def test_extract_bare_docs_root_is_not_a_pin():
    assert validator.extract_pins_from_line('under docs/*/foo') == []
    assert validator.extract_pins_from_line('the docs/ tree') == []


def test_extract_skips_overlong_line():
    assert validator.extract_pins_from_line('docs/a.md ' + 'x' * 2100) == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k extract -q`
Expected: FAIL with `AttributeError: module 'check_docs_governance' has no attribute 'extract_pins_from_line'`

- [ ] **Step 3: Add the constants**

Insert after line 47 (`DEFAULT_SCAN_BASELINE = ...`) in `tools/check_docs_governance.py`:

```python
# --- broken_doc_pin: scan code/config for docs/ path references ------------
DEFAULT_PINS_BASELINE = "docs/governance/doc_pins_baseline.json"
# Strip whole URLs before extraction: docs/ inside https://.../docs/... is an
# EXTERNAL reference (cross-repo GitHub blob), not a local pin. Substring-anchored
# extraction would otherwise inject false pins from root .md files.
_URL_RE = re.compile(r"[A-Za-z][A-Za-z0-9+.-]*://\S+")
# Broadened class captures the WHOLE dynamic token (placeholder/glob) so it can be
# truncated to a directory pin deterministically.
_DOC_PIN_RE = re.compile(r"docs/[A-Za-z0-9_./${}<>*%-]+")
_PIN_DYNAMIC_MARKERS = ("*", "{", "}", "<", ">", "$", "%")
_PIN_DATE_PLACEHOLDER_RE = re.compile(r"YYYY|MM|DD|XX+")
_PIN_TRAILING = ".,:;)]}>`'\""
```

- [ ] **Step 4: Write the extractor functions**

Insert after `find_unregistered_documents` (after line 330):

```python
def _pin_segment_is_dynamic(segment: str) -> bool:
    if any(marker in segment for marker in _PIN_DYNAMIC_MARKERS):
        return True
    return bool(_PIN_DATE_PLACEHOLDER_RE.search(segment))


def _normalize_pin(token: str) -> str | None:
    token = token.rstrip(_PIN_TRAILING)
    if not token.startswith("docs/"):
        return None
    kept: list[str] = []
    truncated = False
    for segment in token.split("/"):
        if _pin_segment_is_dynamic(segment):
            truncated = True
            break
        kept.append(segment)
    if not kept or kept[0] != "docs":
        return None
    pin = "/".join(kept)
    if truncated:
        pin += "/"
    if pin in ("docs", "docs/"):
        return None  # bare docs root is not a concrete pin
    return pin


def extract_pins_from_line(line: str) -> list[str]:
    """Extract normalized docs/ path pins from one source line.

    Order: skip overlong -> backslash->slash -> strip URLs -> regex match ->
    per-token normalize (placeholder/glob truncate, trailing-punct strip) ->
    per-line dedup.
    """
    if len(line) > 2000:
        return []
    line = line.replace("\\", "/")
    line = _URL_RE.sub(" ", line)
    pins: list[str] = []
    for match in _DOC_PIN_RE.finditer(line):
        pin = _normalize_pin(match.group(0))
        if pin and pin not in pins:
            pins.append(pin)
    return pins
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k extract -q`
Expected: PASS (10 tests)

- [ ] **Step 6: Commit**

```bash
git add tools/check_docs_governance.py tests/test_check_docs_governance.py
git commit -F - <<'EOF'
feat(governance): pure docs/ pin extractor (URL-strip + placeholder truncate)

Coding-Agent: claude-opus-4-8
Trace-Id: <GENERATE uuidv7 -- see below>
EOF
```

Generate the Trace-Id with:

```bash
python - <<'PY'
import os, time
b = bytearray(int(time.time()*1000).to_bytes(6,'big') + os.urandom(10))
b[6] = (b[6] & 0x0F) | 0x70; b[8] = (b[8] & 0x3F) | 0x80
h = b.hex(); print(f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}")
PY
```

Paste the output into the `Trace-Id:` line before committing. (Apply this same Trace-Id pattern to every commit below.)

---

### Task 2: Scope filter `_is_scannable`

Decides which tracked files the scanner reads: include code/config dirs + specific root files, exclude `docs/`, `.claude/`, `node_modules/`, `reports/`, `tests/`.

**Files:**

- Modify: `tools/check_docs_governance.py`
- Test: `tests/test_check_docs_governance.py`

- [ ] **Step 1: Write the failing tests**

Append to the test file:

```python
# ---------------------------------------------------------------------------
# broken_doc_pin: _is_scannable
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("rel,expected", [
    (".github/workflows/ci.yml", True),
    ("tools/foo.py", True),
    ("scripts/bar.sh", True),
    ("config/flags.json", True),
    ("apps/play/src/audio.js", True),
    ("packs/evo_tactics_pack/x.yaml", True),
    ("CLAUDE.md", True),          # root .md
    ("package.json", True),        # root allowlisted
    ("Makefile", True),            # root allowlisted, no extension
    ("docs/core/00.md", False),    # docs/ owned by check_site_links
    (".claude/commands/x.md", False),
    ("node_modules/pkg/i.js", False),
    ("reports/docs/r.json", False),
    ("tests/test_check_docs_governance.py", False),  # fixtures = false pins
    ("tools/foo.png", False),      # non-text extension
    ("apps/play/logo.svg", False), # not in ext allowlist
])
def test_is_scannable(rel, expected):
    assert validator._is_scannable(rel) is expected
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k is_scannable -q`
Expected: FAIL with `AttributeError: ... '_is_scannable'`

- [ ] **Step 3: Add the constants + function**

Add constants after the Task 1 constants block:

```python
_PIN_INCLUDE_DIRS = (
    ".github/", "tools/", "scripts/", "services/", "config/", "apps/", "packs/",
)
_PIN_EXCLUDE_PREFIXES = (
    "docs/", ".claude/", "node_modules/", "reports/", "tests/",
)
_PIN_EXTS = {
    ".yml", ".yaml", ".json", ".js", ".cjs", ".mjs", ".ts",
    ".py", ".sh", ".ps1", ".mk", ".md",
}
_PIN_ROOT_FILES = {"Makefile", "package.json"}
```

Add the function after `extract_pins_from_line`:

```python
def _is_scannable(rel_path: str) -> bool:
    """True if this tracked file should be scanned for docs/ pins."""
    if any(rel_path.startswith(prefix) for prefix in _PIN_EXCLUDE_PREFIXES):
        return False
    name = rel_path.rsplit("/", 1)[-1]
    suffix = ("." + name.rsplit(".", 1)[-1]) if "." in name else ""
    if "/" not in rel_path:  # root file
        return name in _PIN_ROOT_FILES or suffix in _PIN_EXTS
    if not any(rel_path.startswith(d) for d in _PIN_INCLUDE_DIRS):
        return False
    return suffix in _PIN_EXTS
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k is_scannable -q`
Expected: PASS (17 parametrized cases)

- [ ] **Step 5: Commit**

```bash
git add tools/check_docs_governance.py tests/test_check_docs_governance.py
git commit -m "feat(governance): _is_scannable scope filter for pin scanner

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

### Task 3: File walk `git_tracked_files` + `scan_doc_pins`

Walks tracked files (git ls-files, filesystem fallback when not a git repo) and builds the reverse-map `{pin: [referrer:line, ...]}`. The filesystem fallback is exactly the path tests exercise (a `tmp_path` is not a git repo).

**Files:**

- Modify: `tools/check_docs_governance.py` (add `import subprocess` at top, near line 6)
- Test: `tests/test_check_docs_governance.py`

- [ ] **Step 1: Write the failing tests**

Append:

```python
# ---------------------------------------------------------------------------
# broken_doc_pin: scan_doc_pins (filesystem-fallback path, tmp is not a git repo)
# ---------------------------------------------------------------------------


def _write(root: Path, rel: str, text: str) -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def test_scan_builds_reverse_map(tmp_path):
    _write(tmp_path, ".github/workflows/skiv.yml",
           "run: git add docs/skiv/MONITOR.md\n")
    _write(tmp_path, "tools/x.py",
           "# see docs/skiv/MONITOR.md\nPATH = 'docs/templates/dossier.html'\n")
    pin_map = validator.scan_doc_pins(tmp_path)
    assert pin_map["docs/skiv/MONITOR.md"] == [
        ".github/workflows/skiv.yml:1", "tools/x.py:1",
    ]
    assert pin_map["docs/templates/dossier.html"] == ["tools/x.py:2"]


def test_scan_excludes_docs_and_tests_dirs(tmp_path):
    _write(tmp_path, "docs/core/a.md", "docs/skiv/MONITOR.md\n")
    _write(tmp_path, "tests/test_x.py", "docs/missing.md\n")
    pin_map = validator.scan_doc_pins(tmp_path)
    assert pin_map == {}


def test_scan_skips_undecodable_file(tmp_path):
    (tmp_path / "tools").mkdir(parents=True)
    (tmp_path / "tools" / "blob.py").write_bytes(b"\xff\xfe docs/a.md \x00")
    # must not raise; binary file simply yields no pins
    assert validator.scan_doc_pins(tmp_path) == {}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k scan -q`
Expected: FAIL with `AttributeError: ... 'scan_doc_pins'`

- [ ] **Step 3: Add `import subprocess`**

At the top of `tools/check_docs_governance.py`, add `import subprocess` in the stdlib import block (after `import re`, line 8):

```python
import re
import subprocess
import sys
```

- [ ] **Step 4: Write the walk functions**

Add after `_is_scannable`:

```python
def git_tracked_files(repo_root: Path) -> list[str]:
    """Tracked files via git ls-files; filesystem walk fallback (non-repo/CI)."""
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), "ls-files"],
            capture_output=True, text=True, check=True,
        )
        files = [line for line in result.stdout.splitlines() if line]
        if files:
            return files
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        pass
    return [
        p.relative_to(repo_root).as_posix()
        for p in repo_root.rglob("*")
        if p.is_file()
    ]


def scan_doc_pins(repo_root: Path) -> dict[str, list[str]]:
    """Build {pin: [referrer:line, ...]} over all scannable tracked files."""
    pin_map: dict[str, list[str]] = {}
    for rel in git_tracked_files(repo_root):
        if not _is_scannable(rel):
            continue
        try:
            text = (repo_root / rel).read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            for pin in extract_pins_from_line(line):
                referrer = f"{rel}:{lineno}"
                bucket = pin_map.setdefault(pin, [])
                if referrer not in bucket:
                    bucket.append(referrer)
    return dict(sorted(pin_map.items()))
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k scan -q`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add tools/check_docs_governance.py tests/test_check_docs_governance.py
git commit -m "feat(governance): scan_doc_pins reverse-map + git-tracked walk

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

### Task 4: `load_pins_baseline` + `find_broken_doc_pins`

Existence-check the scanned pins, subtract the baseline, emit `broken_doc_pin` Issues (`warning`, or `error` under strict), and return the pin-map for the report.

**Files:**

- Modify: `tools/check_docs_governance.py`
- Test: `tests/test_check_docs_governance.py`

- [ ] **Step 1: Write the failing tests**

Append:

```python
# ---------------------------------------------------------------------------
# broken_doc_pin: find_broken_doc_pins + load_pins_baseline
# ---------------------------------------------------------------------------


def test_find_broken_pin_warns(tmp_path):
    _write(tmp_path, "tools/x.py", "P = 'docs/gone/missing.md'\n")
    issues, pin_map = validator.find_broken_doc_pins(tmp_path, set())
    assert len(issues) == 1
    iss = issues[0]
    assert iss.level == "warning"
    assert iss.code == "broken_doc_pin"
    assert iss.path == "docs/gone/missing.md"
    assert "tools/x.py:1" in iss.message
    assert pin_map["docs/gone/missing.md"] == ["tools/x.py:1"]


def test_find_existing_pin_ok(tmp_path):
    _write(tmp_path, "docs/present.md", "# real\n")
    _write(tmp_path, "tools/x.py", "P = 'docs/present.md'\n")
    issues, _ = validator.find_broken_doc_pins(tmp_path, set())
    assert issues == []


def test_find_baseline_absorbs_broken(tmp_path):
    _write(tmp_path, "tools/x.py", "P = 'docs/gone/missing.md'\n")
    issues, _ = validator.find_broken_doc_pins(
        tmp_path, {"docs/gone/missing.md"})
    assert issues == []


def test_find_strict_promotes_to_error(tmp_path):
    _write(tmp_path, "tools/x.py", "P = 'docs/gone/missing.md'\n")
    issues, _ = validator.find_broken_doc_pins(tmp_path, set(), strict=True)
    assert issues[0].level == "error"


def test_load_pins_baseline(tmp_path):
    bl = tmp_path / "bl.json"
    bl.write_text(json.dumps({"broken_known": ["docs/x.md", "docs/y/"]}),
                  encoding="utf-8")
    assert validator.load_pins_baseline(bl) == {"docs/x.md", "docs/y/"}
    assert validator.load_pins_baseline(tmp_path / "nope.json") == set()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k "find_ or load_pins" -q`
Expected: FAIL with `AttributeError: ... 'find_broken_doc_pins'`

- [ ] **Step 3: Write the functions**

Add after `scan_doc_pins`:

```python
def load_pins_baseline(path: Path) -> set[str]:
    """Load known pre-existing broken pins (key 'broken_known'); empty if absent."""
    if not path.exists():
        return set()
    data = load_json(path)
    return {str(entry) for entry in data.get("broken_known", [])}


def find_broken_doc_pins(
    repo_root: Path,
    baseline: set[str] | None = None,
    strict: bool = False,
) -> tuple[list[Issue], dict[str, list[str]]]:
    """Emit broken_doc_pin Issues for pins absent on disk and not baselined.

    Returns (issues, pin_map). pin_map includes healthy pins too -- it is the
    consultable reverse-map written into the drift report.
    """
    known = baseline or set()
    pin_map = scan_doc_pins(repo_root)
    level = "error" if strict else "warning"
    issues: list[Issue] = []
    for pin, referrers in pin_map.items():
        if (repo_root / pin).exists():
            continue
        if pin in known:
            continue
        issues.append(
            Issue(
                level,
                "broken_doc_pin",
                pin,
                f"citato da {referrers[0]}, non esiste su disco",
            )
        )
    return issues, pin_map
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k "find_ or load_pins" -q`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/check_docs_governance.py tests/test_check_docs_governance.py
git commit -m "feat(governance): find_broken_doc_pins existence-check + baseline

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

### Task 5: Wire into `parse_args`, `write_report`, `main`

Add the two CLI flags, thread the pin-map into the report, and run the check in `main`. `broken_doc_pin` is warning-tier by default -> the existing `--strict` (errors-only) CI invocation does NOT gate on it until an owner flips `--pins-strict`.

**Files:**

- Modify: `tools/check_docs_governance.py` (`parse_args` ~line 66, `write_report` ~line 333, `main` ~line 347)
- Test: `tests/test_check_docs_governance.py`

- [ ] **Step 1: Write the failing tests**

Append:

```python
# ---------------------------------------------------------------------------
# broken_doc_pin: report field + main() integration
# ---------------------------------------------------------------------------


def test_write_report_includes_doc_pins(tmp_path):
    report = tmp_path / "r.json"
    pin_map = {"docs/a.md": ["tools/x.py:3"]}
    validator.write_report(report, [], doc_pins=pin_map)
    payload = json.loads(report.read_text(encoding="utf-8"))
    assert payload["doc_pins"] == pin_map


def test_write_report_defaults_doc_pins_empty(tmp_path):
    report = tmp_path / "r.json"
    validator.write_report(report, [])
    payload = json.loads(report.read_text(encoding="utf-8"))
    assert payload["doc_pins"] == {}


def test_main_emits_broken_pin_warning(tmp_path, monkeypatch, capsys):
    # minimal valid registry so validate_registry adds no noise
    (tmp_path / "docs" / "governance").mkdir(parents=True)
    reg = make_valid_registry()
    (tmp_path / "docs" / "test.md").write_text("---\n---\n", encoding="utf-8")
    write_md_with_frontmatter(
        tmp_path / "docs" / "test.md",
        {"doc_status": "active", "doc_owner": "platform-docs",
         "workstream": "cross-cutting",
         "last_verified": (date.today() - timedelta(days=1)).isoformat(),
         "source_of_truth": True, "language": "it-en", "review_cycle_days": 14},
    )
    reg_path = tmp_path / "docs" / "governance" / "docs_registry.json"
    reg_path.write_text(json.dumps(reg), encoding="utf-8")
    _write(tmp_path, "tools/x.py", "P = 'docs/gone/missing.md'\n")

    monkeypatch.setattr(
        validator.Path, "resolve",
        lambda self: self,  # keep repo_root = tmp_path deterministic
        raising=False,
    ) if False else None  # placeholder: see note

    # Drive main() by monkeypatching parse_args + repo_root discovery.
    monkeypatch.setattr(validator.sys, "argv", [
        "prog", "--registry", "docs/governance/docs_registry.json",
        "--report", "reports/r.json",
        "--pins-baseline", "docs/governance/doc_pins_baseline.json",
    ])
    monkeypatch.setattr(
        validator, "Path",
        _RepoRootPath(tmp_path, validator.Path),
    ) if False else None  # see helper note below

    # Simpler: call find_broken_doc_pins directly is already covered.
    # Here assert the report file gets a broken pin via the public helper chain.
    issues, pin_map = validator.find_broken_doc_pins(tmp_path, set())
    validator.write_report(tmp_path / "reports" / "r.json", issues, doc_pins=pin_map)
    payload = json.loads((tmp_path / "reports" / "r.json").read_text(encoding="utf-8"))
    assert any(i["code"] == "broken_doc_pin" for i in payload["issues"])
    assert "docs/gone/missing.md" in payload["doc_pins"]
```

> Note: `main()` derives `repo_root` from `Path(__file__).resolve().parents[1]`, which is hard to redirect to `tmp_path` cleanly. The integration is verified end-to-end through the `find_broken_doc_pins` + `write_report` chain above (the exact calls `main` makes). The two `if False else None` monkeypatch lines are inert scaffolding left as a marker; delete them when implementing. The real `main` wiring is exercised by the full-suite run in Task 7 against the actual repo.

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k "write_report_includes or write_report_defaults or main_emits_broken" -q`
Expected: FAIL (`write_report` has no `doc_pins` kwarg)

- [ ] **Step 3: Extend `parse_args`**

In `parse_args`, before `return parser.parse_args()` (line 96), add:

```python
    parser.add_argument(
        "--pins-baseline",
        default=DEFAULT_PINS_BASELINE,
        help=(
            "Path to JSON baseline of known-broken doc pins "
            "(key 'broken_known'); listed pins are not flagged."
        ),
    )
    parser.add_argument(
        "--pins-strict",
        action="store_true",
        help="Promote broken_doc_pin from warning to error (owner-gated flip).",
    )
```

- [ ] **Step 4: Extend `write_report`**

Replace the `write_report` signature and payload (lines 333-344):

```python
def write_report(
    path: Path,
    issues: list[Issue],
    doc_pins: dict[str, list[str]] | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "summary": {
            "total": len(issues),
            "errors": sum(1 for issue in issues if issue.level == "error"),
            "warnings": sum(1 for issue in issues if issue.level == "warning"),
        },
        "issues": [issue.as_dict() for issue in issues],
        "doc_pins": doc_pins or {},
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
```

- [ ] **Step 5: Wire `main`**

In `main`, replace the block at lines 358-361 (from `issues = validate_registry(...)` through `write_report(report_path, issues)`):

```python
    registry = load_json(registry_path)
    issues = validate_registry(repo_root, registry)
    baseline = load_scan_baseline((repo_root / args.scan_baseline).resolve())
    issues.extend(find_unregistered_documents(repo_root, registry, baseline))
    pins_baseline = load_pins_baseline((repo_root / args.pins_baseline).resolve())
    pin_issues, pin_map = find_broken_doc_pins(
        repo_root, pins_baseline, strict=args.pins_strict
    )
    issues.extend(pin_issues)
    write_report(report_path, issues, doc_pins=pin_map)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -k "write_report or main_emits_broken" -q`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add tools/check_docs_governance.py tests/test_check_docs_governance.py
git commit -m "feat(governance): wire broken_doc_pin into main + report + CLI flags

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

### Task 6: Populate the baseline `doc_pins_baseline.json`

Run the check against the REAL repo, collect the current broken pins, and freeze them into a decreasing-only baseline so CI is green at first commit. Manually eyeball the list before committing (cross-repo-by-design pins get a comment tag).

**Files:**

- Create: `docs/governance/doc_pins_baseline.json`

- [ ] **Step 1: Generate the current broken-pin list**

Run:

```bash
py -3.13 - <<'PY'
import json, sys
from pathlib import Path
sys.path.insert(0, "tools")
import check_docs_governance as v
root = Path(".").resolve()
issues, _ = v.find_broken_doc_pins(root, set())
broken = sorted({i.path for i in issues})
print(f"{len(broken)} broken pins:")
for p in broken:
    print(" ", p)
Path("docs/governance/doc_pins_baseline.json").write_text(
    json.dumps({
        "_comment": "Known pre-existing broken doc pins. DECREASING-ONLY: remove a line when the pin is fixed (referrer updated or doc restored); never add without istruttoria. Cross-repo-by-design pins may carry a trailing note.",
        "broken_known": broken,
    }, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)
print("wrote docs/governance/doc_pins_baseline.json")
PY
```

Expected: prints a list (the design spec predicts entries like `docs/appendici/*.txt` variants via `config/tracker_registry.yaml`, `docs/roadmap/status/`, `docs/recap/qa-playbook.md`, plus cross-repo URLs that SHOULD already be URL-stripped -- if any `https`-derived pin appears, the URL-strip has a gap: STOP and fix Task 1 before baselining).

- [ ] **Step 2: Sanity-check the baseline**

Run:

```bash
py -3.13 -c "import json; d=json.load(open('docs/governance/doc_pins_baseline.json',encoding='utf-8')); print(len(d['broken_known']),'pins'); assert not any('://' in p or '/blob/' in p for p in d['broken_known']), 'URL-derived pin leaked -- fix Task1 URL-strip'; print('no URL-derived pins: OK')"
```

Expected: prints the count + `no URL-derived pins: OK`. If the assert fires, return to Task 1.

- [ ] **Step 3: Verify the check is now green**

Run:

```bash
py -3.13 -c "import sys; sys.path.insert(0,'tools'); import check_docs_governance as v; from pathlib import Path; i,_=v.find_broken_doc_pins(Path('.').resolve(), v.load_pins_baseline(Path('docs/governance/doc_pins_baseline.json'))); print('post-baseline broken:', len(i)); assert len(i)==0, [x.path for x in i]"
```

Expected: `post-baseline broken: 0`

- [ ] **Step 4: Commit**

```bash
git add docs/governance/doc_pins_baseline.json
git commit -m "chore(governance): freeze doc-pins baseline (pre-existing broken refs)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

### Task 7: Guide mention, registry entry, full-suite verification

Document the new check in the lifecycle guide, register this plan doc, and run the whole governance + test suite to confirm zero regressions before opening the PR.

**Files:**

- Modify: `docs/guide/docs-governance-stale-lifecycle.md`
- Modify: `docs/governance/docs_registry.json`
- Test: full suite

- [ ] **Step 1: Add the guide mention**

In `docs/guide/docs-governance-stale-lifecycle.md`, find the section listing the governance checks (grep for `unregistered_document`) and add after it:

```markdown
- **`broken_doc_pin`** (warning) -- un path `docs/` citato da codice/config/workflow o
  da un `.md` fuori `docs/` che non esiste piu' su disco. Baseline decrescente
  `docs/governance/doc_pins_baseline.json`. La reverse-map completa (`doc_pins` nel drift
  report) e' la pin-map consultabile PRIMA di un reorg: dice quale doc e' pinnato e da chi.
  Flip a gate duro = `--pins-strict` (owner). Distinto da `check_site_links.py` (link
  DENTRO `docs/`).
```

- [ ] **Step 2: Register this plan doc**

Run (surgical append, mirrors the spec entry pattern):

```bash
py -3.13 - <<'PY'
from pathlib import Path
p = Path("docs/governance/docs_registry.json")
t = p.read_bytes().decode("utf-8")
anchor = '''      "track": "new"
    }
  ]
}'''
entry = '''      "track": "new"
    },
    {
      "path": "docs/superpowers/plans/2026-07-02-doc-pins-guardrail.md",
      "title": "Doc-pins guardrail -- implementation plan (broken_doc_pin)",
      "doc_status": "draft",
      "doc_owner": "master-dd",
      "workstream": "ops-qa",
      "last_verified": "2026-07-02",
      "source_of_truth": false,
      "language": "it",
      "review_cycle_days": 90,
      "primary": false,
      "track": "new"
    }
  ]
}'''
assert t.rstrip().endswith(anchor), "registry tail changed -- inspect before appending"
idx = t.rfind(anchor)
p.write_bytes((t[:idx] + entry + t[idx+len(anchor):]).encode("utf-8"))
print("registered plan doc")
PY
```

Expected: `registered plan doc`. (If the assert fires, the registry tail moved -- open it and append the entry by hand matching the block shape.)

- [ ] **Step 3: Run the full new-test subset**

Run: `py -3.13 -m pytest tests/test_check_docs_governance.py -q`
Expected: PASS (all pre-existing + ~30 new assertions, 0 failures)

- [ ] **Step 4: Run governance strict + confirm green**

Run:

```bash
py -3.13 tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
```

Expected: `[docs-governance] errors=0 warnings=0` (the new plan doc is registered; broken pins are baselined). Then restore the per-run artifact so it is not committed:

```bash
git checkout -- reports/docs/governance_drift_report.json 2>/dev/null || true
```

- [ ] **Step 5: ASCII + format check**

Run:

```bash
py -3.13 -c "import sys; bad=[(i+1) for i,l in enumerate(open('tools/check_docs_governance.py',encoding='utf-8')) for c in l if ord(c)>127]; print('non-ascii lines in tool:', bad[:5] or 'clean')"
npx prettier --check docs/governance/doc_pins_baseline.json docs/governance/docs_registry.json 2>&1 | tail -3
```

Expected: `clean` for the tool; prettier reports the JSON files formatted (run `npx prettier --write` on them if flagged, then re-stage).

- [ ] **Step 6: Commit**

```bash
git add docs/guide/docs-governance-stale-lifecycle.md docs/governance/docs_registry.json
git commit -m "docs(governance): document broken_doc_pin + register plan doc

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

- [ ] **Step 7: Push and open the PR**

```bash
git push -u origin claude/doc-pins-guardrail
gh pr create --base main \
  --title "feat(governance): broken_doc_pin guardrail -- catch code->doc path refs that break on move" \
  --body-file <(cat <<'BODY'
## Cosa
Nuovo check `broken_doc_pin` in `tools/check_docs_governance.py` (job CI `docs-governance`, gia' required): scannerizza codice/config/workflow/root-md per riferimenti stringa a path `docs/`, e flagga (warning) quelli assenti su disco. Chiude il gap emerso dalla reorg #3185: un move/delete di doc che rompe un riferimento nel codice era invisibile fino al runtime.

Design + confronto ecosistema: `docs/superpowers/specs/2026-07-02-doc-pins-guardrail-design.md`.
Piano: `docs/superpowers/plans/2026-07-02-doc-pins-guardrail.md`.

## Come
- Estrattore puro URL-strip + placeholder/glob-truncate (regola 0 = niente falsi pin da `https://.../docs/...`).
- Scanner git-tracked, esclude `docs/` (owned by check_site_links), `.claude/`, `node_modules/`, `reports/`, `tests/`.
- Baseline decrescente `docs/governance/doc_pins_baseline.json` (rotti pre-esistenti) -> CI verde al primo colpo.
- Reverse-map `doc_pins` nel drift report = pin-map consultabile pre-reorg.
- `--pins-strict` = flip owner a gate duro (1 riga, futuro).

## Verifiche
- `pytest tests/test_check_docs_governance.py` -> verde (~30 nuove asserzioni)
- `check_docs_governance.py --strict` -> errors=0 warnings=0
- broken_doc_pin di default = warning: NON gate il CI finche' owner non flippa `--pins-strict`.

## Rollback (03A)
Check additivo, zero flag runtime, zero schema. `git revert <squash-sha>`.

## Guardrail
> 50 LOC fuori `apps/backend/` (~110 LOC nel validator) -> owner-gated, autorizzato dalla design-review 2026-07-02. Nessun file in `.github/workflows/` toccato.

[emoji-robot] Generated with [Claude Code](https://claude.com/claude-code)
BODY
)
```

> When you run the `gh pr create` above, replace `[emoji-robot]` with the literal robot
> emoji trailer per the repo PR convention. It is written as a placeholder here only to
> keep this plan `.md` ASCII-clean for the pre-commit encoding hook.

Expected: PR URL printed. Merge = master-dd (do-NOT-self-merge). Watch CI green.

---

## Self-Review (author)

- **Spec coverage:** scanner scope + exclusions (Task 2/3) / URL-strip regola 0 (Task 1) / placeholder/glob truncate (Task 1) / existence-check + severity + `--pins-strict` (Task 4/5) / decreasing-only baseline (Task 4/6) / reverse-map in report (Task 5) / `tests/**` exclusion (Task 2) / error-handling undecodable/overlong (Task 1/3) / guide + registry housekeeping (Task 7). All 14 TDD cases from the spec map to a task.
- **Placeholder scan:** no TBD/TODO; every code step shows full code. The two `if False else None` markers in Task 5 are called out explicitly with a delete-on-implement note (the real integration is covered by the helper-chain assertion + the Task 7 live run) -- kept because faking `Path(__file__).resolve().parents[1]` == tmp_path is more fragile than the direct chain test.
- **Type consistency:** `Issue(level, code, path, message)` matches the dataclass (line 50-55). `find_broken_doc_pins` returns `(list[Issue], dict)` consistently in Task 4 def, Task 5 main call, and all tests. `write_report(path, issues, doc_pins=None)` signature consistent Task 5 def + all callers. `load_pins_baseline`/`scan_doc_pins`/`extract_pins_from_line`/`_is_scannable` names identical across defs, calls, and tests.
