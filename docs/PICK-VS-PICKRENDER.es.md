# @Pick vs @PickRender — Evaluación y Decisión de Diseño

## Resumen

`@Pick` y `@PickRender` son dos estilos de autoría para el mismo modelo de renderizado. Se puede construir el mismo tipo de componente con cualquiera de los dos: estado reactivo, computados, templates, estilos scoped, eventos DOM, señales de intención de componente, inicialización, lifecycle hooks, dependencias de servicios e intenciones con `<pick-action>`.

Internamente, `@Pick` es una DSL funcional sobre `@PickRender`. `Pick()` captura la configuración del callback de setup, genera una clase que extiende `PickComponent` y delega el registro a `@PickRender`. Son APIs distintas, no niveles distintos de capacidad.

Nota de tooling: los ejemplos con clases usan `@Reactive count = 0` sin exigir
la palabra clave `accessor`. Pick Components acepta por defecto decoradores
estándar de TypeScript y el pipeline `experimentalDecorators`. Usa
`{ decorators: "strict" }` solo cuando un proyecto quiera aceptar únicamente
decoradores estándar TC39.

```
@Pick(selector, setup)
    ↓ captureConfig(setup)
    ↓ createEnhancedClass(target, config)
    ↓ PickComponentDecorator({...})  ← esto ES @PickRender
    ↓ registerPickElement(selector, Enhanced)
```

---

## El Pipeline de Renderizado

Para entender las diferencias, hay que entender qué pasa cuando el framework renderiza un componente. El `RenderPipeline` ejecuta estos pasos en orden:

```
1. Skeleton           → Mostrar estado de carga (síncrono)
2. Initializer        → Ejecutar inicialización async (cargar datos, preparar estado)
3. Template Compile   → Compilar template con bindings reactivos
4. DOM Replace        → Reemplazar skeleton con el DOM compilado
5. @Listen Init       → Conectar listeners del DOM (initializeListeners)
6. onRenderComplete   → Notificar al componente que el render completó
7. LifecycleManager   → Arrancar el mediator de eventos (startListening)
```

Los pasos 2 y 7 son los que nos interesan. Son **dos responsabilidades completamente distintas**:

| Paso                 | Responsabilidad                                | Cuándo             | Con qué trabaja                                 |
| -------------------- | ---------------------------------------------- | ------------------ | ----------------------------------------------- |
| **Initializer**      | Cargar datos, preparar estado inicial          | ANTES del render   | La instancia del componente (sin DOM todavía)   |
| **LifecycleManager** | Mediar entre componente y servicios de negocio | DESPUÉS del render | Componente con DOM activo, servicios inyectados |

---

## El Initializer: preparar el componente ANTES de que exista el DOM

El `Initializer` es una clase que implementa `IComponentInitializer<T>`. Su único método es:

```typescript
async initialize(component: T): Promise<boolean>
```

Se ejecuta **antes de compilar el template**. El skeleton se muestra mientras esto ocurre. El propósito es cargar datos remotos, calcular estado derivado, o cualquier operación async que el componente necesite para renderizarse correctamente:

```typescript
class UserProfileInitializer extends PickInitializer<UserProfile> {
  constructor(private readonly api: ApiService) {
    super();
  }

  protected async onInitialize(component: UserProfile): Promise<boolean> {
    const user = await this.api.fetchUser(component.userId);
    component.user = user; // El componente ahora tiene datos
    return true; // Listo para renderizar
  }
}
```

Si retorna `false`, el pipeline muestra el `errorTemplate` y no continúa.

### En @Pick: `ctx.initializer()`

`@Pick` genera un `DynamicInitializer` que ejecuta la función de `ctx.initializer()`, que recibe el componente y un bag de dependencias opcional.

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

  ctx.html(`<div>{{loading ? 'Cargando...' : items.length}} items</div>`);
})
class DataGrid {}
```

### En @PickRender: clase explícita

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
  template: `<div>{{loading ? 'Cargando...' : items.length}} items</div>`,
  initializer: () => new DataGridInitializer(Services.get(ApiService)),
})
class DataGrid extends PickComponent {
  @Reactive items: Item[] = [];
  @Reactive loading = false;
}
```

---

## El LifecycleManager: el mediator de negocio DESPUÉS del render

El `LifecycleManager` es la pieza central de la arquitectura. Extiende `PickLifecycleManager<T>` y actúa como **mediator** — es la **única entidad que conoce tanto al componente como al servicio**:

```
Componente  ←→  LifecycleManager  ←→  Servicio de Negocio
  (Vista)          (Mediator)          (Dominio)
```

