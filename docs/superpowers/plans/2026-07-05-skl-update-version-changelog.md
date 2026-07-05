# /skl-update Version + Changelog Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every `/skl-update` run reports installed → incoming version and prints the human-readable changelog of what's new.

**Architecture:** Two new plain-text release artifacts at the repo root (`VERSION`, `CHANGELOG.md`) drive the report; `/skl-update`'s SKILL.md instructions are rewritten to read them and to stamp `.claude/.skl-version` into the consuming project on every sync. A repo `CLAUDE.md` rule keeps the artifacts maintained.

**Tech Stack:** Markdown/plain text only — this repo is a collection of SKILL.md instruction files. There is no test harness; each task's "test" is an explicit `grep` verification of the written content.

**Spec:** `docs/superpowers/specs/2026-07-05-skl-update-version-changelog-design.md`

## Global Constraints

- New version is exactly `1.1.0`; baseline entry is `1.0.0`; release date for both is `2026-07-05`.
- Stamp file path in consuming projects is exactly `.claude/.skl-version`.
- Reporting must NEVER block the sync — every version/changelog failure path falls back to the existing SHA-based output.
- `project.config.md` preservation invariants in `skills/skl-update/SKILL.md` must remain untouched.
- All work happens on the current `dev` branch; commit after each task.

---

### Task 1: Add `VERSION` and `CHANGELOG.md` at the repo root

**Files:**
- Create: `VERSION`
- Create: `CHANGELOG.md`

**Interfaces:**
- Produces: `VERSION` (single line `1.1.0`) and `CHANGELOG.md` with `## <semver> — <YYYY-MM-DD>` section headings — Task 2's SKILL.md text refers to both files by these exact names/formats.

- [x] **Step 1: Create `VERSION`**

File content (single line, trailing newline):

```
1.1.0
```

- [x] **Step 2: Create `CHANGELOG.md`**

```markdown
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
```

- [x] **Step 3: Verify**

Run: `cat VERSION && grep -c '^## ' CHANGELOG.md`
Expected: `1.1.0` and `2`

- [x] **Step 4: Commit**

```bash
git add VERSION CHANGELOG.md
git commit -m "feat: add VERSION + CHANGELOG.md release artifacts"
```

---

### Task 2: Rewrite `/skl-update` to report version + changelog and stamp the project

**Files:**
- Modify: `skills/skl-update/SKILL.md`

**Interfaces:**
- Consumes: `~/.skl/VERSION` and `~/.skl/CHANGELOG.md` from Task 1 (via the `~/.skl` cache).
- Produces: the stamp file contract `.claude/.skl-version` (single semver line) that future runs read.

- [x] **Step 1: Update the frontmatter**

Bump `version: "1.1.0"` → `version: "1.2.0"`. In `description:`, after the first sentence ("Update this project's skl install to the latest version on GitHub."), insert:

```
Reports your installed → new version and prints the changelog of what's new.
```

- [x] **Step 2: Extend the "What this command does" section**

After the bullet list ending "…the shared agents (the QA panel + the specialist agents in `agents/`).", add one paragraph:

```markdown
Every run reports **your installed version → the incoming version** and prints the
`CHANGELOG.md` entries in between (both files live at the repo root), then records the
installed version in `.claude/.skl-version`.
```

- [x] **Step 3: Replace step 2 of `## Steps`**

Replace the entire current step 2 ("**Show what's new.** If `OLD` is set …") with:

