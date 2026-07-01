# Fix backlog — <project> (Phase 0 output)

> Written by `/skl-fix` Phase 0, after Superpowers `systematic-debugging` confirms each bug's root
> cause. Prioritized, highest severity first. Save as `.skl-fix/backlog.md`. Each item becomes one
> speckit feature in Phase 1. For a bug that came from a **GitHub/GitLab issue URL**, record that URL
> in the row (e.g. in the symptom cell) so the fix is traceable to the issue.

## Severity (drives order + the pass gate)
- **Critical** — data loss / crash / security / core flow broken for many users.
- **High** — important feature broken or wrong for common cases.
- **Medium** — broken in a contained/edge case, or with a workaround.
- **Low** — minor/cosmetic (still fixed; ordered last).

The loop fixes Critical→High→Medium→Low; every item is driven to **fixed-and-verified or DEFERRED**.

## Items

| id | title | symptom (observed) | repro | root cause (confirmed) | suspected files | risk | severity |
|----|-------|--------------------|-------|------------------------|-----------------|------|----------|
| F-001 | <short name> | <what the user sees> | <steps / failing input> | <the actual underlying cause, not the symptom> | `path/...` | low/med/high | High |
| F-002 | … | … | … | … | … | … | Medium |

> **Root cause is mandatory.** If a row's root cause is still "unknown / suspected," it is not ready —
> keep `systematic-debugging` going before adding it here. Symptom-only entries are not fixable items.

## Status (updated as the loop runs)

| id | status | iterations | result |
|----|--------|-----------|--------|
| F-001 | pending / in-progress / **done** / **DEFERRED** | <n> | <commit sha + "symptom: passes" / why deferred> |

## Out of scope / explicitly deferred
List anything reported but intentionally not fixed now (with reason) so it isn't silently dropped.
