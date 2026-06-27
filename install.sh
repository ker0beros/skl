#!/usr/bin/env bash
# spec-loop installer — drops the loop-feature + loop-refactor skills + 7 QA agents into a
# spec-kit project and stamps that project's surface + gate commands into project.config.md.
#
# Usage:
#   ./install.sh [TARGET_DIR] [options]
#
# Options:
#   --surface <auto|mobile|web|both>   override surface detection
#   --analyze-cmd "<cmd>"              override the mobile analyze gate
#   --test-cmd "<cmd>"                 override the mobile test gate
#   --dev-cmd "<cmd>"                  override the web dev-server command
#   --with-playwright                  npm-install Playwright+chromium into the skill (web rendering on any project)
#   --agents-global                    install agents into ~/.claude/agents instead of <target>/.claude/agents
#   --force                            overwrite files that differ, INCLUDING regenerating project.config.md
#   --update                           overwrite skills + agents to latest, but KEEP each project.config.md
#   -h, --help                         show this help
#
# TARGET_DIR defaults to the current directory.
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${PWD}"
SURFACE="auto"
ANALYZE_CMD=""
TEST_CMD=""
DEV_CMD=""
WITH_PLAYWRIGHT=0
AGENTS_GLOBAL=0
FORCE=0
UPDATE=0

usage() { awk 'NR>1{ if(/^#/){sub(/^# ?/,"");print} else exit }' "$0"; exit "${1:-0}"; }

# ---- parse args ------------------------------------------------------------
POSITIONAL_SET=0
while [ $# -gt 0 ]; do
  case "$1" in
    --surface) SURFACE="$2"; shift 2 ;;
    --analyze-cmd) ANALYZE_CMD="$2"; shift 2 ;;
    --test-cmd) TEST_CMD="$2"; shift 2 ;;
    --dev-cmd) DEV_CMD="$2"; shift 2 ;;
    --with-playwright) WITH_PLAYWRIGHT=1; shift ;;
    --agents-global) AGENTS_GLOBAL=1; shift ;;
    --force) FORCE=1; shift ;;
    --update) UPDATE=1; shift ;;
    -h|--help) usage 0 ;;
    --*) echo "unknown option: $1" >&2; usage 2 ;;
    *) TARGET="$1"; POSITIONAL_SET=1; shift ;;
  esac
done

# OVERWRITE governs file copies (skills + agents); FORCE alone governs config regeneration.
# --update overwrites files but preserves project.config.md; --force does both.
OVERWRITE=0
{ [ "$FORCE" = 1 ] || [ "$UPDATE" = 1 ]; } && OVERWRITE=1

# ---- resolve + validate target ---------------------------------------------
if [ ! -d "$TARGET" ]; then echo "error: target dir not found: $TARGET" >&2; exit 1; fi
TARGET="$(cd "$TARGET" && pwd)"
PROJECT_NAME="$(basename "$TARGET")"
echo "spec-loop installer"
echo "  source: $SOURCE_DIR"
echo "  target: $TARGET"
[ "$UPDATE" = 1 ] && echo "  mode: update (refresh skills + agents; keep each project.config.md)"
[ "$FORCE" = 1 ] && echo "  mode: force (overwrite everything, including project.config.md)"

# ---- spec-kit check (warn, don't fail) -------------------------------------
if [ ! -d "$TARGET/.specify" ]; then
  echo "  WARNING: no .specify/ in target — loop-feature needs Spec Kit (the speckit-* skills)."
  echo "           init it with:  uvx --from git+https://github.com/github/spec-kit.git specify init --here"
fi

# ---- superpowers note (can't auto-install a Claude Code plugin from bash) ---
echo "  NOTE: /loop-fix needs the Superpowers plugin (obra/Superpowers). Install it in Claude Code:"
echo "          /plugin marketplace add obra/superpowers-marketplace"
echo "          /plugin install superpowers@superpowers-marketplace"
echo "        then reload. (/loop-init also checks for it.)"

