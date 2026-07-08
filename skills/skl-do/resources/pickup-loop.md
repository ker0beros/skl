# Ticket mechanics for `/skl-do` (GitHub / GitLab)

> The exact per-provider commands for **selecting one ticket** (resume `loop-in-progress` first, then
> the oldest `loop-ready`), **claiming** it (`loop-ready` → `loop-in-progress`), **opening the PR/MR** +
> marking it `loop-done`, **deferring** (`loop-in-progress` → `loop-deferred`) with a findings comment,
> **routing to needs-info** (`loop-in-progress` → `loop-needs-info`) with a request-info comment, and
> **routing to needs-human** (`loop-in-progress` → `loop-human`) with a decision-needed comment.
> SKILL.md sequences these; this file is the source of truth for the commands.
> Reuse `resources/issue-access.md` if a fetch hits an auth wall. **Never merge** — a human reviews and
> merges the PR; never apply `loop-ready` yourself (a human curates that queue; restoring it on an
> interactive readiness-gate **Skip** is that human's decision, relayed) — but the loop *does* drive
> every later transition.

## Identify the host + provider

Parse `git config --get remote.origin.url` (handles `git@host:owner/repo.git` and
`https://host/owner/repo.git`, strip a trailing `.git`):
- `github.com` → **GitHub** (`gh`).
- `gitlab.com` or a self-hosted GitLab host → **GitLab** (`glab`; self-hosted → prefix every command
  with `GITLAB_HOST=<host>`).
- any other host → tell the user this skill supports GitHub/GitLab only, and stop.

Resolve the PR base once: `pr_base_branch` from config, else
`git symbolic-ref --short refs/remotes/origin/HEAD` (strip the `origin/` prefix), else `main`.

---

## GitHub (`gh`)

**Readiness:** `command -v gh` → `gh auth status` (needs a logged-in account with the **`repo`** scope;
PR create needs write). If missing/unauth → `brew install gh`, `! gh auth login`, `! gh auth refresh -s repo`.

**Ensure the lifecycle labels exist** (idempotent — run in Phase 0; ignore an "already exists" error):
```bash
gh label create loop-ready       --color 0e8a16 --description "Eligible for the autonomous build loop"  2>/dev/null || true
gh label create loop-in-progress --color fbca04 --description "The loop is working this ticket"          2>/dev/null || true
gh label create loop-done        --color 1d76db --description "Loop finished — PR open, awaiting review" 2>/dev/null || true
gh label create loop-deferred    --color d93f0b --description "Loop couldn't converge — needs a human"   2>/dev/null || true
gh label create loop-needs-info  --color d4c5f9 --description "Loop needs more info — answer the comment, then re-label loop-ready" 2>/dev/null || true
gh label create loop-human       --color d876e3 --description "Needs a human decision — decide, then re-label loop-ready" 2>/dev/null || true
```

**Poll — resume tier first, then the ready tier** (fetch a small batch each, drop skip-listed ids, take
the oldest remaining):
```bash
# 1) resume: oldest ticket a prior (interrupted) run already claimed
gh issue list --search 'label:"loop-in-progress" state:open sort:created-asc' --limit 10 \
  --json number,title,body,url,labels,createdAt
# 2) new — only if the resume list is empty: oldest ready ticket
gh issue list --search 'label:"loop-ready" state:open sort:created-asc' --limit 10 \
  --json number,title,body,url,labels,createdAt
```
The first element (after removing skip-listed `number`s) is the ticket; **both** empty → no eligible ticket.

**Claim a ready ticket** (new tier only — flip `loop-ready` → `loop-in-progress` before working it; a
resumed ticket is already `loop-in-progress`, so skip this):
```bash
gh issue edit <n> --remove-label "loop-ready" --add-label "loop-in-progress"
```

**Open the PR** (after the branch is pushed; write the body to a scratchpad temp file first):
```bash
git push -u origin skl-do/<n>-<slug>
gh pr create \
  --base <pr_base_branch> \
  --head skl-do/<n>-<slug> \
  --title "fix(#<n>): <slug>" \        # or "feat(#<n>): <slug>"
  --body-file <temp-body-file>          # summary + QA evidence + a line "Closes #<n>"
```
`gh pr create` prints the PR URL — record it. **Never merge** — not `gh pr merge`, not auto-merge:
a human reviews and merges the PR.

**On success — mark done** (after the PR is open; the issue stays open until the PR merges via `Closes #<n>`):
```bash
gh issue edit <n> --remove-label "loop-in-progress" --add-label "loop-done"
```

**On defer — relabel + comment:**
```bash
gh issue edit <n> --remove-label "loop-in-progress" --add-label "loop-deferred"
gh issue comment <n> --body-file <temp-findings-file>
```

**On needs-info (readiness gate) — relabel + comment** (an unlabeled `#N` ticket: drop the
`--remove-label`, keep the `--add-label`):
```bash
gh issue edit <n> --remove-label "loop-in-progress" --add-label "loop-needs-info"
gh issue comment <n> --body-file <temp-request-info-file>
```

**On needs-human (readiness gate) — relabel + comment** (an unlabeled `#N` ticket: drop the
`--remove-label`, keep the `--add-label`):
```bash
gh issue edit <n> --remove-label "loop-in-progress" --add-label "loop-human"
gh issue comment <n> --body-file <temp-decision-file>
```

---

## GitLab (`glab`)

**Readiness:** `command -v glab` → `glab auth status` (needs the **`api`** scope for MR create; self-hosted
uses `GITLAB_HOST=<host>`). If missing/unauth → `brew install glab`, `! glab auth login`.

**Ensure the lifecycle labels exist** (idempotent — run in Phase 0; ignore an "already exists" error):
```bash
[GITLAB_HOST=<host>] glab label create --name loop-ready       --color '#0e8a16' --description "Eligible for the autonomous build loop"  2>/dev/null || true
[GITLAB_HOST=<host>] glab label create --name loop-in-progress --color '#fbca04' --description "The loop is working this ticket"          2>/dev/null || true
[GITLAB_HOST=<host>] glab label create --name loop-done        --color '#1d76db' --description "Loop finished — MR open, awaiting review" 2>/dev/null || true
[GITLAB_HOST=<host>] glab label create --name loop-deferred    --color '#d93f0b' --description "Loop couldn't converge — needs a human"   2>/dev/null || true
[GITLAB_HOST=<host>] glab label create --name loop-needs-info  --color '#d4c5f9' --description "Loop needs more info — answer the comment, then re-label loop-ready" 2>/dev/null || true
[GITLAB_HOST=<host>] glab label create --name loop-human       --color '#d876e3' --description "Needs a human decision — decide, then re-label loop-ready" 2>/dev/null || true
```

**Poll — resume tier first, then the ready tier.** The API is the most reliable JSON source:
```bash
# 1) resume: oldest ticket a prior (interrupted) run already claimed
[GITLAB_HOST=<host>] glab api \
  "projects/:id/issues?labels=loop-in-progress&state=opened&order_by=created_at&sort=asc&per_page=10"
# 2) new — only if the resume list is empty: oldest ready ticket
[GITLAB_HOST=<host>] glab api \
  "projects/:id/issues?labels=loop-ready&state=opened&order_by=created_at&sort=asc&per_page=10"
```
(`glab` resolves `:id` to the current project.) Drop skip-listed `iid`s; take the oldest remaining; both
empty → no eligible ticket. The issue's per-project number is `iid`.

**Claim a ready ticket** (new tier only — a resumed ticket is already `loop-in-progress`):
```bash
[GITLAB_HOST=<host>] glab issue update <iid> --unlabel "loop-ready" --label "loop-in-progress"
```

**Open the MR** (after the branch is pushed; `Closes #<iid>` in the description auto-closes the issue):
```bash
git push -u origin skl-do/<n>-<slug>
[GITLAB_HOST=<host>] glab mr create \
  --source-branch skl-do/<n>-<slug> \
  --target-branch <pr_base_branch> \
  --title "fix(#<iid>): <slug>" \       # or "feat(#<iid>): <slug>"
  --description "$(cat <temp-body-file>)" \   # ends with "Closes #<iid>"
  --yes
```
`glab mr create` prints the MR URL — record it. **Never merge** — not `glab mr merge`, not
merge-when-pipeline-succeeds: a human reviews and merges the MR.

**On success — mark done** (after the MR is open; the issue stays open until the MR merges via `Closes #<iid>`):
```bash
[GITLAB_HOST=<host>] glab issue update <iid> --unlabel "loop-in-progress" --label "loop-done"
```

**On defer — relabel + comment:**
```bash
[GITLAB_HOST=<host>] glab issue update <iid> --unlabel "loop-in-progress" --label "loop-deferred"
[GITLAB_HOST=<host>] glab issue note <iid> --message "$(cat <temp-findings-file>)"
```

**On needs-info (readiness gate) — relabel + comment** (an unlabeled `#N` ticket: drop the
`--unlabel`, keep the `--label`):
```bash
[GITLAB_HOST=<host>] glab issue update <iid> --unlabel "loop-in-progress" --label "loop-needs-info"
[GITLAB_HOST=<host>] glab issue note <iid> --message "$(cat <temp-request-info-file>)"
```

**On needs-human (readiness gate) — relabel + comment** (an unlabeled `#N` ticket: drop the
`--unlabel`, keep the `--label`):
```bash
[GITLAB_HOST=<host>] glab issue update <iid> --unlabel "loop-in-progress" --label "loop-human"
[GITLAB_HOST=<host>] glab issue note <iid> --message "$(cat <temp-decision-file>)"
```

---

## Classifying bug vs feature (content-based)

Read the title + body; do **not** rely on type labels. Both bug and feature tickets build through the
**same inline QA-gated loop** (Phase B) — classification only frames how the intent is seeded into
`speckit-specify`:
- **Bug** — it reports something broken: an error/stack trace, crash, regression, "doesn't work",
  wrong/unexpected output, a reproduction of misbehavior → seed the intent as `fix: <symptom / expected-vs-actual>`.
- **Feature** — it asks for new capability: add / support / implement / introduce a behavior, screen,
  endpoint, or option → seed the intent as the requested capability.
- Ambiguous → without `--auto`, ask once; with `--auto`, pick the better fit (new behavior ⇒ feature
  framing, described defect ⇒ fix framing).

Classification feeds the **readiness gate** (SKILL.md Phase 0 step 6 + `readiness-check.md`) before the
build runs. Under `--auto` the build runs zero-prompt (skip clarification + the spec-review gate).
