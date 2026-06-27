---
name: loop-update
description: "Update the spec-loop skills (loop-feature, loop-refactor, loop-init, loop-gate, loop-update) and the shared QA agents in THIS project to the latest version on GitHub. Refreshes the clone-to-cache at ~/.spec-loop, shows what's new, then re-runs the installer in --update mode — overwriting the skill + agent files but PRESERVING each project.config.md (your surface, gate commands, and gate_strictness). Reload Claude Code afterward so the refreshed skills register."
argument-hint: "(none) — updates the current project from origin/main"
compatibility: "Uses your existing git/GitHub auth to reach the private ker0beros/spec-loop repo (gh CLI for the first clone, git pull thereafter). Runs the bundled install.sh --update against the current project and preserves project.config.md. Needs git + gh."
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/loop-update"
user-invocable: true
disable-model-invocation: true
---

## What this command does

`/loop-update` pulls the latest spec-loop from GitHub and refreshes **this project's** installed skills + QA agents — **without** clobbering your per-project config. It is the command form of the README's clone-to-cache update one-liner.

It updates:
- the skills — `loop-feature`, `loop-refactor`, `loop-init`, `loop-gate`, `loop-update`
- the 7 shared QA agents

…and **preserves** every `.claude/skills/*/resources/project.config.md` (surface default, gate commands, and your `gate_strictness` choice from `/loop-gate`).

It does **not** touch Spec Kit / the `speckit-*` skills (update those with spec-kit's own tooling), your `specs/`, or your code.

---

## Steps

1. **Refresh the source cache** (`~/.spec-loop`), recording the revision first so you can show a diff:
   - If `~/.spec-loop` exists → save `OLD=$(git -C ~/.spec-loop rev-parse --short HEAD)`, then `git -C ~/.spec-loop pull -q`.
   - Else → `gh repo clone ker0beros/spec-loop ~/.spec-loop` (the repo is **private** — this uses your `gh auth`; if it fails, tell the user to `gh auth login` rather than guessing). Treat `OLD` as empty (fresh clone).
   - Capture `NEW=$(git -C ~/.spec-loop rev-parse --short HEAD)`.
2. **Show what's new.** If `OLD` is set and `OLD != NEW`, print `git -C ~/.spec-loop log --oneline "$OLD..$NEW"` so the user sees the incoming changes. If `OLD == NEW`, report **"already up to date"** and **stop** — nothing to install.
3. **Re-install into this project (update mode).** Run `~/.spec-loop/install.sh "$PWD" --update`. This overwrites the skill + agent files with the latest but **keeps** each `project.config.md`. Match the original install's agent location: if this project has **no** `.claude/agents/` but the agents live in `~/.claude/agents/`, add `--agents-global`.
4. **Report + reload.** Summarize what the installer changed (it prints `overwrote …` / `KEEP existing config …` lines) and confirm configs were preserved. Fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-update done — ${OLD:-fresh}→$NEW"`, then tell the user to **reload Claude Code** so the refreshed skill versions register.

---

## Rules & invariants

- **Config is preserved.** `--update` never regenerates `project.config.md` — your surface, gate commands, and `gate_strictness` survive. (Only `install.sh --force` resets them; don't use `--force` here.)
- **Skills + agents only.** Doesn't update Spec Kit, your `specs/`, or your code.
- **Private repo over your own auth.** First clone uses `gh`; later updates use `git pull`. On an auth/network failure, surface the real error — don't fall back to a stale or guessed source.
- **Idempotent.** If already at `origin/main`, it's a no-op that reports "up to date".
- **Reload required** for the new skill versions to take effect in Claude Code.
- **Telegram** prefix `[<project>]` (project root basename); skip silently if `~/.claude/notify-telegram.sh` is absent.
