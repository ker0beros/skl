# skl Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take `ker0beros/skl` from private to a public-quality OSS release — MIT license, honest repositioned README, contributor scaffolding, personal-data scrub, de-privatized install language, and the `--auto` flag replaced by an environment-driven unattended mode.

**Architecture:** Two workstreams shipping as one version (2.4.0). Workstream 1 is docs/hygiene with no behavior change. Workstream 2 replaces the `--auto` flag with a single environment trigger, `SKL_UNATTENDED=1`: interactive runs are always fully gated; a run is unattended only when that variable is set (which a cloud/scheduled/CI job exports in its environment, never a human at a prompt). Work on a feature branch off the current branch; the whole thing lands as one PR so `/skl-update` shows a coherent changelog.

**Tech Stack:** Markdown skill/agent files, a Bash notifier script, plain-text `VERSION` + `CHANGELOG.md`. No application code, no test runner — verification is `git grep` invariant checks plus logical read-through of the resolved skill instructions.

## Global Constraints

- **Repo release rule (from `CLAUDE.md`):** any change to `skills/` or `agents/` that lands on `main` MUST bump root `VERSION` (semver) and add a matching `## <version> — <YYYY-MM-DD>` section at the TOP of `CHANGELOG.md`, one bullet per user-visible change. This release: **`VERSION` → `2.4.0`**, dated **2026-07-08**.
- **Do NOT touch loop-engineering "unattended" wording** in `agents/skl-guideline-auditor.md:39` or `skills/skl-init/SKILL.md:67` — those refer to the methodology's L3 autonomy level, not the `--auto` flag. Out of scope.
- **Keep `author: "khairul"`** in all skill/agent frontmatter — maintainer's choice, unchanged.
- **Preserve behavior in Workstream 2** — the unattended branch must behave exactly as the old `--auto` branch did (skip clarify questions + spec-review gate; route needs-info/needs-human via labels+comments). Only the *trigger* changes: `--auto` flag → `SKL_UNATTENDED=1` env var.
- **`SKL_UNATTENDED` is the sole trigger.** No speculative harness auto-detection. Default when unset: interactive (fully gated).
- **Verification is grep + read-through**, not a test runner. Every task ends with a concrete `git grep` (or `test -f`) check with expected output, then a commit.

## File Structure

Files created or modified, by responsibility:

- **Create** `LICENSE` — MIT text (Task 1).
- **Modify** `skills/skl-telegram/resources/notify-telegram.sh` — drop the personal `~/Documents/ResidenC/.env` fallback (Task 2).
- **Modify** `skills/skl-update/SKILL.md` — remove "private repo" framing (Task 3).
- **Modify** `README.md` — de-privatize install (Task 3); remove `--auto`, document `SKL_UNATTENDED` (Task 4); reposition the top with pitch + "is this for you?" + worked example (Task 5).
- **Modify** `skills/skl-do/SKILL.md` + `resources/pickup-loop.md` + `resources/readiness-check.md` + `resources/state-template.md`, and `skills/skl-resume/SKILL.md` — replace `--auto` with `SKL_UNATTENDED`/unattended-mode (Task 4).
- **Create** `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/bug.md`, `.github/ISSUE_TEMPLATE/idea.md`, `SECURITY.md` (Task 6).
- **Modify** `VERSION`, `CHANGELOG.md` (Task 7).

Task order minimizes README anchor drift: the surgical README edits (Task 3, Task 4) run before the top-of-file restructure (Task 5). Task 7 (version/changelog) is last so it captures every user-visible change.

---

### Task 1: Add MIT LICENSE

**Files:**
- Create: `LICENSE`

**Interfaces:**
- Consumes: nothing.
- Produces: a repo-root `LICENSE` file GitHub will detect as MIT.

- [ ] **Step 1: Create the LICENSE file**

Create `LICENSE` with exactly this content:

