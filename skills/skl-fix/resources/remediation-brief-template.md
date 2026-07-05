# Remediation brief — <feature> (fix item <id>) — iteration <N>

> Written after a failing fix round — by `skl-debugger`, or (when the symptom still
> reproduces) by a re-run of Superpowers `systematic-debugging` with a new hypothesis. The next
> `speckit-plan` is seeded with this so plan → tasks target these fixes. Be concrete and file-keyed.

## Failing gates this round

| Gate | Worst severity | One-line reason |
|------|----------------|-----------------|
| <skl-reality-checker / skl-spec-auditor / verification-before-completion / make / …> | <Critical/High/Medium> | <what failed — esp. "symptom still reproduces" or a new regression> |

## Did the symptom actually go away?
- Original reproduction this round: <still reproduces / gone>.
- If it still reproduces → **the root cause was wrong**. Record the new hypothesis from
  `systematic-debugging` below; do not re-attempt the same fix.

## Root cause (this iteration's best understanding)

Group findings by underlying cause (not one bullet per symptom). For each:
- **Cause:** <the actual reason — updated if the prior hypothesis was disproven>
- **Evidence:** <file:line, failing/repro test name, fresh command output>
- **Why the last fix missed it:** <symptom-patch? wrong layer? untested path?>

## Ordered fix list (what plan/tasks must do next)

Ordered by what unblocks the most. Each has a one-line definition of done.
1. **<fix>** — files: `<path(s)>` — done when: <repro test passes; gates green; no regression>.
2. **<fix>** — files: `<path(s)>` — done when: <…>.

## Do NOT regress
- <tests already green; flows already verified — keep them so. List any guard added so it isn't removed.>
