# Code-organization playbook — starting hypotheses (init-loop Phase 2)

> Used by `/init-loop` to seed its **recommendation**, NOT to replace the web search. Treat every
> row as a *hypothesis to confirm or refresh via `WebSearch`* against current community guidance,
> then present 2–4 concrete candidates (with cited sources) for the user to choose. Whatever they
> pick must be **spelled out** in the constitution: topology + allowed dependency direction +
> naming + LOC budgets — because `/refactor-loop` Phase 0 reads the constitution as its target.

## The shape every candidate must end up in

| Field | What to nail down |
|-------|-------------------|
| Topology | the packages / modules / layers and what each is responsible for |
| Dependency direction | who may import whom; what must NOT be imported (the arrows) |
| Naming | file/dir naming, suffixes, feature vs. layer foldering |
| Size budgets | LOC ceilings per file/class/function (so refactor-loop has a measure) |
| Testing placement | where tests live + coverage floors (pairs with the TDD principle) |

## Stack → common idiomatic organizations (confirm via web search)

### Flutter / Dart
- **Monorepo via `melos`** when there are multiple packages/apps (shared `core`, `design_system`, feature packages). Pairs naturally with:
- **Clean Architecture, feature-first**: each feature is a package/folder with `presentation → domain → data`; `domain` is pure (no Flutter/data deps); dependency arrow points inward. Common alternatives: **layer-first** (top-level `data/ domain/ presentation/`) for smaller apps; **bloc/riverpod**-driven foldering for state. Budgets: widgets small, one widget per file.

### JS / TS web (Next.js / React)
- **App Router + feature folders**: colocate route segments under `app/`, shared UI in `components/`, domain logic in `features/<x>/` or `modules/<x>/`. **Modular monolith** for larger apps (clear module boundaries, enforced with import rules / eslint boundaries). Server/client component split is part of the topology. Budgets: component + hook size limits.

### Backend services
- **Go**: standard layout (`cmd/`, `internal/`, `pkg/`), hexagonal/clean for non-trivial domains; keep `internal/` boundaries tight.
- **Python**: `src/` layout + package-per-domain; clean/hexagonal (ports & adapters) for services; `pyproject.toml`-driven.
- **Node/TS services**: feature modules or clean architecture (controllers → services → repositories); enforce direction with project references / eslint-plugin-boundaries.

### Monorepos (polyglot / multi-app)
- Tooling: **Nx / Turborepo** (JS), **melos** (Dart), **Bazel** (polyglot at scale). The decision is mostly *boundary enforcement + caching*; the per-package organization still comes from the stack rows above.

## Cross-cutting principles to fold into the constitution (beyond org)
- **Code quality** — lint/format gates, complexity ceilings, no dead code.
- **Testing / TDD** — test-first; unit/integration/e2e split; coverage floor; public behavior covered (so refactors are safe).
- **UX consistency** — design tokens / a single design system; shared component library; a11y baseline.
- **Performance** — budgets (startup, frame/CWV, bundle/app size), measured in the gates.
