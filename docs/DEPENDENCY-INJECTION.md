# Dependency Injection (DI)

## Introduction

Pick Components uses factory functions as its primary dependency-injection mechanism. There is no application-level auto-discovery, no `static inject` contract, and no hidden service construction. The developer controls exactly how objects are created.

External containers can still be integrated explicitly. The advanced examples use InjectKit by adapting it to `IServiceRegistry`; InjectKit resolves constructor dependencies from explicit `@Injectable({ deps: [...] })` metadata, not from framework reflection.

---

## 1. DI in `@PickRender` (Factory Functions)

### Initializer with constructor injection

```typescript
import {
  Reactive,
  Services,
  PickComponent,
  PickInitializer,
  PickRender,
} from "pick-components";

class ApiService {
  async fetchUserData(userId: string): Promise<User> {
    /* ... */
  }
}

class Logger {
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }
}

class UserProfileInitializer extends PickInitializer<UserProfile> {
  constructor(
    private readonly api: ApiService,
    private readonly logger: Logger,
  ) {
    super();
    if (!api) throw new Error("ApiService is required");
    if (!logger) throw new Error("Logger is required");
  }

  protected async onInitialize(component: UserProfile): Promise<boolean> {
    this.logger.info("Initializing user profile");
    component.user = await this.api.fetchUserData(component.userId);
    return true;
  }
}

@PickRender({
  selector: "user-profile",
  template: "<div>{{user?.name}}</div>",
  initializer: () =>
    new UserProfileInitializer(Services.get(ApiService), Services.get(Logger)),
})
class UserProfile extends PickComponent {
  @Reactive userId = "";
  @Reactive user: User | null = null;
}

// Composition Root (main.ts)
Services.register(ApiService, () => new ApiService());
Services.register(Logger, () => new Logger());
```

### Lifecycle with constructor injection

```typescript
import {
  Services,
  PickComponent,
  PickLifecycleManager,
  PickRender,
} from "pick-components";

class TodoListLifecycle extends PickLifecycleManager<TodoList> {
  constructor(
    private readonly eventBus: EventBus,
    private readonly stateManager: StateManager,
  ) {
    super();
    if (!eventBus) throw new Error("EventBus is required");
    if (!stateManager) throw new Error("StateManager is required");
  }

  protected onComponentReady(component: TodoList): void {
    this.addSubscription(
      component.todoAdded$.subscribe((text) => {
        this.eventBus.emit("todo:added", { text });
        this.stateManager.updateState("todos", component.todos);
      }),
    );
  }
}

@PickRender({
  selector: "todo-list",
  template: "<ul>...</ul>",
  lifecycle: () =>
    new TodoListLifecycle(Services.get(EventBus), Services.get(StateManager)),
})
class TodoList extends PickComponent {
  /* ... */
}
```

### Component without dependencies

```typescript
@PickRender({
  selector: "theme-switcher",
  template: "<button>{{mode}}</button>",
})
class ThemeSwitcher extends PickComponent {
  @Reactive mode: ThemeMode = "auto";
}
```

---

## 2. DI in `@Pick` (Dependency Factory)

The functional `@Pick` decorator accepts a dependency factory in `ctx.initializer()` and `ctx.lifecycle()`.
It also allows creating dependencies inside the initializer itself when you do not need external DI.

### Initializer without external DI (fully inline)

```typescript
@Pick("product-catalog", (ctx: InlineContext<CatalogState>) => {
  ctx.state({ products: [], loading: false });

  ctx.initializer(async function (this: PickComponent & CatalogState) {
    const api = new CatalogApiService();
    this.loading = true;
    this.products = await api.fetchProducts("all");
    this.loading = false;
  });

  ctx.html("<div>{{products.length}} items</div>");
})
class ProductCatalog {}
```

### Initializer with `createDeps`

```typescript
import { Pick, PickComponent, type InlineContext } from "pick-components";

interface Product {
  id: string;
  name: string;
}

interface CatalogState {
  products: Product[];
  loading: boolean;
}

class CatalogApiService {
  async fetchProducts(category: string): Promise<Product[]> {
    return [{ id: "p-1", name: `Sample product for ${category}` }];
  }
}

@Pick("product-catalog", (ctx: InlineContext<CatalogState>) => {
  ctx.state({ products: [], loading: false });

  const api = new CatalogApiService();

  ctx.initializer(
    async function (this: PickComponent & CatalogState, _component, deps) {
      const { api } = deps ?? { api: new CatalogApiService() };
      this.loading = true;
      this.products = await api.fetchProducts("all");
      this.loading = false;
    },
    () => ({ api }),
  );

  ctx.html("<div>{{products.length}} items</div>");
})
class ProductCatalog {}
```

### Initializer with external DI provider

```typescript
interface CustomDI {
  resolve<T>(token: unknown): T;
}

const customDI: CustomDI = getCustomContainer();

@Pick('product-catalog', (ctx: InlineContext<CatalogState>) => {
  ctx.state({ products: [], loading: false });

  ctx.initializer(async function(this: PickComponent & CatalogState, _component, deps) {
    if (!deps) {
      throw new Error('deps are required');
    }

    const { api, logger } = deps;
    logger.info('Loading catalog');
    this.loading = true;
    this.products = await api.fetchProducts('all');
    this.loading = false;
  }, () => ({
    api: customDI.resolve<CatalogApiService>('CatalogApiService'),
    logger: customDI.resolve<Logger>('Logger')
  }));
});
```

