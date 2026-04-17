# Pick Components — Rendering Architecture

This document describes how a PickComponent renders from metadata to a live, reactive DOM element, and explains the responsibility of each registry, pipeline stage, and subsystem involved.

---

## Table of Contents

1. [Big picture: from decorator to DOM](#1-big-picture-from-decorator-to-dom)
2. [Rendering flow step by step](#2-rendering-flow-step-by-step)
3. [Registries](#3-registries)
   - [ComponentMetadataRegistry](#componentmetadataregistry)
   - [ComponentInstanceRegistry](#componentinstanceregistry)
   - [ManagedElementRegistry](#managedelementregistry)
4. [Core rendering classes](#4-core-rendering-classes)
   - [RenderEngine](#renderengine)
   - [RenderPipeline](#renderpipeline)
   - [DomContext](#domcontext)
5. [Template system](#5-template-system)
   - [TemplateProvider](#templateprovider)
   - [RulesResolver preprocessing](#rulesresolver-preprocessing)
   - [TemplateAnalyzer](#templateanalyzer)
   - [TemplateCompiler](#templatecompiler)
6. [Reactive binding system](#6-reactive-binding-system)
   - [BindingResolver](#bindingresolver)
   - [PropertyExtractor](#propertyextractor)
   - [ExpressionResolver](#expressionresolver)
   - [ExpressionParserService](#expressionparserservice)
7. [Managed host processing](#7-managed-host-processing)
   - [ManagedElementResolver](#managedelementresolver)
   - [Attribute binding policy](#attribute-binding-policy)
   - [OutletResolver](#outletresolver)
   - [HostStyleMigrator](#hoststylemigrator)
8. [Content projection (native slots)](#8-content-projection-native-slots)
9. [Skeleton & error rendering](#9-skeleton--error-rendering)
10. [Design patterns summary](#10-design-patterns-summary)

---

## 1. Big picture: from decorator to DOM

```
@PickRender({ selector, template, ... })
       │
       │ registers metadata in
       ▼
ComponentMetadataRegistry
       │
       │ when browser upgrades the custom element:
       ▼
RenderEngine.render()
   ├─ creates DomContext (manages DOM + subscriptions)
   ├─ creates / retrieves component instance (ComponentInstanceRegistry)
   ├─ shows skeleton immediately (SkeletonRenderer)
   ├─ runs initializer before first real render
   ├─ resolves [[RULES.*]] in the template (TemplateProvider)
   ├─ analyses bindings (TemplateAnalyzer)
   └─ runs RenderPipeline
          ├─ compiles template to reactive DOM (TemplateCompiler + BindingResolver)
          ├─ migrates host styles (OutletResolver + HostStyleMigrator)
          ├─ replaces skeleton in DOM (DomContext.setElement)
          ├─ wires event listeners
          └─ starts lifecycle manager
```

---

## 2. Rendering flow step by step

### Step 1 — Metadata lookup

`RenderEngine.render()` receives a `componentId` (the custom element tag name) and reads `ComponentMetadata` from `ComponentMetadataRegistry`. Metadata includes: `selector`, `template`, `initializer`, `lifecycle`, `rules`, `skeleton`, etc.

### Step 2 — Context and instance creation

A new **`DomContext`** is created (1:1 with the target host element or ShadowRoot). It owns all DOM subscriptions for the component's lifetime.

A component instance is retrieved or created via **`ComponentInstanceRegistry`**. Each host element gets exactly one instance, keyed by `contextId`.

### Step 3 — Skeleton display

**`SkeletonRenderer`** renders the loading state immediately, before any async work. Priority:

1. Custom skeleton from metadata
2. Default animated-dot skeleton

### Step 4 — Initializer execution

`RenderEngine` awaits the component initializer before preparing the real template:

1. If `metadata.initializer` exists, it is instantiated and awaited.
2. The initializer can hydrate component state before the first real render.
3. This is the stage where `component.rules` can be loaded for `[[RULES.field]]`.

If initialization fails, the engine renders the error template without entering the main render pipeline.

### Step 5 — Template preprocessing

**`TemplateProvider`**:

1. Reads the raw template string from metadata.
2. Resolves `[[RULES.field]]` tokens (form validation attributes) via `RulesResolver`.
3. Returns the preprocessed template string.

Content projection is handled natively by Shadow DOM `<slot>` elements — no explicit capture step is required.

### Step 6 — Binding analysis

**`TemplateAnalyzer`** scans the preprocessed template and collects all `{{expression}}` tokens. It produces an `ICompiledTemplate` with a `Set<string>` of binding tokens.

### Step 7 — Pipeline execution (`RenderPipeline`)

1. **TemplateCompiler** — Parses HTML into a real DOM element, registers nested Pick Components in `ManagedElementRegistry`, and calls `BindingResolver.bindElement()` to wire all reactive subscriptions.
2. **Managed host processing** — Finds the outlet via `OutletResolver`, migrates `class`/`id` from host to outlet via `HostStyleMigrator`.
3. **DOM replacement** — `DomContext.setElement()` swaps the skeleton for the compiled element.
4. **Style injection** — If `metadata.styles` is set, a `<style>` element is prepended into the Shadow Root target so styles are scoped to the component.
5. **Listeners** — `@Listen` decorators are wired to DOM events.
6. **Lifecycle manager** — Component lifecycle begins (`onInit`, reactive updates, `onDestroy`).

### Step 8 — Cleanup

Returns a cleanup function. When called (e.g. on route change): `DomContext.destroy()` removes the element and runs all subscription teardowns; `ComponentInstanceRegistry.release()` calls `onDestroy()` and frees the instance.

---

## 3. Registries

Registries are the authoritative sources of truth for the system. No class reads global state except through a registry.

### ComponentMetadataRegistry

**File:** `src/core/component-metadata-registry.ts`

Stores component configuration indexed by selector (tag name). Populated at module load time by decorators (`@Pick`, `@PickRender`). Read by `RenderEngine`, `TemplateProvider`, `SkeletonRenderer`, and `TemplateCompiler`.

```
@PickRender({ selector: 'my-counter', template: `...` })
  ──► ComponentMetadataRegistry.register('my-counter', metadata)
```

**Metadata shape (key fields):**

| Field         | Description                                              |
| ------------- | -------------------------------------------------------- |
| `selector`    | Custom element tag name                                  |
| `template`    | HTML template string                                     |
| `styles`      | CSS string injected into the Shadow Root on every render |
| `rules`       | Validation rules expanded from `component.rules` via `[[RULES.field]]` |
| `skeleton`    | Custom loading HTML                                      |
| `initializer` | Async factory called before rendering                    |
| `inputs`      | Declared attribute names treated as component inputs     |

### ComponentInstanceRegistry

**File:** `src/core/component-instance-registry.ts`

Maps `contextId → ComponentInstance`. Guarantees each host element has exactly one component instance. Calls `onDestroy()` when the instance is released.

```
ComponentInstanceRegistry.getOrCreate(contextId, factory, metadata)
  → creates instance once, reuses on subsequent renders
ComponentInstanceRegistry.release(contextId)
  → calls onDestroy(), removes entry
```

### ManagedElementRegistry

**File:** `src/rendering/managed-host/managed-element-registry.ts`

WeakMap-based registry (`Element → componentId`) tracking which DOM elements are associated with a PickComponent instance. The registry is **not** based on tag-name patterns — an element is managed only if explicitly registered here.

**Registration points:**

- `RenderPipeline` registers the host element and the compiled root element.
- `TemplateCompiler` registers nested PickComponent elements found inside a template.

**Consumers:**

- `ManagedElementResolver.isManagedElement()` — queried by `BindingResolver` to decide whether to descend into a child element.
- `TemplateCompiler` — to skip rebinding content that belongs to a nested component.

## 4. Core rendering classes

### RenderEngine

**File:** `src/rendering/render-engine.ts`

The single entry point for all rendering. Orchestrates skeleton display, template resolution, and pipeline execution. Returns a `RenderResult` containing the cleanup function.

```typescript
const result = await renderEngine.render({
  componentId: "my-counter",
  targetRoot: hostElement,
  hostElement,
});
```

### RenderPipeline

**File:** `src/rendering/pipeline/render-pipeline.ts`

Executes the 6 sequential steps after skeleton display (see §2 steps 6–7). Receives compiled template from `TemplateCompiler`, processes managed host, replaces skeleton, wires listeners, and starts lifecycle.

If anything in the pipeline throws, `ErrorRenderer` shows an error overlay using the component's `errorTemplate` or a default fallback.

### DomContext

**File:** `src/rendering/dom-context/dom-context.ts`

Owns the live DOM element and all reactive subscriptions for one rendering context. It is component-agnostic — it knows nothing about Pick Components, only about elements and cleanup callbacks.

Key responsibilities:

- `setElement(el, contentType)` — Replaces current content in the target root (host or ShadowRoot).
- `addSubscription(fn)` — Registers a teardown function.
- `destroy()` — Removes the DOM element and runs all teardowns.
- `query/queryAll(selector)` — CSS queries scoped to the rendered element.

---

## 5. Template system

### TemplateProvider

**File:** `src/rendering/templates/template-provider.ts`

Retrieves and preprocesses a template before reactive compilation:

1. Looks up the template in `ComponentMetadataRegistry`.
2. Calls `RulesResolver` to replace `[[RULES.field]]` tokens using `component.rules`.
3. Returns the preprocessed template string.

Content projection uses native Shadow DOM `<slot>` elements — no intermediate registry is needed.

### RulesResolver preprocessing

**File:** `src/rendering/bindings/rules-resolver.ts`

`RulesResolver` operates **after the initializer** and **before** reactive compilation:

| Class           | Token syntax          | Purpose                               |
| --------------- | --------------------- | ------------------------------------- |
| `RulesResolver` | `[[RULES.fieldName]]` | Expands to HTML validation attributes |

**Example — rules:**

```
template: `<input [[RULES.email]] />`
component.rules = { email: { required: true, pattern: '^[^@]+@[^@]+$' } }
→ `<input required pattern="^[^@]+@[^@]+$" />`
```

### TemplateAnalyzer

**File:** `src/rendering/templates/template-analyzer.ts`

Scans the preprocessed template and builds a `Set<string>` of all `{{expression}}` binding tokens. Uses an HTML-aware tokenizer to avoid false positives inside tag names or attribute names. The result is an `ICompiledTemplate` passed to the pipeline.

### TemplateCompiler

**File:** `src/rendering/templates/template-compiler.ts`

Transforms the template string into a "live" `HTMLElement`:

1. Parses HTML via `DomAdapter` (browser-safe).
2. Adds the component's selector as a CSS class on the root element.
3. Calls `ManagedElementRegistry.register()` for any nested PickComponent elements and `pick-for` template boundary elements.
4. Calls `BindingResolver.bindElement()` to wire all reactive subscriptions on the entire tree.
5. Pre-captures templates for nested `<pick-for>` elements via a `data-preset-template` attribute. This prevents a browser Custom Elements ordering race where an inner `pick-for`'s `connectedCallback` fires before its parent's (DOM `insertBefore` per spec triggers disconnect/reconnect), clearing its own `innerHTML` and corrupting the parent's template capture.
6. Returns the root element ready for insertion.

Content projection is handled by the browser natively via Shadow DOM `<slot>` elements.

---

## 6. Reactive binding system

### BindingResolver

**File:** `src/rendering/bindings/binding-resolver.ts`

The heart of reactivity. Traverses the compiled DOM tree and creates a reactive subscription for every `{{expression}}` attribute or text node it finds.

**Per binding:**

1. `PropertyExtractor` identifies which component properties the expression depends on.
2. For each property, subscribes to `component.getPropertyObservable(prop)`.
3. When a property changes, `ExpressionResolver` re-evaluates the expression and updates the DOM attribute or text node.
4. Subscription teardowns are registered in `DomContext`.

**Recursion rules:**

- Descends into child elements unless `ManagedElementResolver.isManagedElement()` returns `true` — in that case, the nested component manages its own reactive tree via its own Shadow DOM.

### PropertyExtractor

**File:** `src/rendering/bindings/property-extractor.ts`

Given a string like `"Hello {{user.name}}, you have {{count + 1}} items"`, returns `['user', 'count']` — the root property names that should be observed.

- Simple bindings (`{{prop}}`, `{{obj.key}}`) → root token before `.` or `?`.
- Complex expressions (`{{x + y}}`, `{{fn()}}`) → parsed with `ExpressionParserService` and extracted via `DependencyExtractor`.

### ExpressionResolver

**File:** `src/rendering/bindings/expression-resolver.ts`

Resolves `{{expression}}` tokens to their current string values at render/update time:

1. Extracts safe component properties (excludes lifecycle methods, private members starting with `_`).
2. Caches the safe property set per component class.
3. Evaluates: direct property, nested property (`obj.key`), or complex expression via `ExpressionParserService`.

### ExpressionParserService

**File:** `src/rendering/expression-parser/expression-parser.service.ts`

Façade over the AST expression engine. Tokenizes → parses → extracts dependencies → caches the result. Used whenever an expression contains operators, function calls, or conditionals.

```
"count + 1"  →  AST(BinaryExpression)  →  evaluate(context)  →  "6"
"x > 0 ? 'yes' : 'no'"  →  AST(ConditionalExpression)  →  evaluate  →  "yes"
```

The `ExpressionParserFactory` wires together: `ExpressionParserService`, `ASTEvaluator`, `ExpressionCache`, and `DependencyExtractor` — following the Factory Pattern to enable replacement in tests.

---

## 7. Managed host processing

### ManagedElementResolver

**File:** `src/rendering/managed-host/managed-element-resolver.ts`

Single-method interface: `isManagedElement(element): boolean`. Delegates to `ManagedElementRegistry`. Used by `BindingResolver` to halt tree traversal at nested component boundaries.

### Attribute binding policy

Attribute binding is handled directly by `BindingResolver` and
`PickElementFactory`; there is no separate attribute-policy service in the
current runtime.

Rules:

| Rule                       | Examples                                              | Result                                                |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Host attribute on component | `<user-card user-id="42">`                            | Copied to the component property when it exists       |
| Reactive attribute binding | `title="{{msg}}"`, `items="{{entries}}"`             | Bound by `BindingResolver`                            |
| Object/array binding       | `items="{{entries}}"`                                 | Stored in `ObjectRegistry`; DOM receives an object id |
| Boolean attributes         | `disabled="{{loading}}"`, `required="{{isRequired}}"` | Attribute presence and DOM property are synchronized  |
| Structural pick-action    | `action`, `event`, `value`, `bubble`                  | Used by `<pick-action>`, not component inputs        |

`event` also works as an alias for `<pick-action action="...">`.
New examples should use `action`. A handled `pick-action` stops at the nearest
PickComponent unless the element has the `bubble` attribute.

### OutletResolver

**File:** `src/rendering/managed-host/outlet-resolver.ts`

Finds the element inside a compiled template that should receive the host's `class` and `id`. Resolution priority:

1. Element with `.outlet` CSS class (explicit marker).
2. First child element if root has exactly one child.
3. Fallback: the root element itself.

### HostStyleMigrator

**File:** `src/rendering/managed-host/host-style-migrator.ts`

Moves `class` and `id` from the custom element host to the outlet:

- **Class**: Merges with deduplication (host classes are prepended).
- **ID**: Migrated only if the outlet has no existing `id`.
- Removes the attributes from the host after migration.

```
Before:
  <my-button class="btn primary" id="save">  ← host
    <button class="base">Save</button>        ← outlet (single child)

After:
  <my-button>                                 ← host (class/id removed)
    <button class="btn primary base" id="save">Save</button>
```

---

## 8. Content projection (native slots)

Pick Components uses Shadow DOM and native `<slot>` elements for content projection:

```html
<!-- Component template -->
<div class="card">
  <slot name="header">Default Header</slot>
  <div class="body">
    <slot>Default Content</slot>
    <!-- default slot -->
  </div>
</div>

<!-- Usage in HTML -->
<my-card>
  <h2 slot="header">Title</h2>
  <p>Card body content</p>
  <!-- goes to default slot -->
</my-card>
```

**How it works:**

1. All Pick Components attach a Shadow DOM (`mode: 'open'`) on `connectedCallback`.
2. The template is rendered inside the Shadow Root — `<slot>` elements are native placeholders.
3. Light DOM children declared with `slot="name"` are projected by the browser into the matching `<slot name="name">`.
4. Unassigned Light DOM children go into the unnamed default `<slot>`.
5. If a `<slot>` has inner content, it serves as the fallback when no matching Light DOM children exist.
6. No framework code is needed — the browser handles projection natively and efficiently.

**Styles and Shadow DOM:**

Component styles declared in metadata `styles` are injected as a `<style>` element prepended to the Shadow Root on every render. Shadow DOM encapsulation ensures they never leak to the global document.

Key CSS patterns:

```css
/* Host element layout — replaces any external display override */
:host {
  display: block;
}
:host([hidden]) {
  display: none;
}

/* Styling Light DOM children projected via <slot> */
::slotted(*) {
  color: inherit;
}
::slotted(p) {
  margin: 0;
}

/* CSS custom properties pierce the Shadow boundary for theming */
:host {
  background: var(--card-bg, white);
  padding: var(--card-padding, 0.5rem);
}
```

See [templates.md](templates.md) for full CSS styling guide including `:host`, `::slotted()`, and CSS custom property conventions.

---

## 9. Skeleton & error rendering

### SkeletonRenderer

Shows a loading state immediately while async work runs:

1. Uses `metadata.skeleton` if provided (validated by `SkeletonValidator`).
2. Falls back to a built-in animated 3-dot skeleton (cached, reused across components).

`SkeletonValidator` enforces a whitelist of allowed tags and attributes, and blocks `<script>`, `on*` handlers, and `javascript:` URLs — even in skeletons defined by developers.

### ErrorRenderer

When initialization or rendering fails:

1. Tries `metadata.errorTemplate` with reactive `{{...}}` bindings against the component/error context.
2. Falls back to a simple overlay listing the error message.

---

## 10. Design patterns summary

| Pattern                       | Where used                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Factory**                   | `ExpressionParserFactory`, `TemplateProviderFactory`, `DomContextFactory`, `TemplateCompilerFactory`             |
| **Registry**                  | `ComponentMetadataRegistry`, `ComponentInstanceRegistry`, `ManagedElementRegistry`, `ObjectRegistry`             |
| **Observer / Subscription**   | `BindingResolver` subscribes to `getPropertyObservable(prop)`                                                    |
| **Strategy**                  | `OutletResolver` (3 strategies), `SkeletonRenderer` (custom vs. default)                                         |
| **Façade**                    | `ExpressionParserService` over tokenizer + parser + cache                                                        |
| **Pipeline**                  | `RenderPipeline` sequential 6-step execution                                                                     |
| **Dependency Inversion**      | All constructors receive interfaces; concretions wired in `framework-bootstrap.ts`                               |
| **WeakMap for memory safety** | `ManagedElementRegistry`, `ObjectRegistry`, `DomContextHostResolver`                                             |
| **1:1 element-to-instance**   | `ComponentInstanceRegistry` keyed by `contextId`                                                                 |
