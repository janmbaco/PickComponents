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
@Pick / @PickRender
       ├─ registers metadata in ComponentMetadataRegistry
       └─ registers a custom element via PickElementRegistrar / PickElementFactory
                                               │
                                               │ when the browser upgrades the host:
                                               ▼
                                  PickElementFactory.connectedCallback()
                                     ├─ creates the component instance
                                     ├─ reflects host attributes into component props
                                     ├─ chooses the render target
                                     │    ├─ ShadowRoot by default
                                     │    └─ anchored/light DOM for restrictive parents
                                     │       or compatible prerender adoption
                                     └─ calls RenderEngine.render()
                                              ├─ creates DomContext / AnchoredDomContext
                                              ├─ stores the instance in ComponentInstanceRegistry
                                              ├─ shows skeleton (unless adopt mode skips it)
                                              ├─ runs initializer
                                              ├─ resolves [[RULES.*]] via TemplateProvider
                                              ├─ analyzes and caches the template
                                              └─ runs RenderPipeline
                                                     ├─ compiles or adopts DOM
                                                     ├─ migrates host styles
                                                     ├─ replaces/adopts content in the target root
                                                     ├─ wires event listeners
                                                     └─ starts the lifecycle manager
```

---

## 2. Rendering flow step by step

### Step 1 — Metadata lookup

`RenderEngine.render()` receives a `componentId` (the custom element tag name) and reads `ComponentMetadata` from `ComponentMetadataRegistry`. Metadata includes `selector`, `template`, `styles`, `initializer`, `lifecycle`, `skeleton`, and `errorTemplate`.

### Step 2 — Context and instance creation

A new **`DomContext`** is created for normal rendering targets, or an **`AnchoredDomContext`** is created when the host lives under a restrictive native parent such as `tbody`, `tr`, `ul`, or `select`. The context owns DOM subscriptions for the component's lifetime.

The component instance is created by the custom-element wrapper in `PickElementFactory`, then tracked in **`ComponentInstanceRegistry`** keyed by the DOM context's `contextId`.

### Step 3 — Skeleton display

**`SkeletonRenderer`** renders the loading state immediately, before any async work, unless the first client render is adopting compatible prerendered markup. Priority:

1. Custom skeleton from metadata
2. Default animated-dot skeleton

### Step 4 — Initializer execution

`RenderEngine` awaits the component initializer before preparing the real template:

1. If `metadata.initializer` exists, it is instantiated and awaited.
2. The initializer can hydrate component state before the first real render.
3. This is the stage where `component.rules` can be prepared for later `[[RULES.field]]` resolution.

If initialization fails, the engine renders the error template without entering the main render pipeline.

### Step 5 — Template preprocessing

**`TemplateProvider`**:

1. Reads the raw template string from metadata.
2. Resolves `[[RULES.field]]` tokens (form validation attributes) via `RulesResolver` when the component instance exposes a `rules` object.
3. Returns the preprocessed template string.

When a component renders into a ShadowRoot, content projection is handled natively by browser `<slot>` elements — no explicit capture step is required.

### Step 6 — Binding analysis

**`TemplateAnalyzer`** scans the preprocessed template and collects all `{{expression}}` tokens. It produces an `ICompiledTemplate` with a `Set<string>` of binding tokens.

### Step 7 — Pipeline execution (`RenderPipeline`)

1. **TemplateCompiler** — Parses HTML into a real DOM element. Before building the reactive tree, `TemplateStaticValidator` traverses the DOM fragment and throws if it finds dangerous elements (`<script>`, `<iframe>`, `<object>`, `<embed>`, etc.), inline event handler attributes (`on*`), blocked attributes (`style`, `srcdoc`, `srcset`), or unsafe URL protocols (`javascript:`, `vbscript:`, `data:`) in static URL attributes. If validation passes, the compiler registers nested Pick Components in `ManagedElementRegistry` and calls `BindingResolver.bindElement()` to wire reactive subscriptions. Dynamic attribute values resolved at runtime go through `AttributeBindingPolicy.sanitizeResolvedValue()`, which removes the attribute from the DOM if the resolved value is unsafe (for example a `javascript:` URL produced by a binding).
2. **Managed host processing** — Finds the outlet via `OutletResolver`, migrates `class`/`id` from host to outlet via `HostStyleMigrator`.
3. **DOM replacement / adoption** — `DomContext.setElement()` swaps the skeleton for a compiled element, or `DomContext.adoptElement()` keeps compatible prerendered DOM in place.
4. **Styles** — Shared constructed stylesheets are applied via `adoptedStyleSheets` when the target root is a ShadowRoot. `metadata.styles` is prepended to the active target root in both modes, but only ShadowRoot targets provide true style encapsulation.
5. **Listeners** — Listener metadata is wired to DOM events after the final root is mounted or adopted. This covers both `@Listen(...)` and listener metadata emitted by `@Pick`.
6. **Lifecycle manager** — If configured, it starts with `onComponentReady(component)` and later stops with `onComponentDestroy(component)`.

### Step 8 — Cleanup

Returns a cleanup function. When called, the pipeline unregisters managed elements, stops and disposes the lifecycle manager, destroys the DOM context, and then `ComponentInstanceRegistry.release()` calls `component.onDestroy()` and frees the instance.

---

## 3. Registries

Registries are the authoritative sources of truth for the system. No class reads global state except through a registry.

### ComponentMetadataRegistry

**File:** `src/core/component-metadata-registry.ts`

Stores component configuration indexed by selector (tag name). Populated at module load time by decorators (`@Pick`, `@PickRender`). Read by `RenderEngine` and `TemplateProvider`.

```
@PickRender({ selector: 'my-counter', template: `...` })
  ──► ComponentMetadataRegistry.register('my-counter', metadata)
