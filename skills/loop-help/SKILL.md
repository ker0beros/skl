---
name: loop-help
description: "List every spec-loop command with a one-line explanation and the recommended workflow. Reads the installed loop-* skills so the list always reflects what's actually available. Pass a command name (e.g. loop-run) for its full details."
argument-hint: "(optional) a command name for full detail, e.g. loop-run — empty lists everything"
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/loop-help"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If the input names a specific command (with or without the leading `/`, e.g. `loop-run` or
`/loop-run`), show **just that one** in full. Otherwise list **all** commands.

---

## What this command does

`/loop-help` prints the spec-loop command reference. It is **read-only** — it discovers the installed
skills and renders them; it changes nothing and needs no approval or Telegram ping.

To stay accurate as the toolkit evolves, it reads the **live frontmatter** of the installed skills
rather than a hard-coded list.

---

## Steps

1. **Enumerate the installed loop skills.** List `.claude/skills/loop-*/SKILL.md` (the skills registered
   in this project). For each, read its frontmatter `name`, `argument-hint`, and `description`.
2. **Detail mode (`$ARGUMENTS` names a command).** Print that skill's `name`, `argument-hint`, the full
   `description`, and a short bullet list of its key rules/invariants (from the SKILL.md's "Rules &
   invariants" section). Done.
3. **List mode (no argument).** Print a compact reference, **grouped in this order** (omit a group if
   none of its skills are installed; put any unrecognized `loop-*` skill under **Other**). For each
   command show `/<name> <argument-hint>` and the **first sentence** of its `description`:

   - **Setup** — `loop-init`
   - **Build a feature** — `loop-feature` (single, end-to-end)
   - **Plan & batch** — `loop-plan` (queue specs) · `loop-run` (run one/multiple/all)
   - **Maintain** — `loop-refactor` (toward the constitution) · `loop-fix` (root-cause bug fixes)
   - **Controls** — `loop-gate` (QA strictness)
   - **Ops** — `loop-update` (pull latest) · `loop-resume` (continue after a usage-limit reset)
   - **Help** — `loop-help`

4. **Append the workflow + notes** (after the list):

   > **Typical flow:** `loop-init` once → then `loop-feature` for a single feature, **or** `loop-plan`
   > ×N to queue specs then `loop-run` to batch them. Use `loop-refactor` / `loop-fix` on existing
   > code, `loop-gate` to set strictness, `loop-resume` if a usage limit interrupts a long run, and
   > `loop-update` to pull the latest.
   >
   > **Notes:** per-project config (surface, gate commands, `gate_strictness`) lives in each skill's
   > `resources/project.config.md`. `loop-feature` / `loop-plan` take an **optional** claude.ai/design
   > reference (design-driven) or work from plain text (text-only). `loop-fix` needs the **Superpowers**
   > plugin. The QA loops pass at 0 Critical / 0 High / 0 Medium (plus Low/Info per `loop-gate`).

---

## Rules & invariants

- **Read-only.** Lists/explains only — never edits, runs a loop, or fires Telegram.
- **Dynamic.** Always reflect the installed `loop-*` skills; don't invent commands that aren't present,
  and do include any new `loop-*` skill found (under **Other** if it doesn't fit a known group).
- **Concise in list mode** (one line per command); **full** in detail mode.
