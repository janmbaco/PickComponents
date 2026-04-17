# Pick Components frente a otros frameworks

Esto no es un marcador de puntos. Pick Components es pequeño a propósito, así que
la comparación útil es arquitectónica: qué tipo de trabajo hace natural cada
herramienta.

Pick Components es un framework de Web Components centrado en el ciclo de vida.
Favorece custom elements nativos, estado explícito de componente, señales de
intención tipadas y un `PickLifecycleManager` que media entre componentes de UI
y servicios de negocio.

## Posicionamiento

Pick Components encaja especialmente bien cuando quieres:

- Custom elements nativos que puedan usarse desde HTML plano u otros frameworks.
- UI reactiva sin virtual DOM ni un runtime grande de aplicación.
- Separación explícita entre estado renderizable, intenciones de usuario,
  coordinación de lifecycle y servicios.
- Componentes fáciles de embeber como islas, widgets, dashboards, ejemplos de
  documentación o piezas de design system.
- Un framework pequeño, TypeScript-first, con internals inspeccionables.

No intenta sustituir plataformas completas de aplicación. Conviene elegir un
framework mayor cuando necesitas un meta-framework maduro, convenciones de SSR y
carga de datos, targets móviles, ecosistemas enormes de plugins o familiaridad
de equipo como restricción principal.

## Comparativa rápida

| Framework | Qué optimiza | En qué difiere Pick Components | Prefiere Pick Components cuando |
| --- | --- | --- | --- |
| React | Ecosistema grande de apps, modelo JSX, virtual DOM, contratación fácil | Usa custom elements nativos, no virtual DOM, no exige JSX y separa la mediación de lifecycle | Quieres Web Components embebibles y coordinación directa con servicios sin adoptar todo el modelo de app React |
| Vue | Autoría SFC integrada, reactividad amable, estructura de app bastante completa | Mantiene el modelo más cerca de custom elements de plataforma y separa lifecycle/servicios explícitamente | Quieres componentes ligeros con servicios TypeScript explícitos en vez de un framework de app |
| Svelte | Componentes compilados, runtime mínimo, archivos `.svelte` declarativos | Usa metadata/decoradores en runtime y custom elements nativos en vez de un dialecto de compilador | Quieres Web Components e internals reemplazables mediante el service registry |
| Solid | Reactividad fine-grained con signals y JSX, actualizaciones muy precisas | Usa señales por propiedad para bindings, `IntentSignal` para comandos y `LifecycleManager` para flujo de negocio | Prefieres componentes de clase/DSL y un patrón mediator incorporado frente a composición JSX con signals |
| Lit | Web Components standards-first con templates/directives maduros | Es el pariente más cercano. Pick Components añade más opinión sobre initializers, lifecycle managers, DI, templates de expresión segura e intenciones | Quieres Web Components con una arquitectura pequeña para servicios y lifecycles |
| Stencil | Web Components compilados para design systems y librerías distribuibles | Pick Components es más ligero y no obliga a adoptar un framework de compilador para cada componente | Quieres componentes locales/runtime, ejemplos o widgets de app antes que un pipeline compiler-first |
| Alpine | Progressive enhancement con atributos HTML e interacciones locales pequeñas | Pick Components aporta clases de componente, render scoped, servicios, cleanup de lifecycle y streams de intención tipados | Tu UI ya tiene bastante coordinación y el comportamiento inline empieza a quedarse corto |
| HTMX | Interacciones server-driven con HTML y muy poco estado cliente | Pick Components está orientado a componentes cliente con estado reactivo local | Necesitas custom elements cliente con estado local y suscripciones a servicios |
| Web Components vanilla | Máximo control de plataforma, cero abstracción de framework | Pick Components aporta render, bindings, reactividad, lifecycle, DI y convenciones de cleanup | Quieres componentes nativos sin rehacer siempre el mismo plumbing |

## Mapa de conceptos

| Preocupación | Primitiva en Pick Components | Notas |
| --- | --- | --- |
| Estado renderizable | `@Reactive` / `ctx.state()` | Estado que aparece en templates o alimenta computados |
| Observación de estado | `getPropertyObservable("name")` | Para cambios reales de estado, no comandos |
| Acción de usuario o comando | `createIntent<T>()` / `ctx.intent<T>()` | Intenciones puntuales con payload tipado opcional |
| Listener DOM | `@Listen(...)` / `ctx.listen(...)` | Eventos DOM nativos dentro del root renderizado |
| Flujo componente → servicio | `PickLifecycleManager.addSubscription(...)` | El lifecycle manager se suscribe a intenciones del componente |
| Flujo servicio → componente | Señal/observable del servicio → estado `@Reactive` | Mantiene los servicios agnósticos al framework |
| Preparación async inicial | `PickInitializer` / `ctx.initializer()` | Corre antes del primer render real |
| Coordinación viva | `PickLifecycleManager` / `ctx.lifecycle()` | Corre después del render y limpia suscripciones |
| Estrategia de navegación | `INavigationService` | `pick-link`, `pick-router`, `navigate()` y `getCurrentPath()` comparten una facade de navegación reemplazable |

## Dónde se nota distinto

Muchos frameworks de UI colocan la mayor parte del comportamiento dentro del
componente. Pick Components mantiene el componente principalmente como superficie
de vista:

```text
Componente  -> emite intención
Lifecycle   -> coordina con servicios
Servicio    -> posee estado de negocio o integración externa
Componente  <- recibe actualizaciones de estado renderizable
```

Esa separación es el sabor principal del framework. `@Reactive` no es un bus de
comandos. `IntentSignal` no es estado renderizable. El lifecycle manager es el
lugar donde se encuentran ambos mundos.

## Interoperabilidad

Los componentes Pick Components son custom elements, así que pueden consumirse
desde HTML plano, React, Vue, Svelte, Lit, páginas server-rendered o sitios de
documentación estática. Eso los hace adecuados para islas de UI y widgets
compartidos.

El sentido inverso también funciona: una app Pick Components puede alojar custom
elements normales, controles nativos o Web Components creados con otros
frameworks. La frontera de plataforma es el contrato.

La navegación sigue el mismo enfoque de puerto pequeño que la DI. La
implementación por defecto, `BrowserNavigationService`, usa History API, pero
una aplicación puede registrar otro `INavigationService` para hash routing,
memory routing, tests o un adapter sobre un router externo. Los built-ins
`pick-link`, `pick-router`, `navigate()` y `getCurrentPath()` pasan por ese
servicio.

## Regla práctica

Usa Pick Components cuando la plataforma web sea el cimiento adecuado y quieras
una arquitectura pequeña y explícita para estado, intención, lifecycle y
servicios.

Usa un framework mayor cuando la aplicación necesite toda esa plataforma:
convenciones de routing, SSR/carga de datos, ecosistemas grandes de plugins,
targets móviles o familiaridad amplia del equipo.
