# Changelog

All notable changes to skl, newest first. Every change to `skills/` or `agents/` that lands
on `main` bumps `VERSION` and adds a section here — see `CLAUDE.md` for the rule.
`/skl-update` prints the sections newer than your installed version.

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
