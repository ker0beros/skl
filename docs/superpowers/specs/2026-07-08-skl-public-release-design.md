# skl public release — design

**Date:** 2026-07-08
**Status:** approved — proceeding to implementation plan
**Author:** khairul

## Goal

Take `ker0beros/skl` from a private repo to a public-quality open-source
release. The four goals the maintainer set — real adoption, portfolio/showcase,
attracting contributors, and thought leadership — are all in scope, but the
chosen positioning is **"stay opinionated & deep"**: skl keeps its full,
opinionated stack (Spec Kit + Superpowers + the loop-engineering methodology)
and its manual install. We invest in **narrative, honesty about who it's for,
table-stakes OSS hygiene, and one scoped feature change** — not in lowering the
adoption barrier.

## Non-goals (explicitly out of scope)

These were considered and deliberately rejected to preserve the opinionated
positioning:

- **No plugin-marketplace / one-command install.** The manual pull-and-`rsync`
  install stays.
- **No "lite" mode** and **no dependency reduction.** Spec Kit + Superpowers +
  loop-engineering remain required.
- **No new agents, gates, or loop features.** The 8-agent panel and the pipeline
  are unchanged.
- **No unrelated refactoring** of the skills beyond what the two workstreams
  below require.

## The value proposition (what a public reader should grasp in one breath)

> **skl turns Claude Code into a disciplined software factory: a curated ticket
> queue in, reviewable PRs out — one ticket at a time, behind an adversarial
> 8-agent QA panel, and it never merges for you.**
>
> Tagline: *agentic coding with the guardrails on.*

The four differentiators the README must foreground:

1. **Guardrails are the product.** Human-gated, PR-not-merge,
   one-ticket-per-run, readiness-gated, strictness slider — the deliberate
   anti-YOLO.
2. **Adversarial maker/checker QA panel** with a 0-findings bar, including a
   `skl-test-integrity-auditor` that catches the agent gaming its own tests.
3. **Grounded in a named methodology** (loop-engineering L1→L2→L3, cost
   budgeting, readiness scoring) — credibility, not vibes.
4. **Durable & provider-agnostic** — resumes across usage caps / crashes /
   `/clear`; GitHub / GitLab / Jira ticketing.

---

## Workstream 1 — Public-release readiness (docs & hygiene, no behavior change)

### 1.1 LICENSE (required)

Add `LICENSE` at repo root: **MIT**, copyright holder "khairul", year 2026.

### 1.2 Scrub personal data from shipped files

- `skills/skl-telegram/resources/notify-telegram.sh:13,16` — remove the
  hardcoded personal fallback path `~/Documents/ResidenC/.env` (both the comment
  on line 13 and the `for` loop entry on line 16). Keep the generic fallbacks
  (`$PWD/.env`, `~/.config/claude/.env`, `~/.config/claude/telegram.env`).
- Keep `author: "khairul"` frontmatter as-is (maintainer's choice).

### 1.3 De-privatize install/update language

The repo will be public, so plain `git clone https://github.com/ker0beros/skl`
works with no auth. Update:

- `README.md:235` — drop "(the repo is private)"; the install one-liner should
  no longer imply `gh`-auth is required (still fine to use `gh` if present, but
  plain `git clone` is the baseline).
- `skills/skl-update/SKILL.md:5` — remove "private ker0beros/skl repo" framing.
- `skills/skl-update/SKILL.md:42` — remove "(the repo is **private** — this uses
  your…)" note.

Verification: `git grep -i private -- README.md skills/` returns nothing about
the repo being private.

### 1.4 README repositioning

Keep the existing deep reference (it's a genuine asset for the portfolio /
contributor goals) but **restructure so the lede lands first**:

1. One-line pitch + tagline (above).
2. **"What you get" in ~5 lines** — the four differentiators, terse.
3. **"Is this for you?"** filter — the honest include/exclude:
   - *For you if:* you write specs (or want to), work in a real repo with review
     discipline, and want Claude Code to grind a backlog into PRs you trust
     enough to review — not to babysit.
   - *Not for you if:* you want to one-shot a script, prototype fast, or have the
     agent merge to `main` unattended. skl deliberately refuses to.
4. The existing label-lifecycle diagram, pulled up near the top.
5. **A worked example** — a short text walkthrough of `ticket → /skl-do → PR`
   (file an issue, label `loop-ready`, run `/skl-do`, review the PR, merge).
   Highest-leverage "value to others" asset because it *shows* the guardrails.
6. Everything currently in the README (the per-command reference, prerequisites,
   install, credits) follows below, lightly edited for the `--auto` removal and
   the de-privatization.

### 1.5 Contributor table-stakes

- `CONTRIBUTING.md` — how to propose changes, the VERSION + CHANGELOG release
  rule (already in `CLAUDE.md`), how skills/agents are structured, and that skl
  dogfoods its own flow.
- `.github/ISSUE_TEMPLATE/` — a bug template and a feature/skill-idea template.
- Optional `SECURITY.md` — the secrets posture is already strong (creds in a
  git-ignored `.env`, no-echo prompt, agent hook-blocked from reading `.env`);
  document it and give a private disclosure contact.

