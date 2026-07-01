# Granting issue access for `/skl-fix` (GitHub / GitLab)

> Followed by `/skl-fix` Phase 0 when fetching a linked issue fails with an **auth / permission /
> private-404** error. Walk the user through these steps **interactively, one at a time**, then
> **retry the fetch**. The user runs the login commands themselves with the **`!` prefix** (e.g.
> `! gh auth login`) so the interactive prompt runs in the session — Claude cannot drive a browser
> login. Never store or echo tokens; never fabricate an issue you couldn't read.

## First, identify the host
- `github.com/OWNER/REPO/issues/N` → **GitHub** (below).
- `gitlab.com/.../-/issues/N` or `your-gitlab.example.com/.../-/issues/N` → **GitLab** (self-hosted
  uses the same flow with the host set).

---

## GitHub (`gh`)

1. **Is `gh` installed?** Run `command -v gh`. If missing → install it: macOS `brew install gh`,
   else https://cli.github.com . Re-check.
2. **Are you logged in?** Run `gh auth status`. If it errors / shows no account → step 3. If logged in
   but the fetch still 404s, the account likely **lacks access to that repo** → step 4 / 5.
3. **Log in (user runs this):**
   ```
   ! gh auth login
   ```
   Choose, when prompted: **GitHub.com** (or *GitHub Enterprise Server* + host) → **HTTPS** →
   **Authenticate via web browser** (or paste a Personal Access Token). Approve in the browser.
4. **Private/org repo needs the `repo` scope.** If the issue is private and the fetch still fails,
   refresh the token's scope (user runs):
   ```
   ! gh auth refresh -h github.com -s repo
   ```
5. **SAML/SSO orgs:** the browser may ask you to **authorize the token for the org** — do that, then
   retry. Confirm membership/visibility if it persists.
6. **Retry:** `gh issue view <url> --comments`. If it still fails, report the exact error to the user
   (wrong URL? no access? repo archived?) — do **not** guess the issue content.

---

## GitLab (`glab`)

1. **Is `glab` installed?** Run `command -v glab`. If missing → macOS `brew install glab`, else
   https://gitlab.com/gitlab-org/cli . Re-check.
2. **Are you logged in for this host?** Run `glab auth status`. If not → step 3.
3. **Log in (user runs this):**
   ```
   ! glab auth login
   ```
   Choose: **gitlab.com** (or enter your **self-hosted host**) → **Token** → paste a **Personal Access
   Token** with the **`read_api`** scope (enough to read issues; `api` also works). Create one at
   GitLab → **Settings → Access Tokens** (or the project's *Access Tokens*).
4. **Self-hosted host:** if `glab` targets the wrong instance, prefix the fetch with the host, e.g.
   `GITLAB_HOST=your-gitlab.example.com glab issue view <url> --comments`.
5. **No `glab`? API fallback (read-only):** with a PAT in `GITLAB_TOKEN` (scope `read_api`):
   ```
   curl --silent --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     "https://<host>/api/v4/projects/<URL-encoded-namespace%2Frepo>/issues/<iid>"
   ```
   (e.g. project path `group/sub/repo` → `group%2Fsub%2Frepo`; `<iid>` is the per-project issue number).
   Treat `GITLAB_TOKEN` as a secret — don't print it.
6. **Retry** the fetch. If it still fails, report the exact error rather than guessing.

---

## After access is granted
Re-run the original `gh`/`glab` fetch from Phase 0, then continue: turn the issue's title + body +
comments into the bug description and proceed to `systematic-debugging`. Cite the issue URL in the
backlog row and the spec's `Fix-Issue` line for traceability. `/skl-fix` does **not** modify or close
the issue (read-only) unless the user explicitly asks.
