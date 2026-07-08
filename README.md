# skl

Portable Claude Code skills for **spec-driven, QA-gated, autonomous loops** — a one-time setup
command and a human-gated ticket runner that builds each ticket through an auto-iterating 8-agent QA
panel, sharing one installer. Built on
[Spec Kit](https://github.com/github/spec-kit) and the
[loop-engineering](https://github.com/cobusgreyling/loop-engineering) methodology — skl is an
implementation of its five-building-blocks + memory framework (automations, worktrees, skills,
plugins/MCP, sub-agents, durable state), with phased **L1→L2→L3** autonomy rollout, human safety
gates, transparent cost budgeting, and readiness scoring baked into the loop and the constitution.

## The flow

skl is **human-gated and one ticket at a time** — it never drives itself across tickets and never
merges for you:

1. **Plan** — brainstorm a feature or debug an issue with
   [Superpowers](https://github.com/obra/Superpowers) (`brainstorming` / `systematic-debugging`).
2. **Capture** — file it as a ticket on **GitHub / GitLab** with **`/skl-ticket`** — or pass your plan
   or FSD doc (`--plan <path>` / `--fsd <path>`) and it's distilled into the ticket and preserved
   verbatim for `/skl-do` to reuse.
3. **Human gate → run** — review the ticket and confirm it's **`loop-ready`** (`/skl-ticket` proposes
   the intake label; you approve it), then run
   **`/skl-do`**. It works that one ticket through the QA-gated build loop, opens a **PR**
   (never merges), and **stops**. You review and **merge** the PR, then re-run `/skl-do`
   for the next ticket.

| Skill | Input | What it does |
|-------|-------|--------------|
| **`/skl-init`** | your **tech stack** | **Run once first.** Installs Spec Kit + verifies the QA panel, then authors the **constitution** — web-searching the best-fit code organization for you to choose |
| **`/skl-telegram`** | your **bot token + chat id** | Sets up Telegram notifications — installs the sender every skl skill calls and stores the two creds in the project-root `.env` (600, git-ignored) via a **no-echo prompt you run** (secrets never enter the chat), then sends a test ping. `test` / `status` sub-commands |
| **`/skl-ticket`** | a **rough issue**, or a **plan / FSD doc** | Drafts a structured ticket in the repo's house style — from a rough description **or a plan/FSD doc** (`--plan`/`--fsd <path>`: a Claude plan-mode file, a Superpowers plan, or a spec — distilled into the ticket and preserved verbatim for `/skl-do` to reuse) — then after a **Create/Edit/Cancel** gate files it on **GitHub / GitLab / Jira** (auto-detects the provider from the git remote). Classifies loop-readiness and proposes one **intake label** — `loop-ready` / `loop-needs-info` / `loop-human` — in the gate for you to approve; never the loop's own lifecycle labels |
| **`/skl-do`** | (optional) **`#N`** | Works **one** ticket, then stops. With no number it takes the **oldest** open `loop-ready` issue (or `#N` for that exact one), classifies + readiness-gates it, builds it through the QA-gated loop it owns (`specify → … → implement` + an 8-agent QA panel, max 10 iterations), and **opens a PR that `Closes` it — never merging**. You review + merge the PR, then re-run for the next. Drives a label lifecycle: `loop-ready → loop-in-progress → loop-done` (or `loop-deferred` / `loop-needs-info` / `loop-human`) |
| **`/skl-next`** | (none) | Read-only **triage advisor** — sweeps issues / PRs / config, prints the **current state**, then recommends the **single next step** on an unblock-first ladder and offers (human-gated) to run it |
| **`/skl-strictness`** | `strict` \| `standard` \| `low` | 3-stop slider (like `/effort`) for how strict the QA gates are — how far below Medium also blocks (Low / Info) |
| **`/skl-update`** | (none) | Pull the latest skl from GitHub and refresh this project's skills + agents (keeps your config) |
| **`/skl-resume`** | (optional) reset time | Continue the last `/skl-do` run after an interruption — a usage-limit reset, a crash, or a context `/clear` — from its durable checkpoint |
| **`/skl-help`** | (optional) command name | Lists every skl command + a one-line explanation and the workflow (reads the installed skills, so it's always current) |

The build loop chains the individual `speckit-*` skills (`specify → … → implement`), then gates the
result with the QA panel; a gate passes only with **0 Critical / 0 High / 0 Medium** findings (and,
per `/skl-strictness`, also 0 Low and/or 0 Info). On failure, `skl-debugger` turns the findings into the
next iteration's plan.

## `/skl-init` — first-time setup (run this once)

```
/skl-init [optional tech-stack hint]
```
Bootstraps a project for the loop. Installs the prerequisites (**Spec Kit** + the `speckit-*`
skills, optional Playwright), verifies the QA panel, then authors the project's **constitution**:
it asks your **tech stack**, **web-searches** the best-fit code organization (melos, clean
architecture, feature-first, …) and lets you **choose**, then runs `speckit-constitution` to encode
*code quality, testing/TDD, UX consistency, performance,* the **chosen code organization**, and a
**Loop Engineering** principle (the [loop-engineering](https://github.com/cobusgreyling/loop-engineering)
methodology — phased L1→L2→L3 autonomy, human safety gates, cost budgeting, readiness scoring).
Idempotent — re-run anytime. (After a fresh Spec Kit init it stops once for a Claude Code reload,
then resumes.) The constitution it writes is what the QA `skl-guideline-auditor` gate reads as its target.

## `/skl-ticket` — file a ticket on GitHub / GitLab / Jira

```
/skl-ticket <rough description>          # auto-detects the provider from the git remote
/skl-ticket jira: <rough description>    # or name the provider explicitly
/skl-ticket --plan <path>                # seed the ticket from a Claude/Superpowers plan
/skl-ticket --fsd docs/login-fsd.md      # …or from a functional spec doc
/skl-ticket                              # no source → offers the most-recent plan to confirm
```
Turns a rough description **— or a plan / FSD doc —** into a well-structured ticket in the repo's house
style, shows the full draft, and files it **only after you pick Create** (a Create / Edit / Cancel gate
— the whole point). Given a plan/FSD (`--plan`/`--fsd <path>`, a bare/`@` path, or auto-detected from
`~/.claude*/plans` and `docs/**/plans`), it distills the doc into the house style **and preserves the
full plan verbatim** in a collapsible appendix with a `Plan-Ref:` marker — so `/skl-do` reuses your
planning instead of re-deriving the spec. Auto-detects the provider from the git remote — **GitHub**
(`gh`), **GitLab** (`glab`, incl. self-hosted), or **Jira** (Atlassian MCP) — asking only when it's
unsure. It classifies loop-readiness and proposes one **intake label** — `loop-ready` / `loop-needs-info`
/ `loop-human` — in its gate for you to approve (never the loop's lifecycle labels); promoting a held
ticket to **`loop-ready`** stays a human decision (that queue is what `/skl-do` works, one ticket at a time).

## `/skl-do` — work one `loop-ready` ticket into a PR

```
/skl-do             # the OLDEST open loop-ready issue, then stop
/skl-do #42         # work just issue #42, then stop
SKL_UNATTENDED=1 /skl-do   # unattended (zero-prompt) build — for cloud/scheduled/CI runs
```
The **ticket runner**. With no number it takes the **oldest open issue labeled `loop-ready`**; an
explicit `#N` works that exact issue (bypassing the label gate). It classifies the ticket
(bug → framed as a fix, feature → as-is), **readiness-gates it** (an `skl-business-analyst` check — a
ticket too vague to work is labeled `loop-needs-info`, or `loop-human` when it needs a human decision,
with a comment listing what's missing, instead of burning build iterations), builds it through the QA-gated loop it owns — **reusing a plan/FSD the
ticket carries** (from `/skl-ticket --plan`/`--fsd`) to seed the spec — (`speckit specify + clarify`
→ a human spec-review gate → `plan → … → implement` → an 8-agent QA panel, max 10 iterations),
**opens a PR that `Closes` the issue** — pushing a `skl-do/*` branch — and **stops**.
It **never merges** and never auto-advances: you review and merge the PR, then re-run
`/skl-do` for the next ticket. A ticket that can't converge in 10 iterations is relabeled
**`loop-deferred`**, commented with the findings, and skipped.

As it works, it drives a **label lifecycle** on the issue so you can see each ticket's state at a
glance:

```
loop-ready ──claim──▶ loop-in-progress ──PR opened──▶ loop-done      (stays open until YOU merge the PR)
 (you set)            (loop working it)  ├──cap hit──────▶ loop-deferred    (findings commented, skipped)
                                         ├──needs info───▶ loop-needs-info  (missing facts commented; you re-label loop-ready)
                                         └──needs human──▶ loop-human       (decision commented; you decide, re-label loop-ready)
```

A human — or `/skl-ticket` via its gate — sets the intake label (**`loop-ready`** / `loop-needs-info` /
`loop-human`); the loop **builds only `loop-ready`** and owns every transition after the claim. On start-up it
**resumes** any ticket left on `loop-in-progress` by an interrupted / rate-limited run *before*
claiming a new `loop-ready` one, so a crash never strands a ticket. (Missing labels are auto-created
on first run.)

> **The `loop-ready` queue is the human gate, and it stays one-ticket-at-a-time.**
> `/skl-do` only *starts* work on an issue a human has labeled `loop-ready` — it never
> applies that label itself — works exactly **one** ticket per run, and **never merges** or
> auto-advances to the next. Curate the queue (label issues `loop-ready`, optionally filed via
> `/skl-ticket`), then run it: one ticket → a reviewable PR → you merge → re-run for the next.
> `/skl-resume` can continue a `/skl-do` build after any interruption — even a context `/clear`. This
> is the loop-engineering human-gate + PR-not-merge posture in practice.

## `/skl-next` — what should I do now?

```
/skl-next
```
The read-only **triage advisor**. Sweeps the project's skl state — issue `loop-*` labels, open
`skl-do/*` PRs awaiting merge, and setup/housekeeping drift — prints a **current-state snapshot**
first, then ranks the findings on a fixed **unblock-first ladder**: setup blockers (`/skl-init`) →
unblock the pipeline (stranded tickets, PRs awaiting merge, `loop-needs-info` answers, `loop-human`
decisions, deferred rescues) → start new work (`loop-ready` queue → `/skl-do`, or file one via
`/skl-ticket`) → housekeeping (`/skl-update`, dirty tree). It names the single next step and
**offers (human-gated) to run it** — the triage itself changes nothing: no labels, comments,
branches, or writes. Collectors it can't run (no remote, CLI unauthenticated) are skipped with a reason.

## `/skl-strictness` — how strict the QA gates are

```
/skl-strictness [strict | standard | low]
```
A 3-stop slider (like `/effort`) that sets the QA pass threshold the build loop uses. **Medium and
above always block**; the mode decides how far below that also blocks, down the ladder
*Critical › High › Medium › Low › Info* (Info = info-level lint diagnostics):

- **strict** — passes only at *0 Critical / High / Medium / Low / Info*; even info-level lints must be
  clean (the analyze gate runs fatal-on-info, not merely exit 0).
- **standard** *(default)* — passes at *0 Critical / High / Medium / Low*; **Info** is logged, non-blocking.
- **low** — passes at *0 Critical / High / Medium*; **Low + Info** are logged, non-blocking (fastest to converge).

Writes `gate_strictness` into each skill's `project.config.md`; takes effect on the next loop run.

## `/skl-resume` — continue the last run after an interruption

```
/skl-resume [reset time from the status bar, e.g. 2h15m]   # only if a usage cap stopped it
```
A `/skl-do` run can stop mid-flight — a **usage cap**, a crash, or you **`/clear` the context**.
Because `/skl-do` checkpoints its progress to `.skl-do/state.md` (and the `loop-in-progress` label is
the durable signal), nothing is lost. `/skl-resume` reads that durable state, works out which ticket
and which phase/iteration it stopped at, and **re-invokes `/skl-do` to continue the same ticket** — so
you can clear the context and just run `/skl-resume`. If a **usage cap** stopped it, it waits until the
status-bar reset **+ 3 min** (in-session via `ScheduleWakeup`, re-arming hourly) before continuing;
otherwise it continues immediately.

## `/skl-telegram` — set up Telegram notifications

```
/skl-telegram          # setup wizard: install sender, store creds, send a test ping
/skl-telegram test     # re-send a test message
/skl-telegram status   # is it configured? (never reads your .env)
```
Every skl skill already pings Telegram on completion / when it needs you
(`bash ~/.claude/notify-telegram.sh "[<project>] …"`), but that does nothing until the sender and your
creds exist. `/skl-telegram` installs the sender to `~/.claude/notify-telegram.sh` and stores your **bot
token** + **chat id** in the **project-root `.env`** (`chmod 600`, ensured git-ignored), then sends a real
test message to confirm. **Secrets never pass through the chat** — you type them at a no-echo shell prompt
you run yourself (`read -rs`), and the agent is hook-blocked from reading `.env` anyway. Optional add-ons:
a global `~/.config/claude/.env` fallback (so pings also fire from other dirs / a local cron) and appending
the ping convention to `~/.claude/CLAUDE.md` (pings across all projects). Creds in a git-ignored `.env`
cover **local runs in the project dir**; remote/cloud/CI runs need the two vars in their own environment.

## What's in here

```
agents/               # 10 subagents — 8 QA gate agents + skl-debugger (failure-time) + skl-business-analyst (skl-do Phase A + readiness gate)
skills/skl-init/     # SKILL.md + resources/ (code-org playbook) — one-time setup + constitution
skills/skl-telegram/  # SKILL.md + resources/ (notify-telegram.sh sender) — set up Telegram notifications (creds in project .env)
skills/skl-ticket/  # SKILL.md + resources/ (providers) — file a ticket on GitHub/GitLab/Jira
skills/skl-do/  # SKILL.md + resources/ (pickup-loop + state template + readiness-check + issue-access + pass-matrix + render-keyframes.mjs + mobile-render + no-overflow-testing + templates + config example) — build one loop-ready ticket → PR, then stop
skills/skl-next/  # SKILL.md — read-only triage advisor: current-state snapshot → unblock-first next step + offer
skills/skl-strictness/     # SKILL.md — strict|standard|low QA-gate slider (sets gate_strictness)
skills/skl-update/   # SKILL.md — pull latest from GitHub + re-install (keeps project.config.md)
skills/skl-resume/   # SKILL.md — continue the last run from its checkpoint (usage cap / crash / /clear)
skills/skl-help/     # SKILL.md — lists all commands + the workflow (reads installed skills)
```

Install = pull this repo and copy `skills/` + `agents/` into your project's `.claude/` (there is no
install script). `/skl-init` then generates each skill's `project.config.md`.

The 8 gate agents — `skl-spec-auditor` (spec + task completion), `skl-guideline-auditor`
(CLAUDE.md + constitution), `skl-pragmatist` (simplicity), `skl-reality-checker` (runs it),
`skl-code-reviewer` (adversarial bug hunt), `skl-security-auditor` (security pass),
`skl-test-integrity-auditor` (test/gate tampering), `skl-ui-tester` (UI + design/animation parity) —
plus `skl-debugger` (the failure-time fixer) and `skl-business-analyst` (used in `/skl-do` Phase A of
**both modes** to cross-check the spec against its source — the rendered design when there is one, the
intent + clarify answers text-only — plus the `/skl-do` readiness gate).

## Prerequisites (on the target project)

- **Loop Engineering** *(methodology — required reading + adherence, nothing to install)* — skl
  is an implementation of [cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering),
  and its principles are **required** for any autonomous / agentic / loop or scheduled-automation
  capability a skl project ships: the phased **L1 (report-only) → L2 (assisted) → L3 (unattended)**
  rollout, explicit human safety gates + denylists, transparent cost/token budgeting with a stop rule,
  and a measurable readiness score gating promotion to a higher autonomy level. `/skl-init` encodes
  these as a **Loop Engineering** principle in the constitution and the QA compliance gate enforces it.
- **Spec Kit** — `.specify/` + the `speckit-*` skills. The loop orchestrates these.
  `/skl-init` installs this for you; or init by hand with
  `uvx --from git+https://github.com/github/spec-kit.git specify init --here`
- **Superpowers** *(recommended — for the planning step)* — the [obra/Superpowers](https://github.com/obra/Superpowers)
  plugin powers **step 1** of the flow: `brainstorming` to shape a feature, `systematic-debugging` to
  diagnose a bug, **before** you file it as a ticket. No skl skill invokes it directly — it's the
  human's planning aid. Install in Claude Code: `/plugin marketplace add obra/superpowers-marketplace` then
  `/plugin install superpowers@superpowers-marketplace` (or `…@claude-plugins-official`), then reload.
  `/skl-init` checks for it.
- **Design access** *(design-driven tickets only)* — the `DesignSync` tool / claude.ai login
  (`/design-login`), when a ticket names a claude.ai/design reference. Not needed for text-only tickets.
- **Playwright** *(design-driven web tickets only)* — for rendering the design reference
  + web parity. Mobile / text-only work doesn't need it.

## Install

Installation **pulls the repo from GitHub** and copies the skills + agents into your project's
`.claude/` — there is no install script. A plain `git clone` works (public repo); `gh` is used only if present. From
**inside the target project**:

```bash
# clone-to-cache (or refresh it), then copy skills + agents into this project's .claude/
{ [ -d ~/.skl ] && git -C ~/.skl fetch -q origin && git -C ~/.skl reset -q --hard origin/main \
   || gh repo clone ker0beros/skl ~/.skl; } \
  && mkdir -p .claude/skills .claude/agents \
  && rsync -a --exclude=project.config.md ~/.skl/skills/ .claude/skills/ \
  && rsync -a ~/.skl/agents/ .claude/agents/
```

(Prefer agents shared across projects? `rsync -a ~/.skl/agents/ ~/.claude/agents/` instead.) The
`--exclude=project.config.md` keeps any per-project config you already have; `/skl-init` generates it
on first run.

Then:

1. **Reload Claude Code** so the skills (`/skl-init`, `/skl-telegram`, `/skl-ticket`, `/skl-do`,
   `/skl-next`, `/skl-strictness`, `/skl-update`, `/skl-resume`, `/skl-help`) and the agents register.
2. **Install the Superpowers plugin** (recommended — for the planning step) — in Claude Code:
   ```
   /plugin marketplace add obra/superpowers-marketplace
   /plugin install superpowers@superpowers-marketplace
   ```
   (or `/plugin install superpowers@claude-plugins-official`), then reload again.
3. Run **`/skl-init`** first — it sets up Spec Kit, **generates each skill's `project.config.md`**
   (auto-detecting surface + gate commands), checks Superpowers, and authors the constitution.

## Per-project config

`/skl-init` generates `resources/project.config.md` into **each** skill (auto-detecting the surface
web / mobile / both and the gate commands: Makefile targets → melos → flutter / npm). The skills read
it at runtime for `surface_default`, the `mobile_gates` / `web_gates` commands, `web_dev_server`, and
`gate_strictness` (set by `/skl-strictness`). Edit by hand anytime — `/skl-init` and `/skl-update` never
overwrite an existing `project.config.md`.

## Updating

From inside a project that already has skl installed, just run **`/skl-update`** — it pulls
`origin/main`, shows what's new, and syncs the skill + agent files (**keeping** each
`project.config.md`). Reload Claude Code afterward.

By hand, it's the same pull-and-copy one-liner as **Install** above (the `--exclude=project.config.md`
makes it safe to re-run as an update).

Every release bumps the root `VERSION` and adds a `CHANGELOG.md` entry (rule in `CLAUDE.md`),
so `/skl-update` can show you installed → new version and exactly what changed.

## Credits

skl's design follows the **loop-engineering** methodology by Cobus Greyling
([cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering)) — the
five-building-blocks + memory framework, phased L1→L2→L3 autonomy rollout, human safety gates, and
readiness scoring, which `/skl-init` bakes into the constitution and the QA gates enforce.

The agents are skl's own. The panel's original design drew inspiration from
[darcyegb/ClaudeCodeAgents](https://github.com/darcyegb/ClaudeCodeAgents) and
[VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents);
the current 8-gate panel — including the security, correctness, and test-integrity gates — follows
the agentic-review practice in Addy Osmani's
[Loop Engineering](https://addyosmani.com/blog/loop-engineering/) and
[Agentic Code Review](https://addyosmani.com/blog/agentic-code-review/) (maker/checker separation,
adversarial diff review, test-change scrutiny, driver-owned verdicts).
