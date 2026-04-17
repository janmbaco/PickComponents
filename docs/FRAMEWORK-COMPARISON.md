# Pick Components Compared To Other Frameworks

This is not a scoreboard. Pick Components is intentionally small, so the useful
comparison is architectural: what kind of work each tool makes natural.

Pick Components is a lifecycle-focused Web Components framework. It favors native
custom elements, explicit component state, typed intention signals, and a
`PickLifecycleManager` that mediates between UI components and business
services.

## Positioning

Pick Components fits best when you want:

- Native custom elements that can be used from plain HTML or other frameworks.
- Reactive UI without a virtual DOM or a large app runtime.
- Explicit separation between renderable state, user intentions, lifecycle
  coordination, and services.
- Components that are easy to embed as islands, widgets, dashboards, docs
  examples, or design-system pieces.
- A small TypeScript-first framework whose internals are inspectable.

It is not trying to replace full application platforms. Choose a larger
framework when you need a mature meta-framework, SSR/data-loading conventions,
mobile targets, massive plugin ecosystems, or broad team familiarity as the
primary constraint.

## Quick Comparison

| Framework | What it optimizes for | How Pick Components differs | Prefer Pick Components when |
| --- | --- | --- | --- |
| React | Large app ecosystem, JSX component model, virtual DOM, broad hiring pool | Uses native custom elements, no virtual DOM, no JSX requirement, explicit lifecycle mediation | You want embeddable Web Components and direct service coordination without adopting a full React app model |
| Vue | Integrated SFC authoring, approachable reactivity, batteries-included app structure | Keeps the component model closer to platform custom elements and separates lifecycle/service mediation explicitly | You want lightweight components with explicit TypeScript services rather than an app-level framework |
| Svelte | Compile-time components, minimal runtime, declarative `.svelte` files | Uses runtime metadata/decorators and native custom elements instead of a component compiler dialect | You want Web Components and framework internals you can override through the service registry |
| Solid | Fine-grained signal reactivity and JSX with very precise updates | Uses per-property signals for bindings, plus `IntentSignal` for commands and `LifecycleManager` for business flow | You prefer class/DSL components and a built-in mediator pattern over JSX signal composition |
| Lit | Standards-first Web Components with mature template/directive patterns | Closest relative. Pick Components adds stronger opinions around initializers, lifecycle managers, DI, safe expression templates, and intent signals | You want Web Components plus a small architectural framework for services and lifecycles |
| Stencil | Compiler-driven Web Components for design systems and distributable libraries | Pick Components is lighter and does not require adopting a compiler framework for every component | You want local/runtime-driven components, examples, or app widgets rather than a compiler-first library pipeline |
| Alpine | Progressive enhancement with HTML attributes and tiny local interactions | Pick Components gives stronger component classes, scoped rendering, services, lifecycle cleanup, and typed intent streams | Your UI has enough coordination that inline HTML behavior starts to feel cramped |
| HTMX | Server-driven HTML interactions with very little client state | Pick Components is client-component oriented and owns reactive state locally | You need client-side custom elements with local state and service subscriptions |
| Vanilla Web Components | Maximum platform control, no framework abstraction | Pick Components provides rendering, bindings, reactivity, lifecycle orchestration, DI hooks, and cleanup conventions | You want platform-native components without hand-rolling the same plumbing repeatedly |

## Concept Mapping

| Concern | Pick Components primitive | Notes |
| --- | --- | --- |
| Renderable state | `@Reactive` / `ctx.state()` | State that appears in templates or feeds computed values |
| State observation | `getPropertyObservable("name")` | For real state changes, not commands |
| User action or command | `createIntent<T>()` / `ctx.intent<T>()` | Point-in-time intentions with optional typed payload |
| DOM event listener | `@Listen(...)` / `ctx.listen(...)` | Native DOM events inside the rendered component root |
| Component → service flow | `PickLifecycleManager.addSubscription(...)` | Lifecycle manager subscribes to component intentions |
| Service → component flow | Service signal/observable → component `@Reactive` state | Keeps services framework-agnostic |
| Initial async preparation | `PickInitializer` / `ctx.initializer()` | Runs before the first real render |
| Long-lived coordination | `PickLifecycleManager` / `ctx.lifecycle()` | Runs after render and cleans up subscriptions |
| Navigation strategy | `INavigationService` | `pick-link`, `pick-router`, `navigate()` and `getCurrentPath()` share a replaceable navigation facade |

## Where It Feels Different

Many UI frameworks put most behavior inside the component. Pick Components keeps
the component mostly as the view surface:

```text
Component  -> emits intent
Lifecycle  -> coordinates with services
Service    -> owns business state or external integration
Component  <- receives renderable state updates
```

That distinction is the main taste of the framework. `@Reactive` is not a
command bus. `IntentSignal` is not renderable state. The lifecycle manager is
where the two worlds meet.

## Interop

Pick Components components are custom elements, so they can be consumed by plain
HTML, React, Vue, Svelte, Lit, server-rendered pages, or static documentation
sites. That makes it a good fit for component islands and shared widgets.

The opposite direction is also possible: a Pick Components app can host ordinary
custom elements, native controls, or framework-built Web Components. The platform
boundary is the contract.

Navigation follows the same small-port approach as DI. The default
`BrowserNavigationService` uses the History API, but applications can register a
different `INavigationService` for hash routing, memory routing, tests, or an
adapter over an external router. The built-in `pick-link`, `pick-router`,
`navigate()` and `getCurrentPath()` all go through that service.

## Rule Of Thumb

Use Pick Components when the browser platform is the right foundation and you
want a small, explicit architecture for state, intent, lifecycle, and services.

Use a larger framework when the application needs that framework's full platform:
routing conventions, SSR/data loading, large plugin ecosystems, mobile targets,
or team-wide familiarity.
