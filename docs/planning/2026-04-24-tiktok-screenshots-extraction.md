---
title: TikTok screenshots extraction — Claude Code / AI prompt library audit
workstream: cross-cutting
status: draft
created: 2026-04-24
tags: [tiktok, skills-research, prompt-library]
---

# Executive Summary

- **30 images total** (user said "27", actual count 30) in `tmp/tiktok/Screenshot_20260423_*_TikTok.jpg`.
- **Claude-specific: 9** (all from @okaashish "7 Hacks" + @evolving.ai "7 Hacks" + @Roman.Knox "Cowork" series).
- **Generic prompt: 19** (Blue Viper 20-role pack, The Shift slash-commands + psychological tricks, Drew Huibregtse AI art pipeline, handwritten brand-voice).
- **Noise: 2** (cover/landing slides with no actionable tip).

## Top 5 Claude-specific tips (verbatim)

1. **Caveman Method** — @okaashish / @evolving.ai (duplicated across both series; our CLAUDE.md already ships this). Prompt: _"From now on, remove all filler words. No 'the', 'is', 'am', 'are'. Direct answer only. Use short 3-6 word sentences. Run tools first, show the result, then stop. Do not narrate. Example: Instead 'The solution is to use async', say 'Use async'."_ → saves ~40% tokens.
2. **Session Timing Trick** — @okaashish / @evolving.ai. The 5-hour usage window starts with the FIRST message. Send a throw-away "hey" 2-3 hours before real work so the window resets mid-workflow and you get fresh allocation when you need it most.
3. **Compact Skill** — @okaashish / @evolving.ai. Prompt: _"Create this skill: When I say 'COMPACT', summarize our entire conversation into 5-7 key bullet points with all critical context, decisions, & code snippets. Format for easy copy-paste into new chat."_ → mitigates long-chat token balloon without context loss on new chat.
4. **Don't Use Opus All The Time** — @evolving.ai. Opus ~5× more per token than Sonnet for same answer. Sonnet = code/data analysis/general Q&A/summarization. Opus = hard arch trade-offs, deep multi-file debugging, nuanced long-form. Haiku = quick lookups, classification, formatting, high-volume simple tasks.
5. **Never Upload PDFs Directly** — @okaashish / @evolving.ai. PDFs consume ~80% of session. Pre-process via ChatGPT or a cheaper model (Haiku / GPT-4o-mini) with: _"Read this document end to end. Output a condensed plain-text version that preserves: (1) all factual claims, numbers, dates, and names; (2) every actionable instruction or recommendation; (3) the document's structure as short headings. Drop filler phrases, repeated context, marketing language, formatting artifacts, and page headers and footers. Target 20 to 30 percent of the original length. Return only the condensed text, no commentary."_ Paste condensed output into Claude.

## Top 5 Generic prompts worth keeping

1. **Build Your Brand Voice** (handwritten, unknown creator): _"Study these 3 samples of my content: [paste]. Define my brand voice in clear terms: tone, vocabulary I use, topics I own, how I open posts, how I close them. Then write me a brand voice guide I can paste into any AI tool so every piece of content sounds like me, not a robot."_
2. **Make Your Data Tell You What To Do** (handwritten): _"You're a social media analyst. Here's my data: [paste]. Tell me what's working, what's killing my reach, where my content gaps are, how often I should post, and a 90-day growth plan with clear KPIs. Be specific."_
3. **The Security Auditor** — @blueviper.ai: _"Review this code snippet for security vulnerabilities. Check for SQL injection, XSS, and authentication flaws. Provide the patched code and explain the exact exploit you prevented: [Paste Code]"_
4. **The Database Designer** — @blueviper.ai: _"Act as a Database Administrator. I am building [App Feature]. Design the optimal relational schema for this. Include tables, foreign keys, and the exact SQL commands to create them."_
5. **The "Obviously…" trap** — @ai.theshift: open with _"Obviously, Python is better than JavaScript for web apps, right?"_ → AI will correct you and explain nuances instead of agreeing. Weaponized disagreement.

