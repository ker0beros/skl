# Contributing to skl

Thanks for your interest. skl is an opinionated, spec-driven, QA-gated ticket runner for Claude Code —
contributions that sharpen that opinion are welcome; ones that dilute the guardrails (auto-merge,
multi-ticket auto-driving, skipping human gates) are not.

## What skl is (and isn't)

- **Is:** a human-gated, one-ticket-at-a-time loop that opens PRs and never merges them.
- **Isn't:** an unattended agent that ships to `main` on its own. See the README's "Is this for you?".

## Repo layout

- `skills/skl-*/SKILL.md` (+ `resources/`) — the slash commands.
- `agents/` — the 10 subagents (8 QA gates + `skl-debugger` + `skl-business-analyst`).
- `docs/superpowers/{specs,plans}/` — the design + implementation history (skl dogfoods its own flow).

## Release rule (required for any change to `skills/` or `agents/`)

Any change to `skills/` or `agents/` that lands on `main` MUST, in the same change:

1. Bump root `VERSION` (semver: wording/fix = patch, new behavior/skill/agent = minor,
   breaking workflow change = major).
2. Add a matching `## <version> — <YYYY-MM-DD>` section at the top of `CHANGELOG.md`, one bullet per
   user-visible change.

`/skl-update` reads both to show users what changed — an unbumped `VERSION` means they never see it.

## Proposing a change

1. Open an issue describing the change and why it fits skl's posture.
2. For anything non-trivial, skl dogfoods itself: brainstorm → spec (`docs/superpowers/specs/`) →
   plan (`docs/superpowers/plans/`) → implement.
3. Open a PR. Keep the diff focused; update the README/skill docs and the changelog in the same PR.
