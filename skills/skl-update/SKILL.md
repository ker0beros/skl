---
name: skl-update
description: "Update this project's spec-loop install to the latest version on GitHub. Pulls the latest from the main branch of ker0beros/spec-loop and syncs all the skl-* skills + the shared agents into this project's .claude/, PRESERVING each resources/project.config.md (your surface, gate commands, gate_strictness). Does not run the installer script. Reload Claude Code afterward so the refreshed skills register."
argument-hint: "(none) — updates the current project from origin/main"
compatibility: "Uses your existing git/GitHub auth to reach the private ker0beros/spec-loop repo (gh CLI for the first clone, git fetch thereafter). Syncs the skill + agent files directly and preserves project.config.md. Needs git + gh."
metadata:
  author: "khairul"
  version: "1.1.0"
  source: "skills/skl-update"
user-invocable: true
disable-model-invocation: true
---

## What this command does

`/skl-update` pulls the latest spec-loop from the **`main` branch on GitHub** and **syncs the files
directly** into **this project's** `.claude/` — without running the installer script and without
clobbering your per-project config.

It makes this project's installed copy match `origin/main` exactly:
- **all the `skl-*` skills** (every `skills/*/` from the repo — their `SKILL.md` + resources), and
- **the shared agents** (the QA panel + the specialist agents in `agents/`).

…and **preserves** every `.claude/skills/*/resources/project.config.md` (surface default, gate
commands, and your `gate_strictness` choice from `/skl-gate`).

It does **not** touch Spec Kit / the `speckit-*` skills, your
`specs/`, or your code.

---

## Steps

1. **Pull the latest `main` into the cache** (`~/.spec-loop`, a throwaway mirror of the repo):
   - If `~/.spec-loop` exists → record `OLD=$(git -C ~/.spec-loop rev-parse --short HEAD)`, then
     `git -C ~/.spec-loop fetch origin` and force it to exactly match main:
     `git -C ~/.spec-loop checkout main && git -C ~/.spec-loop reset --hard origin/main`.
   - Else → `gh repo clone ker0beros/spec-loop ~/.spec-loop` (the repo is **private** — this uses your
     `gh` auth; if it fails, surface the real error / tell the user to `gh auth login` rather than
     guessing). Treat `OLD` as empty (fresh clone).
   - Capture `NEW=$(git -C ~/.spec-loop rev-parse --short HEAD)`.
2. **Show what's new.** If `OLD` is set and `OLD != NEW`, print `git -C ~/.spec-loop log --oneline
   "$OLD..$NEW"` so the user sees the incoming changes. If `OLD == NEW`, report **"already up to date"**
   and **stop** — nothing to sync.
3. **Sync the files directly into this project**, preserving config:
   - **Skills** — for each skill dir in `~/.spec-loop/skills/*/`, copy its `SKILL.md` and everything
     under `resources/` into `.claude/skills/<skill>/`, **excluding `resources/project.config.md`**
     (never overwrite it). New skills in `main` are added; existing ones are overwritten to match `main`.
     Per skill, e.g.: `rsync -a --exclude=project.config.md "$d"/ ".claude/skills/$(basename "$d")/"`
     (or copy each file except `project.config.md`).
   - **Agents** — copy `~/.spec-loop/agents/*.md` into the project's agents dir. Use `.claude/agents/`
     if it exists; otherwise, if the agents live in `~/.claude/agents/`, sync there (match how they were
     originally installed).
   - **Do not** regenerate or delete any `project.config.md`; **do not** touch Spec Kit, `specs/`, or
     the user's code.
4. **Report + reload.** List which skills + agents were updated and confirm each `project.config.md`
   was kept. Fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-update done — ${OLD:-fresh}→$NEW"`,
   then tell the user to **reload Claude Code** so the refreshed skill versions register.

---

## Rules & invariants

- **Pull from `main`, sync directly.** The source of truth is `origin/main` of `ker0beros/spec-loop`;
  the cache is force-reset to it, then the skill + agent files are copied into `.claude/`.
- **Config is preserved.** `project.config.md` is never overwritten, regenerated, or deleted — your
  surface, gate commands, and `gate_strictness` survive untouched.
- **Skills + agents only.** Doesn't update Spec Kit, your `specs/`, or your code.
- **Exact match to `main`.** After it runs, the project's `skl-*` skills + agents equal `origin/main`
  (minus your preserved configs).
- **Private repo over your own auth.** First clone uses `gh`; later updates use `git fetch`. On an
  auth/network failure, surface the real error — don't fall back to a stale or guessed source.
- **Idempotent.** If already at `origin/main`, it's a no-op that reports "up to date".
- **Reload required** for the new skill versions to take effect in Claude Code.
- **Telegram** prefix `[<project>]` (project root basename); skip silently if `~/.claude/notify-telegram.sh` is absent.