```text
MIT License

Copyright (c) 2026 khairul

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Verify the file exists and reads as MIT**

Run: `test -f LICENSE && head -1 LICENSE`
Expected: prints `MIT License`

- [ ] **Step 3: Commit**

```bash
git add LICENSE
git commit -m "chore: add MIT LICENSE"
```

---

### Task 2: Scrub the personal path from the Telegram notifier

**Files:**
- Modify: `skills/skl-telegram/resources/notify-telegram.sh:13,16`

**Interfaces:**
- Consumes: nothing.
- Produces: a notifier whose creds-resolution list contains no personal paths — only `$PWD/.env`, `~/.config/claude/.env`, `~/.config/claude/telegram.env`.

- [ ] **Step 1: Remove the ResidenC comment line**

In `skills/skl-telegram/resources/notify-telegram.sh`, delete this line (line 13):

```text
#   4. ~/Documents/ResidenC/.env       (legacy fallback)
```

- [ ] **Step 2: Remove the ResidenC entry from the resolution loop**

Change line 16 from:

```bash
for _f in "$PWD/.env" "$HOME/.config/claude/.env" "$HOME/.config/claude/telegram.env" "$HOME/Documents/ResidenC/.env"; do
```

to:

```bash
for _f in "$PWD/.env" "$HOME/.config/claude/.env" "$HOME/.config/claude/telegram.env"; do
```

- [ ] **Step 3: Verify no personal path remains**

Run: `git grep -nI "ResidenC" -- skills agents README.md CONTRIBUTING.md 2>/dev/null || echo CLEAN`
Expected: `CLEAN` (no matches)

- [ ] **Step 4: Verify the script is still syntactically valid**

Run: `bash -n skills/skl-telegram/resources/notify-telegram.sh && echo OK`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add skills/skl-telegram/resources/notify-telegram.sh
git commit -m "chore(skl-telegram): drop personal .env fallback path from notifier"
```

---

### Task 3: De-privatize install/update language

**Files:**
- Modify: `README.md:235`
- Modify: `skills/skl-update/SKILL.md:5,42`

**Interfaces:**
- Consumes: nothing.
- Produces: install/update docs that reflect a public repo (plain `git clone` works; `gh` optional).

- [ ] **Step 1: Fix the README install sentence**

In `README.md`, change line 235 from:

```text
`.claude/` — there is no install script. Uses your existing git/GitHub auth (the repo is private). From
```

to:

```text
`.claude/` — there is no install script. A plain `git clone` works (public repo); `gh` is used only if present. From
```

- [ ] **Step 2: Fix the skl-update `compatibility` frontmatter**

In `skills/skl-update/SKILL.md`, change line 5 from:

```text
compatibility: "Uses your existing git/GitHub auth to reach the private ker0beros/skl repo (gh CLI for the first clone, git fetch thereafter). Syncs the skill + agent files directly and preserves project.config.md. Needs git + gh."
```

to:

```text
compatibility: "Clones/pulls the public ker0beros/skl repo (gh CLI for the first clone if present, else git clone; git fetch thereafter). Syncs the skill + agent files directly and preserves project.config.md. Needs git (gh optional)."
```

- [ ] **Step 3: Fix the skl-update clone-step note**

In `skills/skl-update/SKILL.md`, change line 42 from:

```text
   - Else → `gh repo clone ker0beros/skl ~/.skl` (the repo is **private** — this uses your
     `gh` auth; if it fails, surface the real error / tell the user to `gh auth login` rather than
     guessing). Treat `OLD` as empty (fresh clone).
```

to:

```text
   - Else → `gh repo clone ker0beros/skl ~/.skl` if `gh` is present, otherwise
     `git clone https://github.com/ker0beros/skl ~/.skl` (public repo — no auth needed). If it fails,
     surface the real error rather than guessing. Treat `OLD` as empty (fresh clone).
```

- [ ] **Step 4: Verify no "private repo" language remains**

Run: `git grep -niE "repo is (\*\*)?private|private ker0beros" -- README.md skills/ || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 5: Bump the skl-update skill version (doc-only change)**

In `skills/skl-update/SKILL.md`, change the `metadata.version` line from `version: "1.3.0"` to `version: "1.3.1"`.

- [ ] **Step 6: Commit**

```bash
git add README.md skills/skl-update/SKILL.md
git commit -m "docs: de-privatize install/update language for public repo"
```

---

### Task 4: Replace `--auto` with the `SKL_UNATTENDED` environment trigger

This is one cohesive change across six files. A half-applied `--auto` removal is broken, so all edits land in a single task and commit, verified by a repo-wide "no `--auto`" grep.

