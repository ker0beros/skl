---
name: skl-gate
description: "Choose how strict the QA gates are for /skl-feature and /skl-refactor, the way /effort chooses reasoning effort — a 3-stop slider: strict, standard, or low. strict = a round passes only at 0 Critical/High/Medium/Low/Info (even info-level lints must be clean). standard (default) = 0 Critical/High/Medium/Low (Info ignored). low = 0 Critical/High/Medium (Low + Info ignored, only Medium-and-above blocks). Writes gate_strictness into every installed skill's project.config.md."
argument-hint: "(optional) strict | standard | low — empty shows the slider picker"
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/skl-gate"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If the input names a mode, set it **directly** (skip the picker): `strict` → **strict**; `standard` / `default` → **standard**; `low` / `lenient` / `relaxed` → **low**. Anything else (or empty) → show the slider picker.

---

## What this command does

`/skl-gate` is the QA-gate analogue of `/effort`: it sets **how strict the pass threshold is** for `/skl-feature` and `/skl-refactor`. The setting lives as `gate_strictness:` in each skill's `resources/project.config.md`, and both loops read it when they evaluate the QA panel.

| Mode | A QA round passes at | What's logged (non-blocking) |
|------|----------------------|------------------------------|
| **strict** | 0 Critical · 0 High · 0 Medium · 0 Low · **0 Info** | nothing — even info-level lints must be clean |
| **standard** *(default)* | 0 Critical · 0 High · 0 Medium · **0 Low** | **Info** (info-level lints) |
| **low** | 0 Critical · 0 High · 0 Medium | **Low + Info** |

**Medium and above always block** in every mode. The modes differ at the bottom of the severity ladder (Critical › High › Medium › Low › Info):
- **strict** blocks all the way down to **Info** — info-level lint diagnostics included, so the analyze gate must be clean of infos (e.g. `--fatal-infos` / `--max-warnings 0`), not merely exit 0.
- **standard** *(default)* blocks down to **Low**, but **ignores Info**.
- **low** blocks only **Medium and above** — **Low and Info** pass (logged as non-blocking debt).

A config missing the field is read as **standard**.

---

## Steps

1. **Find the configs.** List `.claude/skills/*/resources/project.config.md` (every installed spec-loop skill carries one). If there are **none**, tell the user to run `/skl-init` first (it generates them) and stop — there's nothing to set.
2. **Read the current mode.** `grep` `gate_strictness:` in the first config (treat absent as `standard`). You'll show it as the current position and pre-select it.
3. **Decide the target mode.**
   - If `$ARGUMENTS` named one → use it.
   - Otherwise **show the slider picker.** First fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-gate awaiting choice"`, then call `AskUserQuestion` with the **three** options below. **List the current mode first** and append " · current" to its label so the slider opens on today's setting. Use these exact previews — the filled knob ● moves across the three stops (strict ↔ standard ↔ low), the "moving arrow":

     **Strict** — preview:
     ```
      strict ●━━━━━━○━━━━━━○ low
             ▲ strict

      passes ONLY at
        0 Crit · 0 High · 0 Med · 0 Low · 0 Info
      even Low + info-level lints must be clean
     ```
     description: "Tightest gates. Blocks all the way down to info-level lint diagnostics, so nothing is left as debt — at the cost of more iterations to converge."

     **Standard** — preview:
     ```
      strict ○━━━━━━●━━━━━━○ low
                    ▲ standard

      passes at
        0 Crit · 0 High · 0 Med · 0 Low
      Info (info-level lints) logged, non-blocking
     ```
     description: "Default. Blocks down to Low, but ignores info-level lints (logged as non-blocking debt)."

     **Low** — preview:
     ```
      strict ○━━━━━━○━━━━━━● low
                           ▲ low

      passes at
        0 Crit · 0 High · 0 Med
      Low + Info logged, non-blocking
     ```
     description: "Loosest. Only Medium-and-above blocks; Low findings and info-level lints both pass (logged). Fastest to converge."
4. **Apply to every config.** For each `project.config.md` found, set the mode: if a `gate_strictness:` line exists, replace its value; if not, add the line (right after `playwright:` if present, else near the top). Keep the trailing explanatory comment. Update **all** of them so `/skl-feature` and `/skl-refactor` agree.
5. **Confirm.** Print the chosen mode, the resulting pass threshold (the table row), and the list of config files updated. Fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-gate set to <mode>"`. The change takes effect on the **next** `/skl-feature` or `/skl-refactor` run (the loops read `gate_strictness` when they evaluate the panel) — no reload needed.

---

## Rules & invariants

- **Three stops on one axis.** Critical/High/Medium **always** block. `strict` also blocks Low **and** Info; `standard` also blocks Low (Info ignored); `low` blocks neither (only Medium-and-above). The picker just slides between these three.
- **Default is standard.** A fresh install writes `gate_strictness: standard`; a config missing the field is read as standard.
- **Write to every installed skill's config** so the loops don't disagree.
- **Idempotent.** Re-running with the same mode is a no-op beyond rewriting the same value.
- **Telegram** prefix `[<project>]` (project root basename); skip silently if `~/.claude/notify-telegram.sh` is absent. Ping before the picker (await) and on apply.