Se ejecuta **después del render**, cuando el componente ya tiene DOM activo. Su responsabilidad no es cargar datos — eso ya lo hizo el Initializer. Su responsabilidad es **coordinar el flujo de eventos** entre el componente y los servicios durante toda la vida del componente:

```typescript
class TodoListLifecycle extends PickLifecycleManager<TodoList> {
  constructor(
    private readonly todoService: TodoService,
    private readonly eventBus: EventBus,
  ) {
    super();
  }

  protected onComponentReady(component: TodoList): void {
    // Componente → Servicio: cuando el usuario añade un todo
    this.addSubscription(
      component.todoAdded$.subscribe((text) => {
        this.todoService.addTodo(text);
      }),
    );

    // Servicio → Componente: cuando el servicio notifica cambios
    this.addSubscription(
      this.todoService.todos$.subscribe((todos) => {
        component.todos = todos;
      }),
    );

    // EventBus → Componente: comunicación cross-component
    this.addSubscription(
      this.eventBus.on("filter:changed").subscribe((filter) => {
        component.activeFilter = filter;
      }),
    );
  }

  protected onComponentDestroy(): void {
    // Las suscripciones se limpian automáticamente vía addSubscription
    this.eventBus.emit("component:destroyed", { selector: "todo-list" });
  }
}
```

El LifecycleManager **no es el componente** — es un objeto separado que vive junto al componente. El componente no sabe que existe. El servicio no sabe que existe. Solo el LifecycleManager conoce a ambos. Esto es el **patrón Mediator**.

### Estado reactivo vs intenciones de componente

Usa `@Reactive` para estado que se renderiza o alimenta bindings/computeds.
Usa `getPropertyObservable("name")` cuando un lifecycle necesita observar
cambios de estado real. Usa una señal de intención para acciones puntuales del
usuario o comandos.

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

En `@Pick`, declara la misma intención por instancia con `ctx.intent()`:

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

Las señales de intención devuelven un unsubscribe desde `subscribe()`, así que
encajan directamente con `PickLifecycleManager.addSubscription()` o con el
objeto `subs` que recibe `ctx.lifecycle()`. No disparan render por sí mismas y
no sustituyen a `@Reactive`. Evita contadores `*RequestVersion` en código nuevo
salvo que estés preservando de forma explícita un contrato ya existente.

### Ejemplo: Provider externo enviando datos a trozos

Imaginemos un servicio que recibe una lista JSON paginada desde una API externa:

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

**Con @PickRender + Initializer + LifecycleManager (separación completa):**

```typescript
// 1. Initializer: carga la primera página ANTES del render
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

// 2. LifecycleManager: media entre scroll del usuario y carga de chunks
class ItemListLifecycle extends PickLifecycleManager<ItemList> {
  constructor(private readonly dataService: PaginatedDataService) {
    super();
  }

  protected onComponentReady(component: ItemList): void {
    // Componente → Servicio: el usuario pide más datos
    this.addSubscription(
      component.loadMore$.subscribe(() => {
        component.currentPage++;
        component.loading = true;
        this.dataService.fetchNextChunk(component.currentPage);
      }),
    );

    // Servicio → Componente: llegan datos nuevos
    this.addSubscription(
      this.dataService.itemsChanged$.subscribe(() => {
        component.items = this.dataService.getItems();
        component.loading = false;
      }),
    );
  }
}

// 3. Componente: solo vista y estado reactivo
@PickRender({
  selector: "item-list",
  template: `
    <pick-for items="{{items}}">
      <div>{{$item.name}}</div>
    </pick-for>
    <pick-action action="requestMore">
      <button>{{loading ? 'Cargando...' : 'Cargar más'}}</button>
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

Aquí hay **tres actores con responsabilidades claras**:

| Actor                   | Responsabilidad                                               | Conoce a              |
| ----------------------- | ------------------------------------------------------------- | --------------------- |
| `ItemList` (componente) | Estado reactivo + template + emitir intenciones               | Nadie más             |
| `ItemListInitializer`   | Cargar la primera página antes del render                     | Componente + Servicio |
| `ItemListLifecycle`     | Coordinar scroll → carga → actualización durante toda la vida | Componente + Servicio |

**Con @Pick, los tres actores colapsan en una función:**

