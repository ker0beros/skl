---
name: loop-design
description: "Generate a ready-to-paste Claude Design prompt for a feature, then auto-write the plan. Asks whether your design system already exists in Claude Design (and helps you define one step-by-step if not), which platforms to design for (mobile / tablet / web — some or all), and the feature flow; uses Superpowers brainstorming to expand the flow into screens/states/interactions, writes the Claude Design prompt, then chains into /loop-plan to produce the numbered, ready-to-run spec."
argument-hint: "(optional) the feature flow to design — empty = the skill asks for it"
compatibility: "Requires the Superpowers plugin (obra/Superpowers) for its brainstorming skill, and pairs with /loop-plan (which needs the .specify/ spec-kit structure + speckit-* skills) to write the plan. An existing design system can be referenced via the DesignSync tool (read-only). Reads resources/project.config.md for surface defaults."
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/loop-design"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If non-empty, treat the input as the **feature flow** to design (the user journey / screens to
brainstorm). If empty, the skill will ask for it.

---

## What this command does

`/loop-design` is the **upstream design-ideation** step: it turns a rough feature idea into a
**well-structured Claude Design prompt** you can paste into claude.ai/design, and then **auto-writes
the plan** so the feature is queued for implementation. The flow:

1. **Design system** — confirm yours is defined in Claude Design, or get step-by-step help defining one.
2. **Platforms** — pick mobile / tablet (iPad) / web (some or all) → target viewports + breakpoints.
3. **Feature flow** — brainstorm it (Superpowers `brainstorming`) into screens, states, interactions.
4. **Write the Claude Design prompt** (ready to paste into claude.ai/design).
5. **Auto-proceed** — chain into `/loop-plan` to create the numbered, ready-to-run spec.

It **writes a prompt**, it does not create the design in your Claude Design account (DesignSync is used
read-only, at most to confirm an existing design system). You paste the prompt into claude.ai/design to
generate the UI; the plan it writes is then run by `/loop-run` (or `/loop-feature`).

> **Superpowers required.** `brainstorming` comes from the Superpowers plugin (`obra/Superpowers`).
> Invoke it via the **Skill tool** (try `superpowers:brainstorming`, fall back to `brainstorming`). If
> it isn't available, tell the user to install Superpowers (`/plugin marketplace add
> obra/superpowers-marketplace` → `/plugin install superpowers@superpowers-marketplace`) and reload —
> or run `/loop-init`, which checks for it.

---

## Steps

1. **Design system check.** Fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-design awaiting design-system answer"`, then `AskUserQuestion`: *"Is your design system already defined in Claude Design?"*
   - **Yes** → ask the user for the Claude Design project / design-system **reference** (name or UUID). Optionally confirm it is readable via `DesignSync` read methods only (`list_projects` → `get_project`); **never** write to it. Use it as the visual foundation the prompt anchors to.
   - **No** → **assist step-by-step.** Follow `resources/design-system-checklist.md`, using Superpowers `brainstorming` to settle, one at a time: brand/tone, color palette (+ semantic roles), typography scale, spacing/grid, core components, theming (light/dark), and an accessibility baseline. Write the result as a **design-system prompt** to `.loop-design/design-system-prompt.md` for the user to create the system in Claude Design first.
2. **Platforms.** Fire the await ping, then `AskUserQuestion` (**multiSelect: true**): **Mobile**, **Tablet (iPad)**, **Web** — the user picks some or all. Map each to target viewports + breakpoints (see the template) so the prompt asks Claude Design for the right responsive layouts.
3. **Feature flow + brainstorm.** Use `$ARGUMENTS` as the feature flow if given; otherwise ask the user to describe it. Then invoke Superpowers **`brainstorming`** (Skill tool) to expand it into: the **user journey**, a **screen list**, **per-screen states** (empty / loading / error / success / edge cases), **key interactions**, and **motion/animation** notes. Keep the user in the loop on the big forks.
4. **Write the Claude Design prompt.** Synthesize the design system + selected platforms + the brainstorm into a structured prompt using `resources/claude-design-prompt-template.md`. Save it to `.loop-design/<slug>/claude-design-prompt.md`. **Present it in plain language** — write for a **non-technical reader**, translate jargon, keep it skimmable:
   - **What we'll design** — 1–2 plain sentences on the feature.
   - **The screens** — the screen list in everyday words (and the key states each shows, e.g. "empty", "loading", "error").
   - **Where it works** — the platforms in plain terms (e.g. "phone, iPad, and web").
   - **What to do next** — "Copy the prompt below into claude.ai/design to generate the look" (and, if Step 1 produced a design-system prompt, "create the design system first using `design-system-prompt.md`"). Then show/point to the prompt file.
5. **Auto-proceed — write the plan.** Invoke **`/loop-plan`** (Skill tool), seeded with: the brainstormed feature flow (journey + screens + states + interactions), the selected platforms, and a pointer to the Claude Design prompt file. If a Claude Design project reference exists (the user provided one in Step 1, or created one from the prompt), pass it so `/loop-plan` runs **design-driven**; otherwise `/loop-plan` runs **text-only** with the rich brainstorm as the spec. Fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-design done — prompt written + plan NNN queued"`, then **tell the user, in plain language, what they now have and the next step**: "✅ Two things are ready: (1) a Claude Design prompt to generate the look, and (2) plan NNN, queued to build. Next: paste the prompt into claude.ai/design (if you haven't), then run `/loop-run` to build it."

---

## Rules & invariants

- **Produces a prompt; never writes to Claude Design.** DesignSync is used read-only (only to confirm an existing design system). The user pastes the generated prompt into claude.ai/design themselves.
- **Design system first.** The feature prompt always anchors to a design system — either the user's existing one or one defined step-by-step in Step 1 — so screens are consistent.
- **Platforms drive the layouts.** Only the selected platforms' viewports/breakpoints go into the prompt (mobile / tablet / web — some or all).
- **Brainstorm via Superpowers** (`brainstorming`), keeping the user in the loop on key decisions.
- **Auto-chains to `/loop-plan`** — the deliverables are the Claude Design prompt **and** a numbered, ready-to-run plan. It does not build (that's `/loop-run` / `/loop-feature`).
- **Telegram** prefix `[<project>]` (project root basename); ping before each question (await) and on completion; skip silently if the notifier is absent.
- **Working files**: `.loop-design/` at the repo root (the design-system prompt + per-feature Claude Design prompt).
