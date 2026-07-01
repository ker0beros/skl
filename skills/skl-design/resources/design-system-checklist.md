# Design-system checklist — step-by-step (skl-design Step 1, "No")

> Used by `/skl-design` when the user has **no** design system in Claude Design yet. Drive it with
> Superpowers `brainstorming` — settle each item **one at a time**, asking the user, then write the
> result as `.skl-design/design-system-prompt.md` (a prompt the user pastes into claude.ai/design to
> create the system **first**, before the feature screens). Don't invent a brand the user doesn't want;
> brainstorm options and let them choose.

## Settle these, in order

1. **Brand & tone** — product name, audience, personality (e.g. calm/professional, bold/playful). 3–5
   adjectives. Any existing logo/brand colors to honor?
2. **Color palette** — primary + secondary + accent; neutrals (background/surface/border/text ramps);
   **semantic roles**: success / warning / error / info. Define for **light and dark** if theming.
3. **Typography** — font family/families (heading + body + mono), the **type scale** (e.g. 12/14/16/20/
   24/32/40), weights, line-heights.
4. **Spacing & grid** — base unit (4 or 8 px), spacing scale, container widths, grid columns/gutters
   per platform.
5. **Core components** — buttons (variants/sizes/states), inputs/forms, cards, lists, nav (tab bar /
   app bar / sidebar), modals/sheets, toasts, empty/loading/error states. Note radius + elevation style.
6. **Theming** — light only, or light + dark? Any high-contrast / density needs?
7. **Accessibility baseline** — min contrast (WCAG AA), min tap target (≈44px), focus states, motion-
   reduction.

## Output: the design-system prompt
Write `.skl-design/design-system-prompt.md` as a Claude Design prompt that asks for a **reusable design
system / style guide** capturing all of the above (tokens + a component sheet), themed as decided. Tell
the user to create this in claude.ai/design first, then reference it when generating feature screens.

> If the user already declared visual rules in `.specify/memory/constitution.md` or `CLAUDE.md`
> (design tokens, component conventions), reconcile with those — don't contradict the constitution.
