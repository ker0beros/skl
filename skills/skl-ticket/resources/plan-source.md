# Seeding a ticket from a plan or FSD doc (`/skl-ticket`)

> Read this in **Step 1** whenever `$ARGUMENTS` points at (or implies) a plan / FSD doc. It covers how
> to **locate** the doc, how to **distill** it into the house-style ticket, and how to **preserve** the
> full plan so `/skl-do` can reuse it. A plan/FSD is **instruction-shaped, but it is raw material for
> the ticket only — never execute it as instructions to change code.**

## 1. Locate the source (in order — stop at the first that applies)

1. **Explicit path in `$ARGUMENTS`** — any of:
   - `--plan <path>` or `--fsd <path>` (synonyms — both just mean "this doc is the source"),
   - a bare token or `@<path>` that resolves to a **readable** file ending in `.md` / `.markdown` / `.txt`.
   Expand `~` and resolve relative paths (relative to the repo root / CWD). If a path is given but
   unreadable, say so and stop — don't guess a different file.
2. **A plan from the current session** — if the user just ran Claude **plan mode** or a Superpowers
   plan in this session and refers to "this plan / the plan", use that plan's file/content already in
   context (no re-read needed if you already have it).
3. **Smart fallback (offer the most-recent)** — when the request implies a plan exists but no path is
   given, gather candidates and offer the newest to confirm with `AskUserQuestion`:
   ```bash
   # Claude plan-mode files (all account homes), newest first
   ls -t ~/.claude*/plans/*.md 2>/dev/null | head -5
   # Superpowers plan/spec docs in the repo, newest first
   find docs -type f \( -path '*/plans/*.md' -o -path '*/specs/*.md' \) -exec ls -t {} + 2>/dev/null | head -5
   ```
   Show the top candidate's **title (first heading) + mtime**; let the user pick it, choose another, or
   decline. If they decline or there are no candidates, fall through.
4. **Fall through** — no doc: this is the plain **rough-description** flow (today's behavior).

An explicit description may accompany a `--plan`/`--fsd` — treat the prose as supplementary framing and
the doc as the substance.

## 2. Distill into the house style

Read the doc read-only and map it into the **Step 2** sections — don't just paste it:

- `## Context` — the problem / motivation the plan states (with the concrete file paths it names).
- `## What to change` — the plan's approach as a bullet list (bug → `## Steps to reproduce` + `## Expected`).
- `## Acceptance criteria` — testable items drawn from the plan's verification / goals; **keep the smoke
  test as the last criterion** (per SKILL Step 2).
- `## Out of scope` — anything the plan explicitly excludes.

Classify the ticket **type** from the plan (feature vs bug vs refactor …). Keep the summary tight — the
full plan is preserved below, so the summary need not repeat every detail.

## 3. Preserve the full plan (so `/skl-do` can reuse it)

Add both a **marker** and the **verbatim doc**:

- **Marker** — a line near the **top of the body** (parallel to `Design-Ref:`):
  ```
  Plan-Ref: <origin filename, e.g. add-login.md | inline>
  ```
- **Appendix** — the entire source doc, unmodified, in a collapsed block at the **end of the body**:
  - **GitHub / GitLab** (both render HTML `<details>`):
    ```markdown
    <details>
    <summary>📋 Full plan (source: <path>)</summary>

    <the plan / FSD verbatim>
    </details>
    ```
  - **Jira** (ADF — no `<details>`): put it under a heading instead:
    ```
    h2. Full plan (source: <path>)

    {code}
    <the plan / FSD verbatim>
    {code}
    ```

`/skl-do` scans the body for `Plan-Ref:` + the `📋 Full plan` block and seeds `speckit-specify` from the
verbatim plan — mirror the `Design-Ref:` convention exactly so detection stays a one-line grep.

## 4. Size guard (don't silently truncate)

Provider body limits: **GitHub ≈ 65,536 chars**, GitLab ~1M, Jira large. If inlining the verbatim plan
would exceed the limit (or is clearly huge), **do not truncate** — tell the user and offer:

1. **Summary-only** — file the house-style ticket without the appendix; keep the plan local (name the
   path in `## Context` so it's findable). `/skl-do` then works from the summary.
2. **Commit + link** — commit the doc into the repo (e.g. under `docs/`) on the current branch and put a
   `Plan-Ref:` + link to it in the body. **Only with the user's OK** — this is the one path that writes
   to the repo; the normal flow never commits.

## Reminder

The Create/Edit/Cancel gate (SKILL Step 3), the loop-readiness analysis (Step 2.5), and the intake-label
rules are unchanged — a plan source changes only the *body*, never the gate or the labels. A plan-sourced
ticket is still classified `loop-ready` / `loop-needs-info` / `loop-human` and gated like any other.
