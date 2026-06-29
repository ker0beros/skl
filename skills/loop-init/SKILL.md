---
name: loop-init
description: "Bootstrap a project for the spec-loop workflow, then author its constitution. Installs the prerequisites (Spec Kit + the speckit-* skills, optional Playwright), then asks your tech stack, web-searches the best-fit code organization (melos, clean architecture, feature-first, …) for you to choose, and runs speckit-constitution to encode code-quality, testing/TDD, UX-consistency, performance, and the chosen code organization. Run this ONCE before /loop-feature or /loop-refactor."
argument-hint: "(optional) a tech-stack hint (e.g. 'flutter melos monorepo') — empty = auto-detect + ask"
compatibility: "Needs uv/uvx (for Spec Kit) and network access (web search + the spec-kit clone). Bootstraps the .specify/ structure + .specify/memory/constitution.md that /loop-feature and /loop-refactor depend on, and generates each skill's resources/project.config.md (surface + gate commands). The spec-loop skills + QA agents are installed by pulling the GitHub repo into .claude/ (see README); loop-init verifies they're present and points to that pull command if any are missing."
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/loop-init"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If non-empty, treat the input as a **tech-stack hint** to seed detection + the code-organization research. If empty, auto-detect from the repo and ask.

---

## What this command does

`/loop-init` is the **one-time setup** you run before `/loop-feature` or `/loop-refactor`. It gets the project to the point where those loops have everything they need: the Spec Kit scaffolding, the QA panel, and — crucially — a **constitution that declares the code organization** (which `/loop-refactor` Phase 0 requires as its source of truth). Three phases:

- **Phase 1 — Install prerequisites**: ensure `uv`/`uvx`, initialize **Spec Kit** (`.specify/` + the `speckit-*` skills), verify the spec-loop skills + agents are present (pulled from GitHub), **generate each skill's `project.config.md`** (surface + gate detection), check Superpowers, optionally bootstrap Playwright for web.
- **Phase 2 — Choose the code organization**: detect/ask the tech stack, **web-search** the best-fit organization, and let you pick (melos, clean architecture, feature-first, …).
- **Phase 3 — Author the constitution**: run `speckit-constitution` seeded with code-quality + testing/TDD + UX-consistency + performance principles **and the chosen code organization**, then verify it.

It is **idempotent** — safe to re-run; it skips what's already done and resumes.

> ⚠️ **Reload checkpoint.** Spec Kit installs the `speckit-*` skills into the session. If this run has to initialize Spec Kit, those skills are **not registered until you reload Claude Code** — so `/loop-init` STOPS after Phase 1 and asks you to reload, then re-run `/loop-init` (it resumes at Phase 2, skipping the install).

---

## Phase 1 — Install prerequisites

1. **Tooling.** Check `uv`/`uvx` with `command -v uvx`. If missing → install it (`brew install uv` on macOS, otherwise `curl -LsSf https://astral.sh/uv/install.sh | sh`), then re-check. Confirm `git` is present; confirm `node`/`npm` only if the surface includes web.
2. **Spec Kit.** If `.specify/` is **absent**, initialize it in the project:
   `uvx --from git+https://github.com/github/spec-kit.git specify init --here --ai claude`
   (add `--force` when the directory is non-empty — spec-kit **merges** its files in, it does **not** delete your code; if a flag errors, run `… specify init --help` and adapt). This creates `.specify/` and the `speckit-*` skills/commands.
   - **If you just created `.specify/` this run → STOP HERE.** Fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-init installed Spec Kit — reload Claude Code, then re-run /loop-init"`, tell the user to **reload Claude Code and re-run `/loop-init`**, and end the turn. The `speckit-*` skills are not invokable until the reload.
   - If `.specify/` already existed, the speckit-* skills are already registered — continue.
3. **Skills + agents present (verify).** Confirm the spec-loop skills live in `.claude/skills/loop-*/` and the agents in `.claude/agents/` (or `~/.claude/agents/`): `Jenny`, `karen`, `claude-md-compliance-checker`, `code-quality-pragmatist`, `task-completion-validator`, `ui-comprehensive-tester`, `ultrathink-debugger`, `business-analyst`, `refactoring-specialist`. If any are missing, they're installed by **pulling the GitHub repo into `.claude/`** — tell the user to run the install one-liner from the README (clone/pull `ker0beros/spec-loop` to `~/.spec-loop`, then `rsync` `skills/` + `agents/` into `.claude/`) and **reload**, or run `/loop-update`. There is no install script.
4. **Generate each skill's `project.config.md`.** For every installed skill at `.claude/skills/loop-*/resources/`, **create `project.config.md` if it doesn't already exist** (never overwrite an existing one — it's the user's). Detect the values:
   - **surface** — `pubspec.yaml` (with `melos` in it ⇒ monorepo) ⇒ `mobile`; `web/package.json`, or root `package.json` containing `"next"` ⇒ `web`; both present ⇒ `both`; otherwise default `mobile` and say so. Confirm with the user if unsure.
   - **mobile_gates** — Makefile `analyze`/`test` targets ⇒ `make analyze` / `make test`; else melos ⇒ `dart run melos run analyze` / `dart run melos run test --no-select`; else `flutter analyze` / `flutter test`.
   - **web_gates** — Makefile `web-analyze`/`web-build` ⇒ those; else `npm run lint` / `npm run build`; **web_dev_server** = `make web-dev` else `npm run dev`; **web_cwv** = `make web-cwv` only if that Makefile target exists.
   - **playwright** — `present` if `node_modules/@playwright` exists under the project / `web/` / `frontend/`, else `absent`.
   Write the file in the shape of `.claude/skills/loop-feature/resources/project.config.example.md`, with `gate_strictness: standard` and only the gate lists for the detected surface. (`/loop-gate` and `/loop-update` rely on this file existing in each skill.)
