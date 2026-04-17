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
8. [Host projection (slots)](#8-host-projection-slots)
9. [Renderizado de skeleton y errores](#9-renderizado-de-skeleton-y-errores)
10. [Resumen de patrones de diseño](#10-resumen-de-patrones-de-diseño)

---

## 1. Panorama general: del decorador al DOM

```
@PickRender({ selector, template, ... })
       │
       │ registra metadata en
       ▼
ComponentMetadataRegistry
       │
       │ cuando el navegador actualiza el custom element:
       ▼
RenderEngine.render()
   ├─ crea DomContext (gestiona DOM + suscripciones)
   ├─ crea / recupera la instancia del componente (ComponentInstanceRegistry)
   ├─ muestra skeleton inmediatamente (SkeletonRenderer)
   ├─ ejecuta el initializer antes del primer render real
   ├─ resuelve `[[RULES.*]]` del template (TemplateProvider)
   ├─ analiza bindings (TemplateAnalyzer)
   └─ ejecuta RenderPipeline
          ├─ compila el template a DOM reactivo (TemplateCompiler + BindingResolver)
          ├─ migra estilos del host (OutletResolver + HostStyleMigrator)
          ├─ reemplaza skeleton en el DOM (DomContext.setElement)
          ├─ conecta listeners de eventos
          └─ inicia el lifecycle manager
```

---

## 2. Flujo de renderizado paso a paso

### Paso 1 — Búsqueda de metadata

`RenderEngine.render()` recibe un `componentId` (tag name del custom element) y lee `ComponentMetadata` desde `ComponentMetadataRegistry`. Esta metadata incluye: `selector`, `template`, `styles`, `initializer`, `lifecycle`, `rules`, `skeleton`, etc.

### Paso 2 — Creación de contexto e instancia

Se crea un **`DomContext`** nuevo (relación 1:1 con el host objetivo o ShadowRoot). Este contexto es dueño de todas las suscripciones del DOM durante la vida del componente.

La instancia del componente se recupera o crea por medio de **`ComponentInstanceRegistry`**. Cada host element tiene exactamente una instancia, indexada por `contextId`.

### Paso 3 — Mostrar skeleton

**`SkeletonRenderer`** renderiza el estado de carga inmediatamente, antes de cualquier trabajo async. Prioridad:

1. Skeleton personalizado desde metadata
2. Skeleton por defecto con puntos animados

### Paso 4 — Ejecución del initializer

`RenderEngine` espera al initializer del componente antes de preparar el template real:

1. Si existe `metadata.initializer`, se instancia y se espera.
2. El initializer puede hidratar estado del componente antes del primer render real.
3. Ésta es la etapa en la que `component.rules` puede cargarse para `[[RULES.field]]`.

Si la inicialización falla, el engine renderiza el template de error sin entrar al pipeline principal.

### Paso 5 — Preprocesado del template

**`TemplateProvider`**:

1. Lee el string de template crudo desde metadata.
2. Resuelve tokens `[[RULES.field]]` (atributos de validación) mediante `RulesResolver`.
3. Devuelve el template preprocesado. La proyección de contenido es gestionada nativamente por el Shadow DOM mediante elementos `<slot>`.

### Paso 6 — Análisis de bindings

**`TemplateAnalyzer`** escanea el template preprocesado y recolecta todos los tokens `{{expression}}`. Produce un `ICompiledTemplate` con un `Set<string>` de bindings.

### Paso 7 — Ejecución del pipeline (`RenderPipeline`)

1. **TemplateCompiler** — Parsea HTML a un elemento DOM real, registra Pick Components anidados en `ManagedElementRegistry` y llama `BindingResolver.bindElement()` para conectar suscripciones reactivas.
2. **Procesamiento del host administrado** — Encuentra el outlet con `OutletResolver` y migra `class`/`id` del host al outlet con `HostStyleMigrator`.
3. **Reemplazo en DOM** — `DomContext.setElement()` reemplaza el skeleton por el elemento compilado.
4. **Inyección de estilos** — Si `metadata.styles` está definido, se añade un elemento `<style>` al Shadow Root para encapsular los estilos del componente.
5. **Listeners** — Se conectan eventos de decoradores `@Listen`.
6. **Lifecycle manager** — Inicia el ciclo de vida del componente (`onInit`, actualizaciones reactivas, `onDestroy`).

### Paso 8 — Limpieza (cleanup)

Retorna una función de cleanup. Cuando se ejecuta (por ejemplo, en un cambio de ruta): `DomContext.destroy()` elimina el elemento y corre todos los teardowns de suscripciones; `ComponentInstanceRegistry.release()` llama `onDestroy()` y libera la instancia.

---

## 3. Registries

Los registries son la fuente de verdad autoritativa del sistema. Ninguna clase lee estado global excepto a través de un registry.

### ComponentMetadataRegistry

**Archivo:** `src/core/component-metadata-registry.ts`

Almacena configuración de componentes indexada por selector (tag name). Se pobla cuando se cargan módulos mediante decoradores (`@Pick`, `@PickRender`). Lo consumen `RenderEngine`, `TemplateProvider`, `SkeletonRenderer` y `TemplateCompiler`.

```
@PickRender({ selector: 'my-counter', template: `...` })
  ──► ComponentMetadataRegistry.register('my-counter', metadata)
```

**Forma de metadata (campos clave):**

| Campo         | Descripción                                                   |
| ------------- | ------------------------------------------------------------- |
| `selector`    | Tag name del custom element                                   |
| `template`    | String HTML del template                                      |
| `styles`      | CSS inyectado como `<style>` en el Shadow Root en cada render |
| `rules`       | Reglas de validación expandidas desde `component.rules` mediante `[[RULES.field]]` |
| `skeleton`    | HTML de carga personalizado                                   |
| `initializer` | Factoría async llamada antes de renderizar                    |
| `inputs`      | Nombres de atributos tratados como inputs del componente      |

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

Punto de entrada único del renderizado. Orquesta skeleton, resolución de template y ejecución del pipeline. Devuelve un `RenderResult` con la función cleanup.

```typescript
const result = await renderEngine.render({
  componentId: "my-counter",
  targetRoot: hostElement,
  hostElement,
});
```

### RenderPipeline

**Archivo:** `src/rendering/pipeline/render-pipeline.ts`

Ejecuta las 6 etapas secuenciales tras mostrar el skeleton (ver §2 pasos 6–7). Recibe el template compilado desde `TemplateCompiler`, procesa host administrado, reemplaza skeleton, conecta listeners e inicia lifecycle.

Si cualquier etapa falla, `ErrorRenderer` muestra un overlay de error usando `errorTemplate` del componente o un fallback por defecto.

### DomContext

**Archivo:** `src/rendering/dom-context/dom-context.ts`

Es dueño del elemento DOM vivo y de todas las suscripciones reactivas de un contexto de renderizado. Es agnóstico al componente: solo conoce elementos y callbacks de limpieza.

Responsabilidades clave:

- `setElement(el, contentType)` — Reemplaza el contenido actual en el target root (host o ShadowRoot).
- `addSubscription(fn)` — Registra una función teardown.
- `destroy()` — Elimina el elemento DOM y ejecuta todos los teardowns.
- `query/queryAll(selector)` — Consultas CSS limitadas al elemento renderizado.

---

## 5. Sistema de templates

### TemplateProvider

**Archivo:** `src/rendering/templates/template-provider.ts`

Obtiene y preprocesa un template antes de la compilación reactiva:

1. Busca el template en `ComponentMetadataRegistry`.
2. Llama `RulesResolver` para reemplazar tokens `[[RULES.field]]` usando `component.rules`.
3. Devuelve el string preprocesado. La proyección de contenido es gestionada nativamente por el Shadow DOM mediante elementos `<slot>`.

### Preprocesado con RulesResolver

**Archivo:** `src/rendering/bindings/rules-resolver.ts`

`RulesResolver` opera **después del initializer** y **antes** de la compilación reactiva:

| Clase           | Sintaxis de token     | Propósito                            |
| --------------- | --------------------- | ------------------------------------ |
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
3. Llama `ManagedElementRegistry.register()` para Pick Components anidados y elementos `pick-for` (frontera de template).
4. Llama `BindingResolver.bindElement()` para conectar suscripciones reactivas en todo el árbol.
5. Pre-captura los templates de elementos `<pick-for>` anidados mediante un atributo `data-preset-template`. Esto previene una condición de carrera en el orden de `connectedCallback` de Custom Elements del navegador, donde un `pick-for` interno se conecta antes que su padre (al mover nodos con `insertBefore`), limpiando su `innerHTML` y corrompiendo la captura del template del padre.
6. Devuelve el elemento raíz listo para inserción.

La proyección de contenido la gestiona el navegador de forma nativa a través de los elementos `<slot>` en el Shadow DOM.

---

## 6. Sistema de bindings reactivos

### BindingResolver

**Archivo:** `src/rendering/bindings/binding-resolver.ts`

Corazón de la reactividad. Recorre el árbol DOM compilado y crea una suscripción reactiva por cada atributo o texto que contenga `{{expression}}`.

**Por binding:**

1. `PropertyExtractor` identifica de qué propiedades depende la expresión.
2. Para cada propiedad, se suscribe a `component.getPropertyObservable(prop)`.
3. Cuando cambia una propiedad, `ExpressionResolver` vuelve a evaluar y actualiza atributo o text node.
4. Los teardowns de suscripción se registran en `DomContext`.

**Reglas de recursión:**

- Desciende en hijos salvo que `ManagedElementResolver.isManagedElement()` devuelva `true`; en ese caso el componente anidado administra su propio árbol reactivo dentro de su Shadow DOM.

### PropertyExtractor

**Archivo:** `src/rendering/bindings/property-extractor.ts`

Dado un string como `"Hello {{user.name}}, you have {{count + 1}} items"`, devuelve `['user', 'count']`: nombres raíz que se deben observar.

- Bindings simples (`{{prop}}`, `{{obj.key}}`) → token raíz antes de `.` o `?`.
- Expresiones complejas (`{{x + y}}`, `{{fn()}}`) → parseo con `ExpressionParserService` y extracción con `DependencyExtractor`.

### ExpressionResolver

**Archivo:** `src/rendering/bindings/expression-resolver.ts`

Resuelve tokens `{{expression}}` a sus valores string actuales en render/update:

1. Extrae propiedades seguras del componente (excluye lifecycle methods y miembros privados que empiezan por `_`).
2. Cachea el set de propiedades seguras por clase de componente.
3. Evalúa: propiedad directa, propiedad anidada (`obj.key`) o expresión compleja con `ExpressionParserService`.

### ExpressionParserService

**Archivo:** `src/rendering/expression-parser/expression-parser.service.ts`

Fachada sobre el motor de expresiones AST. Tokeniza → parsea → extrae dependencias → cachea resultado. Se usa cuando la expresión contiene operadores, llamadas o condicionales.

```
"count + 1"  →  AST(BinaryExpression)  →  evaluate(context)  →  "6"
"x > 0 ? 'yes' : 'no'"  →  AST(ConditionalExpression)  →  evaluate  →  "yes"
```

`ExpressionParserFactory` conecta: `ExpressionParserService`, `ASTEvaluator`, `ExpressionCache` y `DependencyExtractor`, siguiendo Factory Pattern para facilitar reemplazos en tests.

---

## 7. Procesamiento del host administrado

### ManagedElementResolver

**Archivo:** `src/rendering/managed-host/managed-element-resolver.ts`

Interfaz de método único: `isManagedElement(element): boolean`. Delega en `ManagedElementRegistry`. `BindingResolver` lo usa para detener el recorrido en límites de componentes anidados.

### Política de bindings de atributos

Los bindings de atributos se resuelven directamente en `BindingResolver` y
`PickElementFactory`; ya no existe un servicio separado de política de
atributos en el runtime actual.

Reglas:

| Regla                       | Ejemplos                                              | Resultado                                             |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Atributo en host componente | `<user-card user-id="42">`                            | Se copia a la propiedad si existe en el componente    |
| Binding reactivo            | `title="{{msg}}"`, `items="{{entries}}"`             | Lo gestiona `BindingResolver`                         |
| Binding de objeto/array     | `items="{{entries}}"`                                 | Se guarda en `ObjectRegistry`; el DOM recibe un id    |
| Atributos booleanos         | `disabled="{{loading}}"`, `required="{{isRequired}}"` | Sincroniza presencia de atributo y propiedad DOM      |
| Estructural pick-action    | `action`, `event`, `value`, `bubble`                  | Lo usa `<pick-action>`, no es input del componente   |

`event` también funciona como alias de `<pick-action action="...">`.
Los ejemplos nuevos deben usar `action`. Una acción manejada se detiene en el
PickComponent más cercano salvo que el elemento tenga el atributo `bubble`.

### OutletResolver

**Archivo:** `src/rendering/managed-host/outlet-resolver.ts`

Encuentra el elemento dentro del template compilado que debe recibir `class` e `id` del host. Prioridad:

1. Elemento con clase `.outlet` (marcador explícito).
2. Primer hijo si la raíz tiene exactamente un hijo element.
3. Fallback: la raíz misma.

### HostStyleMigrator

**Archivo:** `src/rendering/managed-host/host-style-migrator.ts`

Mueve `class` e `id` del custom element host al outlet:

- **Class**: Merge con deduplicación (clases del host primero).
- **ID**: Se migra solo si el outlet no tiene `id` existente.
- Elimina esos atributos del host después de migrar.

```
Antes:
  <my-button class="btn primary" id="save">  ← host
    <button class="base">Save</button>        ← outlet (hijo único)

Después:
  <my-button>                                   ← host (sin class/id)
    <button class="btn primary base" id="save">Save</button>
```

---

## 8. Proyección de contenido (slots nativos)

Pick Components usa Shadow DOM y elementos `<slot>` nativos para proyección de contenido:

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

**Flujo:**

1. Todos los Pick Components adjuntan un Shadow DOM (`mode: 'open'`) en `connectedCallback`.
2. El template se renderiza dentro del Shadow Root — los `<slot>` son marcadores de posición nativos.
3. Los hijos del Light DOM con `slot="name"` son proyectados por el navegador al `<slot name="name">` correspondiente.
4. Los hijos del Light DOM sin atributo van al `<slot>` sin nombre (slot por defecto).
5. Si un `<slot>` tiene contenido interno, éste actúa como fallback cuando no hay hijos del Light DOM asignados.
6. No se requiere código del framework — el navegador gestiona la proyección de forma nativa.

**Estilos CSS en Shadow DOM:**

Los estilos del componente declarados en `metadata.styles` se inyectan como elemento `<style>` en el Shadow Root. Use `:host` para estilizar el propio custom element y `::slotted()` para el contenido proyectado:

```css
:host {
  display: block;
}
:host([hidden]) {
  display: none;
}
::slotted(p) {
  margin: 0;
}
:host {
  background: var(--card-bg, white);
}
```

---

## 9. Renderizado de skeleton y errores

### SkeletonRenderer

Muestra un estado de carga inmediatamente mientras corre trabajo async:

1. Usa `metadata.skeleton` si está disponible (validado por `SkeletonValidator`).
2. Fallback a un skeleton interno de 3 puntos animados (cacheado y reutilizado entre componentes).

`SkeletonValidator` aplica whitelist de tags y atributos permitidos, y bloquea `<script>`, handlers `on*` y URLs `javascript:` incluso en skeletons definidos por desarrolladores.

### ErrorRenderer

Cuando falla la inicialización o el render:

1. Intenta `metadata.errorTemplate` con bindings reactivos `{{...}}` contra el contexto de componente/error.
2. Si falla, usa un overlay simple con el mensaje de error.

---

## 10. Resumen de patrones de diseño

| Patrón                                | Dónde se usa                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Factory**                           | `ExpressionParserFactory`, `TemplateProviderFactory`, `DomContextFactory`, `TemplateCompilerFactory`                |
| **Registry**                          | `ComponentMetadataRegistry`, `ComponentInstanceRegistry`, `ManagedElementRegistry`, `ObjectRegistry`                |
| **Observer / Subscription**           | `BindingResolver` se suscribe a `getPropertyObservable(prop)`                                                       |
| **Strategy**                          | `OutletResolver` (3 estrategias), `SkeletonRenderer` (custom vs default)                                            |
| **Fachada**                           | `ExpressionParserService` sobre tokenizer + parser + cache                                                          |
| **Pipeline**                          | `RenderPipeline` con ejecución secuencial de 7 etapas                                                               |
| **Inversión de Dependencias**         | Todos los constructores reciben interfaces; las concreciones se cablean en `framework-bootstrap.ts`                 |
| **WeakMap para seguridad de memoria** | `ManagedElementRegistry`, `ObjectRegistry`, `DomContextHostResolver`                                                |
| **1:1 element-to-instance**           | `ComponentInstanceRegistry` indexado por `contextId`                                                                |