**Files:**
- Modify: `skills/skl-do/SKILL.md:3,4,8,22,105,134,142,146,220,235`
- Modify: `skills/skl-do/resources/pickup-loop.md:181,185`
- Modify: `skills/skl-do/resources/readiness-check.md:104,110,114,117,122,126`
- Modify: `skills/skl-do/resources/state-template.md:13`
- Modify: `skills/skl-resume/SKILL.md:63`
- Modify: `README.md:33,85`

**Interfaces:**
- Consumes: nothing.
- Produces: the **unattended-mode contract** the whole skill now shares —
  - Mode resolution: on a **fresh** run (no in-flight ticket in `.skl-do/state.md`), `unattended = (env var SKL_UNATTENDED == "1")`; record it in state as `Unattended: yes|no`. On a **resume** (in-flight ticket present), read `Unattended:` from state (fall back to the env var if the line is absent, for older state files).
  - Unattended behavior == the former `--auto` behavior: skip clarify questions, skip the spec-review gate, pick best-fit on ambiguous classification, route needs-info/needs-human via labels+comments (no interactive prompt), suppress await-input Telegram pings.
  - Interactive (default) behavior: all gates fire.

- [ ] **Step 1: Rewrite the `--auto` clause in the skl-do `description` frontmatter**

In `skills/skl-do/SKILL.md` line 3, find this fragment inside the `description`:

```text
On start-up it resumes any loop-in-progress ticket before claiming a new one. Flag: --auto (zero-prompt build: skip clarification + the spec-review gate). Never auto-advances to the next ticket and never auto-merges."
```

Replace with:

```text
On start-up it resumes any loop-in-progress ticket before claiming a new one. Unattended runs (env SKL_UNATTENDED=1, set by a cloud/scheduled/CI job) skip clarification + the spec-review gate and route needs-info/needs-human via labels; interactive runs are fully gated. Never auto-advances to the next ticket and never auto-merges."
```

- [ ] **Step 2: Rewrite the `argument-hint`**

In `skills/skl-do/SKILL.md` line 4, change:

```text
argument-hint: "(optional) an issue number e.g. '#42' (that exact ticket) — empty = the OLDEST open loop-ready issue; add --auto for a zero-prompt build. Does ONE ticket, opens a PR, then STOPS."
```

to:

```text
argument-hint: "(optional) an issue number e.g. '#42' (that exact ticket) — empty = the OLDEST open loop-ready issue. Set env SKL_UNATTENDED=1 for an unattended (zero-prompt) build. Does ONE ticket, opens a PR, then STOPS."
```

- [ ] **Step 3: Bump the skl-do skill version**

In `skills/skl-do/SKILL.md` line 8, change `version: "1.2.0"` to `version: "1.3.0"`.

- [ ] **Step 4: Rewrite the flag-parsing bullet in "User Input"**

In `skills/skl-do/SKILL.md`, replace the bullet at lines 22–23:

```text
- **`--auto`** → zero-prompt build: skip the spec-clarification questions **and** the human
  spec-review gate, and proceed with the recommended defaults; suppress await-input Telegram pings.
```

with (note: this describes an environment mode, not a parsed argument):

```text
- **Unattended mode** is set by the environment, not an argument: if **`SKL_UNATTENDED=1`** is set
  (a cloud/scheduled/CI job exports it; a human never does), the build runs zero-prompt — skip the
  spec-clarification questions **and** the human spec-review gate, proceed with the recommended
  defaults, and suppress await-input Telegram pings. Default (unset) is fully interactive/gated.
  On a resume, the mode recorded in `.skl-do/state.md` (`Unattended:`) wins so a cloud run resumes
  unattended.
```

- [ ] **Step 5: Fix the classification ambiguity line (Phase 0 step 5)**

In `skills/skl-do/SKILL.md` line 105, change:

```text
   without `--auto` ask once; with `--auto` pick the better fit.
```

to:

```text
   interactive → ask once; unattended → pick the better fit.
```

- [ ] **Step 6: Fix the clarify-skip note (Phase A step 8)**

In `skills/skl-do/SKILL.md` line 134, change:

```text
   `spec.md`. Then `speckit-clarify` (skip its questions under `--auto`). *Design mode:* capture the
```

to:

```text
   `spec.md`. Then `speckit-clarify` (skip its questions when unattended). *Design mode:* capture the
```