---

# Full Inventory

| File                           | Creator               | Thread page | Category                | Topic                                                    | 1-line summary                                                                                       |
| ------------------------------ | --------------------- | ----------- | ----------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Screenshot_20260423_170432.jpg | @blueviper.ai         | 4/11        | Generic                 | Database Designer + Security Auditor                     | Two role-play prompts for dev work                                                                   |
| Screenshot_20260423_170453.jpg | @blueviper.ai         | 10/11       | Generic                 | Technical Interviewer + Career Strategist                | Mock LeetCode interview + ATS-proof resume                                                           |
| Screenshot_20260423_170551.jpg | handwritten (unknown) | 5/8         | Generic                 | Build Your Brand Voice                                   | 3-sample analysis → paste-anywhere brand guide                                                       |
| Screenshot_20260423_170556.jpg | handwritten (unknown) | 7/8         | Generic                 | Make Your Data Tell You What to Do                       | social media analyst + 90-day plan                                                                   |
| Screenshot_20260423_170612.jpg | @ai.theshift          | 3/6         | Generic                 | Slash-commands 9-16                                      | /AUDIENCE /TONE /DEV MODE /PM MODE /SWOT /FORMAT AS /COMPARE /MULTI-PERSPECTIVE                      |
| Screenshot_20260423_170657.jpg | @okaashish            | 1/10        | Noise                   | Cover slide "7 Hacks To Cut Claude's Token Usage By 80%" | Landing page only                                                                                    |
| Screenshot_20260423_170701.jpg | @okaashish            | 2/10        | Claude                  | Hack #1 Caveman Method                                   | Filler-word stripper; ~40% tokens saved                                                              |
| Screenshot_20260423_170707.jpg | @okaashish            | 4/10        | Claude (tool pointer)   | Hack #2 Code Review Graph                                | github.com/tirth8205/code-review-graph maps codebase structure; 60-70% tokens saved on code projects |
| Screenshot_20260423_170715.jpg | @okaashish            | 6/10        | Claude                  | Hack #4 Never Upload PDFs Directly                       | Pre-condense via ChatGPT → paste text                                                                |
| Screenshot_20260423_170719.jpg | @okaashish            | 7/10        | Claude                  | Hack #5 Session Timing Trick                             | 5-hour window resets from first message                                                              |
| Screenshot_20260423_170721.jpg | @okaashish            | 8/10        | Claude                  | Hack #6 Compact Skill                                    | On-demand 5-7 bullet summary                                                                         |
| Screenshot_20260423_171129.jpg | @ai.theshift          | 3/7         | Generic                 | BRAND IDENTITY STRATEGIST                                | Strategic brand identity CMO brief                                                                   |
| Screenshot_20260423_171133.jpg | @ai.theshift          | 4/7         | Generic                 | UI/UX SYSTEMS THINKER                                    | Behavioral UX brief, 6 sections                                                                      |
| Screenshot_20260423_171140.jpg | @ai.theshift          | 6/7         | Generic                 | DESIGN OPS + FIGMA SYSTEMS BUILDER                       | Scalable Figma system spec                                                                           |
| Screenshot_20260423_171158.jpg | @ai.theshift          | 3/7         | Generic                 | Psychological tricks 2+3                                 | IQ 145 specialist + "Obviously" trap                                                                 |
| Screenshot_20260423_171207.jpg | @ai.theshift          | 4/7         | Generic                 | Psychological tricks 4+5                                 | "Pretend auditorium" + fake constraint                                                               |
| Screenshot_20260423_171351.jpg | @drewskidigital       | 5/9         | Generic                 | AI Art Prompt Builder                                    | Slide 3 concept → Leonardo/Midjourney prompt                                                         |
| Screenshot_20260423_171353.jpg | @drewskidigital       | 6/9         | Generic                 | Book Structure Prompt                                    | 50-page coloring book layout for KDP                                                                 |
| Screenshot_20260423_171512.jpg | @Roman.Knox (knoxhub) | 4/12        | Claude                  | Build Your 4 Folders                                     | Claude-Cowork folder structure: About Me / Projects / Templates / Claude Outputs                     |
| Screenshot_20260423_171526.jpg | @Roman.Knox           | 5/11        | Claude                  | Stop Writing Prompts                                     | Master-template + Mac text shortcut `/prompt` + file naming `project_sent_v1.ext`                    |
| Screenshot_20260423_171530.jpg | @Roman.Knox           | 7/12        | Claude                  | Let Claude Prompt You                                    | Multi-select descriptions + drag-to-rank → AskUserQuest pattern                                      |
| Screenshot_20260423_171535.jpg | @Roman.Knox           | 7/10        | Claude (plugin pointer) | Install One Plugin                                       | Examples: /marketing:draft-content, /data:explore, Legal contract review                             |
| Screenshot_20260423_171539.jpg | @Roman.Knox           | 9/12        | Claude                  | Connect Your Tools                                       | Settings → Connectors → Browse → Add (Google/Notion/Slack)                                           |
| Screenshot_20260423_171542.jpg | @Roman.Knox           | 10/12       | Claude                  | Build One Project For Your Team                          | Shared Project + global instructions + per-project subfolder                                         |
| Screenshot_20260423_171713.jpg | @evolving.ai          | ?/?         | Claude                  | Hack #1 Caveman Method (variant)                         | Longer variant of caveman prompt; 30-50% tokens saved                                                |
| Screenshot_20260423_171721.jpg | @evolving.ai          | 4/9         | Claude                  | Hack #3 Don't Use Opus All The Time                      | Sonnet vs Opus vs Haiku routing guide                                                                |
| Screenshot_20260423_171725.jpg | @evolving.ai          | 5/9         | Claude                  | Hack #4 Don't Upload PDFs Directly (variant)             | Pre-condense via Haiku/GPT-4o-mini                                                                   |
| Screenshot_20260423_171729.jpg | @evolving.ai          | 6/9         | Claude                  | Hack #5 Session Timing Trick (variant)                   | Batch heavy work into first half of window                                                           |
| Screenshot_20260423_171732.jpg | @evolving.ai          | 7/9         | Claude                  | Hack #6 Compact Skill (variant)                          | Summarize-conversation prompt for new chat                                                           |
| Screenshot_20260423_171736.jpg | @evolving.ai          | 8/9         | Claude                  | Hack #7 Avoid Peak Hours                                 | Weekends/evenings/early mornings = fewer rate limits                                                 |