The `createDeps` function passed as the second argument to `ctx.initializer()` returns the concrete dependency bag. TypeScript infers `deps` from that return type.

- `api` is the local property name exposed inside `deps`.
- `api` is the concrete object the dynamic component will use.

That means the framework executes the factory for the current initialization, copies the dependency bag, and exposes the result as `deps.api`.

`ctx.initializer()` does not resolve services. It only receives the objects the developer already decided to provide.

### Lifecycle with `createDeps`

```typescript
@Pick("event-viewer", (ctx: InlineContext<ViewerState>) => {
  ctx.state({ events: [] });
  const eventBus = new EventBus();

  ctx.lifecycle(
    {
      onInit(component: PickComponent & ViewerState, subs, deps) {
        const { eventBus } = deps as { eventBus: EventBus };
        subs.addSubscription(
          eventBus.on("event").subscribe((eventName: string) => {
            component.events = [...component.events, eventName];
          }),
        );
      },
      onDestroy(_component, _subs, deps) {
        const { eventBus } = deps as { eventBus: EventBus };
        eventBus.emit("viewer:destroyed");
      },
    },
    () => ({ eventBus }),
  );

  ctx.html(
    '<ul><pick-for items="{{events}}"><li>{{$item}}</li></pick-for></ul>',
  );
})
class EventViewer {}
```

---

## 3. Custom Registry or External Container

```typescript
import {
  DefaultServiceRegistry,
  Services,
  PickComponent,
  PickLifecycleManager,
  PickRender,
  type IServiceRegistry,
  type ServiceToken,
} from "pick-components";

class CustomRegistryAdapter implements IServiceRegistry {
  private readonly fallback = new DefaultServiceRegistry();

  register<T>(token: ServiceToken<T>, instanceOrFactory: T | (() => T)): void {
    this.fallback.register(token, instanceOrFactory);
  }

  get<T>(token: ServiceToken<T>): T {
    return this.fallback.get(token);
  }

  has(token: ServiceToken): boolean {
    return this.fallback.has(token);
  }

  clear(): void {
    this.fallback.clear();
  }
}

Services.useImplementation(new CustomRegistryAdapter());

@PickRender({
  selector: "todo-list",
  template: "...",
  lifecycle: () => new TodoListLifecycle(Services.get(TodoService)),
})
class TodoList extends PickComponent {
  /* ... */
}
```

The framework only executes the factory. If you integrate an external container, do it by providing an `IServiceRegistry` implementation through `Services.useImplementation(...)`.

---

## 4. Clear Error Messages

If you forget to register a service, you should get a descriptive error:

```
[DI] Missing dependency for Lifecycle 'TodoAppLifecycle'.todoService -> Token 'TodoService'
Context: Component: <todo-app> | Lifecycle: TodoAppLifecycle
Solution: Register the service in your Composition Root:
  Services.register(TodoService, () => new TodoService());
Original error: [ServiceRegistry] Service 'TodoService' is not registered
```

---

## 5. Composition Root

Register all services in one place, usually `main.ts`.

For ordinary factory registration, the safe order is:

1. Register or replace the service registry implementation if needed.
2. Register application services or aliases needed by component metadata.
3. Call `bootstrapFramework()` so framework services are available.
4. Dynamically import modules that define `@PickRender` / `@Pick` components.

The dynamic import matters because decorators register metadata when the module is evaluated.

```typescript
import { bootstrapFramework, Services } from "pick-components";

// 1. Application services
Services.register(ApiService, () => new ApiService());
Services.register(EventBus, () => new EventBus());
Services.register(Logger, () => new ConsoleLogger());
Services.register("IConfig", () => loadConfig());

// 2. Framework bootstrap (registers internal services)
await bootstrapFramework(Services);

// 3. Component modules can now evaluate decorators safely
await import("./todo-list.js");
```

### Overrides (Testing / Customization)

`bootstrapFramework` accepts an optional second `overrides` parameter for replacing internal framework services.

```typescript
import { bootstrapFramework, Services } from "pick-components";

bootstrapFramework(Services, {
  IDomAdapter: () => new CustomDomAdapter(),
  IErrorRenderer: new SilentErrorRenderer(),
});
```

- If the value is a function, it is registered as a factory.
- If the value is an object, it is registered as an instance singleton.

---

## Summary

| Context              | DI Mechanism                                                    |
| -------------------- | --------------------------------------------------------------- |
| `@PickRender`       | Factory function with constructor injection (`readonly`)        |
| `@Pick` initializer | `ctx.initializer(fn, createDeps)` — dependencies as parameters  |
| `@Pick` lifecycle   | `ctx.lifecycle(hooks, createDeps)` — dependencies as parameters |
| Framework services   | `ServiceProvider` via `Services.register()`                     |
| External container   | Factory function that resolves from the container               |

One rule governs the whole system: whoever needs the object is responsible for creating it, and they do so through a factory function.

## Related Docs

- Rendering architecture: [RENDERING-ARCHITECTURE.md](RENDERING-ARCHITECTURE.md)
- Pick vs PickRender: [SMART-VS-SMARTRENDER.md](SMART-VS-SMARTRENDER.md)
- Spanish version: [DEPENDENCY-INJECTION.es.md](DEPENDENCY-INJECTION.es.md)
