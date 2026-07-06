# Claude Design prompt — <feature> (`/skl-plan --design` prompt output)

> The shape of the prompt `/skl-plan --design` writes to `.skl-design/<slug>/claude-design-prompt.md`.
> Fill every `<…>` from the design system (design-system step), the selected platforms (platforms step),
> and the Superpowers brainstorm (flow step). The user pastes this into **claude.ai/design** to generate
> the UI. Keep it concrete — name screens, states, and interactions; reference the design system rather
> than re-deriving it.

---

## Context
- **Feature:** <one-line intent>.
- **Design system:** <existing Claude Design project/ref to match — OR "see design-system-prompt.md, create it first">. Use its tokens (color, type, spacing) and components; do not invent new visual primitives.
- **Platforms & viewports:** *(only the selected ones)*
  - Mobile — 390×844 (also check 360×800).
  - Tablet (iPad) — 834×1194 (and 1024×1366 for iPad Pro).
  - Web — 1440×900 desktop, responsive at 1280 / 768 breakpoints.
- **Tone:** <brand adjectives>.

## Screens (the flow)
Numbered user journey from the brainstorm. For **each screen**:
- **Purpose** — what the user does here.
- **Layout per selected platform** — how it adapts (e.g. tab bar on mobile → sidebar on web).
- **States** — empty / loading / error / success / key edge cases.
- **Key components** — from the design system.

| # | screen | purpose | states to show |
|---|--------|---------|----------------|
| 1 | <name> | <…> | empty / loading / error / success |
| 2 | … | … | … |

## Interactions & motion
- Primary interactions per screen (taps, gestures, transitions between screens).
- Animations worth specifying: *element · trigger · property · duration · easing · loop?* (these become
  the spec's Animation Inventory when `/skl-plan` runs design-driven).

## Deliverables to ask Claude Design for
- Each screen above, for **each selected platform**, in its **key states**.
- Consistent use of the design system (call it out explicitly).
- A short notes section on responsive behavior + motion.

> After generating in claude.ai/design, the design becomes the visual spec that `/skl-plan` /
> `/skl-feature` pull (read-only) and verify parity against.
