# Provider recipes for `/create-ticket` (GitHub / GitLab / Jira)

> Read this at the **provider readiness check** (Preconditions step 2) and again at **creation**
> (Step 4). Each section has: the **auth check** (+ how the user fixes it), how to **parse the target**,
> and the exact **create command**. The user runs any interactive login themselves with the **`!`
> prefix** (e.g. `! gh auth login`) so the prompt runs in the session — Claude cannot drive a browser
> login. Never store or echo tokens. Never file a ticket the user hasn't approved via the gate.

## Identify the host from the remote

- `github.com/OWNER/REPO` → **GitHub**.
- `gitlab.com/OWNER/REPO` → **GitLab**.
- any other host → **unsure**: self-hosted GitLab, GitHub Enterprise, Bitbucket, Gitea, … → ask
  (SKILL Preconditions step 1.3). Capture the host for GitLab/GitHub-Enterprise recipes below.
- **Jira** is never inferred from a git remote — it's chosen explicitly or via the picker.

Parse `owner/repo` from either URL form:
`git@github.com:owner/repo.git` and `https://github.com/owner/repo.git` both → `owner/repo` (strip a
trailing `.git`). For nested GitLab groups the "repo" may be `group/subgroup/repo`.

---

## GitHub (`gh`)

**Readiness:**
1. **Installed?** `command -v gh`. If missing → macOS `brew install gh`, else https://cli.github.com . Re-check.
2. **Logged in with the right scope?** `gh auth status`. Must show a logged-in account with the `repo`
   scope. If it errors / shows no account → the user runs `! gh auth login` (choose **GitHub.com** —
   or *GitHub Enterprise Server* + host — → **HTTPS** → **web browser** or a PAT). If logged in but
   lacking scope → `! gh auth refresh -s repo`.
3. **GitHub Enterprise:** authenticate to the host once (`! gh auth login --hostname <host>`); then
   qualify the repo as `<host>/OWNER/REPO` in `--repo`.

**Create** (write the body to a scratchpad temp file first to avoid multi-line quoting issues):
```bash
gh issue create \
  --repo <owner/repo> \            # or <host>/owner/repo for Enterprise
  --title "<title>" \
  --body-file <path-to-temp-body-file> \
  [--label <label>]                # only labels the user approved; never loop-*
```
On success `gh` prints the issue URL — report it. If it fails on an **unknown label**, offer to retry
without `--label` (or create the label first only if the user asks). If a flag errors, run
`gh issue create --help` and adapt.

---

## GitLab (`glab`)

**Readiness:**
1. **Installed?** `command -v glab`. If missing → macOS `brew install glab`, else
   https://gitlab.com/gitlab-org/cli . Re-check.
2. **Logged in for this host?** `glab auth status`. If not → the user runs `! glab auth login`
   (choose **gitlab.com** or enter the **self-hosted host** → **Token** → paste a PAT with the **`api`**
   scope — creating issues needs write, so `api`, not just `read_api`). Create one at GitLab →
   **Settings → Access Tokens** (or the project's *Access Tokens*).
3. **Self-hosted host:** prefix every `glab` command with `GITLAB_HOST=<host>` so it targets the right
   instance.

**Create** (write the body to a temp file first; `--yes` skips the interactive submit prompt):
```bash
[GITLAB_HOST=<host>] glab issue create \
  --repo <owner/repo> \            # nested groups: group/subgroup/repo
  --title "<title>" \
  --description "$(cat <path-to-temp-body-file>)" \
  [--label "<comma,separated,labels>"] \   # only approved labels; never loop-*
  --yes
```
On success `glab` prints the issue URL — report it. If a flag differs on the installed version, run
`glab issue create --help` and adapt (older builds use `-d`/`-t`/`-l`/`-R`).

**No `glab`? API fallback (create via REST):** with a PAT (scope `api`) in `GITLAB_TOKEN`:
```bash
curl --silent --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data "$(jq -n --arg t "<title>" --arg body "$(cat <temp-body-file>)" '{title:$t, description:$body}')" \
  "https://<host>/api/v4/projects/<URL-encoded-namespace%2Frepo>/issues"
```
(e.g. project path `group/sub/repo` → `group%2Fsub%2Frepo`.) Treat `GITLAB_TOKEN` as a secret — never
print it. The response JSON's `web_url` is the ticket URL.

---

## Jira (Atlassian MCP)

Jira uses the **Atlassian MCP connector**, not a git CLI. The relevant tools (load via ToolSearch when
needed): `getAccessibleAtlassianResources`, `getVisibleJiraProjects`, `getJiraProjectIssueTypesMetadata`
/ `getJiraIssueTypeMetaWithFields`, and `createJiraIssue`.

**Readiness:**
1. **Connector available?** Confirm the Atlassian MCP tools are reachable. If not, tell the user to
   connect the **Atlassian** connector (in Claude: connect/authenticate Atlassian), then retry.
2. **cloudId:** call `getAccessibleAtlassianResources` → pick the site's `cloudId` (ask if there are
   several).
3. **Project + issue type:** if the user hasn't named a project, list options with
   `getVisibleJiraProjects` and ask (`AskUserQuestion`). Resolve the **issue type** from the ticket type
   (bug → Bug; feature → Story/Task; etc.), validating against the project via
   `getJiraProjectIssueTypesMetadata`.
4. **Required fields:** fetch `getJiraIssueTypeMetaWithFields` and make sure every **required** field is
   supplied (some projects require components, priority, etc.). Ask for any missing required field.

**Create:**
Call `createJiraIssue` with:
- `cloudId` — from step 2
- `projectKey` — the resolved project (e.g. `PLATFORM`)
- `issueTypeName` — the resolved issue type (e.g. `Bug`, `Story`, `Task`)
- `summary` — the drafted **title**
- `description` — the drafted **body** (the Markdown sections from SKILL Step 2)
- any **required fields** from step 4; labels only if the user approved them (never `loop-*`)

Report the returned issue **key** and **browse URL** (e.g. `https://<site>.atlassian.net/browse/PROJ-123`).
If `createJiraIssue` fails (missing required field, invalid issue type, no permission), surface the exact
error and offer to retry with the field supplied / a valid issue type — do not guess.