- [ ] **Step 7: Fix the spec-review gate heading (Phase A step 10)**

In `skills/skl-do/SKILL.md` line 142, change:

```text
10. **Spec-review gate — STOP for approval** *(skipped under `--auto`)*. Checkpoint `phase: spec-review`.
```

to:

```text
10. **Spec-review gate — STOP for approval** *(skipped when unattended)*. Checkpoint `phase: spec-review`.
```

- [ ] **Step 8: Fix the spec-review gate proceed note (Phase A step 10)**

In `skills/skl-do/SKILL.md` line 146, change:

```text
    Only **Proceed** enters Phase B. (Under `--auto`, proceed directly.)
```

to:

```text
    Only **Proceed** enters Phase B. (When unattended, proceed directly.)
```

- [ ] **Step 9: Fix the "Two human gates" invariant**

In `skills/skl-do/SKILL.md` line 219–220, change:

```text
- **Two human gates + the QA panel.** `loop-ready` intake, the **spec-review gate** (Phase A step 10,
  skipped under `--auto`), and the PR merge — plus the 8-agent QA panel gating each build round.
```

to:

```text
- **Two human gates + the QA panel.** `loop-ready` intake, the **spec-review gate** (Phase A step 10,
  skipped when unattended), and the PR merge — plus the 8-agent QA panel gating each build round.
```

- [ ] **Step 10: Fix the Telegram invariant**

In `skills/skl-do/SKILL.md` line 233–235, change:

```text
- **Telegram** prefix `[<project>]` (repo basename); ping on the spec-review gate (await), on each
  failing iteration, and on PR / defer / needs-info / needs-human / systemic failure; suppress await pings under
  `--auto`; skip silently if `~/.claude/notify-telegram.sh` is absent.
```

to:

```text
- **Telegram** prefix `[<project>]` (repo basename); ping on the spec-review gate (await), on each
  failing iteration, and on PR / defer / needs-info / needs-human / systemic failure; suppress await pings when
  unattended; skip silently if `~/.claude/notify-telegram.sh` is absent.
```

- [ ] **Step 11: Add the mode-resolution rule to Phase 0**

In `skills/skl-do/SKILL.md`, in the "Parse from the input" area right after the User Input bullets (immediately before the `Empty input (no number) →` line at line 25), the mode bullet from Step 4 already documents resolution. Additionally, at Phase 0 where the run starts (the numbered steps begin around line 100 — the select step), add mode detection as the first action. Insert a new sentence at the start of Phase 0's step flow. Concretely, find the "5. **Classify**" line (line 103) and ensure the mode is resolved before it by adding this as a new step right after the ticket is selected and before classify — add these two lines immediately above line 103 (`5. **Classify** ...`), renumbering is not needed since it's woven into the existing prose; insert:

```text
   **Resolve run mode first.** `unattended = (SKL_UNATTENDED == "1")` on a fresh run; on a resume,
   the `Unattended:` value in `.skl-do/state.md` wins. Record `Unattended: yes|no` at the first
   checkpoint write. All "unattended" branches below key off this.
```

(If the surrounding numbering makes a clean insertion point unclear at implementation time, place the paragraph at the end of the Phase 0 select step so it is resolved before Classify — the requirement is only that mode is resolved before step 5.)

- [ ] **Step 12: Fix `pickup-loop.md` ambiguity + zero-prompt lines**

In `skills/skl-do/resources/pickup-loop.md` line 181, change:

```text
- Ambiguous → without `--auto`, ask once; with `--auto`, pick the better fit (new behavior ⇒ feature
```

to:

```text
- Ambiguous → interactive, ask once; unattended, pick the better fit (new behavior ⇒ feature
```

And line 185, change:

```text
build runs. Under `--auto` the build runs zero-prompt (skip clarification + the spec-review gate).
```

to:

```text
build runs. When unattended (SKL_UNATTENDED=1) the build runs zero-prompt (skip clarification + the spec-review gate).
```

- [ ] **Step 13: Fix `readiness-check.md` routing headings**

