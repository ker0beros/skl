# Code organization — <project> (Phase 0 output)

> Written by `/refactor-loop` Phase 0. This is the **target** the refactor drives toward — derived
> from the project's constitution + CLAUDE.md + the dominant existing patterns, NOT invented. Save
> as `.refactor-loop/organization.md`.

## Sources of truth
- Constitution: `.specify/memory/constitution.md` — principles that bind (cite the relevant ones).
- `CLAUDE.md` — conventions, package boundaries, naming, gates.
- Dominant existing patterns observed in the code (where the codebase already agrees with itself).

## Topology (target)

The intended package / module / layer layout and the **allowed dependency direction**.

| Layer / package | Responsibility | May depend on | Must NOT depend on |
|-----------------|----------------|---------------|--------------------|
| <e.g. domain> | <pure models/ports> | <nothing> | <framework, data, ui> |
| … | … | … | … |

## Conventions (target)
- File/dir naming: <…>
- Layering rules: <…>
- LOC ceilings / size budgets: <… from constitution/CLAUDE.md …>
- State / error / async patterns: <…>
- Test placement + coverage floors: <…>

## "Well-organized" — the definition of done
A concise checklist the audit measures deviations against, e.g.:
- [ ] No file exceeds its LOC ceiling without a cited rationale.
- [ ] No layer/package imports against the allowed direction.
- [ ] No duplicated logic that belongs in one shared place.
- [ ] No dead code / unused exports.
- [ ] Naming + structure consistent with the dominant pattern.
- [ ] Public behavior covered by tests (so refactors are safe).

## Current-state notes
Where the codebase already matches the target (leave alone) vs where it drifts (feeds Phase 1).
