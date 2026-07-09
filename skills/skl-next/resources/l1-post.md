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
