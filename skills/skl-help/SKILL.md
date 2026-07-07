---
name: skl-help
description: "List every skl command with a one-line explanation and the recommended workflow. Reads the installed skl-* skills so the list always reflects what's actually available. Pass a command name (e.g. skl-do) for its full details."
argument-hint: "(optional) a command name for full detail, e.g. skl-do — empty lists everything"
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

If the input names a specific command (with or without the leading `/`, e.g. `skl-do` or
`/skl-do`), show **just that one** in full. Otherwise list **all** commands.

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

   - **Setup** — `skl-init` · `skl-telegram` (set up Telegram notifications)
   - **Tickets** — `skl-ticket` (file an issue on GitHub/GitLab/Jira) · `skl-do` (build the oldest `loop-ready` ticket into a PR, then stop)
   - **Controls** — `skl-strictness` (QA strictness)
   - **Ops** — `skl-update` (pull latest) · `skl-resume` (continue after a usage-limit reset)
   - **Help** — `skl-help` · `skl-next` (what should I do now?)

4. **Append the workflow + notes** (after the list):

   > **Typical flow:** `skl-init` once. Then the ticket flow: **1)** plan with Superpowers
   > (`brainstorming` a feature or `systematic-debugging` a bug), **2)** capture it as a ticket with
   > `skl-ticket` (GitHub/GitLab), **3)** review the ticket, label it `loop-ready`, and run
   > `skl-do` — it builds the oldest `loop-ready` ticket into a PR, then **stops**; you
   > review & merge the PR, then re-run it for the next. Use `skl-strictness` to set QA strictness,
   > `skl-resume` if a usage limit or a context `/clear` interrupts a run (it continues from the
   > checkpoint), and `skl-update` to pull the latest. Not sure what's next? `skl-next` triages your
   > issues / PRs into one recommended step.
   >
   > **Notes:** per-project config (surface, gate commands, `gate_strictness`) lives in each skill's
   > `resources/project.config.md`. A ticket can name a **claude.ai/design** reference for a
   > design-driven build (else `skl-do` builds text-only). The QA loop passes at 0 Critical / 0 High /
   > 0 Medium (plus Low/Info per `skl-strictness`). The planning step (step 1) uses the **Superpowers** plugin.

---

## Rules & invariants

- **Read-only.** Lists/explains only — never edits, runs a loop, or fires Telegram.
- **Dynamic.** Always reflect the installed `skl-*` skills; don't invent commands that aren't present,
  and do include any new `skl-*` skill found (under **Other** if it doesn't fit a known group).
- **Concise in list mode** (one line per command); **full** in detail mode.
