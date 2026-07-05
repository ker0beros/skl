# /skl-update: version + changelog reporting — design

**Date:** 2026-07-05
**Status:** approved

## Goal

Every `/skl-update` run tells the user (a) the installed version vs the incoming version, and
(b) a human-readable changelog of what's new — instead of only raw `git log --oneline` SHAs.

## Version source

- A `VERSION` file at the repo root of `ker0beros/skl`, holding a single semver string.
- Seeded at `1.0.0` (baseline = the repo's current state), bumped to `1.1.0` by this change.

## Changelog

- A `CHANGELOG.md` at the repo root. Newest-first, one section per release:

```markdown
## 1.1.0 — 2026-07-05
- skl-update: show current → new version and the changelog entries in between

## 1.0.0 — 2026-07-05
- Baseline: 13 skl-* skills, 11 QA/specialist agents, ticket queue workflow
```

## /skl-update behavior changes (`skills/skl-update/SKILL.md`)

1. **Current-version detection.** Read the stamp file `.claude/.skl-version` in the project;
   if absent, fall back to `git -C ~/.skl show $OLD:VERSION`; if neither exists, treat as
   unknown / fresh install.
2. **Step 2 — show what's new.** Print `skl <current> → <new>`, then the `CHANGELOG.md`
   sections newer than the current version. Keep `git log --oneline "$OLD..$NEW"` as
   supplementary detail and as the fallback when changelog sections are missing/malformed.
   "Already up to date" reports the version too: `skl 1.1.0 — already up to date`.
3. **Step 3 — sync.** Additionally copy `~/.skl/VERSION` → `.claude/.skl-version` so the next
   run knows what's installed.
4. **Step 4 — report/Telegram.** The Telegram message becomes version-based:
   `[<project>] /skl-update done — 1.0.0→1.1.0` (falls back to SHAs only if VERSION is
   somehow absent upstream).

## Maintenance rule

- New repo `CLAUDE.md` (the repo has none): any change to `skills/` or `agents/` on `main`
  must bump `VERSION` and add a `CHANGELOG.md` entry.
- README gets one line pointing at the rule / changelog.

## Edge cases

- Fresh clone, no stamp, no `$OLD` → show the latest changelog entry and report
  `fresh install at <new>`.
- Changelog section missing for a version in the gap → fall back to summarized git log for
  that gap.
- `VERSION` missing upstream (older cache states) → fall back to the current SHA-based
  reporting; never fail the update over reporting.

## Out of scope

- Per-skill frontmatter versions (kept as-is; not surfaced by `/skl-update`).
- The installer one-liner in the README stays as-is except for stamping awareness — the stamp
  is written by `/skl-update` itself; a fresh manual install simply has no stamp until the
  first `/skl-update`.