# ---- helpers ---------------------------------------------------------------
lc() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
has_make_target() { [ -f "$TARGET/Makefile" ] && grep -qE "^$1:" "$TARGET/Makefile"; }
is_melos() { [ -f "$TARGET/pubspec.yaml" ] && grep -qE '(^|[^a-z])melos' "$TARGET/pubspec.yaml" 2>/dev/null; }

# ---- detect surface --------------------------------------------------------
if [ "$SURFACE" = "auto" ]; then
  has_web=0; has_mobile=0
  [ -f "$TARGET/web/package.json" ] && has_web=1
  { [ -f "$TARGET/package.json" ] && grep -q '"next"' "$TARGET/package.json" 2>/dev/null; } && has_web=1
  [ -f "$TARGET/pubspec.yaml" ] && has_mobile=1
  if [ $has_web -eq 1 ] && [ $has_mobile -eq 1 ]; then SURFACE="both"
  elif [ $has_web -eq 1 ]; then SURFACE="web"
  elif [ $has_mobile -eq 1 ]; then SURFACE="mobile"
  else SURFACE="mobile"; echo "  NOTE: could not auto-detect surface; defaulting to mobile (override with --surface)"; fi
fi
SURFACE="$(lc "$SURFACE")"
echo "  surface: $SURFACE"

# ---- resolve gate commands -------------------------------------------------
# mobile
if [ -z "$ANALYZE_CMD" ]; then
  if has_make_target analyze; then ANALYZE_CMD="make analyze"
  elif is_melos; then ANALYZE_CMD="dart run melos run analyze"
  else ANALYZE_CMD="flutter analyze"; fi
fi
if [ -z "$TEST_CMD" ]; then
  if has_make_target test; then TEST_CMD="make test"
  elif is_melos; then TEST_CMD="dart run melos run test --no-select"
  else TEST_CMD="flutter test"; fi
fi
# web
WEB_ANALYZE="make web-analyze"; has_make_target web-analyze || WEB_ANALYZE="npm run lint"
WEB_BUILD="make web-build";     has_make_target web-build   || WEB_BUILD="npm run build"
WEB_CWV="";                     has_make_target web-cwv     && WEB_CWV="make web-cwv"
if [ -z "$DEV_CMD" ]; then
  if has_make_target web-dev; then DEV_CMD="make web-dev"; else DEV_CMD="npm run dev"; fi
fi

# ---- detect playwright -----------------------------------------------------
PLAYWRIGHT="absent"
for d in "$TARGET" "$TARGET/web" "$TARGET/frontend"; do
  [ -d "$d/node_modules/@playwright" ] && PLAYWRIGHT="present"
done

# ---- copy helper -----------------------------------------------------------
copy_file() { # src dst
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [ -f "$dst" ] && ! cmp -s "$src" "$dst"; then
    if [ "$OVERWRITE" = 1 ]; then cp "$src" "$dst"; echo "  overwrote ${dst#$TARGET/}"
    else echo "  SKIP (differs, use --update or --force): ${dst#$TARGET/}"; fi
  else cp "$src" "$dst"; fi
}

