# Changelog

All notable changes to skl, newest first. Every change to `skills/` or `agents/` that lands
on `main` bumps `VERSION` and adds a section here — see `CLAUDE.md` for the rule.
`/skl-update` prints the sections newer than your installed version.

## 2.2.0 — 2026-07-07

- **New `/skl-telegram`.** Sets up Telegram notifications end-to-end — installs the
  `~/.claude/notify-telegram.sh` sender (the one every skl skill already calls), stores your bot token +
  chat id in the **project-root `.env`** (`chmod 600`, git-ignored), and verifies with a real test ping.
  Secrets are entered at a **no-echo prompt you run yourself** (`read -rs`) — they never pass through the
  chat, and the agent is hook-blocked from reading `.env`. The write preserves other vars in an existing
  `.env`, and a git-**tracked** `.env` is a hard stop. `test` re-sends a ping; `status` reports config
  without reading `.env`. Optional add-ons: a global `~/.config/claude/.env` fallback (cross-dir / local
  cron) and appending the `[<project>]`-prefixed ping convention to `~/.claude/CLAUDE.md`.
- The bundled sender resolves creds from a **cascade** — `$PWD/.env` → `~/.config/claude/.env` →
  `~/.config/claude/telegram.env` → the legacy fallback — so per-project and older global setups both work.
- Notifications are scoped to **local runs in the project dir** (git-ignored `.env` doesn't travel to
  remote/cloud/CI runs); the skill says so and the global fallback widens coverage.

## 2.1.0 — 2026-07-06

- **`/skl-ticket` can seed a ticket from a plan or FSD doc.** Pass `--plan <path>` / `--fsd <path>`
  (or a bare / `@` path to a `.md`/`.markdown`/`.txt` file), or run `/skl-ticket` with no source and it
  offers the **most-recent** plan across `~/.claude*/plans/` (Claude plan-mode) and `docs/**/plans/` ·
  `docs/**/specs/` (Superpowers) to confirm. The doc is **distilled into the house-style ticket** and
  the **full plan is preserved verbatim** in a collapsible `<details>` appendix with a top-of-body
  `Plan-Ref:` marker (Jira uses an `h2. Full plan` section). A **size guard** warns instead of silently
  truncating an oversize doc. Plain rough-description tickets are unchanged. New resource
  `skills/skl-ticket/resources/plan-source.md`.
- **`/skl-do` reuses an attached plan.** When a ticket body carries `Plan-Ref:` + a `📋 Full plan`
  block, `speckit-specify` is seeded from that plan **verbatim** (the authored intent) instead of
  re-deriving the spec from title + body alone — the up-front planning is no longer thrown away.
- Docs: README "The flow" + the `/skl-ticket` / `/skl-do` sections updated. `metadata.version` bumped —
  `skl-ticket` 1.0.0 → 1.1.0, `skl-do` 1.0.0 → 1.1.0.

## 2.0.0 — 2026-07-06

- **skl is now a lean, human-gated, ticket-based toolkit (14 → 8 commands).** The one sanctioned flow:
  plan with Superpowers (brainstorm a feature / debug a bug) → capture with **`/skl-ticket`** → review
  + label `loop-ready` → **`/skl-do`** builds the ticket through the QA-gated loop and opens a PR → you
  review + **merge** → repeat. skl never drives itself across tickets and never merges for you.
- **Removed the autonomous / batch commands:** `/skl-auto` (the hands-off driver), `/skl-fix`,
  `/skl-refactor`, `/skl-plan`, the old batch `/skl-run`, and the standalone builder `/skl-feature`
  (its build loop is now **folded into `/skl-do`**); plus the orphaned `skl-refactoring-specialist`
  agent.
- **Removed all auto-merge** — `--merge-on-green`, the `automerge_base` / `automerge_method` config,
  and the provider merge-when-green commands (`gh pr merge --auto`, `glab mr merge --auto-merge`).
  Every PR awaits a human merge.
- **`/skl-do`** *(was `/skl-pickup-ticket`)* is the single ticket command: it selects one `loop-ready`
  ticket (or `#N`), readiness-gates it, and **builds it end-to-end through the QA-gated loop it owns**
  (speckit `specify + clarify` → a human spec-review gate → `plan → … → implement` → an 8-agent QA
  panel, max 10 iterations), opens a PR that `Closes` the issue, then **STOPS**. One ticket per run —
  never auto-advances, never merges. Bug tickets build framed as a fix; a ticket that names a
  claude.ai/design ref builds design-driven.
- **Renamed for a shorter surface:** `/skl-create-ticket` → **`/skl-ticket`**, `/skl-pickup-ticket` →
  **`/skl-do`**, `/skl-gate` → **`/skl-strictness`**, `/skl-next-step` → **`/skl-next`**. Just run the
  new names (`/skl-update` prunes the old ones on update). State/branch also renamed: `.skl-pickup/` →
  `.skl-do/`, branch prefix `skl-pickup/*` → `skl-do/*`.
- **`/skl-resume` now resumes from a durable checkpoint.** `/skl-do` checkpoints its progress (ticket,
  phase, iteration, last step) to `.skl-do/state.md`; `/skl-resume` reads that + the `loop-in-progress`
  label and continues the same ticket **in a fresh context** — so you can `/clear` and just run
  `/skl-resume`. A usage-cap stop still waits for the reset first; a crash or `/clear` continues
  immediately.
- **Superpowers** is no longer invoked by any skl skill — it's now **recommended for the planning
  step** (brainstorm a feature / debug a bug before filing a ticket).
