# Changelog

All notable changes to skl, newest first. Every change to `skills/` or `agents/` that lands
on `main` bumps `VERSION` and adds a section here — see `CLAUDE.md` for the rule.
`/skl-update` prints the sections newer than your installed version.

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
