# @Pick vs @PickRender

## Summary

`@Pick` and `@PickRender` are two authoring styles for the same rendering model. You can build the same kind of component with either one: reactive state, computed values, templates, scoped styles, DOM events, component intent signals, initialization, lifecycle hooks, service dependencies, and `<pick-action>` intents.

Internally, `@Pick` is a functional DSL on top of `@PickRender`. `Pick()` captures setup-callback configuration, generates a class that extends `PickComponent`, and then delegates registration to `@PickRender`. They are different APIs, not different capability tiers.

Tooling note: class-based examples use `@Reactive count = 0` without requiring
the `accessor` keyword. Pick Components accepts both TypeScript standard
decorators and the `experimentalDecorators` pipeline by default. Use
`{ decorators: "strict" }` only when a project intentionally wants to accept
TC39 standard decorators only.

```
@Pick(selector, setup)
		↓ captureConfig(setup)
		↓ createEnhancedClass(target, config)
		↓ PickComponentDecorator({...})  ← this is @PickRender
		↓ registerPickElement(selector, Enhanced)
```

---

## The Rendering Pipeline

To understand the differences, it helps to understand what happens when the framework renders a component. `RenderPipeline` executes these steps in order:

```
1. Skeleton           → Show loading state (synchronous)
2. Initializer        → Run async initialization (load data, prepare state)
3. Template Compile   → Compile the template with reactive bindings
4. DOM Replace        → Replace the skeleton with compiled DOM
5. @Listen Init       → Connect DOM listeners (initializeListeners)
6. onRenderComplete   → Notify the component that rendering finished
7. LifecycleManager   → Start the event mediator (startListening)
```

Steps 2 and 7 are the important ones here. They are two separate responsibilities.

| Step                 | Responsibility                                  | When          | What it works with                                  |
| -------------------- | ----------------------------------------------- | ------------- | --------------------------------------------------- |
| **Initializer**      | Load data, prepare initial state                | BEFORE render | The component instance without active DOM           |
| **LifecycleManager** | Mediate between component and business services | AFTER render  | The component with active DOM and injected services |

---

## The Initializer: prepare the component before DOM exists

The Initializer is a class that implements `IComponentInitializer<T>`. Its contract is:

```typescript
async initialize(component: T): Promise<boolean>
```

It runs before template compilation. The skeleton remains visible while this work happens. Its purpose is to load remote data, calculate derived state, or perform any async preparation the component needs before rendering.

```typescript
class UserProfileInitializer extends PickInitializer<UserProfile> {
  constructor(private readonly api: ApiService) {
    super();
  }

  protected async onInitialize(component: UserProfile): Promise<boolean> {
    const user = await this.api.fetchUser(component.userId);
    component.user = user;
    return true;
  }
}
```

If it returns `false`, the pipeline renders the `errorTemplate` and stops.

### In `@Pick`: `ctx.initializer()`

`@Pick` generates a `DynamicInitializer` that executes the `ctx.initializer()` function, which receives the component and an optional dependency bag.

```typescript
@Pick("data-grid", (ctx) => {
  ctx.state({ items: [], loading: false });

  ctx.initializer(
    async (component, deps) => {
      component.loading = true;
      component.items = await deps?.api.fetchAll();
      component.loading = false;
    },
    () => ({ api: Services.get(ApiService) }),
  );

  ctx.html(`<div>{{loading ? 'Loading...' : items.length}} items</div>`);
})
class DataGrid {}
```

### In `@PickRender`: explicit class

```typescript
class DataGridInitializer extends PickInitializer<DataGrid> {
  constructor(private readonly api: ApiService) {
    super();
  }

  protected async onInitialize(component: DataGrid): Promise<boolean> {
    component.loading = true;
    component.items = await this.api.fetchAll();
    component.loading = false;
    return true;
  }
}

@PickRender({
  selector: "data-grid",
  template: `<div>{{loading ? 'Loading...' : items.length}} items</div>`,
  initializer: () => new DataGridInitializer(Services.get(ApiService)),
})
class DataGrid extends PickComponent {
  @Reactive items: Item[] = [];
  @Reactive loading = false;
}
```

---

## The LifecycleManager: the business mediator after render

