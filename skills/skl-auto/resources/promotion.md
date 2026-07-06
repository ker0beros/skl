# Ticket promotion for `/skl-auto` (`--promote` only)

> Used ONLY by the driver, ONLY under `--promote[=N]`, ONLY after the authorized queue is fully
> drained. Passing the flag is the human's standing authorization — the one sanctioned exception
> to "a human only ever sets `loop-ready`" (`/skl-pickup-ticket` itself still never applies it;
> the DRIVER does). This file is the source of truth for WHO may be auto-promoted and HOW.
> The driver increments `promotions_used` BEFORE invoking the work loop — crash-safe: an attempt
> consumes a slot regardless of outcome (shipped, deferred, or needs-info).

## Eligibility (ALL must hold)

1. **Open issue** carrying **none of the five configured lifecycle labels** (`pickup_label`,
   `pickup_inprogress_label`, `pickup_done_label`, `pickup_deferred_label`,
   `pickup_needsinfo_label` — match the *configured names*, not a `loop-` prefix).
2. **Trusted author** —
   - GitHub: `author_association` ∈ **OWNER | MEMBER | COLLABORATOR**. Reject `CONTRIBUTOR`,
     `FIRST_TIME_CONTRIBUTOR`, `FIRST_TIMER`, `NONE`, `MANNEQUIN`.
   - GitLab: project member (including inherited group members) with **`access_level ≥ 30`**
     (Developer — the closest analog of GitHub write-trust; Reporters/Guests excluded.
     Levels: 10 Guest, 20 Reporter, 30 Developer, 40 Maintainer, 50 Owner).
3. **Oldest first** among qualifiers.

## GitHub — find the oldest eligible candidate

`author_association` is NOT exposed by `gh issue list/view --json` (verified gh 2.94.0) — use the
REST API. `sort=created&direction=asc` puts the oldest on page 1; REST issue lists include PRs, so
filter them out. Substitute the five configured label names:

```bash
gh api "repos/{owner}/{repo}/issues?state=open&sort=created&direction=asc&per_page=100" --jq '
  [ .[]
    | select(has("pull_request") | not)
    | select(([.labels[].name | select(IN("loop-ready","loop-in-progress","loop-done","loop-deferred","loop-needs-info"))] | length) == 0)
    | select(IN(.author_association; "OWNER","MEMBER","COLLABORATOR"))
    | {number, title, author: .user.login, assoc: .author_association, created_at}
  ]'
# .[0] = the promotion candidate; .[1] … for remaining slots.

# Per-issue spot check (fallback):
gh api "repos/{owner}/{repo}/issues/<n>" --jq '.author_association'
```

## GitLab — find the oldest eligible candidate

Issues carry no association field — check project membership per author:

```bash
# 1) Oldest open issues without any lifecycle label:
[GITLAB_HOST=<host>] glab api "projects/:id/issues?state=opened&order_by=created_at&sort=asc&per_page=100" \
  | jq '[ .[]
      | select(([.labels[] | select(IN("loop-ready","loop-in-progress","loop-done","loop-deferred","loop-needs-info"))] | length) == 0)
      | {iid, title, author_id: .author.id, author: .author.username, created_at} ]'

# 2) Per candidate, oldest first — member with Developer+ access (>= 30) = trusted:
[GITLAB_HOST=<host>] glab api "projects/:id/members/all/<author_id>" 2>/dev/null | jq -r '.access_level // 0'
# non-zero exit (404 = not a member) or access_level < 30 → not eligible; >= 30 → eligible.
```

Do NOT use `not[labels]` server-side filtering — its AND/negation semantics vary across GitLab
versions; filter client-side as above.

## The promotion itself

```bash
gh issue edit <n> --add-label "loop-ready"
# or
[GITLAB_HOST=<host>] glab issue update <iid> --label "loop-ready"
```

Then, in this order (SKILL.md Phase 3): increment `promotions_used` in `.skl-auto/state.md` →
Telegram audit ping → invoke `/skl-pickup-ticket --auto --drain [--merge-on-green]` in **loop
mode** — never `#N` mode (`#N` never claims, so the ticket would keep `loop-ready` after
resolution: residue the next triage re-counts → churn; loop mode claims cleanly and its
step-2.5 readiness gate routes vague tickets to `loop-needs-info`).
