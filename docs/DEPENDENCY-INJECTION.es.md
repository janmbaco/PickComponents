# Dependency Injection (DI) - Guía de Uso

## Introducción

Pick Components utiliza **factory functions** como mecanismo principal de inyección de dependencias. No hay auto-discovery de aplicación, no hay contrato `static inject` y no hay construcción oculta de servicios. El desarrollador controla completamente cómo se construyen sus objetos.

También se pueden integrar contenedores externos de forma explícita. Los ejemplos avanzados usan InjectKit adaptándolo a `IServiceRegistry`; InjectKit resuelve dependencias de constructor desde metadatos explícitos `@Injectable({ deps: [...] })`, no desde reflection del framework.

---

## 1. DI en @PickRender (Factory Functions)

### Initializer con constructor injection

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
  info(msg: string): void {
    console.log(`[INFO] ${msg}`);
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

### Lifecycle con constructor injection

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

### Componente sin dependencias

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

## 2. DI en @Pick (Factory de dependencias)

El decorador funcional `@Pick` acepta una factory de dependencias en `ctx.initializer()` y `ctx.lifecycle()`:

### Initializer con `createDeps`

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
    return [{ id: "p-1", name: `Producto de ejemplo para ${category}` }];
  }
}

@Pick("product-catalog", (ctx: InlineContext<CatalogState>) => {
  ctx.state({ products: [], loading: false });

  const api = new CatalogApiService();

  ctx.initializer(
    async function (this: PickComponent & CatalogState, _component, deps) {
      const { api } = deps as { api: CatalogApiService };
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

La función `createDeps` que se pasa como segundo argumento a `ctx.initializer()` devuelve el objeto concreto de dependencias. En `() => ({ api })`:

- `api` es el nombre local de la propiedad que aparecerá dentro de `deps`.
- `api` es el objeto concreto con el que va a trabajar el componente dinámico.

Eso significa que el framework ejecuta la factory en esa inicialización, copia el objeto de dependencias y expone el resultado como `deps.api`.

`ctx.initializer()` no resuelve servicios. Solo recibe los objetos que el desarrollador ya decidió proporcionar.

### Lifecycle con `createDeps`

```typescript
@Pick("event-viewer", (ctx: InlineContext<ViewerState>) => {
  ctx.state({ events: [] });
  const eventBus = new EventBus();

  ctx.lifecycle(
    {
      onInit(component: PickComponent & ViewerState, subs, deps) {
        const { eventBus } = deps as { eventBus: EventBus };
        subs.addSubscription(
          eventBus.on("event").subscribe((e: string) => {
            component.events = [...component.events, e];
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

## 3. Registro personalizado o contenedor externo

```typescript
import {
  DefaultServiceRegistry,
  Services,
  PickComponent,
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

El framework solo ejecuta la factory. Si integras un contenedor externo, hazlo proporcionando una implementación de `IServiceRegistry` mediante `Services.useImplementation(...)`.

---

## 4. Mensajes de Error Claros

Si olvidas registrar un servicio, obtendrás un error descriptivo:

```
[DI] Missing dependency for Lifecycle 'TodoAppLifecycle'.todoService -> Token 'TodoService'
Context: Component: <todo-app> | Lifecycle: TodoAppLifecycle
Solution: Register the service in your Composition Root:
  Services.register(TodoService, () => new TodoService());
Original error: [ServiceRegistry] Service 'TodoService' is not registered
```

---

## 5. Composition Root

Registra todos los servicios en un solo lugar (normalmente `main.ts`).

Para registro por factories, el orden seguro es:

1. Registrar o sustituir la implementación del service registry si hace falta.
2. Registrar servicios o alias de aplicación que necesite la metadata del componente.
3. Llamar a `bootstrapFramework()` para tener disponibles los servicios internos.
4. Importar dinámicamente los módulos que definen componentes con `@PickRender` / `@Pick`.

El import dinámico importa porque los decoradores registran metadata cuando se evalúa el módulo.

```typescript
import { bootstrapFramework, Services } from "pick-components";

// 1. Servicios de la aplicación
Services.register(ApiService, () => new ApiService());
Services.register(EventBus, () => new EventBus());
Services.register(Logger, () => new ConsoleLogger());
Services.register("IConfig", () => loadConfig());

// 2. Bootstrap del framework (registra servicios internos)
await bootstrapFramework(Services);

// 3. Ahora los módulos de componentes pueden evaluar decoradores con seguridad
await import("./todo-list.js");
```

### Overrides (Testing / Customización)

`bootstrapFramework` acepta un segundo parámetro opcional `overrides` para reemplazar servicios internos del framework:

```typescript
import { bootstrapFramework, Services } from "pick-components";

bootstrapFramework(Services, {
  IDomAdapter: () => new CustomDomAdapter(),
  IErrorRenderer: new SilentErrorRenderer(),
});
```

- Si el valor es una **función**, se registra como factory.
- Si el valor es un **objeto**, se registra como instancia (singleton).

---

## Resumen

| Contexto             | Mecanismo DI                                             |
| -------------------- | -------------------------------------------------------- |
| `@PickRender`       | Factory function con constructor injection (`readonly`)  |
| `@Pick` initializer | `ctx.initializer(fn, createDeps)` — deps como parámetro  |
| `@Pick` lifecycle   | `ctx.lifecycle(hooks, createDeps)` — deps como parámetro |
| Servicios framework  | `ServiceProvider` con `Services.register()`              |
| Contenedor externo   | Factory function que resuelve desde el contenedor        |

**Regla única:** ¿Quién crea el objeto? Quien lo pide. ¿Cómo? Con una factory function.
