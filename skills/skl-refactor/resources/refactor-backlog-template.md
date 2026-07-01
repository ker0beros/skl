# Refactor backlog — <project> (Phase 1 output)

> Written by `/skl-refactor` Phase 1. Prioritized, highest severity first. Save as
> `.skl-refactor/backlog.md`. Each item becomes one speckit feature in Phase 2.

## Severity (drives order + the pass gate)
- **Critical** — breaks the architecture / blocks other work / actively risky (e.g. layer violation that leaks framework into domain).
- **High** — significant deviation from the target organization (god-file over ceiling, duplicated core logic).
- **Medium** — real but contained (inconsistent naming, a missing test on touched code).
- **Low** — nice-to-have / cosmetic.

The loop refactors Critical→High→Medium; **Low items are reported, not auto-refactored** (they don't fail the "good enough" stop).

## Items

| id | title | why (smell) | files / scope | current → target | risk | severity | est. effort |
|----|-------|-------------|---------------|------------------|------|----------|-------------|
| R-001 | <extract X> | <duplication / boundary> | `path/...` | `<from>` → `<to>` | low/med/high | High | S/M/L |
| R-002 | … | … | … | … | … | Medium | … |

## Status (updated as the loop runs)

| id | status | iterations | result |
|----|--------|-----------|--------|
| R-001 | pending / in-progress / **done** / **DEFERRED** | <n> | <commit sha or why deferred> |

## Out of scope / explicitly deferred
List anything intentionally not touched (with reason) so it isn't silently dropped.
