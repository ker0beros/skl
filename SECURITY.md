# Security

## Secrets posture

skl never places secrets in the transcript. `/skl-telegram` stores your bot token + chat id in the
project-root `.env` (`chmod 600`, git-ignored) via a no-echo shell prompt you run yourself; the agent
is hook-blocked from reading `.env`. Creds for unattended/cloud runs live in that environment, never
in the repo.

## Reporting a vulnerability

Please report suspected vulnerabilities privately via GitHub's "Report a vulnerability" (Security tab)
rather than a public issue. We'll acknowledge and follow up.
