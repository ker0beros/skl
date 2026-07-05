# skl repo instructions

## Release rule: VERSION + CHANGELOG.md

Any change to `skills/` or `agents/` that lands on `main` MUST, in the same change:

1. Bump `VERSION` (semver — wording/fix = patch, new behavior or new skill/agent = minor,
   breaking workflow change = major).
2. Add a matching `## <version> — <YYYY-MM-DD>` section at the TOP of `CHANGELOG.md`, one
   bullet per user-visible change.

`/skl-update` reads both files to show users what's new — an unbumped `VERSION` means users
never see a changelog for your change.
