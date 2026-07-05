---
name: skl-update
description: "Update this project's skl install to the latest version on GitHub. Reports your installed → new version and prints the changelog of what's new. Pulls the latest from the main branch of ker0beros/skl and syncs all the skl-* skills + the shared agents into this project's .claude/, PRESERVING each resources/project.config.md (your surface, gate commands, gate_strictness). Does not run the installer script. Reload Claude Code afterward so the refreshed skills register."
argument-hint: "(none) — updates the current project from origin/main"
compatibility: "Uses your existing git/GitHub auth to reach the private ker0beros/skl repo (gh CLI for the first clone, git fetch thereafter). Syncs the skill + agent files directly and preserves project.config.md. Needs git + gh."
metadata:
  author: "khairul"
  version: "1.2.0"
  source: "skills/skl-update"
user-invocable: true
disable-model-invocation: true
---

## What this command does

`/skl-update` pulls the latest skl from the **`main` branch on GitHub** and **syncs the files
directly** into **this project's** `.claude/` — without running the installer script and without
clobbering your per-project config.

It makes this project's installed copy match `origin/main` exactly:
- **all the `skl-*` skills** (every `skills/*/` from the repo — their `SKILL.md` + resources), and
- **the shared agents** (the QA panel + the specialist agents in `agents/`).

Every run reports **your installed version → the incoming version** and prints the
`CHANGELOG.md` entries in between (both files live at the repo root), then records the
installed version in `.claude/.skl-version`.

…and **preserves** every `.claude/skills/*/resources/project.config.md` (surface default, gate
commands, and your `gate_strictness` choice from `/skl-gate`).

It does **not** touch Spec Kit / the `speckit-*` skills, your
`specs/`, or your code.

---

## Steps

1. **Pull the latest `main` into the cache** (`~/.skl`, a throwaway mirror of the repo):
   - If `~/.skl` exists → record `OLD=$(git -C ~/.skl rev-parse --short HEAD)`, then
     `git -C ~/.skl fetch origin` and force it to exactly match main:
     `git -C ~/.skl checkout main && git -C ~/.skl reset --hard origin/main`.
   - Else → `gh repo clone ker0beros/skl ~/.skl` (the repo is **private** — this uses your
     `gh` auth; if it fails, surface the real error / tell the user to `gh auth login` rather than
     guessing). Treat `OLD` as empty (fresh clone).
   - Capture `NEW=$(git -C ~/.skl rev-parse --short HEAD)`.
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
3. **Sync the files directly into this project**, preserving config:
   - **Skills** — for each skill dir in `~/.skl/skills/*/`, copy its `SKILL.md` and everything
     under `resources/` into `.claude/skills/<skill>/`, **excluding `resources/project.config.md`**
     (never overwrite it). New skills in `main` are added; existing ones are overwritten to match `main`.
     Per skill, e.g.: `rsync -a --exclude=project.config.md "$d"/ ".claude/skills/$(basename "$d")/"`
     (or copy each file except `project.config.md`).
   - **Agents** — copy `~/.skl/agents/*.md` into the project's agents dir. Use `.claude/agents/`
     if it exists; otherwise, if the agents live in `~/.claude/agents/`, sync there (match how they were
     originally installed).
   - **Version stamp** — `cp ~/.skl/VERSION .claude/.skl-version` so the next run knows the
     installed version (skip silently if `VERSION` is absent upstream).
   - **Do not** regenerate or delete any `project.config.md`; **do not** touch Spec Kit, `specs/`, or
     the user's code.
4. **Report + reload.** List which skills + agents were updated and confirm each `project.config.md`
   was kept. Fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-update done — ${CURR_V:-fresh}→${NEW_V:-$NEW}"`,
   then tell the user to **reload Claude Code** so the refreshed skill versions register.

---

## Rules & invariants

- **Pull from `main`, sync directly.** The source of truth is `origin/main` of `ker0beros/skl`;
  the cache is force-reset to it, then the skill + agent files are copied into `.claude/`.
- **Config is preserved.** `project.config.md` is never overwritten, regenerated, or deleted — your
  surface, gate commands, and `gate_strictness` survive untouched.
- **Version + changelog are the report.** `VERSION` + `CHANGELOG.md` at the repo root drive
  the "what's new" output; `.claude/.skl-version` records what's installed in the project.
  Reporting failures fall back to SHA output and never block the sync.
- **Skills + agents only.** Doesn't update Spec Kit, your `specs/`, or your code.
- **Exact match to `main`.** After it runs, the project's `skl-*` skills + agents equal `origin/main`
  (minus your preserved configs).
- **Private repo over your own auth.** First clone uses `gh`; later updates use `git fetch`. On an
  auth/network failure, surface the real error — don't fall back to a stale or guessed source.
- **Idempotent.** If already at `origin/main`, it's a no-op that reports "up to date".
- **Reload required** for the new skill versions to take effect in Claude Code.
- **Telegram** prefix `[<project>]` (project root basename); skip silently if `~/.claude/notify-telegram.sh` is absent.
