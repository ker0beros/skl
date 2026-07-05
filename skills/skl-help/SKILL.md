---
name: skl-help
description: "List every skl command with a one-line explanation and the recommended workflow. Reads the installed skl-* skills so the list always reflects what's actually available. Pass a command name (e.g. skl-run) for its full details."
argument-hint: "(optional) a command name for full detail, e.g. skl-run — empty lists everything"
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/skl-help"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If the input names a specific command (with or without the leading `/`, e.g. `skl-run` or
`/skl-run`), show **just that one** in full. Otherwise list **all** commands.

---

## What this command does

`/skl-help` prints the skl command reference. It is **read-only** — it discovers the installed
skills and renders them; it changes nothing and needs no approval or Telegram ping.

To stay accurate as the toolkit evolves, it reads the **live frontmatter** of the installed skills
rather than a hard-coded list.

---

## Steps

1. **Enumerate the installed loop skills.** List `.claude/skills/skl-*/SKILL.md` (the skills registered
   in this project). For each, read its frontmatter `name`, `argument-hint`, and `description`.
2. **Detail mode (`$ARGUMENTS` names a command).** Print that skill's `name`, `argument-hint`, the full
   `description`, and a short bullet list of its key rules/invariants (from the SKILL.md's "Rules &
   invariants" section). Done.
3. **List mode (no argument).** Print a compact reference, **grouped in this order** (omit a group if
   none of its skills are installed; put any unrecognized `skl-*` skill under **Other**). For each
   command show `/<name> <argument-hint>` and the **first sentence** of its `description`:

   - **Setup** — `skl-init`
   - **Build a feature** — `skl-feature` (single, end-to-end)
   - **Plan & batch** — `skl-plan` (queue specs) · `skl-run` (run one/multiple/all)
   - **Maintain** — `skl-refactor` (toward the constitution) · `skl-fix` (root-cause bug fixes)
   - **Controls** — `skl-gate` (QA strictness)
   - **Ops** — `skl-update` (pull latest) · `skl-resume` (continue after a usage-limit reset)
   - **Help** — `skl-help` · `skl-next-step` (what should I do now?)

4. **Append the workflow + notes** (after the list):

   > **Typical flow:** `skl-init` once → then `skl-feature` for a single feature, **or** `skl-plan`
   > ×N to queue specs then `skl-run` to batch them. Use `skl-refactor` / `skl-fix` on existing
   > code, `skl-gate` to set strictness, `skl-resume` if a usage limit interrupts a long run, and
   > `skl-update` to pull the latest. Not sure what's next? `skl-next-step` triages your
   > issues / PRs / plans into one recommended step.
   >
   > **Notes:** per-project config (surface, gate commands, `gate_strictness`) lives in each skill's
   > `resources/project.config.md`. `skl-feature` / `skl-plan` take an **optional** claude.ai/design
   > reference (design-driven) or work from plain text (text-only). `skl-fix` needs the **Superpowers**
   > plugin. The QA loops pass at 0 Critical / 0 High / 0 Medium (plus Low/Info per `skl-gate`).

---

## Rules & invariants

- **Read-only.** Lists/explains only — never edits, runs a loop, or fires Telegram.
- **Dynamic.** Always reflect the installed `skl-*` skills; don't invent commands that aren't present,
  and do include any new `skl-*` skill found (under **Other** if it doesn't fit a known group).
- **Concise in list mode** (one line per command); **full** in detail mode.