5. **Superpowers (verify + instruct).** `/loop-fix` and `/loop-design` need the Superpowers plugin (`obra/Superpowers`) — `/loop-fix` uses `systematic-debugging` + `verification-before-completion`, `/loop-design` uses `brainstorming`. Check whether those skills are available in this session. If **not**, tell the user to install it — `/plugin marketplace add obra/superpowers-marketplace` then `/plugin install superpowers@superpowers-marketplace` (or `/plugin install superpowers@claude-plugins-official`) — and **reload Claude Code**. It's a `/plugin` command, so you can't run it programmatically; just instruct.
6. **Playwright (web only, optional).** If the detected/configured `surface_default` is `web`/`both` while `playwright: absent`, offer to bootstrap it: in `.claude/skills/loop-feature/resources/`, run `npm i -D @playwright/test && npx playwright install chromium` (init a `package.json` first if absent), then set `playwright: present` in the configs. It is only needed for `/loop-feature` web parity; skip for mobile/refactor-only projects.

## Phase 2 — Choose the code organization

5. **Detect the stack.** Inspect the repo and combine with the `$ARGUMENTS` hint: `pubspec.yaml` (+ `melos` in it) ⇒ Flutter/Dart (monorepo?); `package.json` with `next`/`react` ⇒ JS/TS web; `go.mod`, `Cargo.toml`, `pyproject.toml`, etc. ⇒ the respective stack. Note whether it's greenfield (little code) or an existing codebase.
6. **Confirm the stack** with `AskUserQuestion` — present what you detected and ask for anything that changes the recommendation (domain, team size, expected scale, web/mobile/both). Fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-init awaiting stack confirmation"` before asking.
7. **Research the organization.** **WebSearch** current best-practice code organization for that stack + domain and **cite the sources**. Use `resources/code-org-playbook.md` as *starting hypotheses to confirm/refresh* — not gospel. Synthesize **2–4 concrete candidate organizations** with tradeoffs (e.g. *melos monorepo + clean architecture, feature-first*; *layered (data/domain/presentation)*; *modular monolith*; *feature-folders*), each spelled out as: package/layer topology, allowed dependency direction, naming conventions, and LOC budgets.
8. **Let the user choose** with `AskUserQuestion` (recommended option first, labeled "(Recommended)"). Fire the await-input Telegram ping before asking. Capture the chosen organization **concretely** — topology + dependency rules + naming + LOC budgets — enough for the constitution to *declare* it, not just name it.

## Phase 3 — Author the constitution

9. **Run the constitution.** Invoke `speckit-constitution` (Skill tool), seeded with this directive — the base line **verbatim**, with the chosen organization spelled out where it says *chosen code organization*:
   > Create principles focused on code quality, testing standards, user experience consistency, and performance requirements, develop using TDD, and **<the chosen code organization: stack + package/layer topology + allowed dependency direction + naming conventions + LOC budgets>**.
10. **Verify + report.** Confirm `.specify/memory/constitution.md` exists and contains:
    - a **Code Organization** principle that states the topology + dependency direction concretely (this is exactly what `/loop-refactor` Phase 0 keys on — if it's vague, edit the file to make it explicit), **and**
    - the **code-quality**, **testing/TDD**, **UX-consistency**, and **performance** principles.
    Then fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-init done — constitution seeded (<stack>, <org>)"`, present a short summary (stack, chosen org, the principle headings, the constitution path), and point to next steps: `/loop-feature <design> — <intent>` or `/loop-refactor [scope]`.

---

## Rules & invariants

- **Run once, idempotent.** Re-running skips completed steps (uv present, `.specify/` present, agents present) and resumes. **Never re-init Spec Kit over an existing `.specify/`** (don't pass `--force` to a project that already has one).
- **Reload after a fresh Spec Kit init** — the `speckit-*` skills don't register until a reload; loop-init checkpoints there rather than failing to invoke `speckit-constitution`.
- **The constitution MUST declare the code organization.** That is the contract `/loop-refactor` Phase 0 depends on — don't finish Phase 3 until the constitution states the topology + dependency direction concretely.
- **The user picks the organization.** loop-init *recommends* (web-search-backed, with citations) but the decision is the user's (`AskUserQuestion`).
- **Non-destructive.** Spec Kit init merges into the project; it never removes your code. loop-init never touches git history and never pushes.
- **Telegram** prefix `[<project>]` where `<project>` is the project root dir basename; skip silently if `~/.claude/notify-telegram.sh` is absent. Ping on the reload checkpoint, before every await-input question (stack confirm, org choice), and on completion.
