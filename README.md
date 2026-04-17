# Pick Components

> A lightweight, reactive web components framework for TypeScript and modern browser ESM.  
> Business logic stays in services. Components are pure presentation.

[![npm](https://img.shields.io/npm/v/pick-components)](https://www.npmjs.com/package/pick-components)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)

---

## Features

- **Signal-based reactivity** — Per-property observables; only affected DOM nodes update.
- **Component intent signals** — Typed point-in-time actions for lifecycle managers, without `requestVersion++` counters.
- **No virtual DOM** — Surgical DOM updates via direct subscriptions.
- **Two authoring styles** — Inline `@Pick` for quick components; class-based `@PickRender` for full control.
- **Native slot projection** — Named and default `<slot>` elements for composable layouts via Shadow DOM.
- **Factory-first DI** — Explicit dependency injection through factory functions; no hidden service construction.
- **Security-first expression evaluator** — Deterministic AST pipeline; no `eval` or `new Function`. Whitelisted method calls only.
- **Tiny footprint** — Zero runtime dependencies.
- **Browser-ready distribution** — Published ESM build for direct `<script type="module">` usage.

---

## Installation

```bash
npm install pick-components
```

---

## Choose Your Setup

### Option A — npm + bundler

Use this in Vite, Rollup, Webpack, esbuild, or similar toolchains.

```typescript
import { bootstrapFramework, Services } from "pick-components";
```

This path does not specifically require Vite, but it does require a toolchain that can resolve npm package imports for the browser.

### Option B — plain HTML + browser-ready ESM

Use this when you want to import the framework directly in the browser with no bundler.

For this mode, use the browser-ready artifacts prepared for GitHub Releases rather than trying to import the npm package directly in the browser.

Release assets are published here:

- `https://github.com/janmbaco/pickcomponents/releases`
- `https://github.com/janmbaco/pickcomponents/releases/tag/v<version>`

Direct asset URLs follow this pattern:

- `https://github.com/janmbaco/pickcomponents/releases/download/v<version>/pick-components.js`
- `https://github.com/janmbaco/pickcomponents/releases/download/v<version>/pick-components-bootstrap.js`

Recommended flow:

1. Download the browser bundle from the project's GitHub Release assets.
2. Copy it into your site's public assets, for example `/vendor/pick-components.js`.
3. Write your component source in TypeScript or modern JavaScript.
4. Transpile it before serving it to the browser.
5. Import the generated JavaScript from your HTML with `<script type="module">`.

Minimal HTML:

```html
<!doctype html>
<html lang="en">
  <body>
    <hello-card></hello-card>
    <script type="module" src="./hello-card.js"></script>
  </body>
</html>
```

Minimal TypeScript source:

```typescript
import {
  bootstrapFramework,
  Services,
  Pick,
} from "/vendor/pick-components.js";

await bootstrapFramework(Services);

@Pick("hello-card", (ctx) => {
  ctx.state({ name: "world" });
  ctx.html(`<p>Hello {{name}}</p>`);
})
class HelloCard {}
```

The browser-ready distribution is self-contained and does not rely on external runtime packages or Node builtins. It is intended for direct browser import once the file is being served by your site.

The npm package is optimized for development and consumption. The plain-browser distribution is documented and prepared as a separate release artifact flow, not as a browser-importable npm package entrypoint.

For GitHub Releases, the project also prepares a heavier browser distribution with:

- non-minified bundles
- minified bundles
- source maps for all browser bundles
- SHA256 checksums

Build the release artifacts locally with:

```bash
npm run build:release
```

This creates `.release-artifacts/v<version>/`, which mirrors the intended GitHub Release contents.

This direct browser path assumes a modern browser environment with ESM. TypeScript syntax and decorators must still be transpiled unless your target runtime explicitly supports the exact JavaScript decorator syntax you are serving.

---

## TypeScript And Decorators

Pick Components works with both TypeScript decorator emits:

- Standard decorators: `experimentalDecorators` omitted or `false`.
- Legacy decorators: `experimentalDecorators: true`.

You should not need to change a Vite/TypeScript project just to use
Pick Components. The default bootstrap accepts both modes.

Recommended public syntax:

```typescript
class Counter extends PickComponent {
  @Reactive count = 0;
}
```

`@Reactive accessor count = 0` is still supported for users who explicitly want
TC39 auto-accessors, but it is not required.

The playground and downloaded examples transpile with this compiler shape:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "experimentalDecorators": false
  }
}
```

If your project uses TypeScript's `experimentalDecorators` pipeline, the default
bootstrap already supports it:

```typescript
await bootstrapFramework(Services);
```

Strict decorator mode is available only when you intentionally want to accept
TC39 standard decorators only:

```typescript
await bootstrapFramework(Services, {}, { decorators: "strict" });
```

---

## Bootstrap

Call `bootstrapFramework()` once in your entry point before component modules
that use `@Pick`, `@PickRender`, `@Reactive`, or `@Listen` are evaluated:

```typescript
import { bootstrapFramework, Services } from "pick-components";

