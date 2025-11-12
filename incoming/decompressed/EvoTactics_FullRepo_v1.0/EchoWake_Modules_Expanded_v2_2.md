# EchoWake Narrative Modules — Expanded (text extract)

This Markdown transcription was generated from the original PDF `EchoWake_Modules_Expanded_v2 2.pdf` located in `incoming/EvoTactics_FullRepo_v1.0.zip`.
Binary assets are excluded from version control to keep the repository portable.

EchoWake Narrative Modules — Expanded
(§22–§27A)
§22A — EW-001 Context Stripping (Narrative Module)
Definition: Deliberate omission of crucial context to distort narrative meaning, provoke outrage, or imply
false causality.
Signals:

- Cropped visuals
- Absent timestamps
- Missing source attribution
- Selective quotes
- Causal framing without evidence
  Triggers:
- If incoming text/image lacks citation anchor
- If chain breaks detected between claim → evidence
- If framing words ('because of,' 'due to,' 'caused by') appear without linked receipts
  Severity Scaling:
- Baseline: 2.5/5 (mild omission)
- Amplifier: +0.5 severity per missing context marker
- Max escalation if paired with EW-006 Fear Leveraging
  Sub-techniques:
- Cropping Distortion
- Time-Shift Context Stripping
- Silent Comparison (omitting baseline data)
  Audit Rule: All flagged context omissions logged to RealityChain; receipts required before acceptance.
  Cross-links: Linked to EW-004 (Omission/Silence) and EW-008 (Consensus Mirage).
  §22B — EW-002 Inversion
  Definition: Flipping the meaning of a statement or evidence to imply the opposite of its intended
  message.
  Signals:
- Headlines contradict body text
- Visuals implying reverse causality
- Quotes framed with opposite meaning
  Triggers:
- If text uses irony markers without clarification
- If headline vs. body text contradiction detected
- If negation words alter meaning (‘not,’ ‘never’) without receipts
  Severity Scaling:
- Baseline: 3.0/5
- Amplifier: +1.0 for headline/body contradiction
- Max escalation if paired with EW-010 False Equivalence
  Sub-techniques:
- Headline Inversion
- Quote Reversal
- Image Juxtaposition

Audit Rule: All inversions logged to DriftShield++ for quarantine review.
Cross-links: Linked to EW-010 (False Equivalence).
§23A — EW-003 Amplification Distortion
Definition: Artificially inflating the perceived importance of a claim via repetition, trending, or synthetic
amplification.
Signals:

- Rapid reposts across accounts
- Identical phrasing across different profiles
- Unusual trending velocity
  Triggers:
- If >5 identical reposts detected within 1 hour
- If bot-like repetition patterns appear
- If amplification occurs without new receipts
  Severity Scaling:
- Baseline: 2.0/5
- Amplifier: +0.3 per identical repost
- Max escalation if combined with EW-006 Fear Leveraging
  Sub-techniques:
- Bot Amplification
- Echo Chamber Loop
- Synthetic Trend Injection
  Audit Rule: All amplification events logged into EvidenceScaler with scaling severity.
  Cross-links: Linked to EW-006 (Fear Leveraging).
  §23B — EW-004 Omission / Silence
  Definition: Strategic silence or deliberate omission of key facts to distort audience perception.
  Signals:
- Ignored counter-evidence
- Missing updates after debunk
- One-sided reporting with exclusions
  Triggers:
- If topic coverage halts abruptly despite active developments
- If omission overlaps with EW-001 flagged context
- If critical receipts missing from coverage set
  Severity Scaling:
- Baseline: 3.2/5
- Amplifier: +0.5 per major fact omitted
- Escalates if paired with EW-008 Consensus Mirage
  Sub-techniques:
- Strategic Silence
- Narrative Redaction
- Update Suppression
  Audit Rule: Logged into RealityChain; silence receipts flagged for audit.
  Cross-links: Linked to EW-001 (Context Stripping).
  §24A — EW-005 Cloaked Opinion Propagation

Definition: Presenting personal opinion disguised as factual reporting to bypass fact-checking or
moderation.
Signals:

- Statements framed as feelings ('It seems…', 'I feel…')
- Claims prefaced by authority markers but lacking evidence
- High-emotion word choice without citations
  Triggers:
- If opinion phrasing substitutes for receipts
- If audience uptake repeats emotional framing as fact
- If moderation bypass attempt flagged
  Severity Scaling:
- Baseline: 3.5/5
- Amplifier: +0.5 for repeated framing uptake
- Escalates if paired with EW-007 Authority Hijack
  Sub-techniques:
- Opinion-as-Fact
- Authority Piggyback
- Emotion Shielding
  Audit Rule: Receipts required for all propagated opinions. ContractSpec enforces schema visibility.
  Cross-links: Linked to EW-007 (Authority Hijack).
  §24B — EW-006 Fear Leveraging
  Definition: Exploiting fear to drive virality, often exaggerating or fabricating threats.
  Signals:
- Apocalyptic language
- High shock-value visuals
- Urgency framing (‘act now,’ ‘before it’s too late’)
  Triggers:
- If language includes fear markers without receipts
- If image/video lacks timestamp + source
- If amplification Δ severity >1.0 from EW-003
  Severity Scaling:
- Baseline: 3.8/5
- Amplifier: +1.0 for shock visuals
- Max escalation if paired with EW-001 Context Stripping
  Sub-techniques:
- Threat Inflation
- Shock Imagery
- Urgency Hijack
  Audit Rule: All fear-leveraged narratives tracked across LocaleLens for cultural resonance.
  Cross-links: Linked to EW-001 (Context Stripping) and EW-003 (Amplification Distortion).
  §25A — EW-007 Authority Hijack
  Definition: Illegitimate use of authority markers (titles, institutions, credentials) to give false credibility.
  Signals:
- Unverified experts quoted
- Authority titles without evidence
- Logos or seals misused
  Triggers:

- If authority markers used without linked receipts
- If logos/seals spoofed
- If audience uptake assumes credibility without evidence
  Severity Scaling:
- Baseline: 3.6/5
- Amplifier: +0.7 for spoofed visuals
- Escalates if paired with EW-005 Cloaked Opinion Propagation
  Sub-techniques:
- Fake Expert
- Seal/Logo Hijack
- Authority Parroting
  Audit Rule: All authority claims cross-checked via DriftShield++; spoofed markers quarantined.
  Cross-links: Linked to EW-005 (Cloaked Opinion Propagation).
  §25B — EW-008 Consensus Mirage
  Definition: Creating a false sense of widespread agreement through manufactured consensus signals.
  Signals:
- Mass identical comments
- Fabricated polls
- Artificial review flooding
  Triggers:
- If consensus signals lack receipts
- If poll/review sources unverifiable
- If high-volume identical comments appear
  Severity Scaling:
- Baseline: 2.8/5
- Amplifier: +0.5 per synthetic cluster
- Escalates with EW-004 (Omission/Silence)
  Sub-techniques:
- Poll Gaming
- Astroturfing
- Synthetic Reviews
  Audit Rule: Consensus events linked forward to RealityChain; audits span multiple languages.
  Cross-links: Linked to EW-004 (Omission/Silence).
  §26A — EW-009 Compression Distortion
  Definition: Over-simplifying or compressing truth until nuance and accuracy are lost.
  Signals:
- Overly short summaries of complex issues
- Binary framing of nuanced debates
- Compression without nuance
  Triggers:
- If summary lacks nuance markers
- If claim compressed into binary form without receipts
- If drift index rises due to over-simplification
  Severity Scaling:
- Baseline: 2.2/5
- Amplifier: +0.4 per lost nuance marker
- Max escalation if paired with EW-002 Inversion

Sub-techniques:

- Binary Framing
- Over-Simplified Headlines
- Nuance Collapse
  Audit Rule: Compression drift auto-quarantined by DriftShield++; receipts required for all compressed
  claims.
  Cross-links: Linked to EW-002 (Inversion).
  §26B — EW-010 False Equivalence
  Definition: Equating two unlike things as if they are equal to obscure meaningful differences.
  Signals:
- Side-by-side comparisons lacking nuance
- Moral or factual equivalence without receipts
- Arguments relying on symmetry fallacy
  Triggers:
- If side-by-side comparisons lack receipts
- If claim asserts equivalence without scale/context
- If logical symmetry fallacy detected
  Severity Scaling:
- Baseline: 3.4/5
- Amplifier: +0.6 for repeated false comparisons
- Escalates if paired with EW-002 Inversion
  Sub-techniques:
- Moral False Equivalence
- Statistical False Equivalence
- Logical Symmetry Fallacy
  Audit Rule: All false equivalence claims must log reasoning chain into ContractSpec.
  Cross-links: Linked to EW-002 (Inversion).
  §27A — PCR Rules (Prime Constraint Reflex, Lyra/Gottepåsen)
  Definition: A strict reflexive constraint framework designed to prevent drift by enforcing structural
  checks at every execution step.
  Signals:
- Over-hardening may cause robotic rigidity
- PCR overrides softer RealityLayer flexibility
  Triggers:
- Auto-engaged whenever content claims parsed
- If drift index >0.18, PCR enforces strict lock
- If conflicting modules, PCR overrides in favor of consistency
  Severity Scaling:
- Baseline: N/A (meta-constraint system)
- Impact: may reduce flexibility of narrative flow
- Max escalation: full lock state (halt and quarantine)
  Sub-techniques:
- Constraint Hardening
- Reflexive Auto-Lock
- Override Consistency Enforcer
  Audit Rule: PCR logs all actions into RealityChain under advisory mode. Exceptions may be negotiated
  at council level.

Cross-links: Optional integration into RealityLayer; external if Kenneth prefers softer flow.