In `skills/skl-do/resources/readiness-check.md`, change these six branch labels (behavior unchanged, trigger reworded):
- Line 104 `- **`needs-info` + `--auto`** →` → `- **`needs-info`, unattended** →`
- Line 110 `- **`needs-info`, interactive (no `--auto`)** →` → `- **`needs-info`, interactive** →`
- Line 114 `  - **Route to needs-info** → the `--auto` path above.` → `  - **Route to needs-info** → the unattended path above.`
- Line 117 `- **`needs-human` + `--auto`** → same shape, one hop over: flip ...` → `- **`needs-human`, unattended** → same shape, one hop over: flip ...`
- Line 122 `- **`needs-human`, interactive (no `--auto`)** →` → `- **`needs-human`, interactive** →`
- Line 126 `  - **Route to loop-human** → the `--auto` path above.` → `  - **Route to loop-human** → the unattended path above.`

- [ ] **Step 14: Fix `state-template.md` — record mode, not the flag**

In `skills/skl-do/resources/state-template.md` line 13, change:

```text
Flags: --auto         # whichever were passed (verbatim, for a clean /skl-resume re-invoke)
```

to:

```text
Unattended: no        # yes if SKL_UNATTENDED was set — /skl-resume honors this so a cloud run resumes unattended
```

- [ ] **Step 15: Fix `skl-resume/SKILL.md` — re-invoke without the flag**

In `skills/skl-resume/SKILL.md` line 62–65, change:

```text
5. **Continue.** Re-invoke **`/skl-do <same flags from the checkpoint>`** via the **Skill tool** (pass the
   `Flags:` recorded in `.skl-do/state.md`, e.g. `--auto`). `/skl-do` re-reads `.skl-do/state.md` + the
   `loop-in-progress` label and continues the **same** ticket from its checkpointed `phase` / `iteration`
   / `last_step` — it does not restart the ticket. Fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-resume ▶ continuing /skl-do #<n> (<phase> iter <iteration>)"`.
```

to:

```text
5. **Continue.** Re-invoke **`/skl-do`** via the **Skill tool** (no flags needed). `/skl-do` re-reads
   `.skl-do/state.md` + the `loop-in-progress` label and continues the **same** ticket from its
   checkpointed `phase` / `iteration` / `last_step` — it does not restart the ticket. The recorded
   `Unattended:` value in the checkpoint restores the run mode (a cloud run resumes unattended even if
   the env var is not re-exported). Fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-resume ▶ continuing /skl-do #<n> (<phase> iter <iteration>)"`.
```

- [ ] **Step 16: Fix the README `/skl-do` command row**

In `README.md` line 33, change the input column `(optional) **`#N`**; `--auto`` — replace the ``; `--auto`` portion so the cell reads:

```text
| **`/skl-do`** | (optional) **`#N`** | Works **one** ticket, then stops.
```

(Only the input-column cell changes: `(optional) **`#N`**; `--auto`` → `(optional) **`#N`**`. Leave the rest of the row's description text as-is.)

- [ ] **Step 17: Fix the README `/skl-do` usage block**

In `README.md` lines 83–86, change:

```text
/skl-do             # the OLDEST open loop-ready issue, then stop
/skl-do #42         # work just issue #42, then stop
/skl-do --auto      # zero-prompt build
```

to:

```text
/skl-do             # the OLDEST open loop-ready issue, then stop
/skl-do #42         # work just issue #42, then stop
SKL_UNATTENDED=1 /skl-do   # unattended (zero-prompt) build — for cloud/scheduled/CI runs
```

- [ ] **Step 18: Verify `--auto` is gone everywhere and `SKL_UNATTENDED` is documented**

Run: `git grep -nI -- '--auto' skills README.md || echo NO-AUTO`
Expected: `NO-AUTO`

Run: `git grep -lI "SKL_UNATTENDED" skills README.md`
Expected: lists at least `README.md`, `skills/skl-do/SKILL.md`, `skills/skl-do/resources/pickup-loop.md`, `skills/skl-do/resources/state-template.md`

- [ ] **Step 19: Read-through verification of the two paths**

Read `skills/skl-do/SKILL.md` steps 5, 8, 10 and `resources/readiness-check.md` and confirm by inspection:
- With `SKL_UNATTENDED` unset: clarify questions run (step 8), the spec-review gate STOPS for approval (step 10), needs-info/needs-human fire an `AskUserQuestion` (readiness-check interactive branches).
- With `SKL_UNATTENDED=1`: clarify skipped, spec-review skipped ("proceed directly"), needs-info/needs-human route via labels+comments then STOP (readiness-check unattended branches).

Expected: both paths are internally consistent; no dangling reference to a `--auto` argument.

- [ ] **Step 20: Commit**

```bash
git add skills/skl-do/SKILL.md skills/skl-do/resources/pickup-loop.md skills/skl-do/resources/readiness-check.md skills/skl-do/resources/state-template.md skills/skl-resume/SKILL.md README.md
git commit -m "feat(skl-do): drop --auto flag; unattended mode via SKL_UNATTENDED env"
```

---

### Task 5: Reposition the README top (pitch + who-it's-for + worked example)

**Files:**
- Modify: `README.md:1-10` (replace the dense opening paragraph)
- Modify: `README.md` (insert a worked-example section after the flow table, before `## /skl-init`)