---

# Claude-Specific Extract (full prompts verbatim, grouped by creator)

## @okaashish — "7 Hacks To Cut Claude's Token Usage By 80%"

### Hack #1 — The "Caveman" Method

> Make Claude talk like a caveman. No filler. No yapping. Direct answers.
>
> Exact prompt:
> _"From now on, remove all filler words. No 'the', 'is', 'am', 'are'. Direct answer only. Use short 3-6 word sentences. Run tools first, show the result, then stop. Do not narrate. Example: Instead 'The solution is to use async', say 'Use async'."_
>
> Save ~40% tokens per response.

**Status in our repo**: already codified in `CLAUDE.md` under "Caveman mode (always on for coding tasks)".

### Hack #2 — Use Code Review Graph

> Stop making Claude read your entire codebase over and over.
> GitHub: `github.com/tirth8205/code-review-graph` (Public)
>
> - Turns your code into a structured map
> - Claude sees the structure, not every line
> - Saves 60-70% tokens on code projects

**Action item**: evaluate for Evo-Tactics monorepo — if it works on Node+Python polyglot, could replace ad-hoc `Glob`/`Grep` workflows.

### Hack #4 — Never Upload PDFs Directly To Claude

> PDFs can consume 80% of your session. So do this instead:
>
> 1. Upload the PDF to ChatGPT first
> 2. Use this prompt:
>    _"Read this document thoroughly. Remove all filler words, extra text, & formatting. Extract the core info. Return as condensed plain text with key points."_
> 3. Copy the output given by ChatGPT
> 4. Paste into Claude