- Command surface: **14 → 8 skills, 11 → 10 agents.** Remaining commands: `skl-init`, `skl-ticket`,
  `skl-do`, `skl-strictness`, `skl-next`, `skl-update`, `skl-resume`, `skl-help`.

## 1.6.0 — 2026-07-06

- **Removed skill `/skl-design`; folded it into `/skl-plan --design`.** The design-ideation
  front-step — confirm or define a design system, pick platforms, brainstorm the flow into
  screens/states via Superpowers, and write a ready-to-paste Claude Design prompt — is now an
  opt-in flag on `/skl-plan` rather than a standalone command, then it continues straight into the
  plan. **Migrate:** `/skl-design <flow>` → `/skl-plan --design <flow>`. The Claude Design prompt +
  design-system prompt still land under `.skl-design/`; the templates moved to
  `skl-plan/resources/`. Plain `/skl-plan` (no `--design`) is unchanged and still needs no
  Superpowers; only `--design` uses `brainstorming`.
- skl-init: the Superpowers prerequisite check now points to `/skl-plan --design` (was `/skl-design`).
- skl-update: now **prunes `skl-*` skills removed from `main`** so a deleted command (like
  `/skl-design`) actually disappears from existing installs on update — previously it only added or
  overwrote, leaving stale skills behind. The prune is guarded (runs only when the cache lists ≥ 1
  skill, so a failed fetch never wipes your skills) and scoped to the `skl-*` namespace; agents and
  non-skl skills are never pruned, and each `project.config.md` is still preserved.
- Command surface: net 15 → 14 skills (from a command-surface audit; `/skl-next-step` and
  `/skl-gate` were reviewed and deliberately kept as-is).

## 1.5.0 — 2026-07-06

- **New skill `/skl-auto`** — the hands-off driver: runs `/skl-next-step`'s triage, then
  autonomously resumes stranded tickets + drains the `loop-ready` queue
  (`/skl-pickup-ticket --auto --drain`) and batch-runs ready plans (`/skl-run --auto`), opening
  PRs that **auto-merge into `dev` on green CI** (provider merge-when-green; never main/master;
  `--no-merge` opts out; skipped with a digest note when the repo has no required checks).
  Human-only work goes to ONE deduped Telegram digest. **`--promote[=N]`** (default OFF)
  promotes up to N **trusted-author** tickets (owner/member/collaborator) to `loop-ready` — the
  flag-gated exception to the human queue gate, each promotion audited. `--alive` re-polls every
  30 min; otherwise "nothing to be done" exits. State in `.skl-auto/state.md`.
- skl-pickup-ticket: new **`--drain`** (driver mode — exit on the first empty poll, no wakeup,
  no ping) and **`--merge-on-green`** (PR targets `automerge_base`, default `dev`, and merges
  itself once CI passes; new config keys `automerge_base` / `automerge_method`).
- skl-resume: resumes `/skl-auto` first when `.skl-auto/state.md` shows an interrupted run.
- skl-run: `--auto` now also resumes `running` plans (left by an interrupted run) before the
  ready ones.
- skl-help: new **Autonomous** group (`skl-pickup-ticket` · `skl-auto`).

## 1.4.0 — 2026-07-05

- **New skill `/skl-next-step`** — the read-only triage advisor: sweeps issue `loop-*` labels,
  open `skl-pickup/*` PRs + unmerged review branches, `Loop-Status` plans, and setup/housekeeping
  drift; prints a current-state snapshot first, ranks the findings on a fixed unblock-first
  ladder (setup → unblock the pipeline → start new work → housekeeping), names the single next
  step, and offers (human-gated) to run it. Strictly read-only — no labels, comments, branches,
  or writes; collectors it can't run are skipped with a reason.
- skl-help: `skl-next-step` listed under **Help**; the workflow blurb points at it for "what now?".

## 1.3.0 — 2026-07-05

- skl-pickup-ticket: new **readiness gate** (step 2.5) — before building, an
  `skl-business-analyst` check judges whether the claimed ticket is workable without asking the
  reporter (bug: symptom / repro-or-evidence / expected-vs-actual; feature: outcome / scope /
  acceptance criteria — the repo is checked before declaring a gap). Under `--auto`, not-ready
  tickets are labeled **`loop-needs-info`** with a comment listing exactly what's missing;
  interactively the missing items are asked inline. New config key `pickup_needsinfo_label`;
  human re-entry = answer the comment, re-label `loop-ready`.
- skl-business-analyst: new ticket-readiness secondary task (`READINESS: ready|not-ready`
  verdict contract; the pickup driver owns routing).

## 1.2.0 — 2026-07-05

- skl-plan / skl-feature Phase A: the `skl-business-analyst` spec cross-check now runs in **both
  modes** — text-only features get an intent↔spec review (coverage gaps, contradictions, scope
  creep, untestable acceptance criteria, clarify answers missing from the spec) instead of going
  straight to ready/approval unreviewed. Design mode is unchanged.
- skl-business-analyst: new **text-only cross-check mode** — seeded with the original intent + the
  clarify Q&A instead of a rendered design; same severity-tagged findings + `VERDICT:` contract.

## 1.1.0 — 2026-07-05

- skl-update: report installed → new version and print the changelog entries in between;
  stamp `.claude/.skl-version` into the project on every sync.

## 1.0.0 — 2026-07-05

- Baseline: 13 skl-* skills (create-ticket, design, feature, fix, gate, help, init,
  pickup-ticket, plan, refactor, resume, run, update), 11 QA/specialist agents, and the
  loop-ready ticket queue workflow.
