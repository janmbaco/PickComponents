---
description: "Use when editing Pick Components source files in src/**, especially decorators, bootstrap/composition root, dependency injection factories, registration, and rendering/reactivity internals."
applyTo: "src/**"
---

# Pick Components Source Instructions

## Scope

- Applies to source changes under `src/**`.
- Keep changes aligned with factory-first DI and composition-root bootstrapping.

## Bootstrap and Import Order

- Preserve entry/bootstrap ordering semantics when touching startup code.
- Ensure framework bootstrap runs before relying on decorator-registered behavior.
- Treat decorator imports as potentially side-effectful registration paths.

## Factory-First Dependency Injection

- For `@PickRender` and `@Pick`, provide initializer/lifecycle dependencies through factory functions.
- Do not introduce implicit dependency auto-discovery patterns.
- Instantiate concrete dependencies only in composition root/bootstrap paths.
- In feature/component code, depend on abstractions and injected collaborators.

## Reactivity and Rendering Boundaries

- Keep business logic out of presentational rendering layers.
- Preserve property-level reactivity patterns used by the framework internals.
- Avoid cross-cutting mutable globals outside the framework service registry behavior.

## Validation and Errors

- Validate public inputs and injected dependencies at method/constructor entry.
- Throw explicit/typed errors for invalid states.
- Catch only specific errors and re-throw unknown/unhandled errors.
- Do not use `null`/`undefined` as failure signals in public APIs.

## Documentation Links

- DI architecture: [docs/DEPENDENCY-INJECTION.md](../../docs/DEPENDENCY-INJECTION.md)
- Rendering internals: [docs/RENDERING-ARCHITECTURE.md](../../docs/RENDERING-ARCHITECTURE.md)
- Rendering pipeline: [docs/RENDERING-PIPELINE-DEEP-DIVE.md](../../docs/RENDERING-PIPELINE-DEEP-DIVE.md)
- Pick vs PickRender: [docs/SMART-VS-SMARTRENDER.md](../../docs/SMART-VS-SMARTRENDER.md)