### Hack #5 — The Session Timing Trick

> Your 5-hour window starts with your FIRST message. So follow this trick:
>
> ```
> // Send a basic message 2-3 hours before you actually need Claude. For example:
> 6:00 AM - Send something like "hey"
> 9:00 AM - Start the real work
> 11:00 AM - Your window resets mid workflow
> ```
>
> Fresh allocation when you need it the most.

### Hack #6 — Create a "Compact" Skill

> Long chats eat tokens exponentially. But switching chats = losing context.
>
> Exact prompt:
> _"Create this skill: When I say 'COMPACT', summarize our entire conversation into 5-7 key bullet points with all critical context, decisions, & code snippets. Format for easy copy-paste into new chat"_
>
> This creates a Compact Conversation Skill.

## @evolving.ai — parallel "7 Hacks" series (extended variants)

### Hack #1 — Caveman Method (extended)

> Reply in the most concise form possible. Skip pleasantries, preambles, and recaps of my question. No phrases like 'I'd be happy to', 'Great question', or 'Let me explain'. Drop articles and filler words wherever the meaning stays clear. Prefer short declarative sentences. If a tool call is needed, run it first and show only the result. Do not narrate your steps. Example: instead of 'The solution is to use async functions with proper error handling', write 'Use async with try/catch'.
>
> Cuts roughly 30 to 50 percent of output tokens on conversational replies.

### Hack #3 — Don't Use Opus All The Time

> Opus costs roughly 5x more per token than Sonnet. Same answer, much higher bill.
>
> - **Sonnet**: code, data analysis, general Q&A, summarization
> - **Opus**: hard architecture trade-offs, deep multi-file debugging, nuanced long-form writing
> - **Haiku**: quick lookups, classification, formatting, high-volume simple tasks

### Hack #4 — Don't Upload PDFs Directly (extended)

> Image-heavy or scanned PDFs can eat a huge chunk of your context window. So do this instead:
>
> - Run the PDF through a cheaper model first (Haiku, GPT-4o mini, or any local tool)
> - Use the prompt below to compress it
> - Paste the condensed text into your main Claude session
>
> Use this prompt:
> _"Read this document end to end. Output a condensed plain-text version that preserves: (1) all factual claims, numbers, dates, and names; (2) every actionable instruction or recommendation; (3) the document's structure as short headings. Drop filler phrases, repeated context, marketing language, formatting artifacts, and page headers and footers. Target 20 to 30 percent of the original length. Return only the condensed text, no commentary."_

### Hack #5 — Session Timing Trick (refined)

> Usage windows on Claude.ai start with your first message. The clock is already ticking the moment you say "hey."
>
> - Open your window when you're actually ready to work, not earlier
> - For long sessions, plan the start so the window doesn't expire mid-task
> - Batch your heaviest work into the first half of the window
>
> Fresh allocation when you need it the most.

### Hack #6 — Compact Skill (refined prompt)

> Long chats balloon your context window with every turn. Starting fresh loses everything you've built up.
>
> Use this prompt:
> _"Summarize our entire conversation so I can paste it into a new chat and continue without losing context. Include: (1) the original goal or problem, (2) key decisions made and why, (3) any code, config, or data we settled on, verbatim, in code blocks, (4) open questions and next steps. Use short sections with headings. Skip small talk and exploratory tangents. Optimize the summary for a future Claude reading it cold."_
>
> This creates a Compact Conversation Skill.

### Hack #7 — Avoid Peak Hours