```

**Metadata shape (key fields):**

| Field         | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `selector`    | Custom element tag name                                            |
| `template`    | HTML template string                                               |
| `styles`      | CSS string prepended to the target root; Shadow DOM scopes it when the target is a `ShadowRoot` |
| `skeleton`    | Custom loading HTML                                                |
| `errorTemplate` | Optional HTML for render/init failures                           |
| `initializer` | Async factory called before first real render                      |
| `lifecycle`   | Factory that creates a `PickLifecycleManager` for this component   |

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

The single entry point for all rendering. Orchestrates DOM-context creation, optional skeleton display, initializer execution, template resolution, prerender adoption decisions, and pipeline execution. Returns a `RenderResult` containing the cleanup function and the event target for delegated `pick-action` handling.

```typescript
const result = await renderEngine.render({
  componentId: "my-counter",
  targetRoot: hostElement,
  hostElement,
});
```

### RenderPipeline

**File:** `src/rendering/pipeline/render-pipeline.ts`

Executes the rendering steps after initialization. It can either compile a fresh DOM tree or adopt an existing prerendered root, then processes the managed host, wires listeners, starts the lifecycle manager, and prepares cleanup.

If anything in the pipeline throws, `ErrorRenderer` shows an error overlay using the component's `errorTemplate` or a default fallback.

### DomContext

**File:** `src/rendering/dom-context/dom-context.ts`

Owns the live DOM element and all reactive subscriptions for one rendering context. It is component-agnostic — it knows nothing about Pick Components, only about elements and cleanup callbacks. In restrictive-parent scenarios, `RenderEngine` uses `AnchoredDomContext`, which keeps the managed host alive but renders the visible DOM through a transparent anchor beside it.

Key responsibilities:

- `setElement(el, contentType)` — Replaces current content in the target root (ShadowRoot or normal root).
- `adoptElement(el, contentType)` — Marks compatible prerendered markup as the live root without replacing it.
- `addSubscription(fn)` — Registers a teardown function.
- `destroy()` — Removes the DOM element and runs all teardowns.
- `query/queryAll(selector)` — CSS queries scoped to the rendered element.

---

## 5. Template system

### TemplateProvider

**File:** `src/rendering/templates/template-provider.ts`

Retrieves and preprocesses a template before reactive compilation:

1. Looks up the template in `ComponentMetadataRegistry`.
2. Calls `RulesResolver` to replace `[[RULES.field]]` tokens using `component.rules` when present.
3. Returns the preprocessed template string.

Content projection uses native `<slot>` elements when the component renders into a ShadowRoot — no intermediate registry is needed.

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

The same class also supports `adoptExisting(...)`, which copies binding-bearing markers from the canonical template into compatible prerendered DOM and then wires live subscriptions on top of that existing markup.

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

- Descends into child elements unless `ManagedElementResolver.isManagedElement()` returns `true` — in that case, the nested component manages its own reactive tree through its own render root.

### PropertyExtractor

**File:** `src/rendering/bindings/property-extractor.ts`

Given a string like `"Hello {{user.name}}, you have {{count + 1}} items"`, returns `['user', 'count']` — the root property names that should be observed.

- Simple bindings (`{{prop}}`, `{{obj.key}}`) → root token before `.` or `?`.
- Complex expressions (`{{x + y}}`, `{{fn()}}`) → parsed with `ExpressionParserService`; dependencies come from the parser result's `dependencies` array.

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

At bootstrap time, the runtime wires `ExpressionParserService` together with `ASTEvaluator`, `PropertyExtractor`, and `ExpressionResolver` through the service registry.

---

## 7. Managed host processing

### ManagedElementResolver

**File:** `src/rendering/managed-host/managed-element-resolver.ts`

Single-method interface: `isManagedElement(element): boolean`. Delegates to `ManagedElementRegistry`. Used by `BindingResolver` to halt tree traversal at nested component boundaries.

### Attribute binding policy

`defaultAttributeBindingPolicy` is shared by `BindingResolver` and `TemplateCompiler`. Host attribute reflection still happens separately in `PickElementFactory`.

| Rule | Examples | Result |
| ---- | -------- | ------ |
| Host attribute | `<user-card user-id="42">` | Reflected into the component property |
| Reactive binding | `title="{{msg}}"`, `items="{{entries}}"` | Handled by `BindingResolver` |
| Object/array binding | `items="{{entries}}"` | Stored in `ObjectRegistry`; DOM receives an id |
| Boolean attributes | `disabled="{{loading}}"` | Attribute presence and DOM property synchronized |
| Dangerous (`on*`, `style`, `srcdoc`, `srcset`) | `onclick="x"`, `onclick="{{x}}"` | `TemplateStaticValidator` throws at compile time; always blocked |
| URL (`href`, `src`, …) | `href="javascript:x"`, `href="{{url}}"` | Static unsafe value → throw; dynamic binding unsafe value → attribute removed at runtime |
| Structural `pick-action` | `action`, `event`, `bubble` | Not component inputs |

`event` is an alias for `action` in `<pick-action>`; new examples should use `action`. A handled action stops at the nearest PickComponent unless the element has `bubble`.

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

Pick Components uses native `<slot>` elements for content projection in its Shadow DOM rendering path:

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

1. Standard Pick Components render into an open `ShadowRoot` by default.
2. In that mode, the template is rendered inside the ShadowRoot and `<slot>` elements are native placeholders.
3. Light DOM children declared with `slot="name"` are projected by the browser into the matching `<slot name="name">`.
4. Unassigned Light DOM children go into the unnamed default `<slot>`.
5. If a `<slot>` has inner content, it serves as the fallback when no matching Light DOM children exist.
6. When a component is forced into anchored/light-DOM rendering under a restrictive parent, native Shadow DOM slot projection does not apply for that render target.

**Styles and Shadow DOM:**

Component styles declared in metadata `styles` are prepended to the active target root, and shared constructed stylesheets may also be applied via `adoptedStyleSheets` when that target is a ShadowRoot. True encapsulation applies only when the render target is actually a ShadowRoot; anchored/light-DOM rendering does not provide the same style boundary.

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

Shows a loading state immediately while async work runs, except when compatible prerendered markup is being adopted:

1. Uses `metadata.skeleton` if provided (validated by `SkeletonValidator`).
2. Falls back to a built-in animated 3-dot skeleton (cached, reused across components).

`SkeletonValidator` enforces a whitelist of allowed tags and attributes, and blocks `<script>`, `on*` handlers, and `javascript:` URLs — even in skeletons defined by developers.

### ErrorRenderer

When initialization or rendering fails:

1. Tries `metadata.errorTemplate`, resolving component-backed `{{...}}` expressions and replacing `{{message}}` safely as text.
2. Falls back to a simple overlay listing the error message.

---

## 10. Design patterns summary

| Pattern                       | Where used                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Factory**                   | `TemplateProviderFactory`, `DomContextFactory`, `TransparentHostFactory`, `PickElementFactory`                   |
| **Registry**                  | `ComponentMetadataRegistry`, `ComponentInstanceRegistry`, `ManagedElementRegistry`, `ObjectRegistry`             |
| **Observer / Subscription**   | `BindingResolver` subscribes to `getPropertyObservable(prop)`                                                    |
| **Strategy**                  | `OutletResolver`, `SkeletonRenderer`, `DefaultPrerenderAdoptionDecider`                                          |
| **Façade**                    | `ExpressionParserService` over tokenizer + parser + evaluator                                                    |
| **Pipeline**                  | `RenderPipeline` orchestrates compile/adopt, DOM mounting, listeners, and lifecycle                              |
| **Dependency Inversion**      | Constructors depend on interfaces; concrete implementations are wired in `framework-bootstrap.ts`                |
| **WeakMap for memory safety** | `ManagedElementRegistry`, `ObjectRegistry`, `DomContextHostResolver`                                             |
| **1:1 element-to-instance**   | `ComponentInstanceRegistry` keyed by `contextId`                                                                 |