# ---- install agents --------------------------------------------------------
if [ "$AGENTS_GLOBAL" = 1 ]; then AGENTS_DST="$HOME/.claude/agents"; else AGENTS_DST="$TARGET/.claude/agents"; fi
echo "  installing agents → $AGENTS_DST"
for f in "$SOURCE_DIR"/agents/*.md; do copy_file "$f" "$AGENTS_DST/$(basename "$f")"; done

# ---- config writer (per skill) ---------------------------------------------
write_config() { # dest_path
  local cfg="$1"
  mkdir -p "$(dirname "$cfg")"
  if [ -f "$cfg" ] && [ "$FORCE" != 1 ]; then
    echo "  KEEP existing config (use --force to regenerate): ${cfg#$TARGET/}"; return
  fi
  {
    echo "# spec-loop — project config (generated by install.sh on $(date '+%Y-%m-%d %H:%M:%S'))"
    echo "#"
    echo "# The skill reads this for the surface default + gate commands. Hand-edit freely."
    echo
    echo "project_name: $PROJECT_NAME"
    echo "project_root: $TARGET"
    echo "surface_default: $SURFACE"
    echo "playwright: $PLAYWRIGHT"
    echo "gate_strictness: standard   # low = 0 Crit/High/Med (Low+Info logged) | standard = also 0 Low (Info logged) | strict = also 0 Info. Toggle with /loop-gate"
    echo
    echo "## Automated gate commands. Every listed command must exit 0."
    echo "mobile_gates:"
    if [ "$SURFACE" = "mobile" ] || [ "$SURFACE" = "both" ]; then
      echo "  - $ANALYZE_CMD"
      echo "  - $TEST_CMD"
    else
      echo "  []"
    fi
    if [ "$SURFACE" = "web" ] || [ "$SURFACE" = "both" ]; then
      echo "web_gates:"
      echo "  - $WEB_ANALYZE"
      echo "  - $WEB_BUILD"
      echo "web_dev_server: $DEV_CMD"
      echo "web_cwv: ${WEB_CWV:-}"
    else
      echo "web_gates: []"
      echo "web_dev_server:"
      echo "web_cwv:"
    fi
    echo
    echo "## Parity tooling"
    echo "# - web parity:    render-keyframes.mjs (needs Playwright: $PLAYWRIGHT)"
    echo "# - mobile parity: Mobile MCP / Flutter integration screenshots (ui-comprehensive-tester)"
  } > "$cfg"
  echo "  wrote ${cfg#$TARGET/}"
}

# ---- install every skill under skills/* ------------------------------------
INSTALLED_SKILLS=""
for skilldir in "$SOURCE_DIR"/skills/*/; do
  [ -d "$skilldir" ] || continue
  skill="$(basename "$skilldir")"
  SKILL_DST="$TARGET/.claude/skills/$skill"
  echo "  installing skill '$skill' → $SKILL_DST"
  copy_file "${skilldir}SKILL.md" "$SKILL_DST/SKILL.md"
  for f in "${skilldir}resources/"*; do [ -e "$f" ] && copy_file "$f" "$SKILL_DST/resources/$(basename "$f")"; done

  # Playwright bootstrap only for a skill that ships the renderer (loop-feature)
  if [ "$WITH_PLAYWRIGHT" = 1 ] && [ -f "$SKILL_DST/resources/render-keyframes.mjs" ]; then
    echo "  bootstrapping Playwright into $skill/resources…"
    ( cd "$SKILL_DST/resources" \
      && { [ -f package.json ] || npm init -y >/dev/null 2>&1; } \
      && npm i -D @playwright/test >/dev/null 2>&1 \
      && npx playwright install chromium ) && PLAYWRIGHT="present" \
      || echo "  WARNING: Playwright bootstrap failed; leaving playwright: $PLAYWRIGHT"
  fi

  write_config "$SKILL_DST/resources/project.config.md"
  INSTALLED_SKILLS="$INSTALLED_SKILLS $skill"
done

# ---- summary ---------------------------------------------------------------
echo
echo "✅ spec-loop installed into $PROJECT_NAME"
echo "   skills:$INSTALLED_SKILLS"
echo "   surface=$SURFACE  playwright=$PLAYWRIGHT"
echo "   gates: $ANALYZE_CMD ; $TEST_CMD"
echo
echo "Next:"
echo "  1) Reload Claude Code in $PROJECT_NAME so the skills + QA agents register."
echo "  2) Run /loop-init FIRST — it installs Spec Kit (if missing) + authors the constitution."
echo "  3) /loop-feature needs design access (DesignSync): sign in to claude.ai or run /design-login."
echo "  4) Run:  /loop-feature <design project> — <intent>     or     /loop-refactor [scope]"
echo "     Batch:  /loop-plan <intent>  (queue many)  then  /loop-run [all]"
echo "  5) For /loop-fix: install the Superpowers plugin (see the NOTE above) + reload."
[ -d "$TARGET/.specify" ] || echo "  (i) No .specify/ yet — /loop-init will install Spec Kit for you."
