# Pick Components — Arquitectura de Renderizado

Este documento describe cómo un PickComponent se renderiza desde su metadata hasta un elemento DOM vivo y reactivo, y explica la responsabilidad de cada registry, etapa del pipeline y subsistema involucrado.

---

## Tabla de Contenidos

1. [Panorama general: del decorador al DOM](#1-panorama-general-del-decorador-al-dom)
2. [Flujo de renderizado paso a paso](#2-flujo-de-renderizado-paso-a-paso)
3. [Registries](#3-registries)
   - [ComponentMetadataRegistry](#componentmetadataregistry)
   - [ComponentInstanceRegistry](#componentinstanceregistry)
   - [ManagedElementRegistry](#managedelementregistry)
4. [Clases núcleo de renderizado](#4-clases-núcleo-de-renderizado)
   - [RenderEngine](#renderengine)
   - [RenderPipeline](#renderpipeline)
   - [DomContext](#domcontext)
5. [Sistema de templates](#5-sistema-de-templates)
   - [TemplateProvider](#templateprovider)
   - [Preprocesado con RulesResolver](#preprocesado-con-rulesresolver)
   - [TemplateAnalyzer](#templateanalyzer)
   - [TemplateCompiler](#templatecompiler)
6. [Sistema de bindings reactivos](#6-sistema-de-bindings-reactivos)
   - [BindingResolver](#bindingresolver)
   - [PropertyExtractor](#propertyextractor)
   - [ExpressionResolver](#expressionresolver)
   - [ExpressionParserService](#expressionparserservice)
7. [Procesamiento del host administrado](#7-procesamiento-del-host-administrado)
   - [ManagedElementResolver](#managedelementresolver)
   - [Política de bindings de atributos](#política-de-bindings-de-atributos)
   - [OutletResolver](#outletresolver)
   - [HostStyleMigrator](#hoststylemigrator)
8. [Proyección de contenido (slots nativos)](#8-proyección-de-contenido-slots-nativos)
9. [Renderizado de skeleton y errores](#9-renderizado-de-skeleton-y-errores)
10. [Resumen de patrones de diseño](#10-resumen-de-patrones-de-diseño)

---

## 1. Panorama general: del decorador al DOM

```
@Pick / @PickRender
       ├─ registra metadata en ComponentMetadataRegistry
       └─ registra un custom element vía PickElementRegistrar / PickElementFactory
                                               │
                                               │ cuando el navegador actualiza el host:
                                               ▼
                                  PickElementFactory.connectedCallback()
                                     ├─ crea la instancia del componente
                                     ├─ refleja atributos del host en props del componente
                                     ├─ elige el target de render
                                     │    ├─ ShadowRoot por defecto
                                     │    └─ light DOM anclado para padres restrictivos
                                     │       o adopción de prerender compatible
                                     └─ llama a RenderEngine.render()
                                              ├─ crea DomContext / AnchoredDomContext
                                              ├─ guarda la instancia en ComponentInstanceRegistry
                                              ├─ muestra skeleton (salvo que el modo adopt lo omita)
                                              ├─ ejecuta el initializer
                                              ├─ resuelve [[RULES.*]] vía TemplateProvider
                                              ├─ analiza y cachea el template
                                              └─ ejecuta RenderPipeline
                                                     ├─ compila o adopta DOM
                                                     ├─ migra estilos del host
                                                     ├─ reemplaza / adopta contenido en el target root
                                                     ├─ conecta listeners
                                                     └─ inicia el lifecycle manager
```

---

## 2. Flujo de renderizado paso a paso

### Paso 1 — Búsqueda de metadata

`RenderEngine.render()` recibe un `componentId` (el tag name del custom element) y lee `ComponentMetadata` desde `ComponentMetadataRegistry`. La metadata incluye `selector`, `template`, `styles`, `initializer`, `lifecycle`, `skeleton` y `errorTemplate`.

### Paso 2 — Creación de contexto e instancia

Se crea un **`DomContext`** nuevo para targets de render normales, o un **`AnchoredDomContext`** cuando el host vive bajo un padre nativo restrictivo como `tbody`, `tr`, `ul` o `select`. El contexto es dueño de las suscripciones DOM durante toda la vida del componente.

La instancia del componente la crea el wrapper del custom element en `PickElementFactory`, y luego queda registrada en **`ComponentInstanceRegistry`** usando el `contextId` del contexto DOM.

### Paso 3 — Mostrar skeleton

**`SkeletonRenderer`** renderiza el estado de carga inmediatamente, antes de cualquier trabajo async, salvo que el primer render cliente esté adoptando markup prerenderizado compatible. Prioridad:

1. Skeleton personalizado desde metadata
2. Skeleton por defecto con puntos animados

### Paso 4 — Ejecución del initializer

`RenderEngine` espera al initializer del componente antes de preparar el template real:

1. Si existe `metadata.initializer`, se instancia y se espera.
2. El initializer puede hidratar el estado del componente antes del primer render real.
3. Esta es la etapa en la que `component.rules` puede quedar preparado para la resolución posterior de `[[RULES.field]]`.

Si la inicialización falla, el engine renderiza el template de error sin entrar en el pipeline principal.

### Paso 5 — Preprocesado del template

**`TemplateProvider`**:

1. Lee el string de template crudo desde metadata.
2. Resuelve tokens `[[RULES.field]]` mediante `RulesResolver` cuando la instancia del componente expone un objeto `rules`.
3. Devuelve el template preprocesado.

Cuando un componente renderiza dentro de un ShadowRoot, la proyección de contenido se delega nativamente al navegador mediante elementos `<slot>`.

### Paso 6 — Análisis de bindings

**`TemplateAnalyzer`** escanea el template preprocesado y recolecta todos los tokens `{{expression}}`. Produce un `ICompiledTemplate` con un `Set<string>` de bindings.

### Paso 7 — Ejecución del pipeline (`RenderPipeline`)

1. **TemplateCompiler** — Parsea HTML a un elemento DOM real. Antes de construir el árbol reactivo, `TemplateStaticValidator` recorre el fragmento DOM y lanza un error si encuentra elementos peligrosos (`<script>`, `<iframe>`, `<object>`, `<embed>`, etc.), atributos de manejadores de eventos inline (`on*`), atributos bloqueados (`style`, `srcdoc`, `srcset`) o protocolos URL inseguros (`javascript:`, `vbscript:`, `data:`) en atributos URL estáticos. Si la validación pasa, el compilador registra Pick Components anidados en `ManagedElementRegistry` y llama `BindingResolver.bindElement()` para conectar suscripciones reactivas. Los valores de atributos dinámicos resueltos en runtime pasan por `AttributeBindingPolicy.sanitizeResolvedValue()`, que elimina el atributo del DOM si el valor resuelto es inseguro (por ejemplo, una URL `javascript:` producida por un binding).
2. **Procesamiento del host administrado** — Encuentra el outlet con `OutletResolver` y migra `class`/`id` del host al outlet con `HostStyleMigrator`.
3. **Reemplazo / adopción en DOM** — `DomContext.setElement()` reemplaza el skeleton por el elemento compilado, o `DomContext.adoptElement()` mantiene en su sitio el DOM prerenderizado compatible.
4. **Estilos** — Las hojas de estilo compartidas se aplican por `adoptedStyleSheets` cuando el target root es un ShadowRoot. `metadata.styles` se antepone al target root activo en ambos modos, pero solo un ShadowRoot ofrece encapsulación real.
5. **Listeners** — La metadata de listeners se conecta a eventos DOM cuando la raíz final ya está montada o adoptada. Esto cubre tanto `@Listen(...)` como la metadata de listeners emitida por `@Pick`.
6. **Lifecycle manager** — Si existe, arranca con `onComponentReady(component)` y más tarde se detiene con `onComponentDestroy(component)`.

### Paso 8 — Limpieza (cleanup)

Retorna una función de cleanup. Cuando se ejecuta, el pipeline desregistra elementos administrados, detiene y libera el lifecycle manager, destruye el contexto DOM y, después, `ComponentInstanceRegistry.release()` llama a `component.onDestroy()` y libera la instancia.

---

## 3. Registries

Los registries son la fuente de verdad autoritativa del sistema. Ninguna clase lee estado global excepto a través de un registry.

### ComponentMetadataRegistry

**Archivo:** `src/core/component-metadata-registry.ts`

Almacena configuración de componentes indexada por selector (tag name). Se pobla cuando se cargan módulos mediante decoradores (`@Pick`, `@PickRender`). Lo consumen `RenderEngine` y `TemplateProvider`.

```
@PickRender({ selector: 'my-counter', template: `...` })
  ──► ComponentMetadataRegistry.register('my-counter', metadata)
```

**Forma de metadata (campos clave):**

| Campo           | Descripción |
| --------------- | ----------- |
| `selector`      | Tag name del custom element |
| `template`      | String HTML del template |
| `styles`        | CSS que se antepone al target root; Shadow DOM lo encapsula cuando el target es un `ShadowRoot` |
| `skeleton`      | HTML de carga personalizado |
| `errorTemplate` | HTML opcional para fallos de render o inicialización |
| `initializer`   | Factoría async llamada antes del primer render real |
| `lifecycle`     | Factoría que crea un `PickLifecycleManager` para este componente |

### ComponentInstanceRegistry

**Archivo:** `src/core/component-instance-registry.ts`

Mapea `contextId → ComponentInstance`. Garantiza que cada host element tenga exactamente una instancia. Llama `onDestroy()` cuando la instancia se libera.

```
ComponentInstanceRegistry.getOrCreate(contextId, factory, metadata)
  → crea la instancia una sola vez y la reutiliza en renders posteriores
ComponentInstanceRegistry.release(contextId)
  → llama onDestroy() y elimina la entrada
```

### ManagedElementRegistry

**Archivo:** `src/rendering/managed-host/managed-element-registry.ts`

Registry basado en WeakMap (`Element → componentId`) que rastrea qué elementos DOM están asociados a una instancia de PickComponent. Este registry **no** usa heurísticas de tag name: un elemento es administrado solo si se registra explícitamente aquí.

**Puntos de registro:**

- `RenderPipeline` registra el host element y la raíz compilada.
- `TemplateCompiler` registra Pick Components anidados encontrados dentro de un template.

**Consumidores:**

- `ManagedElementResolver.isManagedElement()` — lo consulta `BindingResolver` para decidir si debe descender en un elemento hijo.
- `TemplateCompiler` — para evitar rebinding de contenido que pertenece a un componente anidado.

## 4. Clases núcleo de renderizado

### RenderEngine

**Archivo:** `src/rendering/render-engine.ts`

Es el punto de entrada único del renderizado. Orquesta la creación del contexto DOM, la visualización opcional del skeleton, la ejecución del initializer, la resolución del template, las decisiones de adopción de prerender y la ejecución del pipeline. Devuelve un `RenderResult` con la función cleanup y el event target usado para la delegación de `pick-action`.

```typescript
const result = await renderEngine.render({
  componentId: "my-counter",
  targetRoot: hostElement,
  hostElement,
});
```

### RenderPipeline

**Archivo:** `src/rendering/pipeline/render-pipeline.ts`

Ejecuta los pasos de render tras la inicialización. Puede compilar un árbol DOM nuevo o adoptar una raíz prerenderizada existente; después procesa el host administrado, conecta listeners, arranca el lifecycle manager y prepara la limpieza.

Si cualquier etapa falla, `ErrorRenderer` muestra un overlay de error usando `errorTemplate` del componente o un fallback por defecto.

### DomContext

**Archivo:** `src/rendering/dom-context/dom-context.ts`

Es dueño del elemento DOM vivo y de todas las suscripciones reactivas de un contexto de renderizado. Es agnóstico al componente: solo conoce elementos y callbacks de limpieza. En escenarios con padres restrictivos, `RenderEngine` usa `AnchoredDomContext`, que mantiene vivo el host administrado pero renderiza el DOM visible a través de un ancla transparente junto a él.

Responsabilidades clave:

- `setElement(el, contentType)` — Reemplaza el contenido actual en el target root (ShadowRoot o root normal).
- `adoptElement(el, contentType)` — Marca markup prerenderizado compatible como raíz viva sin reemplazarlo.
- `addSubscription(fn)` — Registra una función teardown.
- `destroy()` — Elimina el elemento DOM y ejecuta todos los teardowns.
- `query/queryAll(selector)` — Consultas CSS limitadas al elemento renderizado.

---

## 5. Sistema de templates

### TemplateProvider

**Archivo:** `src/rendering/templates/template-provider.ts`

Obtiene y preprocesa un template antes de la compilación reactiva:

1. Busca el template en `ComponentMetadataRegistry`.
2. Llama a `RulesResolver` para reemplazar tokens `[[RULES.field]]` usando `component.rules` cuando existen.
3. Devuelve el string preprocesado.

La proyección de contenido usa elementos `<slot>` nativos cuando el componente renderiza dentro de un ShadowRoot; no hace falta un registry intermedio.

### Preprocesado con RulesResolver

**Archivo:** `src/rendering/bindings/rules-resolver.ts`

`RulesResolver` opera **después del initializer** y **antes** de la compilación reactiva:

| Clase           | Sintaxis de token     | Propósito |
| --------------- | --------------------- | --------- |
| `RulesResolver` | `[[RULES.fieldName]]` | Expande atributos HTML de validación |

**Ejemplo — rules:**

```
template: `<input [[RULES.email]] />`
component.rules = { email: { required: true, pattern: '^[^@]+@[^@]+$' } }
→ `<input required pattern="^[^@]+@[^@]+$" />`
```

### TemplateAnalyzer

**Archivo:** `src/rendering/templates/template-analyzer.ts`

Escanea el template preprocesado y construye un `Set<string>` con todos los tokens `{{expression}}`. Usa tokenización consciente de HTML para evitar falsos positivos en nombres de tag o atributos. El resultado es un `ICompiledTemplate` que entra al pipeline.

### TemplateCompiler

**Archivo:** `src/rendering/templates/template-compiler.ts`

Transforma el string de template en un `HTMLElement` "vivo":

1. Parsea HTML mediante `DomAdapter` (seguro para navegador).
2. Agrega el selector del componente como clase CSS en la raíz.
3. Llama a `ManagedElementRegistry.register()` para Pick Components anidados y elementos `pick-for` como frontera de template.
4. Llama a `BindingResolver.bindElement()` para conectar suscripciones reactivas en todo el árbol.
5. Precaptura los templates de elementos `<pick-for>` anidados mediante un atributo `data-preset-template`. Esto previene una condición de carrera en el orden de `connectedCallback` de Custom Elements del navegador, donde un `pick-for` interno se conecta antes que su padre, limpia su `innerHTML` y corrompe la captura del template padre.
6. Devuelve el elemento raíz listo para inserción.

La misma clase también soporta `adoptExisting(...)`, que copia los marcadores de binding desde el template canónico hacia DOM prerenderizado compatible y luego conecta suscripciones vivas sobre ese markup existente.

---

## 6. Sistema de bindings reactivos

### BindingResolver

**Archivo:** `src/rendering/bindings/binding-resolver.ts`

Es el corazón de la reactividad. Recorre el árbol DOM compilado y crea una suscripción reactiva por cada atributo o nodo de texto que contenga `{{expression}}`.

**Por binding:**

1. `PropertyExtractor` identifica de qué propiedades depende la expresión.
2. Para cada propiedad, se suscribe a `component.getPropertyObservable(prop)`.
3. Cuando cambia una propiedad, `ExpressionResolver` vuelve a evaluar la expresión y actualiza el atributo o text node.
4. Los teardowns de suscripción se registran en `DomContext`.

**Reglas de recursión:**

- Desciende en hijos salvo que `ManagedElementResolver.isManagedElement()` devuelva `true`; en ese caso el componente anidado administra su propio árbol reactivo a través de su propio render root.

### PropertyExtractor

**Archivo:** `src/rendering/bindings/property-extractor.ts`

Dado un string como `"Hello {{user.name}}, you have {{count + 1}} items"`, devuelve `['user', 'count']`: nombres raíz que se deben observar.

- Bindings simples (`{{prop}}`, `{{obj.key}}`) → token raíz antes de `.` o `?`.
- Expresiones complejas (`{{x + y}}`, `{{fn()}}`) → se parsean con `ExpressionParserService`; las dependencias salen del array `dependencies` del resultado del parser.

### ExpressionResolver

**Archivo:** `src/rendering/bindings/expression-resolver.ts`

Resuelve tokens `{{expression}}` a sus valores string actuales durante render y update:

1. Extrae propiedades seguras del componente (excluye lifecycle methods y miembros privados que empiezan por `_`).
2. Cachea el set de propiedades seguras por clase de componente.
3. Evalúa propiedad directa, propiedad anidada (`obj.key`) o expresión compleja mediante `ExpressionParserService`.

### ExpressionParserService

**Archivo:** `src/rendering/expression-parser/expression-parser.service.ts`

Fachada sobre el motor de expresiones AST. Tokeniza → parsea → extrae dependencias → cachea resultado. Se usa cuando la expresión contiene operadores, llamadas o condicionales.

```
"count + 1"  →  AST(BinaryExpression)  →  evaluate(context)  →  "6"
"x > 0 ? 'yes' : 'no'"  →  AST(ConditionalExpression)  →  evaluate  →  "yes"
```

Durante el bootstrap, el runtime conecta `ExpressionParserService` con `ASTEvaluator`, `PropertyExtractor` y `ExpressionResolver` a través del service registry.

---

## 7. Procesamiento del host administrado

### ManagedElementResolver

**Archivo:** `src/rendering/managed-host/managed-element-resolver.ts`

Interfaz de método único: `isManagedElement(element): boolean`. Delega en `ManagedElementRegistry`. `BindingResolver` la usa para detener el recorrido en límites de componentes anidados.

### Política de bindings de atributos

`defaultAttributeBindingPolicy` es compartida por `BindingResolver` y `TemplateCompiler`. La reflexión de atributos del host ocurre aparte en `PickElementFactory`.

| Regla | Ejemplos | Resultado |
| ----- | -------- | --------- |
| Atributo de host | `<user-card user-id="42">` | Se refleja en la propiedad del componente |
| Binding reactivo | `title="{{msg}}"`, `items="{{entries}}"` | Gestionado por `BindingResolver` |
| Binding objeto/array | `items="{{entries}}"` | `ObjectRegistry`; el DOM recibe un id |
| Booleanos | `disabled="{{loading}}"` | Sincroniza presencia de atributo y propiedad DOM |
| Peligrosos (`on*`, `style`, `srcdoc`, `srcset`) | `onclick="x"`, `onclick="{{x}}"` | `TemplateStaticValidator` lanza en compilación; bloqueado siempre |
| URL (`href`, `src`, …) | `href="javascript:x"`, `href="{{url}}"` | Valor estático peligroso → throw; binding dinámico peligroso → atributo eliminado en runtime |
| Estructural `pick-action` | `action`, `event`, `bubble` | No son inputs del componente |

`event` es alias de `action` en `<pick-action>`; los ejemplos nuevos deben usar `action`. Una acción se detiene en el PickComponent más cercano salvo que el elemento tenga `bubble`.

### OutletResolver

**Archivo:** `src/rendering/managed-host/outlet-resolver.ts`

Encuentra el elemento dentro del template compilado que debe recibir `class` e `id` del host. Prioridad:

1. Elemento con clase `.outlet` (marcador explícito).
2. Primer hijo si la raíz tiene exactamente un hijo element.
3. Fallback: la raíz misma.

### HostStyleMigrator

**Archivo:** `src/rendering/managed-host/host-style-migrator.ts`

Mueve `class` e `id` del custom element host al outlet:

- **Class**: merge con deduplicación (clases del host primero).
- **ID**: se migra solo si el outlet no tiene `id` existente.
- Elimina esos atributos del host después de migrar.

```
Antes:
  <my-button class="btn primary" id="save">  ← host
    <button class="base">Save</button>        ← outlet (hijo único)

Después:
  <my-button>                                 ← host (sin class/id)
    <button class="btn primary base" id="save">Save</button>
```

---

## 8. Proyección de contenido (slots nativos)

Pick Components usa elementos `<slot>` nativos para la proyección de contenido en su ruta de renderizado con Shadow DOM:

```html
<!-- Template del componente -->
<div class="card">
  <slot name="header">Header por defecto</slot>
  <div class="body">
    <slot>Contenido por defecto</slot>
    <!-- slot por defecto -->
  </div>
</div>

<!-- Uso en HTML -->
<my-card>
  <h2 slot="header">Título</h2>
  <p>Contenido del cuerpo</p>
  <!-- va al slot por defecto -->
</my-card>
```

**Cómo funciona:**

1. Los Pick Components estándar renderizan en un `ShadowRoot` abierto por defecto.
2. En ese modo, el template se renderiza dentro del ShadowRoot y los `<slot>` son marcadores de posición nativos.
3. Los hijos del Light DOM con `slot="name"` son proyectados por el navegador al `<slot name="name">` correspondiente.
4. Los hijos del Light DOM sin atributo van al `<slot>` sin nombre (slot por defecto).
5. Si un `<slot>` tiene contenido interno, éste actúa como fallback cuando no hay hijos del Light DOM asignados.
6. Cuando un componente se fuerza a render anclado en light DOM bajo un padre restrictivo, esa proyección nativa de Shadow DOM ya no aplica a ese target de render.

**Estilos y Shadow DOM:**

Los estilos del componente declarados en `metadata.styles` se anteponen al target root activo, y las hojas de estilo compartidas también pueden aplicarse por `adoptedStyleSheets` cuando ese target es un ShadowRoot. La encapsulación real solo existe cuando el target de render es efectivamente un ShadowRoot; el render anclado en light DOM no ofrece esa misma frontera de estilos.

Patrones CSS habituales:

```css
/* Layout del host — reemplaza cualquier override externo de display */
:host {
  display: block;
}
:host([hidden]) {
  display: none;
}

/* Estilizar contenido del Light DOM proyectado vía <slot> */
::slotted(*) {
  color: inherit;
}
::slotted(p) {
  margin: 0;
}

/* Las custom properties atraviesan la frontera Shadow para theming */
:host {
  background: var(--card-bg, white);
  padding: var(--card-padding, 0.5rem);
}
```

Vea [templates.md](templates.md) para la guía completa de estilos CSS con `:host`, `::slotted()` y convenciones de custom properties.

---

## 9. Renderizado de skeleton y errores

### SkeletonRenderer

Muestra un estado de carga inmediatamente mientras corre trabajo async, salvo cuando se está adoptando markup prerenderizado compatible:

1. Usa `metadata.skeleton` si está disponible (validado por `SkeletonValidator`).
2. Hace fallback a un skeleton interno de 3 puntos animados (cacheado y reutilizado entre componentes).

`SkeletonValidator` aplica una whitelist de tags y atributos permitidos, y bloquea `<script>`, handlers `on*` y URLs `javascript:` incluso en skeletons definidos por desarrolladores.

### ErrorRenderer

Cuando falla la inicialización o el render:

1. Intenta `metadata.errorTemplate`, resolviendo expresiones `{{...}}` respaldadas por el componente y sustituyendo `{{message}}` de forma segura como texto.
2. Si no aplica, usa un overlay simple con el mensaje de error.

---

## 10. Resumen de patrones de diseño

| Patrón                                | Dónde se usa |
| ------------------------------------- | ------------ |
| **Factory**                           | `TemplateProviderFactory`, `DomContextFactory`, `TransparentHostFactory`, `PickElementFactory` |
| **Registry**                          | `ComponentMetadataRegistry`, `ComponentInstanceRegistry`, `ManagedElementRegistry`, `ObjectRegistry` |
| **Observer / Subscription**           | `BindingResolver` se suscribe a `getPropertyObservable(prop)` |
| **Strategy**                          | `OutletResolver`, `SkeletonRenderer`, `DefaultPrerenderAdoptionDecider` |
| **Fachada**                           | `ExpressionParserService` sobre tokenizer + parser + evaluator |
| **Pipeline**                          | `RenderPipeline` orquesta compile/adopt, montaje DOM, listeners y lifecycle |
| **Inversión de Dependencias**         | Los constructores dependen de interfaces; las implementaciones concretas se cablean en `framework-bootstrap.ts` |
| **WeakMap para seguridad de memoria** | `ManagedElementRegistry`, `ObjectRegistry`, `DomContextHostResolver` |
| **1:1 element-to-instance**           | `ComponentInstanceRegistry` indexado por `contextId` |
