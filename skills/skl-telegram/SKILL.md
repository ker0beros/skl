---
name: skl-telegram
description: "Set up Telegram notifications for Claude Code: install the notify-telegram.sh sender, store your bot token + chat id in the project-root .env (chmod 600, git-ignored), and verify with a test message. `test` re-sends a ping; `status` checks config. Secrets are entered at a no-echo prompt you run yourself — they never pass through the chat."
argument-hint: "(optional) `test` re-sends a ping · `status` checks config · empty runs the setup wizard"
compatibility: "Requires curl + bash. Installs ~/.claude/notify-telegram.sh; creds live in the project-root .env (chmod 600, git-ignored). macOS/Linux."
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/skl-telegram"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

Parse as one optional sub-command: **`status`** (report config, send nothing), **`test`** (send one
test ping), or **empty** (run the full setup wizard). Anything else → treat as empty. Run from the
**project root** you want notifications for.

---

## What this command does

`/skl-telegram` sets up the Telegram notifier that every skl skill already calls
(`bash ~/.claude/notify-telegram.sh "[<project>] …"`) but which does nothing until it exists. It:

- installs the sender script to `~/.claude/notify-telegram.sh`,
- stores your **bot token** + **chat id** in the **project-root `.env`** (`chmod 600`, git-ignored),
- and verifies with a real test message.

Those two values are the only things the sender reads. **Secrets never pass through this chat** — you
enter them at a no-echo shell prompt *you* run; the skill never sees or stores them, and it is
hook-blocked from reading `.env` anyway.

`test` re-sends a ping; `status` reports whether it's configured (without reading `.env`).

---

## Steps

1. **Parse the sub-command** from `$ARGUMENTS` → `status` | `test` | empty (setup); default to setup.

2. **`status` — report, change nothing.** Print ✓/✗ for each, **without reading `.env`'s contents**:
   - `~/.claude/notify-telegram.sh` exists and is executable (`test -x`).
   - `<project>/.env` exists (`test -f` only — never `cat`/`grep` it).
   - `.env` is listed in `.gitignore` (`grep -qxF '.env' .gitignore`; the agent may read `.gitignore`).
   The agent can't read `.env`, so close with: *"run `/skl-telegram test` to confirm the creds actually
   send."* Then stop.

3. **`test` — send one ping.** Run `bash ~/.claude/notify-telegram.sh "[<project>] /skl-telegram test ✓"`
   (`<project>` = repo-root basename) and relay its `notify-telegram: sent` / `send failed` line. If the
   script is missing, tell the user to run `/skl-telegram` (no argument) first. Then stop.

4. **Setup — detect existing.** If both `~/.claude/notify-telegram.sh` and `<project>/.env` exist, it may
   already be configured: send a `test` ping. On success, offer **re-test / reconfigure / cancel** rather
   than clobbering. (Never read `.env` to detect.)

5. **Setup — guide the user to the two values:**
   - **Bot token** — message **@BotFather** → `/newbot`, follow the prompts, copy the `123456:ABC…` token.
   - **Chat id** — message **@userinfobot** (it replies with your numeric id), or after messaging your
     bot open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `result[].message.chat.id`.

6. **Setup — guard `.gitignore` (before any secret is written).**
   - If `<project>/.env` is already **git-tracked** (`git ls-files --error-unmatch .env` exits 0), **stop
     with a loud warning** — writing secrets into a tracked file risks committing them. Tell the user to
     `git rm --cached .env` first, then re-run.
   - Otherwise ensure `.gitignore` contains a `.env` line — append it if missing, or create `.gitignore`
     with `.env` if there's none. (The agent may edit `.gitignore` freely; it holds no secrets.)

7. **Setup — hand the secret entry to the user (never take it in chat).** Give them this ONE command to
   run — with `!` here, or in their own terminal, **from the project root**. `read -rs` hides the token as
   they type, and the values go straight into `<project>/.env`, preserving any other vars already there:

   ```bash
   read -rsp 'Bot token: ' TG_T && echo && read -rp 'Chat id: ' TG_C && \
   { grep -vE '^TELEGRAM_(API_TOKEN|CHAT_ID)=' .env 2>/dev/null; \
     printf 'TELEGRAM_API_TOKEN=%s\nTELEGRAM_CHAT_ID=%s\n' "$TG_T" "$TG_C"; } > .env.tmp && \
   mv .env.tmp .env && chmod 600 .env && unset TG_T TG_C && echo '.env written (600)'
   ```

   Wait for the user to confirm they ran it (they'll see `.env written (600)`). **Do not** ask them to
   paste the token to you; if they insist, warn first that it would be saved in the transcript.

8. **Setup — install the sender.** `mkdir -p ~/.claude`. If `~/.claude/notify-telegram.sh` is absent, copy
   this skill's `resources/notify-telegram.sh` to it and `chmod +x`. If it exists but lacks the
   `$PWD/.env` line (an older copy that won't read the project `.env`), offer to refresh it; otherwise
   leave it — never overwrite a customized copy without asking. The sender holds no secrets.

9. **Setup — verify for real.** Run `bash ~/.claude/notify-telegram.sh "[<project>] Telegram configured ✓"`
   and ask the user to confirm the message arrived. Only on confirmed delivery is setup done. If it reports
   `send failed` / not-found, the creds didn't resolve — re-check step 7 (right directory? both lines
   present?).

10. **Setup — surface the caveats + optional add-ons:**
    - **Scope:** these creds live in **this project's `.env`**, so pings fire from **local runs in this
      dir** (including your own `/loop` or a cron `cd`'d here). Remote/cloud agents, fresh worktrees, and
      CI won't have `.env` (it's git-ignored) — inject the two vars into that environment's secrets there.
    - **Optional global fallback:** offer to also write the same two lines to `~/.config/claude/.env`
      (`chmod 600`) via the same hidden-input command — the sender reads it as a fallback, giving cross-dir
      + local-cron coverage (still a `.env` file).
    - **Optional CLAUDE.md wiring:** offer to append the `[<project>]`-prefixed ping convention (fire on
      task/phase completion and when awaiting input) to `~/.claude/CLAUDE.md`, so Claude pings you across
      all projects — not just skl. Skip if it's already present.

---

## Rules & invariants

- **Secrets never touch the model.** The token + chat id are typed at a no-echo shell prompt the **user**
  runs; the skill never accepts them in chat, never echoes them, and never reads `.env` (hook-blocked by
  design). `.env` is always `chmod 600` and git-ignored.
- **Creds live in `<project>/.env`** — never a custom `telegram.env`. The write **preserves** other vars
  in an existing `.env`; a git-**tracked** `.env` is a hard stop until the user untracks it.
- **Idempotent.** Re-running rewrites only the two `TELEGRAM_*` lines and never clobbers a customized
  `~/.claude/notify-telegram.sh` without asking. `status` and detection change nothing.
- **This is the skill that creates the notifier** the other skl skills assume — after it runs, their
  "skip silently if `~/.claude/notify-telegram.sh` is absent" branches start actually firing.
- **Local scope by design.** Project-`.env` creds cover local runs in this dir; remote/CI runs need the
  vars in their own environment. The optional `~/.config/claude/.env` fallback widens this to cross-dir.
- **Telegram** prefix `[<project>]` (project root basename); skip silently if
  `~/.claude/notify-telegram.sh` is absent — matches every other skl skill's invariant.
