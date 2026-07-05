# Remediation brief — <feature> (refactor item <id>) — iteration <N>

> Written by `skl-debugger` after a failing refactor round. The next `speckit-plan` is
> seeded with this so plan → tasks target these fixes. Be concrete and file-keyed.

## Failing gates this round

| Gate | Worst severity | One-line reason |
|------|----------------|-----------------|
| <skl-reality-checker / skl-spec-auditor / make / …> | <Critical/High/Medium> | <what failed — esp. any behavior regression> |

## Root causes

Group findings by underlying cause (not one bullet per symptom). For each:
- **Cause:** <the actual reason>
- **Evidence:** <file:line, failing test name, command output>
- **Target ref:** <which `organization.md` rule / spec requirement this still violates>

## Behavior-preservation check (refactor-critical)

- Did the refactor change observable behavior? <yes/no — if yes, this is the priority fix>
- Failing/changed tests: <list> — are they failing because behavior regressed, or because a
  moved/renamed symbol needs its reference updated? <classify each>

## Ordered fix list (what plan/tasks must do next)

Ordered by what unblocks the most. Each has a one-line definition of done.
1. **<fix>** — files: `<path(s)>` — done when: <observable, testable condition; gates green>.
2. **<fix>** — files: `<path(s)>` — done when: <…>.

## Do NOT regress
- <gates already green; org rules already satisfied; call-sites already migrated — keep them so.>
