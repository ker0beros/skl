# Changelog

All notable changes to skl, newest first. Every change to `skills/` or `agents/` that lands
on `main` bumps `VERSION` and adds a section here — see `CLAUDE.md` for the rule.
`/skl-update` prints the sections newer than your installed version.

## 1.1.0 — 2026-07-05

- skl-update: report installed → new version and print the changelog entries in between;
  stamp `.claude/.skl-version` into the project on every sync.

## 1.0.0 — 2026-07-05

- Baseline: 13 skl-* skills (create-ticket, design, feature, fix, gate, help, init,
  pickup-ticket, plan, refactor, resume, run, update), 11 QA/specialist agents, and the
  loop-ready ticket queue workflow.
