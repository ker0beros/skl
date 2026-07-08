# skl-do — project config (EXAMPLE / template)
#
# /skl-init generates `project.config.md` from this template, auto-detecting the values for the
# project (surface + gate commands). The skl-do SKILL reads `project.config.md` at runtime for
# the surface default and the gate commands. You can hand-edit `project.config.md` anytime.

project_name: <project>
project_root: </abs/path/to/project>
surface_default: mobile        # one of: web | mobile | both | auto
playwright: absent             # present | absent  (web design-ref rendering + web parity need Playwright)
gate_strictness: standard      # low = 0 Crit/High/Med (Low+Info logged) | standard = also 0 Low (Info logged) | strict = also 0 Info (info-level lints). Toggle with /skl-strictness

## Pickup labels — the issue-lifecycle labels /skl-do drives and /skl-ticket proposes (override only to rename).
# Defaults shown; omit any line to keep the default. /skl-do builds only pickup_label tickets; the two
# "held" labels (needs-info / human) are resolved by a human (answer / decide), who then re-labels pickup_label.
pickup_label:            loop-ready        # eligible for the autonomous build loop
pickup_inprogress_label: loop-in-progress  # the loop is working this ticket (also the resume signal)
pickup_done_label:       loop-done         # PR open, awaiting your review + merge
pickup_deferred_label:   loop-deferred     # loop couldn't converge in the cap — needs a human
pickup_needsinfo_label:  loop-needs-info   # missing facts — answer the comment, then re-label loop-ready
pickup_human_label:      loop-human        # needs a human decision/action — decide, then re-label loop-ready

## Automated gate commands — Phase B step 10. Every listed command must exit 0.
mobile_gates:
  - make analyze
  - make test
web_gates: []                  # e.g.  - make web-analyze   /   - make web-build
web_dev_server:                # e.g.  make web-dev   (skl-ui-tester uses this for web parity)
web_cwv:                       # e.g.  make web-cwv   (run only for full-page web designs)

## Mobile live render — how skl-ui-tester captures REAL pixels for a design-driven mobile round.
# Design-driven MOBILE has NO headless desktop render (Flutter apps with no web/desktop target), so a
# booted simulator/emulator screenshot is the ONLY pixel source for the parity gate. The loop reads
# `mobile_render` to render + capture each design-driven screen into specs/<feature>/verification/.
# See resources/mobile-render.md for the step-by-step runbook.
mobile_render:
  platform: ios                # default render platform: ios (iPad) | android (tablet, opt-in secondary)
  device: "iPad (10th generation)"  # the tablet simulator/emulator to boot (match the design's target)
  boot: make run-sim           # command that boots the sim + launches the app (mirror your run-ipad target)
  driver: mobile-mcp           # drive to each design-driven screen + screenshot via Mobile MCP
  out: specs/<feature>/verification  # write ONE screenshot per design-driven screen here

# device_logical_size — the real device LANDSCAPE logical size (dp) the headless no-overflow / fidelity
# tests must pump at (replaces the old implicit 1280x800). Measure ONCE on-device: log
# MediaQuery.size / devicePixelRatio / padding on the booted simulator. One entry per platform you render.
# See resources/no-overflow-testing.md for how the tests consume this.
device_logical_size:
  ios: <WxH>                   # e.g. 1366x1024  (iPad 10th-gen landscape logical px) — MEASURE, don't guess
  # android: <WxH>             # opt-in secondary, only if you also render Android

## Parity tooling (informational)
# - web parity:    render-keyframes.mjs — WEB-ONLY, needs Playwright (resources/render-keyframes.mjs)
# - mobile parity: the mobile_render recipe above — Mobile MCP, default iOS (resources/mobile-render.md)
# - design ref:    Playwright render when present; else Mobile MCP / user-provided PNGs under specs/<feature>/references/