The LifecycleManager is the central architectural piece. It extends `PickLifecycleManager<T>` and acts as a mediator. It is the only entity that knows both the component and the service.

```
Component  ←→  LifecycleManager  ←→  Business Service
	(View)          (Mediator)             (Domain)
```

It runs after render, when the component already has active DOM. Its job is not to load data. The Initializer already handled that. Its job is to coordinate event flow between the component and services throughout the component lifetime.

```typescript
class TodoListLifecycle extends PickLifecycleManager<TodoList> {
  constructor(
    private readonly todoService: TodoService,
    private readonly eventBus: EventBus,
  ) {
    super();
  }

  protected onComponentReady(component: TodoList): void {
    this.addSubscription(
      component.todoAdded$.subscribe((text) => {
        this.todoService.addTodo(text);
      }),
    );

    this.addSubscription(
      this.todoService.todos$.subscribe((todos) => {
        component.todos = todos;
      }),
    );

    this.addSubscription(
      this.eventBus.on("filter:changed").subscribe((filter) => {
        component.activeFilter = filter;
      }),
    );
  }

  protected onComponentDestroy(): void {
    this.eventBus.emit("component:destroyed", { selector: "todo-list" });
  }
}
```

The LifecycleManager is not the component. It is a separate object that lives alongside the component. The component does not know it exists. The service does not know it exists. Only the LifecycleManager knows both. That is the Mediator pattern.

### Reactive state versus component intentions

Use `@Reactive` for state that renders or feeds bindings/computed values. Use
`getPropertyObservable("name")` when a lifecycle needs to observe real state
changes. Use an intent signal for point-in-time user actions or commands.

```typescript
class ModeSelector extends PickComponent {
  @Reactive mode: RaceMode = "mass_start";

  readonly modeRequested$ = this.createIntent<RaceMode>();

  requestMode(mode: RaceMode): void {
    this.modeRequested$.notify(mode);
  }
}

class ModeSelectorLifecycle extends PickLifecycleManager<ModeSelector> {
  constructor(private readonly raceService: RaceService) {
    super();
  }

  protected onComponentReady(component: ModeSelector): void {
    this.addSubscription(
      component.modeRequested$.subscribe((mode) => {
        this.raceService.setMode(mode);
      }),
    );
  }
}
```

For `@Pick`, declare the same per-instance intent with `ctx.intent()`:

```typescript
type ModeSelectorPick = PickComponent & {
  modeRequested$: IIntentSignal<RaceMode>;
};

@Pick("mode-selector", (ctx) => {
  ctx.state({ mode: "mass_start" as RaceMode });
  ctx.intent<RaceMode>("modeRequested$");

  ctx.on({
    requestMode(mode: RaceMode) {
      (this as ModeSelectorPick).modeRequested$.notify(mode);
    },
  });

  ctx.lifecycle(
    {
      onInit(component: ModeSelectorPick, subs, deps) {
        subs.addSubscription(
          component.modeRequested$.subscribe((mode) => {
            deps?.raceService.setMode(mode);
          }),
        );
      },
    },
    () => ({ raceService: Services.get(RaceService) }),
  );
})
class ModeSelector {}
```

Intent signals return an unsubscribe from `subscribe()`, so they fit directly
inside `PickLifecycleManager.addSubscription()` or the `subs` object passed to
`ctx.lifecycle()`. They do not trigger rendering by themselves and should not
replace `@Reactive`. Avoid `*RequestVersion` counters for new code unless you
are preserving an existing component contract on purpose.

### Real example: external provider sending chunked data

Imagine a service that receives paginated JSON from an external API.

```typescript
class PaginatedDataService {
  private readonly chunks$ = new StateSignal();
  private allItems: Item[] = [];

  async fetchNextChunk(page: number): Promise<void> {
    const response = await fetch(`/api/items?page=${page}`);
    const chunk: Item[] = await response.json();
    this.allItems = [...this.allItems, ...chunk];
    this.chunks$.notify();
  }

  getItems(): Item[] {
    return this.allItems;
  }

  get itemsChanged$(): IStateSignal {
    return this.chunks$;
  }
}
```

With `@PickRender` plus Initializer plus LifecycleManager:

