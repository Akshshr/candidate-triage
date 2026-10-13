# Candidate Triage

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project specifics

- What it is: a two-panel triage tool. 200 synthetic applicants across 10 AAC Clyde Space engineering roles on the left; one button has Jev (`typesafe/jev-router` on OpenRouter) sort them into Meet, Consider and Reject on the right.
- Roles: `data/roles.json`. Four come from the live careers page (Clarityloop board), six are inferred and marked `"source": "inferred"`.
- Applicants: `data/candidates.json`, generated once by `scripts/generate.mjs`. The intended fit for each applicant sits in `data/archetypes.json` and must never reach the judge or the UI.
- Verdicts live only in the open page. Every load starts with all 200 applicants unsorted; "Sort Candidates" calls Jev and sorts them live.
- `OPENROUTER_API_KEY` lives in `.env` (mode 600, gitignored, copied from `../qm/.env`). Never print it.
- No dependencies: `node server.mjs` on port 3400. Start it with `preview_start {name: "candidate-triage"}` from the workspace launch.json, never from Bash. Node lives at `~/.local/node/bin`.
- Styling follows `DESIGN.md` (derived from aac-clyde.space). Use the tokens at the top of `public/styles.css`; never use the AAC Clyde Space logo or imagery.
- No em dashes anywhere, including generated data.
