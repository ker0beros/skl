#!/bin/bash
# Telegram notifier for Claude Code — installed by /skl-telegram, called by every skl skill:
#   bash ~/.claude/notify-telegram.sh "[<project>] one-line status message"
#
# Triggers (see ~/.claude/CLAUDE.md): on task/phase completion AND whenever Claude stops to
# ask the user a question / awaits a decision or approval. Always prefix with [<project>].
#
# Creds resolution — sources the FIRST file that supplies both vars, so a per-project setup
# and an older global setup both keep working:
#   1. $PWD/.env                       (the project you're running in — /skl-telegram writes here)
#   2. ~/.config/claude/.env           (optional global fallback — cross-dir / local cron)
#   3. ~/.config/claude/telegram.env   (legacy standalone)
# Each must define TELEGRAM_API_TOKEN and TELEGRAM_CHAT_ID.
set -a
for _f in "$PWD/.env" "$HOME/.config/claude/.env" "$HOME/.config/claude/telegram.env"; do
  if [ -f "$_f" ]; then
    # shellcheck disable=SC1090
    source "$_f"
    [ -n "$TELEGRAM_API_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] && break
  fi
done
set +a

if [ -z "$TELEGRAM_API_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "notify-telegram: TELEGRAM_API_TOKEN / TELEGRAM_CHAT_ID not found — run /skl-telegram" >&2
  exit 1
fi

MSG="${1:-"Notification from Claude Code"}"

# --data-urlencode keeps '&', '=' and other delimiters intact (the plain `-d text=` form
# silently truncates the message at the first '&').
curl -s "https://api.telegram.org/bot${TELEGRAM_API_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MSG}" > /dev/null \
  && echo "notify-telegram: sent" \
  || echo "notify-telegram: send failed" >&2