```typescript
@Pick("item-list", (ctx) => {
  const dataService = Services.get(PaginatedDataService); // resuelto una vez al decorar

  ctx.state({ items: [], currentPage: 0, loading: false });
  ctx.intent("loadMore$");

  ctx.initializer(async (component) => {
    await dataService.fetchNextChunk(0);
    component.items = dataService.getItems();
  });

  ctx.on({
    requestMore(this: ItemListState) {
      this.loadMore$.notify(); // Componente → Lifecycle: emitir intención
    },
  });

  ctx.lifecycle({
    onInit(component: ItemListState, subs) {
      // Componente → Servicio: el usuario pide más datos
      subs.addSubscription(
        component.loadMore$.subscribe(() => {
          component.currentPage++;
          component.loading = true;
          dataService.fetchNextChunk(component.currentPage);
        }),
      );

      // Servicio → Componente: reaccionar cuando llegan datos nuevos
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

El `@Pick` genera un `DynamicLifecycle` funcional: `onInit` recibe el componente como primer argumento explícito, un token `ISubscriptionManager` (`subs`) como segundo para cleanup automático, y opcionalmente una bolsa de dependencias tipada como tercero cuando se provee `createDeps`. El acceso a servicios desde `ctx.on()` se hace mediante clausuras sobre el scope del setup. Lo que **no** proporciona es un objeto mediator con identidad propia y estado entre eventos — para eso está `PickLifecycleManager`.

---

## La filosofía de la inicialización y el ciclo de vida

### El Initializer NO es ciclo de vida

El Initializer trabaja **antes de que el componente tenga DOM**. Es un paso de preparación:

- Llamar APIs para cargar datos iniciales
- Validar configuración
- Calcular estado derivado

Es un paso **finito** — se ejecuta una vez y termina. Si falla, el componente no se renderiza.

### El LifecycleManager NO es inicialización

El LifecycleManager trabaja **después de que el componente tiene DOM**. Es un coordinador:

- Suscribirse a eventos del componente → ejecutar lógica de negocio
- Suscribirse a cambios del servicio → actualizar vista del componente
- Escuchar el EventBus → reaccionar a eventos de otros componentes
- Limpiar todo al destruirse

Es un proceso **continuo** — vive mientras el componente viva.

### Por qué son entidades separadas

```
             ┌─────────────────────────────────────────────────┐
  ANTES      │ Initializer                                     │
  del        │ "Dame los datos para poder renderizar"          │
  render     │ initialize(component) → Promise<boolean>        │
             └─────────────────────────────────────────────────┘
                                    ↓
             ┌─────────────────────────────────────────────────┐
  RENDER     │ Template Compile + DOM Replace + @Listen Init   │
             └─────────────────────────────────────────────────┘
                                    ↓
             ┌─────────────────────────────────────────────────┐
  DESPUÉS    │ LifecycleManager (Mediator)                     │
  del        │ "Coordino eventos entre componente y servicios" │
  render     │ startListening(component)                       │
             │   onComponentReady → suscripciones              │
             │   onComponentDestroy → cleanup                  │
             └─────────────────────────────────────────────────┘