**Interfaces:**
- Consumes: nothing.
- Produces: a README whose lede lands in one breath, with an honest audience filter and a concrete run walkthrough. No information is lost — the Spec Kit / loop-engineering detail from the old opening paragraph is already covered in `## Prerequisites` and `## Credits`.

- [ ] **Step 1: Replace the dense opening paragraph with the pitch + "what you get" + "is this for you?"**

In `README.md`, replace lines 1–10 (the `# skl` heading through the end of the opening paragraph that ends `...baked into the loop and the constitution.`) with:

```markdown
# skl

**Agentic coding with the guardrails on.** skl turns Claude Code into a disciplined software
factory: a curated ticket queue in, reviewable PRs out — one ticket at a time, behind an
adversarial 8-agent QA panel, and it never merges for you.

Built on [Spec Kit](https://github.com/github/spec-kit) and the
[loop-engineering](https://github.com/cobusgreyling/loop-engineering) methodology (see
[Prerequisites](#prerequisites-on-the-target-project) and [Credits](#credits)).

## What you get

- **Guardrails are the product** — human-gated, PR-not-merge, one-ticket-per-run, readiness-gated,
  strictness slider. The deliberate anti-YOLO.
- **An adversarial QA panel** — 8 independent gate agents at a **0-findings** bar, including a
  test-integrity auditor that catches the agent gaming its own tests.
- **Grounded in a methodology** — the loop-engineering framework (phased **L1→L2→L3** autonomy, cost
  budgeting, readiness scoring), not vibes.
- **Durable & provider-agnostic** — resumes across usage caps / crashes / `/clear`; files tickets on
  **GitHub / GitLab / Jira**.

## Is this for you?

**Yes, if** you write specs (or want to), work in a real repo with review discipline, and want Claude
Code to grind a backlog into PRs you trust enough to review — not to babysit.

**No, if** you want to one-shot a script, prototype fast, or have the agent merge to `main`
unattended. skl deliberately refuses to — that's the point.
```

- [ ] **Step 2: Add a worked-example section after the flow table**

In `README.md`, find the paragraph that ends the `## The flow` section — the sentence beginning `The build loop chains the individual `speckit-*` skills ... skl-debugger` turns the findings into the next iteration's plan.` (currently lines 40–43). Immediately **after** that paragraph and **before** `## `/skl-init` — first-time setup`, insert:

````markdown
## A worked example

```bash
# 1. File a ticket (or label an existing issue)
/skl-ticket add a --json flag to the export command
#    → review the draft, pick Create; it's filed and proposed as loop-ready

# 2. You approve the queue — confirm the label is `loop-ready` (this is the human gate)

# 3. Build it
/skl-do
#    → claims the oldest loop-ready issue → specify → clarify → (you approve the spec)
#      → plan → implement → the 8-agent QA panel loops until 0 findings
#      → opens a PR that `Closes` the issue, then STOPS

# 4. You review the PR and merge it. Re-run /skl-do for the next ticket.
```

At no point does skl merge for you or advance to the next ticket on its own — the `loop-ready` queue
and the PR merge are yours. For an unattended build (cloud / scheduled / CI, no human at the prompt),
export `SKL_UNATTENDED=1` before `/skl-do`.
````

- [ ] **Step 3: Verify the new sections are present and internal anchors resolve**

Run: `git grep -n "Agentic coding with the guardrails on" README.md && git grep -n "## What you get" README.md && git grep -n "## Is this for you" README.md && git grep -n "## A worked example" README.md`
Expected: one line each.

