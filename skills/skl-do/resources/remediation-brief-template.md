# Remediation brief — <feature> — iteration <N>

> Written by `skl-debugger` after a failing QA round. The next `speckit-plan` run is
> seeded with this file so plan → tasks target these fixes. Be concrete and file/spec-keyed.

## Failing gates this round

List each gate that did not pass and why (carry the agent's own severity).

| Gate | Worst severity | One-line reason |
|------|----------------|-----------------|
| <skl-spec-auditor / skl-reality-checker / skl-ui-tester / make / …> | <Critical/High/Medium> | <what failed> |

## Root causes

Group the findings by underlying cause (not one bullet per symptom). For each:

- **Cause:** <the actual reason multiple findings occur>
- **Evidence:** <file:line, command output, screenshot path, or timings diff>
- **Spec ref:** <which `spec.md` requirement / Visual Target / Animation Inventory row this violates>

## Ordered fix list (what plan/tasks must do next)

Ordered by what unblocks the most. Each item has a one-line definition of done.

1. **<fix>** — files: `<path(s)>` — done when: <observable, testable condition>.
2. **<fix>** — files: `<path(s)>` — done when: <…>.

## Do NOT regress

Things that already pass and must stay passing (so the next iteration doesn't trade one gate for another):

- <e.g. existing Visual Target rows already matching; coverage floors; design-token gate>

## Animation/parity specifics (if `skl-ui-tester` failed)

| Inventory row | Expected (design) | Observed (live) | Fix |
|---------------|-------------------|-----------------|-----|
| <element · property> | <duration / easing / trigger> | <captured value or "absent"> | <what to change> |