```markdown
2. **Show version + changelog.** Resolve the versions — reporting must never block the sync;
   if anything here fails (missing files, old cache state), fall back to the SHA-based output
   and continue:
   - `NEW_V=$(cat ~/.skl/VERSION 2>/dev/null)` — the incoming version.
   - `CURR_V` — the installed version: `.claude/.skl-version` if it exists; else, if `OLD` is
     set, `git -C ~/.skl show "$OLD:VERSION"` (absent in pre-1.1.0 states); else unknown.
   - If `OLD == NEW` → report **"skl $NEW_V — already up to date"** and **stop** — nothing to
     sync. (If `.claude/.skl-version` is missing, write `NEW_V` to it first so the next run
     knows the installed version.)
   - If `OLD` is empty (fresh clone) → print **"skl — fresh install at $NEW_V"** and show the
     top (latest) section of `~/.skl/CHANGELOG.md`.
   - Otherwise → print **`skl ${CURR_V:-?} → $NEW_V`**, then the changelog: every
     `## <version>` section of `~/.skl/CHANGELOG.md` from the top of the file down to — and
     excluding — the `## $CURR_V` heading. If `CURR_V` is unknown or the changelog has no
     section covering the gap, summarize `git -C ~/.skl log --oneline "$OLD..$NEW"` into
     readable bullets instead. Either way, also print the raw
     `git -C ~/.skl log --oneline "$OLD..$NEW"` beneath as supplementary detail.
```

- [x] **Step 4: Add the version stamp to step 3 of `## Steps`**

After the **Agents** bullet and before the "**Do not** regenerate…" bullet, insert:

```markdown
   - **Version stamp** — `cp ~/.skl/VERSION .claude/.skl-version` so the next run knows the
     installed version (skip silently if `VERSION` is absent upstream).
```

- [x] **Step 5: Make step 4 of `## Steps` version-based**

Replace the Telegram sentence in step 4 with:

```markdown
   Fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-update done — ${CURR_V:-fresh}→${NEW_V:-$NEW}"`,
```

(The `${NEW_V:-$NEW}` fallback keeps the SHA when `VERSION` is absent upstream.)

- [x] **Step 6: Add the invariant to `## Rules & invariants`**

After the "**Config is preserved.**" bullet, insert:

```markdown
- **Version + changelog are the report.** `VERSION` + `CHANGELOG.md` at the repo root drive
  the "what's new" output; `.claude/.skl-version` records what's installed in the project.
  Reporting failures fall back to SHA output and never block the sync.
```

- [x] **Step 7: Verify**

Run: `grep -c '.skl-version' skills/skl-update/SKILL.md && grep -n 'CURR_V\|NEW_V' skills/skl-update/SKILL.md | head -3 && grep -n 'version: "1.2.0"' skills/skl-update/SKILL.md`
Expected: count ≥ 4; CURR_V/NEW_V hits in step 2; the frontmatter line number for 1.2.0.

- [x] **Step 8: Commit**

```bash
git add skills/skl-update/SKILL.md
git commit -m "feat(skl-update): report version + changelog, stamp .claude/.skl-version"
```

---

### Task 3: Add the maintenance rule (repo `CLAUDE.md`) and README pointer

**Files:**
- Create: `CLAUDE.md`
- Modify: `README.md` (the `## Updating` section, after the "By hand…" paragraph ending line 305)

**Interfaces:**
- Consumes: the `VERSION`/`CHANGELOG.md` names and formats from Task 1.

- [x] **Step 1: Create `CLAUDE.md`**

```markdown
# skl repo instructions

## Release rule: VERSION + CHANGELOG.md

Any change to `skills/` or `agents/` that lands on `main` MUST, in the same change:

1. Bump `VERSION` (semver — wording/fix = patch, new behavior or new skill/agent = minor,
   breaking workflow change = major).
2. Add a matching `## <version> — <YYYY-MM-DD>` section at the TOP of `CHANGELOG.md`, one
   bullet per user-visible change.

`/skl-update` reads both files to show users what's new — an unbumped `VERSION` means users
never see a changelog for your change.
```

- [x] **Step 2: Add the README pointer**

In `README.md`, after the paragraph ending "…makes it safe to re-run as an update)." (line 305) and before `## Credits`, insert:

```markdown
Every release bumps the root `VERSION` and adds a `CHANGELOG.md` entry (rule in `CLAUDE.md`),
so `/skl-update` can show you installed → new version and exactly what changed.
```

- [x] **Step 3: Verify**

Run: `grep -n 'Release rule' CLAUDE.md && grep -n 'CHANGELOG.md' README.md`
Expected: the rule heading in CLAUDE.md; one hit in README's Updating section.

- [x] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: release rule (VERSION + CHANGELOG.md) and README pointer"
```