Run: `git grep -c "^# skl$" README.md`
Expected: `1` (still exactly one top-level heading)

- [ ] **Step 4: Verify no dangling reference to the removed opening paragraph's unique claims**

Read the `## Prerequisites` and `## Credits` sections and confirm the loop-engineering L1→L2→L3 / five-building-blocks detail still appears there (so nothing was lost by trimming the opener).
Expected: both sections still describe loop-engineering; confirmed by inspection.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: reposition README lede — pitch, audience filter, worked example"
```

---

### Task 6: Contributor scaffolding (CONTRIBUTING, issue templates, SECURITY)

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `.github/ISSUE_TEMPLATE/bug.md`
- Create: `.github/ISSUE_TEMPLATE/idea.md`
- Create: `SECURITY.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the standard OSS contributor entry points GitHub surfaces (new-issue chooser, "Contributing" link, "Security" tab).

- [ ] **Step 1: Create `CONTRIBUTING.md`**

```markdown
# Contributing to skl

Thanks for your interest. skl is an opinionated, spec-driven, QA-gated ticket runner for Claude Code —
contributions that sharpen that opinion are welcome; ones that dilute the guardrails (auto-merge,
multi-ticket auto-driving, skipping human gates) are not.

## What skl is (and isn't)

- **Is:** a human-gated, one-ticket-at-a-time loop that opens PRs and never merges them.
- **Isn't:** an unattended agent that ships to `main` on its own. See the README's "Is this for you?".

## Repo layout

- `skills/skl-*/SKILL.md` (+ `resources/`) — the slash commands.
- `agents/` — the 10 subagents (8 QA gates + `skl-debugger` + `skl-business-analyst`).
- `docs/superpowers/{specs,plans}/` — the design + implementation history (skl dogfoods its own flow).

## Release rule (required for any change to `skills/` or `agents/`)

Any change to `skills/` or `agents/` that lands on `main` MUST, in the same change:

1. Bump root `VERSION` (semver: wording/fix = patch, new behavior/skill/agent = minor,
   breaking workflow change = major).
2. Add a matching `## <version> — <YYYY-MM-DD>` section at the top of `CHANGELOG.md`, one bullet per
   user-visible change.

`/skl-update` reads both to show users what changed — an unbumped `VERSION` means they never see it.

## Proposing a change

1. Open an issue describing the change and why it fits skl's posture.
2. For anything non-trivial, skl dogfoods itself: brainstorm → spec (`docs/superpowers/specs/`) →
   plan (`docs/superpowers/plans/`) → implement.
3. Open a PR. Keep the diff focused; update the README/skill docs and the changelog in the same PR.
```

- [ ] **Step 2: Create `.github/ISSUE_TEMPLATE/bug.md`**

```markdown
---
name: Bug report
about: A skl command misbehaves
title: "[bug] "
labels: bug
---

**Command** (e.g. `/skl-do`, `/skl-init`):

**What happened:**

**What you expected:**

**Environment:** OS · Claude Code version · provider (GitHub/GitLab/Jira) · skl `VERSION`

**Relevant output / `.skl-do/state.md` excerpt (redact secrets):**
```

- [ ] **Step 3: Create `.github/ISSUE_TEMPLATE/idea.md`**

```markdown
---
name: Idea / skill request
about: Propose a new behavior, skill, or gate
title: "[idea] "
labels: enhancement
---

**The idea:**

**Why it fits skl's posture** (human-gated, PR-not-merge, spec-driven — see CONTRIBUTING.md):

**Which command(s) it touches:**

**Alternatives you considered:**
```

- [ ] **Step 4: Create `SECURITY.md`**

```markdown
# Security

## Secrets posture

skl never places secrets in the transcript. `/skl-telegram` stores your bot token + chat id in the
project-root `.env` (`chmod 600`, git-ignored) via a no-echo shell prompt you run yourself; the agent
is hook-blocked from reading `.env`. Creds for unattended/cloud runs live in that environment, never
in the repo.

## Reporting a vulnerability

