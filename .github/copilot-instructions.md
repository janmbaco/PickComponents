# Pick Components Workspace Instructions

These instructions apply to the whole repository. Keep responses concise, actionable, and aligned with existing architecture.

## Code Style

- All JSDoc must be in English.
- Mandatory JSDoc for all public exports:
  - Interfaces: `Defines the responsibility of...`
  - Classes: `Implements the responsibility of...`
  - Public methods must include `@param`, `@returns`, `@throws`, `@example`
- Use explicit types (no `any`), descriptive names, and `private readonly` for internal dependencies.
- Prefer one return per method; use guard clauses only for short input validation.
- No commented-out code and no silent error swallowing.

## Architecture

- Core source code is under `src/`; tests are under `tests/`.
- This project is factory-first DI:
  - `@PickRender` and `@Pick` initializer/lifecycle dependencies are provided through factory functions.
  - Do not use implicit dependency auto-discovery patterns.
- Composition root is bootstrap:
  - Instantiate concrete services only in bootstrap/composition root paths.
  - Depend on abstractions in feature code.
- Decorator modules can have registration side effects. Preserve import order semantics when touching bootstrap/entry files.

## Build and Test

- Install: `npm install`
- Build library: `npm run build:lib`
- Build all: `npm run build`
- Dev server: `npm run serve:dev`
- Run tests: `npm test`
- Run unit only: `npm run test:unit`
- Run integration only: `npm run test:integration`
- Lint: `npm run lint`
- Format: `npm run format`

## Conventions

- Validate parameters and injected dependencies at method/constructor start; throw explicit errors.
- Catch only specific errors and always re-throw unknown/unhandled ones.
- Do not return `null`/`undefined` to signal failures in public APIs; throw typed errors instead.
- Use `?.` and `??` for safe access/defaults, but do not skip runtime validation for public APIs.
- Avoid global mutable state outside framework-level service registry behavior.

## Linked References

- Repository overview and usage: [README.md](../README.md)
- Test-specific rules (AAA, mocks, naming): [.github/instructions/testing.instructions.md](instructions/testing.instructions.md)
- Dependency injection architecture: [docs/DEPENDENCY-INJECTION.md](../docs/DEPENDENCY-INJECTION.md)
- Rendering internals: [docs/RENDERING-ARCHITECTURE.md](../docs/RENDERING-ARCHITECTURE.md)
- Pick vs PickRender design: [docs/SMART-VS-SMARTRENDER.md](../docs/SMART-VS-SMARTRENDER.md)

## Anti-Patterns (Never)

- Swallow errors silently.
- Instantiate concrete classes outside composition root when an abstraction is available.
- Introduce hidden coupling patterns such as `param || new ConcreteClass()`.
- Mix business logic into presentational component layers.