```typescript
class ItemListInitializer extends PickInitializer<ItemList> {
  constructor(private readonly dataService: PaginatedDataService) {
    super();
  }

  protected async onInitialize(component: ItemList): Promise<boolean> {
    await this.dataService.fetchNextChunk(0);
    component.items = this.dataService.getItems();
    component.currentPage = 0;
    return true;
  }
}

class ItemListLifecycle extends PickLifecycleManager<ItemList> {
  constructor(private readonly dataService: PaginatedDataService) {
    super();
  }

  protected onComponentReady(component: ItemList): void {
    this.addSubscription(
      component.loadMore$.subscribe(() => {
        component.currentPage++;
        component.loading = true;
        this.dataService.fetchNextChunk(component.currentPage);
      }),
    );

    this.addSubscription(
      this.dataService.itemsChanged$.subscribe(() => {
        component.items = this.dataService.getItems();
        component.loading = false;
      }),
    );
  }
}

@PickRender({
  selector: "item-list",
  template: `
		<pick-for items="{{items}}">
			<div>{{$item.name}}</div>
		</pick-for>
		<pick-action action="requestMore">
			<button>{{loading ? 'Loading...' : 'Load more'}}</button>
		</pick-action>
	`,
  initializer: () =>
    new ItemListInitializer(Services.get(PaginatedDataService)),
  lifecycle: () => new ItemListLifecycle(Services.get(PaginatedDataService)),
})
class ItemList extends PickComponent {
  @Reactive items: Item[] = [];
  @Reactive currentPage = 0;
  @Reactive loading = false;

  readonly loadMore$ = this.createIntent();

  requestMore(): void {
    this.loadMore$.notify();
  }
}
```

There are three actors with clear responsibilities:

| Actor                  | Responsibility                                           | Knows about         |
| ---------------------- | -------------------------------------------------------- | ------------------- |
| `ItemList` (component) | Reactive state, template, emit intentions                | Nobody else         |
| `ItemListInitializer`  | Load the first page before render                        | Component + service |
| `ItemListLifecycle`    | Coordinate scroll → load → update for the whole lifetime | Component + service |

With `@Pick`, those three actors collapse into one function:

```typescript
@Pick("item-list", (ctx) => {
  const dataService = Services.get(PaginatedDataService); // resolved once at decoration time

  ctx.state({ items: [], currentPage: 0, loading: false });
  ctx.intent("loadMore$");

  ctx.initializer(async (component) => {
    await dataService.fetchNextChunk(0);
    component.items = dataService.getItems();
  });

  ctx.on({
    requestMore(this: ItemListState) {
      this.loadMore$.notify(); // Component → Lifecycle: emit intention
    },
  });

  ctx.lifecycle({
    onInit(component: ItemListState, subs) {
      // Component → Service: the user asks for more data
      subs.addSubscription(
        component.loadMore$.subscribe(() => {
          component.currentPage++;
          component.loading = true;
          dataService.fetchNextChunk(component.currentPage);
        }),
      );

      // Service → Component: react when new data arrives
      subs.addSubscription(
        dataService.itemsChanged$.subscribe(() => {
          component.items = dataService.getItems();
          component.loading = false;
        }),
      );
    },
  });

  ctx.html(`...`);
})
class ItemList {}
```

`@Pick` generates a fully functional `DynamicLifecycle`: `onInit` receives the component as the first explicit argument, an `ISubscriptionManager` token (`subs`) as the second for automatic cleanup, and optionally a typed dependency bag as the third when `createDeps` is provided. Service access from `ctx.on()` handlers works via closures over the setup scope. What it does **not** provide is a mediator object with its own identity and state across events — that is what `PickLifecycleManager` is for.

---

## Initialization philosophy versus lifecycle philosophy

### The Initializer is not lifecycle

The Initializer works before the component has DOM. It is a preparation step:

- Call APIs for initial data.
- Validate configuration.
- Calculate derived state.

It is finite. It runs once and ends. If it fails, the component does not render.

### The LifecycleManager is not initialization

The LifecycleManager works after the component has DOM. It is a coordinator:

- Subscribe to component events and trigger business logic.
- Subscribe to service changes and update the component view.
- Listen to the event bus and react to other components.
- Clean everything up on destruction.