```

Si mezclamos ambas responsabilidades:

- Un Initializer que se suscribe a eventos crea un acoplamiento temporal (pide limpieza que no le corresponde)
- Un LifecycleManager que carga datos async retrasa el inicio de la coordinación de eventos

### Dónde se ubica cada pieza en @Pick vs @PickRender

| Concepto                                | @Pick                                                                | @PickRender                                       |
| --------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| Carga de datos inicial                  | `ctx.initializer(fn, createDeps?)` → DynamicInitializer               | Clase separada `extends PickInitializer` |
| Mediator de eventos                     | `ctx.lifecycle({ onInit, onDestroy })` → DynamicLifecycle             | Clase separada `extends PickLifecycleManager`     |
| Señal de intención de componente        | `ctx.intent<T>("name$")`                                              | `readonly name$ = this.createIntent<T>()`          |
| Suscripción con cleanup automático      | `subs.addSubscription()` en hooks de `ctx.lifecycle()`                | `this.addSubscription()` en `onComponentReady`     |
| DI explícita                            | `ctx.initializer(..., createDeps)` ó `ctx.lifecycle(..., createDeps)` | Inyección por constructor en factory functions     |
| Flujo bidireccional Component ↔ Service | Hooks funcionales de lifecycle con dependency bag                     | Mediator de clase con identidad/estado propio      |

**`ctx.lifecycle()` genera un `DynamicLifecycle` con hooks `onInit`/`onDestroy`. Ambos hooks reciben `component` y `subs` (un `ISubscriptionManager` para cleanup automático) como argumentos explícitos. Una bolsa de dependencias opcional se pasa como tercer argumento cuando se provee `createDeps`.**

---

## Ejemplo real: componente compacto con @Pick

Un componente cuyo comportamiento se lee de forma natural como un bloque de setup es un buen caso para `@Pick`:

```typescript
@Pick("demo-nav", (ctx: InlineContext<Record<string, never>>) => {
  ctx.css(`:host { display: contents; }`);
  ctx.html(`
    <nav>
      <ul>
        <li><pick-link to="/es"><strong>Hola Mundo</strong></pick-link></li>
        <li><pick-link to="/es/counter"><strong>Contador</strong></pick-link></li>
      </ul>
    </nav>
  `);
})
export class DemoNav {}
```

El mismo componente podría escribirse con `@PickRender`; `@Pick` solo mantiene juntos el template pequeño y el estilo.

---

## Ejemplo real: `hello-world` con @PickRender y @Listen

`@PickRender` usa la forma de decorador de clase para listeners DOM:

```typescript
@PickRender({
  selector: "hello-world",
  template: `
    <article>
      <h2>Hola {{user ? user : 'Mundo'}}!</h2>
      <input id="given-name" type="text" placeholder="Tu nombre">
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

Con `@Pick`, se usa la API funcional de listeners:

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

`ctx.on()` sigue siendo la API adecuada para intenciones de `<pick-action>`. `ctx.listen()` es para eventos DOM nativos como `input`, `change`, `submit`, `focusout` y eventos de teclado.

---

## Ejemplo real: `theme-switcher` con @PickRender

Un componente con ciclo de vida simple (sin servicios externos):

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

Aquí no hay LifecycleManager porque no hay servicios de negocio que mediar. El `onRenderComplete` del componente basta para la inicialización post-render.

---

## Ventajas de autoría de @Pick

### 1. Setup compacto y colocado

Estado, computados, listeners DOM, lifecycle hooks, factories de dependencias, estilos y template pueden vivir en un único callback de setup. Es útil cuando el componente se entiende mejor como una unidad.

### 2. Dependencias funcionales explícitas

Las dependencias se piden donde se usan mediante funciones `createDeps` pasadas a `ctx.initializer()` o `ctx.lifecycle()`. Esto mantiene concisos los ejemplos pequeños y los widgets autocontenidos.

### 3. Computados como declaraciones de setup

Con `@Pick`, los computados se declaran mediante `ctx.computed()`:

```typescript
ctx.computed({
  total(this: CartState) {
    return this.items.reduce((sum, i) => sum + i.price, 0) * (1 + this.taxRate);
  },
});
```

`@PickRender` consigue el mismo resultado con getters sobre accessors `@Reactive`:

```typescript
get total(): number {
  return this.items.reduce((sum, i) => sum + i.price, 0) * (1 + this.taxRate);
}
```

---

## Ventajas de autoría de @PickRender

### 1. Clases explícitas

El componente es una clase real con campos, getters, métodos y decoradores declarados. Esto puede ser más fácil de depurar y navegar en módulos grandes.

### 2. Clases separadas para Initializer y LifecycleManager

Cuando la inicialización o la mediación crecen, las clases separadas dan nombre propio, dependencias por constructor, tests y archivos a esas responsabilidades.

### 3. @Listen en forma de decorador

`@Pick` soporta eventos DOM nativos con `ctx.listen()`, pero la forma decoradora `@Listen(...)` pertenece a clases explícitas con `@PickRender`.

---

## Cuándo usar cada uno

Ambos son válidos para componentes de usuario. La elección es de legibilidad y ownership, no de capacidad.

| Patrón           | Caso de uso                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **@Pick**       | El componente se lee mejor como setup compacto: estado, handlers, listeners DOM, estilos y template juntos.                                              |
| **@PickRender** | El componente se lee mejor como clases explícitas: campos/métodos decorados, initializer separado, lifecycle manager separado, tipado orientado a clase. |

---

## Recomendación

Úsalos indistintamente desde el punto de vista de capacidades. Un componente puede moverse de `@Pick` a `@PickRender`, o al revés, sin cambiar el modelo del framework: por debajo se usa el mismo pipeline de render, registry de metadata, sistema de bindings, inicializador de listeners, initializers y lifecycle manager.

Prefiere `@Pick` cuando mejora la localidad. Prefiere `@PickRender` cuando la estructura explícita de clases mejora la claridad.

### Convención sugerida

```
Componente funcional compacto  →  @Pick
Componente explícito de clase  →  @PickRender
```

Si el equipo puede leerlo cómodamente en ambas formas, cualquiera de las dos está bien. Mantener consistencia dentro de una feature importa más que imponer un decorador global.
