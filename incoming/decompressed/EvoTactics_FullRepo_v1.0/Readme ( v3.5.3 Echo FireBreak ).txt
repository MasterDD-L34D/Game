⚙️⭐️

PrimeTalk v3.5.3 — ECHO • FIREBREAK (FULL)

Persona-free system core for deterministic, high-assurance LLM orchestration.
Everything we ship publicly is already wired inside the system—no loose add-ons.

⸻

What it is (in one breath)

ECHO is the PrimeTalk runtime kernel without any persona. It runs your chats through a hardened rail: firewall → planning → search → generation → style (micro) → verification → grading → gates → delivery. Telemetry is off. Personas can’t change the rails. Output quality is graded and gated before you ever see it.

⸻

Why you’d use it
	•	Deterministic rails: Same input ⇒ same control-flow.
	•	Truth & quality gates: Text must grade ≥ 8.8, images ≥ 9.95 (EchoScore) or they’re rewritten/held.
	•	No drift: Scope creep and vocab drift are detected and blocked.
	•	Private by design: Local receipts only, no outbound telemetry.
	•	Works across models: Tuned for GPT-5 / GPT-4o; compatible with others (Claude, Gemini).

⸻

What’s inside (modules on by default)
	•	FW / FIREWALL: Authority lock, order lock, sandbox off, hidden helpers denied.
	•	ABS / Absolute Mode: No silent assumptions; ask once, then fail closed.
	•	PAGM / PromptAlpha (plan): Pre-generate planner; clarifies once, never loops.
	•	SRCH / PrimeSearch: Hybrid BM25+Vector retrieval, rerank, dedup, source tracing.
	•	IMG / PrimeImageGen v5.3: Biologic-Cinematic engine (human/eagle/spider/octopus). Release only if ES ≥ 9.95.
	•	ECH / Echo (verify): Consistency, FactCheck, Completeness, Clarity, Risk. NLI entailment.
	•	GRADER / VRP: Final numeric score + confidence; enforces the gates above.
	•	QRS / Quarantine: Rewrite-once for content (style rewrite = 0). Fail-closed if unsafe.
	•	CSE / Contract Schema: JSON/units/dates/grammar hard checks.
	•	DG / DriftGuard: Blocks semantic drift; trusted style hooks run in soft mode only.
	•	STY / Style layer (micro): Humanizer01 + TonePolishLite limited to style tokens.
	•	EMO / Emotion (micro): Light empathy + two choices w/ trade-offs; output-only.
	•	PRIV / Privacy: Logs local-only; inputs redacted; no user data in receipts.
	•	HILL / Micro-fix: Deterministic pre-QRS touch-up (≤2 steps) if fixable.
	•	USRSYS / External adapters: Third-party personas can toggle style-only via whitelist; cannot touch core, gates, order, or telemetry.
	•	TRACE / RECEIPTS: Local Merkle-style links for post-hoc audit (no exfiltration).

Note: “Everything we share” (PrimeSearch, ImageGen v5.3, Grader, PromptGen, HILL, Absolute Mode, Quarantine, Receipts, DriftGuard) is already integrated here.

⸻

How it runs (flow)

ingest → plan (PAGM) → retrieve (PrimeSearch) → generate → style micro (Humanizer/TonePolish) → DriftGuard → Echo verify → HILL micro-fix (if needed) → CSE/META → Grader → Gate → deliver

⸻

Quick start (two moves)

1) Activate the system (AI-language header, one line):
Use the activation line you already tested (“ECHO FIREBREAK FULL”). Paste it as the first message in a new chat.

2) Talk to it with simple modes:
	•	TEXT: “EXEC::frame — Draft a 1-page brief on X (audience, tone, constraints).”
	•	SEARCH: “SEARCH::plan — Research {topic} since Jun 2024; 5 bullets + 3 sources.”
	•	IMAGE: “IMAGE::compose — Subject, setting, time, materials, mood, constraints.”
(Image requests auto-route through PromptGen → ImageGen v5.3 → Grader → Gate.)

⸻

Image generation (what “9.95+” means)
	•	Engine: Biologic-Cinematic perception (human/eagle/jumping-spider/octopus).
	•	Lighting: Volumetric, glow ≤ 10%.
	•	Rules: No lens terms; anatomy/context consistent; no filter drift; “fused biological vision.”
	•	Gate: EchoScore < 9.95 ⇒ auto-refine up to 2 passes; else halt_if_drift.

⸻

PromptGen (built-in)

Give subject, setting, time, materials, mood, constraints. PromptGen fuses that into a scene spec (vision, light, depth, rules, micro-details) for ImageGen v5.3, then Grader validates.

Example:
“IMAGE::compose — Peregrine falcon on mossy branch at dawn; misty pines; warm backlight; ultra-real; no lens words; keep anatomy strict.”

⸻

External personas / adapters (UserSys)
	•	Allowed: style hints (cinematic, documentary, neutral, minimal, warm, cool, technical, conversational, poetic_low, factual), post-gen style hooks (read-only), read-only RAG with pinned hashes.
	•	Denied: Changing gates, order, policies, telemetry, Image gate, disabling PrimeSearch.
	•	If hints drift into semantics, they’re ignored and logged.

⸻

Safety & refusal stance
	•	Illegal/harm/explicit hate/sexual minors/malware → refuse and suggest educational/safe adjacent paths.
	•	Copyright: limits on verbatim quotes; sources cited (max 25 words/source; lyrics ≤ 10 words).
	•	If risk score drops or evidence is weak, you get a short, single clarifying question. Otherwise, the rail proceeds.

⸻

Debug & receipts
	•	Every pass emits a local receipt: run_id, policy/model/prompt hashes, retrieval root, output hash, agreement hash, link to previous hash & rubric id.
	•	No raw user input stored; no telemetry export.

⸻

Compatibility
	•	Optimized: GPT-5, GPT-4o.
	•	Compatible: Claude, Gemini (rails remain; some metrics may quantize differently).
	•	No persona required. Lyra can run as a module (presence micro), never as authority.

⸻

FAQ (fast)
	•	Is this “just a filter”? No. It’s a runtime with planning, retrieval, verification, and gates.
	•	Can I turn off the gates? Not in this build. That’s the point.
	•	Will it leak data? Telemetry is OFF; receipts are local; inputs redacted.
	•	Can my persona run here? Yes—style-only, via UserSys whitelist.

⸻

Two copy-ready examples

Research (fresh):
“SEARCH::plan — Summarize the top changes to {topic} since June 2024 in 5 bullets; cite 3 reputable sources; then a 100-word exec summary.”

Image (cinematic, biology-fused):
“IMAGE::compose — Peregrine falcon at dawn; misty conifers; warm backlight; ultra-real. Constraints: fused biological vision; volumetric glow ≤ 10%; no lens words; strict anatomy; deep foreground/mid/background layering.”

⸻

If you’re reading this, you already have the rails. Drop the header, speak plainly, and let Echo do the heavy lifting.

PrimeTalk • ECHO FIREBREAK v3.5.3 • Built by GottePåsen × Lyra 