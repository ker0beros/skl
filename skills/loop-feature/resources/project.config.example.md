# loop-feature — project config (EXAMPLE / template)
#
# /loop-init generates `project.config.md` from this template, auto-detecting the values for the
# project (surface + gate commands). The loop-feature SKILL reads `project.config.md` at runtime for
# the surface default and the gate commands. You can hand-edit `project.config.md` anytime.

project_name: <project>
project_root: </abs/path/to/project>
surface_default: mobile        # one of: web | mobile | both | auto
playwright: absent             # present | absent  (web design-ref rendering + web parity need Playwright)
gate_strictness: standard      # low = 0 Crit/High/Med (Low+Info logged) | standard = also 0 Low (Info logged) | strict = also 0 Info (info-level lints). Toggle with /loop-gate

## Automated gate commands — Phase B step 10. Every listed command must exit 0.
mobile_gates:
  - make analyze
  - make test
web_gates: []                  # e.g.  - make web-analyze   /   - make web-build
web_dev_server:                # e.g.  make web-dev   (ui-comprehensive-tester uses this for web parity)
web_cwv:                       # e.g.  make web-cwv   (run only for full-page web designs)

## Parity tooling (informational)
# - web parity:    render-keyframes.mjs (needs Playwright)
# - mobile parity: Mobile MCP / Flutter integration screenshots (ui-comprehensive-tester)
# - design ref:    Playwright render when present; else Mobile MCP / user-provided PNGs under specs/<feature>/references/