Please report suspected vulnerabilities privately via GitHub's "Report a vulnerability" (Security tab)
rather than a public issue. We'll acknowledge and follow up.
```

- [ ] **Step 5: Verify the files exist**

Run: `for f in CONTRIBUTING.md SECURITY.md .github/ISSUE_TEMPLATE/bug.md .github/ISSUE_TEMPLATE/idea.md; do test -f "$f" && echo "OK $f" || echo "MISSING $f"; done`
Expected: four `OK` lines.

- [ ] **Step 6: Commit**

```bash
git add CONTRIBUTING.md SECURITY.md .github/ISSUE_TEMPLATE/
git commit -m "docs: add CONTRIBUTING, SECURITY, and issue templates"
```

---

### Task 7: Bump VERSION + add the CHANGELOG entry

Last, so it captures every user-visible change from Tasks 1–6. Both files must land in this same PR (release rule).

**Files:**
- Modify: `VERSION`
- Modify: `CHANGELOG.md` (insert at top, under the intro, above `## 2.3.0`)

**Interfaces:**
- Consumes: nothing.
- Produces: `VERSION` = `2.4.0` and a dated changelog section `/skl-update` will show.

- [ ] **Step 1: Bump VERSION**

Overwrite `VERSION` with exactly:

```text
2.4.0
```

- [ ] **Step 2: Insert the changelog section**

In `CHANGELOG.md`, insert this block immediately **before** the `## 2.3.0 — 2026-07-08` line (i.e. right after the intro paragraph that ends `... prints the sections newer than your installed version.`):

```markdown
## 2.4.0 — 2026-07-08

- **`/skl-do --auto` is removed** — unattended (zero-prompt) builds are now driven by the environment,
  not a flag. Set **`SKL_UNATTENDED=1`** in a cloud / scheduled / CI run to skip the clarify questions
  and the spec-review gate; interactive runs are always fully gated. **Migration:** replace
  `/skl-do --auto` with `SKL_UNATTENDED=1 /skl-do`. `/skl-resume` honors the mode recorded in the
  checkpoint, so an interrupted cloud run resumes unattended.
- **skl is now public** — added an MIT `LICENSE`, a `CONTRIBUTING.md`, a `SECURITY.md`, and GitHub
  issue templates; de-privatized the install/update docs (a plain `git clone` works, `gh` optional).
- **README repositioned** — leads with the pitch, an honest "is this for you?" filter, and a worked
  `ticket → /skl-do → PR` example.
- **Telegram notifier** no longer ships a personal `.env` fallback path.
```

- [ ] **Step 3: Verify VERSION and CHANGELOG agree**

Run: `head -1 VERSION && git grep -n "^## 2.4.0 — 2026-07-08$" CHANGELOG.md`
Expected: `2.4.0` then one match for the new heading.

- [ ] **Step 4: Commit**

```bash
git add VERSION CHANGELOG.md
git commit -m "chore: release 2.4.0"
```

---

## Self-Review

**Spec coverage** — every spec item maps to a task:
- 1.1 LICENSE → Task 1. 1.2 scrub personal path → Task 2 (+ keep `author` = Global Constraint).
  1.3 de-privatize → Task 3. 1.4 README repositioning → Task 5. 1.5 CONTRIBUTING/templates/SECURITY → Task 6.
- Workstream 2 (`--auto` → `SKL_UNATTENDED`, all six files, resume mode, versioning) → Task 4 + Task 7.
- Non-goals (no plugin install, no lite mode, no dep reduction, no new agents) → nothing in the plan adds these. ✓
- Verification section of the spec (leak scan, `--auto` gone, interactive-still-gates, unattended-proceeds, LICENSE/CONTRIBUTING present, VERSION+CHANGELOG) → covered by the per-task grep/read-through steps and Task 7. ✓

**Placeholder scan** — no `TBD`/`TODO`/"handle edge cases"; every edit shows exact old→new text; every created file shows full content. ✓

**Type/name consistency** — the shared contract names are used identically everywhere: env var `SKL_UNATTENDED` (value `1`), state key `Unattended:` (`yes|no`), the word "unattended" for the mode. No `--auto` survives (Task 4 Step 18 asserts it). The skl-do skill version is bumped once (1.2.0→1.3.0, Task 4 Step 3); skl-update once (1.3.0→1.3.1, Task 3 Step 5). ✓

**One judgment call left to the implementer:** Task 4 Step 11's exact insertion point for the mode-resolution paragraph — the requirement (mode resolved before Classify, step 5) is fixed; the precise line is chosen at edit time against the then-current file.