await bootstrapFramework(Services);
await import("./my-component.js");
```

---

## Usage

The examples below use the standard package import form:

```typescript
import { bootstrapFramework, Services } from "pick-components";

await bootstrapFramework(Services);
```

### Presentational Component (Slot Projection)

Components that wrap child content in a styled layout using native Shadow DOM slots. No state, no logic.

```typescript
import { Pick } from "pick-components";

@Pick("card-container", (ctx) => {
  ctx.html(`
    <div class="card">
      <div class="card-header">
        <slot name="header">Default Header</slot>
      </div>
      <div class="card-body">
        <slot>Default Content</slot>
      </div>
    </div>
  `);
})
export class CardContainer {}
```

```html
<card-container>
  <h2 slot="header">Card Title</h2>
  <p>Card body content goes here.</p>
</card-container>
```

---

### Data Display Component (Reactive Props)

Components that receive data via attributes and render it reactively.

```typescript
import { Pick } from "pick-components";

@Pick("user-badge", (ctx) => {
  ctx.props<{ name: string; role: string }>();

  ctx.html(`
    <div class="badge">
      <span class="name">{{name}}</span>
      <span class="role">{{role}}</span>
    </div>
  `);
})
export class UserBadge {}
```

```html
<user-badge name="Alice" role="Engineer"></user-badge>
```

---

### Interactive Component (Local State + Events)

Components with local state that responds to user interactions.

```typescript
import { Pick } from "pick-components";

@Pick("simple-counter", (ctx) => {
  ctx.state({ count: 0 });

  ctx.on({
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    },
    reset() {
      this.count = 0;
    },
  });

  ctx.html(`
    <div class="counter">
      <pick-action action="decrement"><button type="button">−</button></pick-action>
      <span>{{count}}</span>
      <pick-action action="increment"><button type="button">+</button></pick-action>
      <pick-action action="reset"><button type="button">Reset</button></pick-action>
    </div>
  `);
})
export class SimpleCounter {}
```

---

### Class-Based Component (`@PickRender`)

For components that need async initialization or a lifecycle manager to wire
external services.

```typescript
import {
  PickRender,
  PickComponent,
  PickInitializer,
  PickLifecycleManager,
  Reactive,
} from "pick-components";

class TodoInitializer extends PickInitializer<TodoList> {
  protected async onInitialize(component: TodoList): Promise<boolean> {
    component.items = await fetch("/api/todos").then((r) => r.json());
    return true;
  }
}

class TodoLifecycle extends PickLifecycleManager<TodoList> {
  protected onComponentReady(component: TodoList): void {
    this.addSubscription(
      todoService.onUpdate$.subscribe((items) => {
        component.items = items;
      }),
    );
  }
}

@PickRender({
  selector: "todo-list",
  template: `
    <ul>
      <pick-for items="{{items}}" key="id">
        <li class="{{$item.done ? 'done' : ''}}">{{$item.text}}</li>
      </pick-for>
    </ul>
  `,
  initializer: () => new TodoInitializer(),
  lifecycle: () => new TodoLifecycle(),
})
export class TodoList extends PickComponent {
  @Reactive items: Todo[] = [];
}
```

---

## Component Intentions

Use `@Reactive` for state that renders. Use intent signals for punctual user
actions that a lifecycle manager should coordinate with services.

```typescript
class ModeSelector extends PickComponent {
  @Reactive mode: RaceMode = "mass_start";

  readonly modeRequested$ = this.createIntent<RaceMode>();

  requestMode(mode: RaceMode): void {
    this.modeRequested$.notify(mode);
  }
}

class ModeSelectorLifecycle extends PickLifecycleManager<ModeSelector> {
  protected onComponentReady(component: ModeSelector): void {
    this.addSubscription(
      component.modeRequested$.subscribe((mode) => {
        raceService.setMode(mode);
      }),
    );
  }
}
```

`@Pick` has the same capability through `ctx.intent<T>("name$")`. Prefer this
pattern for actions and commands; keep `getPropertyObservable()` for real state
changes.

---

## View Actions

`<pick-action>` is the declarative bridge from view markup to component actions.
It listens to click and keyboard activation on its child content, then dispatches
a `pick-action` event that the nearest PickComponent handles.

```html
<pick-action action="archive" value="{{selectedId}}">
  <button type="button">Archive</button>