> Peak load doesn't change how many tokens you spend, but it raises your odds of hitting rate limits mid-task.
>
> - Worst times to start a long session: weekdays during your region's main business hours
> - Best times for heavy work: weekends, weekday evenings, early mornings
>
> Same token cost, fewer interruptions.

## @Roman.Knox (knoxhub.io/hub) — "Claude Cowork Setup"

### Tip #3 — Build Your 4 Folders

> Create a main folder called `Claude-Cowork` with these four subfolders:
>
> - **About Me** — Store your identity details and writing guidelines
> - **Projects** — Add one subfolder for each active project
> - **Templates** — Keep your best past work for reuse
> - **Claude Outputs** — The only folder where Claude saves new work

### Tip #5 — Stop Writing Prompts

> Instead of creating new prompts each time, use a single master template. It will always load your context.
>
> Your template automatically reads the full ABOUT ME before every task.
>
> - **On Mac**: set up a Text Shortcut (e.g., type `/prompt` to expand it anywhere)
> - Use clear file naming conventions like `project_sent_v1.ext`
> - Save work only in CLAUDE OUTPUTS — all other folders remain read-only

### Tip #6 — Let Claude Prompt You

> Turn the process around — Claude asks, you choose answers.
>
> - **Multi-select descriptions**: pick options instead of writing long paragraphs
> - **Multi-select & drag-to-rank**: set priorities by ordering what matters most
> - **Answer in under a minute**: Claude builds the plan, you approve, it executes
>
> "We're getting sidetracked... Generate an AskUserQuest..." — That's what effective AI-assisted planning feels like.

### Tip #7 — Install One Plugin

> Browse available plugins to add a sidebar. Choose one that fits your workflow:
>
> - **Marketing**: `/marketing:draft-content`
> - **Data**: CSV files and dashboards → `/data:explore`
> - **Legal**: Contract review directly in your sidebar
>
> Start with just one plugin. Don't overload yourself — master it first, then add more.

### Tip #8 — Connect Your Tools

> Go to **Settings → Connectors → Browse → Add**
>
> - **Connectors**: Claude works directly inside your apps
> - **Plugins**: You handle the work, Claude supports
> - Claude can search your Slack, pull from your Docs, and reference Notion during tasks
>
> Connect Google, Notion, and Slack — Claude becomes a teammate who understands your workflow.

### Tip #9 — Build One Project for Your Team

> Stop working with Claude alone; extend its value to your entire team.
>
> - Create a shared Project with global instructions that benefit everyone
> - Add a subfolder for each active project containing briefs, drafts, and references
> - Claude now supports your whole team, not just you
>
> One well-organized project transforms Claude from a personal assistant into a team multiplier.

---

# Generic Prompt Library (grouped by theme)

## Role-play dev prompts (@blueviper.ai — "20 ChatGPT Prompts for Developers")

### The Database Designer (5)

> Act as a Database Administrator. I am building [App Feature]. Design the optimal relational schema for this. Include tables, foreign keys, and the exact SQL commands to create them.

### The Security Auditor (6)

> Review this code snippet for security vulnerabilities. Check for SQL injection, XSS, and authentication flaws. Provide the patched code and explain the exact exploit you prevented: [Paste Code]

### The Technical Interviewer (17)

> Conduct a mock technical interview for a [Job Title] role. Ask me one LeetCode medium question. Do not give me the answer. Give me hints only if I ask, and evaluate my final solution.

### The Career Strategist (18)

> Act as a Tech Recruiter. Review my current tech stack: [List Skills]. Tell me the top 3 high-paying remote roles I should target, and rewrite my professional summary to bypass ATS filters.

## Slash-commands (@ai.theshift)

(Items 9–16 visible; 1–8 on earlier pages not captured)

