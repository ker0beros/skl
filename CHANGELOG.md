# Changelog

All notable changes to skl, newest first. Every change to `skills/` or `agents/` that lands
on `main` bumps `VERSION` and adds a section here — see `CLAUDE.md` for the rule.
`/skl-update` prints the sections newer than your installed version.

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