</pick-action>
```

- `action` is the action name exposed by `ctx.on(...)` or `getViewActions()`.
- `value` is optional and becomes the first action argument.
- The child can be any visual trigger, not only a `<button>`.
- `event` is also accepted as an alias for `action`, but new code should use `action`.
- Handled actions stop at the nearest component by default.
- Add `bubble` only when a parent component should be allowed to handle the same action.

---

## Template Syntax

| Syntax              | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `{{expression}}`    | Reactive binding — re-evaluates on property change        |
| `[[Namespace.KEY]]` | Static constant — inlined at compile time                 |
| `[[RULES.field]]`   | Validation rules — expands to HTML5 validation attributes |
| `<slot>`            | Default projection slot (native Shadow DOM)               |
| `<slot name="X">`   | Named projection slot (native Shadow DOM)                 |

---

## Commands

| Command                    | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `npm install`              | Install dependencies                                              |
| `npm run build:lib`        | Compile library to `dist/`                                        |
| `npm run build:browser`    | Bundle browser-ready ESM artifacts to `dist/browser/`             |
| `npm run build:prod`       | Compile library + browser-ready ESM artifacts                     |
| `npm run build:release`    | Prepare GitHub release browser artifacts in `.release-artifacts/` |
| `npm run build`            | Compile library + examples                                        |
| `npm run serve:dev`        | Start dev server on `http://localhost:3000`                       |
| `npm run serve:dist`       | Serve the built examples bundle on `http://localhost:8080`        |
| `npm test`                 | Run full test suite (unit + integration)                          |
| `npm run test:unit`        | Unit tests only                                                   |
| `npm run test:integration` | Integration tests only                                            |
| `npm run lint`             | Lint source files                                                 |
| `npm run format`           | Format source files                                               |

---

## Interactive Playground

The project ships with 14 interactive examples that run in the browser via a
TypeScript playground with live preview. Each example has an editable code panel
(CodeMirror) and an iframe sandbox that re-transpiles and re-executes on every
change.

### Running the playground

```bash
npm install
npm run build        # builds library + example bundles
npm run serve:dev    # http://localhost:3000
```

To preview the built examples with the production-oriented static server:

```bash
npm run build
npm run serve:dist   # http://localhost:8080
```

### Examples

| #   | Tab                       | Category     | Description                                      |
| --- | ------------------------- | ------------ | ------------------------------------------------ |
| 01  | Hello World               | Basics       | Minimal `@PickRender` component                 |
| 02  | Reactive State            | Basics       | `@Reactive` state and simple actions             |
| 03  | Template Bindings         | Basics       | Simple template bindings with `{{...}}`          |
| 04  | Template Expressions      | Basics       | Expressions inside `{{...}}`                     |
| 05  | Computed Bindings         | Basics       | Getter-derived bindings                          |
| 06  | @Pick Component          | Basics       | Functional authoring with `@Pick`               |
| 07  | Pick Actions             | Primitives   | Declarative view actions with `<pick-action>`   |
| 07b | Pick Actions with @Pick | Primitives   | The same action model via `ctx.on(...)`          |
| 08  | Pick Select              | Primitives   | Conditional branches with `<pick-select>`       |
| 09  | Pick For                 | Primitives   | List rendering with `<pick-for>`                |
| 10  | Forms & Rules             | Primitives   | Validation rules provided before render          |
| 11  | DI Injection              | Architecture | InjectKit bridge and constructor dependencies    |
| 12  | Real API                  | Architecture | Initializer + lifecycle + `createIntent()`       |
| 13  | Dashboard                 | Architecture | Multi-service composition and split template/CSS |
| 14  | @Pick Advanced           | Architecture | Full `@Pick` component with services & state    |

### Docker deployment

```bash
docker build -t pick-components .
docker run -p 8080:8080 pick-components
# Playground available at http://localhost:8080
```

---

## Documentation

| Document                                                                     | Description                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [docs/DEPENDENCY-INJECTION.md](docs/DEPENDENCY-INJECTION.md)                 | DI architecture and service registry                         |
| [docs/FRAMEWORK-COMPARISON.md](docs/FRAMEWORK-COMPARISON.md)                 | How Pick Components compares with other UI frameworks         |
| [docs/SMART-VS-SMARTRENDER.md](docs/SMART-VS-SMARTRENDER.md)                 | When to use `@Pick` vs `@PickRender`                       |
| [docs/RENDERING-ARCHITECTURE.md](docs/RENDERING-ARCHITECTURE.md)             | Rendering pipeline overview                                  |
| [docs/RENDERING-PIPELINE-DEEP-DIVE.md](docs/RENDERING-PIPELINE-DEEP-DIVE.md) | Expression parsing, binding resolution, reactivity internals |
| [docs/templates.md](docs/templates.md)                                       | Template system reference                                    |

---

## License

[MIT](LICENSE) © janmbaco