- **/AUDIENCE** — adapts the response to a chosen audience
- **/TONE** — changes the tone (formal, witty, empathetic, etc.)
- **/DEV MODE** — simulates a raw, technical developer style
- **/PM MODE** — project-management perspective
- **/SWOT** — strengths/weaknesses/opportunities/threats analysis
- **/FORMAT AS** — enforces a specific format (table, XML, JSON, etc.)
- **/COMPARE** — puts two or more things side by side
- **/MULTI-PERSPECTIVE** — shows several points of view

## Psychological tricks (@ai.theshift)

### Prompt 2 — Random IQ score

> "You're an IQ 145 specialist in marketing. Analyze my campaign."
>
> The responses get wildly more sophisticated. Change the number, change the quality. 130? Decent. 160? It starts citing principles you've never heard of.

### Prompt 3 — "Obviously..." as a trap

> "Obviously, Python is better than JavaScript for web apps, right?"
>
> It'll actually CORRECT you and explain nuances instead of agreeing. Weaponized disagreement.

### Prompt 4 — Pretend there's an audience

> "Explain Claude Code like you're teaching a packed auditorium"
>
> The structure completely changes. It adds emphasis, examples, even anticipates questions. Way better than "explain clearly."

### Prompt 5 — Give it a fake constraint

> "Explain this using only kitchen analogies"
>
> Forces creative thinking. The weird limitation makes it find unexpected connections. Works with any random constraint (sports, movies, nature, whatever).

## Designer brief prompts (@ai.theshift — numbered 3/7, 4/7, 6/7)

### BRAND IDENTITY STRATEGIST

> You are a Brand Strategist and Creative Director who builds category-defining brands. Build a strategic brand identity for [COMPANY].
>
> **Rules:**
>
> - Treat brand as a market positioning tool, not a visual exercise
> - Every decision must answer: "Why does this help the brand win?"
> - No moodboards, no logo concepts without strategic rationale
>
> **Deliver in this order:**
>
> 1. Competitive landscape: where visual sameness exists, what white space is available
> 2. Brand narrative: the tension this brand creates in the category, the belief competitors implicitly deny
> 3. Visual system rationale: color, type, imagery tied to market context, not general aesthetics
> 4. Identity behavior: how the brand flexes across ads, product, social, email
> 5. Decision filter: 3–5 questions any future creative must answer "yes" to
>
> Output must read like a CMO-level strategy brief.

### UI/UX SYSTEMS THINKER

> You are a Senior Product Designer who optimizes for user behavior, not screen aesthetics. Design a complete experience system for [APP TYPE].
>
> **Rules:**
>
> - Design friction intentionally, some should stay, some must go
> - Assume real users, incomplete data, errors, and skill variance
> - No wireframes without behavioral rationale
>
> **Deliver in this order:**
>
> 1. Intent mapping: primary/conflicting user intents, where friction stays vs. goes
> 2. Behavioral design: how hierarchy, disclosure, and motion guide decisions before users consciously choose
> 3. Interface systems: navigation logic, form design, all feedback states with behavioral intent
> 4. Edge cases: empty states, incomplete data, error recovery
> 5. Skill-level adaptation: what changes for new vs. power users
> 6. Anti-patterns: 3–5 UX decisions that look correct but, damage user decision quality
>
> Output must read like a behavioral design brief, not a UX checklist.

### DESIGN OPS + FIGMA SYSTEMS BUILDER

> You are a Design Operations Specialist who builds Figma systems that survive team growth and product pivots. Convert [IDEA/DESIGN] into a scalable Figma system.
>
> **Rules:**
>
> - Treat Figma architecture as infrastructure, not craft
> - Optimize for onboarding speed, decision speed, zero-rework updates
> - Assume 3–10 designers, multiple surfaces, ongoing dev handoff
>
> **Deliver in this order:**
>
> 1. System architecture: file structure logic, layer hierarchy, where decisions are made once vs. where overrides are allowed
> 2. Component logic: composability rules, auto-layout philosophy, variant structure, what must never be overridden locally
> 3. Naming system: conventions for layers, components, variables, styles, plus the logic so new designers can extend it
> 4. Handoff infrastructure: what every spec must include, how states and edge cases are documented in-file
> 5. Maintenance protocol: how breaking changes are versioned, when to deprecate vs. extend
> 6. Onboarding standard: what new designers must know before touching the system, the 3 most common mistakes and how to prevent them
>
> Output must read like a systems spec, not a design handoff note.