It is continuous. It lives as long as the component lives.

### Why they are separate entities

```
						 ┌─────────────────────────────────────────────────┐
	BEFORE     │ Initializer                                     │
	render     │ "Give me the data needed to render"             │
						 │ initialize(component) → Promise<boolean>        │
						 └─────────────────────────────────────────────────┘
																		↓
						 ┌─────────────────────────────────────────────────┐
	RENDER     │ Template Compile + DOM Replace + @Listen Init   │
						 └─────────────────────────────────────────────────┘
																		↓
						 ┌─────────────────────────────────────────────────┐
	AFTER      │ LifecycleManager (Mediator)                     │
	render     │ "Coordinate events between component/services" │
						 │ startListening(component)                       │
						 │   onComponentReady → subscriptions              │
						 │   onComponentDestroy → cleanup                  │
						 └─────────────────────────────────────────────────┘
```

If you mix both responsibilities:

- An Initializer that subscribes to events creates temporal coupling and cleanup pressure it should not own.
- A LifecycleManager that loads async data delays event coordination unnecessarily.

### Where each piece fits in `@Pick` vs `@PickRender`

| Concept                                | `@Pick`                                                               | `@PickRender`                                     |
| -------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| Initial data loading                   | `ctx.initializer(fn, createDeps?)` → `DynamicInitializer`              | Separate class `extends PickInitializer` |
| Event mediator                         | `ctx.lifecycle({ onInit, onDestroy })` → `DynamicLifecycle`            | Separate class `extends PickLifecycleManager`     |
| Component intention signal             | `ctx.intent<T>("name$")`                                               | `readonly name$ = this.createIntent<T>()`          |
| Subscription with automatic cleanup    | `subs.addSubscription()` in `ctx.lifecycle()` hooks                    | `this.addSubscription()` in `onComponentReady`     |
| Explicit DI                            | `ctx.initializer(..., createDeps)` or `ctx.lifecycle(..., createDeps)` | Explicit class-based collaborators                 |
| Bidirectional Component ↔ Service flow | Functional lifecycle hooks with a dependency bag                       | Class mediator with constructor/state identity     |

`ctx.lifecycle()` generates a `DynamicLifecycle` with `onInit`/`onDestroy` hooks. Both hooks receive `component` and `subs` (an `ISubscriptionManager` for automatic cleanup) as explicit arguments. An optional `deps` bag is provided as a third argument when `createDeps` is given.

---

## Real example: compact component with `@Pick`

A component whose behavior reads naturally as one setup block is an ideal case for `@Pick`.

```typescript
@Pick("demo-nav", (ctx: InlineContext<Record<string, never>>) => {
  ctx.css(`:host { display: contents; }`);
  ctx.html(`
		<nav>
			<ul>
				<li><pick-link to="/en"><strong>Hello World</strong></pick-link></li>
				<li><pick-link to="/en/counter"><strong>Counter</strong></pick-link></li>
			</ul>
		</nav>
	`);
})
export class DemoNav {}
```

The same component could be written with `@PickRender`; `@Pick` just keeps the small template and style together.

---

## Real example: `hello-world` with `@PickRender` and `@Listen`

`@PickRender` uses the class decorator form for DOM listeners:

```typescript
@PickRender({
  selector: "hello-world",
  template: `
		<article>
			<h2>Hello {{user ? user : 'World'}}!</h2>
			<input id="given-name" type="text" placeholder="Your name">
		</article>
	`,
})
export class HelloWorld extends PickComponent {
  @Reactive user: string | null = null;

  @Listen("#given-name", "keypress")
  onKeyPress(event: unknown): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === "Enter") {
      this.user = (keyEvent.target as HTMLInputElement).value.trim();
    }
  }
}
```

With `@Pick`, use the functional listener API instead:

```typescript
@Pick<{ user: string | null }>("hello-world", (ctx) => {
  ctx.state({ user: null });
  ctx.listen("#given-name", "keypress", function (event) {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === "Enter") {
      this.user = (keyEvent.target as HTMLInputElement).value.trim();
    }
  });
  ctx.html(`
    <article>
      <h2>{{user ? user : 'World'}}</h2>
      <input id="given-name" type="text">
    </article>
  `);
})
export class HelloWorld {}
```