---

## Workstream 2 — Retire `--auto`, drive unattended mode from the environment

### Rationale

`--auto` is a per-invocation flag that skips the clarify questions and the human
spec-review gate and changes readiness routing. For a public audience,
"auto / zero-prompt" reads as "let it rip," undercutting the guardrails pitch —
and a human can type it interactively and skip their own gates. Autonomy should
be a property of the **environment** (a cloud/scheduled run has no human),
not a flag a human passes.

### Design

Replace the `--auto` flag with an **interactive-vs-unattended context
detection** at a single decision point in `/skl-do`:

- **Default: interactive.** All human gates fire — `speckit-clarify` questions,
  the spec-review approval gate, and `AskUserQuestion` prompts for
  `needs-info` / `needs-human`. Full guardrails.
- **Unattended** when a non-interactive context is detected. In that mode,
  `/skl-do` behaves exactly as the old `--auto` branch did: pick the better fit
  on ambiguity, skip the spec-review gate, and route `needs-info` /
  `needs-human` tickets via labels + comments instead of an interactive prompt.

**Detection contract (concrete, no TBD):**

- **Explicit marker (the contract):** the environment variable
  **`SKL_UNATTENDED=1`** ⇒ unattended. This is the direct, reliable replacement
  for the flag — a cloud/scheduled/CI job exports it once in its environment; an
  interactive human never sets it. Documented as the supported way to run skl
  unattended.
- **Harness-native auto-detect (enhancement):** additionally treat the run as
  unattended if a Claude Code non-interactive signal is present (headless /
  print-mode / scheduled-routine). The *exact* env var(s) Claude Code exposes
  for this will be confirmed during planning (via the claude-code-guide agent /
  docs) and wired in; the `SKL_UNATTENDED` contract stands regardless, so this
  is strictly additive.
- **Default when neither is present: interactive.** The safe default — if unsure,
  prompt.

### Files to change

- `skills/skl-do/SKILL.md` — remove `--auto` from the `description`,
  `argument-hint`, the flag definition (`:22`), and the branch notes
  (`:105,134,142,146,220,235`); replace with the interactive-vs-unattended
  detection and reference `SKL_UNATTENDED`.
- `skills/skl-do/resources/pickup-loop.md:181,185` — same reframing.
- `skills/skl-do/resources/readiness-check.md:104–126` — the `--auto` vs
  interactive branches become unattended vs interactive branches; behavior
  unchanged, trigger changed.
- `skills/skl-do/resources/state-template.md:13` — stop recording `Flags: --auto`;
  record the detected mode (or nothing) so `/skl-resume` re-enters the same mode.
  Resume must re-detect (or persist) unattended so an interrupted cloud run
  resumes unattended, not stuck at a gate.
- `skills/skl-resume/SKILL.md:63` — update the `Flags:` re-invoke note to the new
  mode handling.
- `README.md:85` and the `/skl-do` row (`:33`) — remove `--auto`; document the
  `SKL_UNATTENDED` env var for unattended runs.

### Versioning

**Decision: minor → 2.4.0.** The unattended *capability* is preserved (via
`SKL_UNATTENDED`), so this is not a loss of function — `--auto` was a niche,
deep-in-the-skill flag, not a breaking loss. Bump `VERSION` to `2.4.0` and
add a top `## 2.4.0 — 2026-07-08` section to `CHANGELOG.md` with a bullet per
user-visible change (LICENSE, README repositioning, `--auto`→`SKL_UNATTENDED`,
de-privatization, personal-path scrub, CONTRIBUTING/templates), and a short
**migration note**: "`/skl-do --auto` → set `SKL_UNATTENDED=1` in the run's
environment."

---

## Verification

- **Leak scan:** `git grep -niE "ResidenC|/Users/khairulazmi" -- skills agents`
  returns nothing; `git grep -i private -- README.md skills/` says nothing about
  the repo being private.
- **`--auto` gone:** `git grep -n "\-\-auto" -- skills README.md` returns
  nothing; `SKL_UNATTENDED` is documented in `README.md` and `skl-do/SKILL.md`.
- **Interactive still gates:** a dry read-through (or a real `/skl-do` on a
  throwaway ticket with `SKL_UNATTENDED` unset) confirms the clarify + spec-review
  gates fire.
- **Unattended proceeds:** with `SKL_UNATTENDED=1` set, the same path auto-proceeds
  (skips spec-review, routes needs-info/needs-human via labels). Verified by
  reading the resolved skill logic end-to-end; a full cloud run is out of scope
  for this change.
- **LICENSE present**, `CONTRIBUTING.md` present, issue templates render on
  GitHub.
- **VERSION bumped + CHANGELOG** has a matching dated section (repo release rule).

## Rollout

Single release on a `skl-do/`-style branch → PR → maintainer merges → flip the
GitHub repo visibility to public. Workstreams 1 and 2 ship together as one
version so `/skl-update` shows a coherent changelog.
