# /skl-next --post — L1 report-only digest

Publish a deduped triage digest to one rolling thread. Report-only: the ONLY write is to this
thread. Requires `node` + an authenticated `gh`/`glab`. Gated by `l1_digest.enabled`.

## 0. Guard
Read `l1_digest.*` from this skill's `resources/project.config.md` (defaults if absent).
`enabled` not `true` → print `l1 digest disabled` and STOP (exit 0). No remote / CLI unauthenticated
(resolve per `skl-do/resources/pickup-loop.md`) → print the reason and STOP (exit 0). Never abort.

## 1. Build state
Run Phase 1 + Phase 2. Assemble the state JSON the helper expects:
```json
{ "repo":"OWNER/NAME", "date":"YYYY-MM-DD",
  "issuesByLabel": {"loop-ready":[..],"loop-in-progress":[..],"loop-needs-info":[..],"loop-human":[..],"loop-deferred":[..]},
  "openPRs": [{"number":N,"review":"<review_state>"}],
  "drift": ["..."], "nextStep": "<the named next step>", "skipped": [{"collector":"..","reason":".."}] }
```

## 2. Compute
```bash
DIGEST=$(printf '%s' "$STATE_JSON" | node .claude/skills/skl-next/resources/l1-digest.mjs)
HASH=$(printf '%s' "$DIGEST" | jq -r .hash)
BODY=$(printf '%s' "$DIGEST" | jq -r .body)
```

## 3. Dry-run (`--dry-run`)
Read the rolling thread's last hash (§Destination in Task 4). Print:
```
L1 digest (dry-run) — hash <HASH>, last <LAST_HASH|none>
→ would POST (changed)      # or: would SKIP (unchanged)
<BODY>
```
Then STOP. No writes.

## Destination — resolve + find-or-create the rolling thread
`destination: auto` → GitHub with Discussions enabled uses a **Discussion**; otherwise a **labeled
issue** `skl-l1-digest`. GitLab always uses the labeled issue. Thread title `skl · L1 daily triage`,
body carries `<!-- skl-l1-thread -->`. Cache its number in `l1_digest.thread_ref` after creation.

### GitHub — Discussion
```bash
OWNER=…; NAME=…                     # from the remote
read RID DISCUSS CAT <<<"$(gh api graphql -f query='
  query($o:String!,$n:String!){repository(owner:$o,name:$n){
    id hasDiscussionsEnabled discussionCategories(first:25){nodes{id name}}}}' \
  -f o="$OWNER" -f n="$NAME" \
  -q '[.data.repository.id, (.data.repository.hasDiscussionsEnabled|tostring),
       (.data.repository.discussionCategories.nodes[]|select(.name=="'"$CATEGORY"'").id)] | @tsv')"
# DISCUSS=false → fall through to the issue path.
NUM=$(gh api graphql -f query='query($o:String!,$n:String!){repository(owner:$o,name:$n){
  discussions(first:50,orderBy:{field:CREATED_AT,direction:DESC}){nodes{number body}}}}' \
  -f o="$OWNER" -f n="$NAME" \
  -q '.data.repository.discussions.nodes[]|select(.body|test("<!-- skl-l1-thread -->")).number' | head -1)
if [ -z "$NUM" ]; then
  NUM=$(gh api graphql -f query='mutation($r:ID!,$c:ID!,$t:String!,$b:String!){
    createDiscussion(input:{repositoryId:$r,categoryId:$c,title:$t,body:$b}){discussion{number}}}' \
    -f r="$RID" -f c="$CAT" -f t="skl · L1 daily triage" \
    -f b=$'<!-- skl-l1-thread -->\nRolling L1 (report-only) triage digest. New comment only when state changes.' \
    -q '.data.createDiscussion.discussion.number')
fi
DID=$(gh api graphql -f query='query($o:String!,$n:String!,$m:Int!){repository(owner:$o,name:$n){discussion(number:$m){id}}}' \
  -f o="$OWNER" -f n="$NAME" -F m="$NUM" -q '.data.repository.discussion.id')
LAST_HASH=$(gh api graphql -f query='query($o:String!,$n:String!,$m:Int!){repository(owner:$o,name:$n){
  discussion(number:$m){comments(last:1){nodes{body}}}}}' \
  -f o="$OWNER" -f n="$NAME" -F m="$NUM" \
  -q '.data.repository.discussion.comments.nodes[-1].body // ""' | grep -oE 'skl-l1:[0-9a-f]{12}' | tail -1)
```

### Issue fallback (GitHub Discussions off, or GitLab)
```bash
# GitHub:
gh label create skl-l1-digest --color 5319e7 --description "skl L1 daily triage" 2>/dev/null || true
NUM=$(gh issue list --label skl-l1-digest --state open --limit 1 --json number -q '.[0].number // ""')
[ -z "$NUM" ] && NUM=$(gh issue create --title "skl · L1 daily triage" --label skl-l1-digest \
  --body $'<!-- skl-l1-thread -->\nRolling L1 (report-only) triage digest.' | grep -oE '[0-9]+$')
LAST_HASH=$(gh issue view "$NUM" --json comments -q '.comments[-1].body // ""' | grep -oE 'skl-l1:[0-9a-f]{12}' | tail -1)

# GitLab (glab api, matching skl-next's existing usage):
IID=$(glab api "projects/:id/issues?labels=skl-l1-digest&state=opened&per_page=1" | jq -r '.[0].iid // ""')
[ -z "$IID" ] && IID=$(glab api --method POST "projects/:id/issues" -f title="skl · L1 daily triage" \
  -f labels="skl-l1-digest" -f description=$'<!-- skl-l1-thread -->\nRolling L1 (report-only) triage digest.' | jq -r '.iid')
LAST_HASH=$(glab api "projects/:id/issues/$IID/notes?sort=asc&per_page=100" | jq -r '[.[].body]|last // ""' \
  | grep -oE 'skl-l1:[0-9a-f]{12}' | tail -1)
```

## Post — only when changed
`"skl-l1:$HASH" == "$LAST_HASH"` (both non-empty) → print `no change` and STOP (exit 0, no nudge).
Missing/unparseable last marker → treat as changed (fail toward informing). Else append the comment:
```bash
# GitHub Discussion:
gh api graphql -f query='mutation($d:ID!,$b:String!){addDiscussionComment(input:{discussionId:$d,body:$b}){comment{url}}}' \
  -f d="$DID" -f b="$BODY" -q '.data.addDiscussionComment.comment.url'
# GitHub issue:  gh issue comment "$NUM" --body "$BODY"
# GitLab issue:  glab api --method POST "projects/:id/issues/$IID/notes" -f body="$BODY"
```
Persist `l1_digest.thread_ref: <NUM|IID>` in `project.config.md` if not already set.
(Pinning the thread is an optional one-time cosmetic step via the web UI — discovery is by the
`<!-- skl-l1-thread -->` marker, so pinning is not required.)
