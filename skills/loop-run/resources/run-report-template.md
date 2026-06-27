# /loop-run batch report — <project>

> Written by `/loop-run` when a batch finishes. Save as `.loop-run/report.md`. Summarizes which plans
> ran, their outcome, and where to review them.

## Run
- Integration branch: `loop-run/<stamp>` (review here; nothing was pushed or merged to main/dev).
- Selected: <plan numbers run this batch>  ·  Skipped (left `ready`): <plan numbers not selected>.
- gate_strictness: <low | standard | strict>.

## Results

| plan | slug | mode | result | iterations | commit / note |
|------|------|------|--------|-----------|---------------|
| NNN | <slug> | design / text-only | **shipped** / **DEFERRED** | <n>/10 | `feat(NNN): <slug>` sha, or why deferred |
| … | … | … | … | … | … |

## Deferred (need a human)
For each DEFERRED plan: the still-failing gates, what was tried across iterations, and the unmerged
branch name. Its `spec.md` stays `Loop-Status: deferred`.

## Next
- Review the `loop-run/<stamp>` branch; merge when satisfied.
- Re-run `/loop-run` to pick up any plans left `ready`, or `/loop-plan` to queue more.