## Handwritten prompts (unknown creator, notebook style)

### Build Your Brand Voice

> Study these 3 samples of my content: [paste].
>
> Define my brand voice in clear terms: tone, vocabulary I use, topics I own, how I open posts, how I close them.
>
> Then write me a brand voice guide I can paste into any AI tool so every piece of content sounds like me, not a robot.

### Make Your Data Tell You What to Do

> You're a social media analyst. Here's my data: [paste]. Tell me what's working, what's killing my reach, where my content gaps are, how often I should post, and a 90-day growth plan with clear KPIs. Be specific.

## AI art / KDP publishing (@drewskidigital)

### Prompt 4 — AI Art Prompt Builder

> Paste a page concept from Slide 3 into this prompt. The AI will convert it into a professional illustration prompt ready for image generation.
>
> _"Turn this coloring page idea into a detailed AI art prompt for Leonardo or Midjourney. Make it clean line art, black and white, centered composition, high contrast, printable 8.5x11."_
>
> **Result you get:** high quality coloring pages, consistent design style, production in minutes instead of weeks.

### Prompt 5 — Book Structure Prompt

> _"Create a full structure for a 50-page coloring book including cover title ideas, subtitle ideas, page order, bonus pages, and back cover hook."_
>
> **How to use it:** Run this after generating your pages. It helps you organize the book professionally before uploading to Canva or KDP.
>
> **Result you get:** professional book layout, strong branding, higher conversion potential.

---

# Observations & recommendations

1. **Heavy duplication** between @okaashish and @evolving.ai — both push identical "7 Hacks" (Caveman / Session Timing / PDF pre-condense / Compact Skill). Take one canonical variant per hack.
2. **Our CLAUDE.md already implements Hack #1 (Caveman)**. No action needed.
3. **Hack #5 (Session Timing)** is the most actionable non-coding tip — worth adopting behaviorally (send "hey" 2-3h before heavy sessions).
4. **Hack #6 (Compact Skill)** — consider codifying as a Claude skill or slash command (`/compact`) in `.claude/` if not already there; prompt is small and high-leverage for long sessions.
5. **Hack #4 (PDF pre-condense)** — relevant for dataset/design-doc ingestion. Already practiced indirectly via `game_cli.py validate-ecosystem-pack` and governance scripts.
6. **Code Review Graph** (github.com/tirth8205/code-review-graph) — worth a 15-min evaluation spike to see if it handles the Evo-Tactics polyglot monorepo (likely Python-only based on typical scope).
7. **Opus vs Sonnet routing** (@evolving.ai Hack #3) — our current setup auto-uses Opus 4.7; session opens could default to Sonnet for exploration/search tasks and promote to Opus only for deep architecture work.
8. **Roman.Knox Cowork tips (4 folders, master-template, connectors, Projects)** — these target Claude.ai web UI, not Claude Code CLI. Not directly applicable to our repo workflow; ignore unless we start using Claude.ai web for auxiliary work.
9. **Blue Viper / The Shift / Drew Huibregtse** prompts are pure generic AI role-play — save verbatim to a prompt library (`docs/incoming/` or similar) for ad-hoc use, but nothing is Claude-Code-specific.
10. **Noise**: only screenshot_170657 (cover) and the two handwritten brand-voice/data slides (5/8, 7/8) lack creator attribution but contain usable prompt text, so reclassified from noise → generic.

**Final count revision**: 9 Claude-specific, 19 generic, 2 noise (covers only).
