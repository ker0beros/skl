# Mobile live-render runbook (design-driven mobile parity)

The mobile counterpart to `render-keyframes.mjs` (which is **web-only**). Design-driven **mobile** has
**no headless desktop render** — a Flutter app with no web/desktop target can't be rendered to PNGs by
a script — so the **only** pixel source for the parity gate is a screenshot of the app running on a
**booted simulator/emulator**. `ui-comprehensive-tester` runs this flow; the round **cannot pass**
without the resulting `specs/<feature>/verification/` captures (the render gate in `pass-matrix.md`).

Default render platform: **iOS** (an iPad-class tablet). Android is an **opt-in secondary** — render it
too only if `mobile_render.platform`/`device_logical_size` lists Android.

## Inputs (from `project.config.md → mobile_render`)

- `platform` — `ios` (default) or `android`.
- `device` — the tablet simulator/emulator to boot (e.g. `iPad (10th generation)`).
- `boot` — the command that boots the sim **and** launches the app (mirror your `make run-ipad`; add a
  `make run-sim` if you don't have one).
- `driver` — `mobile-mcp` (drive + screenshot via Mobile MCP).
- `out` — where screenshots land: `specs/<feature>/verification/`.

## Steps

1. **Boot + launch.** Run the `boot` command. Confirm the app is up on the target `device` at the
   landscape `device_logical_size` you recorded (don't render at a different size than the tests pump).
2. **Drive to each design-driven screen.** For every screen in the spec's **Visual Targets** (and each
   keyframe for animated ones), navigate there with **Mobile MCP** the way a user would.
3. **Scroll scrollables to the end.** For any list/grid, `scroll` to the **last item** before
   capturing — a clipped bottom row only shows once you've scrolled to it. Capture the end state.
4. **Screenshot → `verification/`.** Save one screenshot per screen into `out`
   (`specs/<feature>/verification/`), named to match the corresponding `references/` file so they pair
   up 1:1 for the side-by-side.
5. **Compare to `references/`.** Judge **pixels**, not spec text. Flag, at minimum:
   - **content clipped / cut off at the screen edge** (last row flush to / under the edge) — **≥ High**;
   - **non-scrollable overflow** — **≥ High**;
   - **doubled or missing chrome** (e.g. the app's own status bar *and* the OS status bar both visible;
     or a bar the design shows is gone) — **≥ High**;
   - per-element layout / color / spacing drift — **≥ Medium**.

## If the simulator / Mobile MCP is unavailable

Do **not** fall back to a functional/widget smoke and call parity "present." Report a **High** finding
(`no live render obtainable`) and **ask the user to supply a device screenshot** for each design-driven
screen, then compare those to `references/`. No render ⇒ no pass.

## Related

- `no-overflow-testing.md` — the headless `make test` convention (real `device_logical_size` + OS inset
  + assertions beyond `takeException()`) that catches the silent-clip class **before** this render.
- `render-keyframes.mjs` — the web-only renderer; not used for mobile.