`ctx.on()` remains the right API for `<pick-action>` intents. `ctx.listen()` is for native DOM events such as `input`, `change`, `submit`, `focusout`, and keyboard events.

---

## Real example: `theme-switcher` with `@PickRender`

A component with simple post-render behavior but no external business service still fits `@PickRender` naturally.

```typescript
@PickRender({
  selector: "theme-switcher",
  template: `
		<pick-action action="cycle">
			<button class="outline secondary" title="Theme: {{label}}">
				<span>{{icon}}</span> <small><strong>{{label}}</strong></small>
			</button>
		</pick-action>
	`,
})
export class ThemeSwitcher extends PickComponent {
  @Reactive mode: ThemeMode =
    (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "auto";

  get icon(): string {
    return THEME_ICON[this.mode];
  }
  get label(): string {
    return THEME_LABEL[this.mode];
  }

  onRenderComplete(): void {
    applyTheme(this.mode);
  }

  override onDestroy(): void {
    super.onDestroy?.();
  }

  cycle(): void {
    const next = THEME_NEXT[this.mode];
    localStorage.setItem(STORAGE_KEY, next === "auto" ? "" : next);
    applyTheme(next);
    this.mode = next;
  }
}
```

There is no LifecycleManager here because there is no business service to mediate. The component's own `onRenderComplete` hook is enough for post-render initialization.

---

## Authoring advantages of `@Pick`

### 1. Compact colocated setup

State, computed values, DOM listeners, lifecycle hooks, dependency factories, styles, and template can live in one setup callback. This is useful when the component is easiest to read as a single unit.

### 2. Explicit functional dependencies

Dependencies are requested where they are used through `createDeps` functions passed to `ctx.initializer()` or `ctx.lifecycle()`. That makes small examples and self-contained widgets concise.

### 3. Computed values as setup declarations

With `@Pick`, computed values are declared through `ctx.computed()`:

```typescript
ctx.computed({
  total(this: CartState) {
    return (
      this.items.reduce((sum, item) => sum + item.price, 0) * (1 + this.taxRate)
    );
  },
});
```

`@PickRender` reaches the same result with plain getters over `@Reactive` accessors:

```typescript
get total(): number {
	return this.items.reduce((sum, item) => sum + item.price, 0) * (1 + this.taxRate);
}
```

---

## Authoring advantages of `@PickRender`

### 1. Explicit classes

The component is a real class with declared fields, getters, methods, and decorators. This can be easier to debug and navigate in larger modules.

### 2. Separate Initializer and LifecycleManager classes

When initialization or mediation becomes substantial, separate classes give those responsibilities their own names, constructor dependencies, tests, and files.

### 3. Decorator-first `@Listen`

`@Pick` supports native DOM events through `ctx.listen()`, but the `@Listen(...)` decorator form belongs to explicit `@PickRender` classes.

---

## When to use each

Both are valid for user-facing components. Choose by readability and ownership, not by capability.

| Pattern        | Prefer when                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@Pick`       | The component reads best as a compact setup block: state, handlers, DOM listeners, styles, and template together.                                |
| `@PickRender` | The component reads best as explicit classes: decorated fields/methods, separate initializer, separate lifecycle manager, class-oriented typing. |

---

## Recommendation

Use them interchangeably from a capability perspective. A component can move from `@Pick` to `@PickRender`, or the other way around, without changing the framework model: the same render pipeline, metadata registry, binding system, listener initializer, initializers, and lifecycle manager are used underneath.

Prefer `@Pick` when it improves locality. Prefer `@PickRender` when explicit class structure improves clarity.

### Suggested convention

```
Compact functional component  →  @Pick
Explicit class component      →  @PickRender
```

If the team can read it comfortably in either form, either form is fine. Keep consistency within a feature more important than enforcing one decorator globally.

## Related Docs

- DI guide: [DEPENDENCY-INJECTION.md](DEPENDENCY-INJECTION.md)
- Rendering internals: [RENDERING-ARCHITECTURE.md](RENDERING-ARCHITECTURE.md)
- Spanish version: [PICK-VS-PICKRENDER.es.md](PICK-VS-PICKRENDER.es.md)
