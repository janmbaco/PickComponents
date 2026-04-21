/**
 * Pick Components - A tiny lifecycle-focused framework for building reactive web components
 *
 * @packageDocumentation
 */

// Core exports
export { PickComponent } from "./core/pick-component.js";
export {
  IServiceRegistry,
  DefaultServiceRegistry,
  Services,
} from "./providers/service-provider.js";
export type { ServiceToken } from "./providers/service-provider.interface.js";
export { bootstrapFramework } from "./providers/framework-bootstrap.js";
export type { FrameworkOverrides } from "./providers/framework-bootstrap.js";
export { IntentSignal, StateSignal } from "./reactive/signal.js";
export type {
  IIntentSignal,
  IStateSignal,
  IntentListener,
  Unsubscribe,
} from "./reactive/signal.js";

// Behavior exports
export { PickLifecycleManager } from "./behaviors/pick-lifecycle-manager.js";
export { PickInitializer } from "./behaviors/pick-initializer.js";
export type {
  InitializerFactory,
  LifecycleFactory,
} from "./core/component-metadata.js";

// Decorator exports
export {
  Reactive,
  PickRender,
  Listen,
  Pick,
  InlineContext,
} from "./decorators/index.js";
export type {
  ComponentConfig,
  DomListenerHandler,
  ListenerMetadata,
} from "./decorators/index.js";

// Registration exports
export { PickElementRegistrar } from "./registration/pick-element-registrar.js";
export type { IPickElementRegistrar } from "./registration/pick-element-registrar.interface.js";
export { PickElementFactory } from "./registration/pick-element-factory.js";
export type { PickElementOptions } from "./registration/pick-element-factory.js";
export type { IPickElementFactory } from "./registration/pick-element-factory.interface.js";

// Rendering exports
export { RenderEngine } from "./rendering/index.js";
export type {
  RenderOptions,
  RenderResult,
  IRenderEngine,
} from "./rendering/index.js";
export { DomContext } from "./rendering/dom-context/dom-context.js";
export { SharedStylesRegistry } from "./rendering/styles/shared-styles-registry.js";
export type { ISharedStylesRegistry } from "./rendering/styles/shared-styles-registry.js";
// ScopeStack and fragment AST path removed from public API

// Prerender/SSR compatibility exports
export {
  DefaultPrerenderAdoptionDecider,
  PICK_PRERENDER_ATTRIBUTES,
  PICK_PRERENDER_CONTRACT_VERSION,
  computePickTemplateHash,
  isLightDomPrerenderCandidate,
  readPrerenderAdoptionCandidate,
} from "./ssr/prerender-manifest.js";
export type {
  ClientRenderMode,
  IPrerenderAdoptionDecider,
  PickRootMode,
  PrerenderAdoptionCandidate,
  PrerenderAdoptionDecision,
  PrerenderAdoptionRequest,
} from "./ssr/prerender-manifest.js";

// Core components exports
export { PickSelectElement } from "./components/pick-select/pick-select-element.js";
export { PickLinkElement } from "./components/pick-link/pick-link-element.js";
export { PickRouterElement } from "./components/pick-router/pick-router-element.js";
export {
  navigate,
  getCurrentPath,
  BrowserNavigationService,
} from "./components/pick-router/navigation.js";
export type { INavigationService } from "./components/pick-router/navigation-service.interface.js";
export { PickActionElement } from "./components/pick-action/pick-action-element.js";
export type {
  PickActionEvent,
  PickActionEventDetail,
  PickViewAction,
  PickViewActions,
} from "./components/pick-action/pick-action-element.js";
export { PickForElement } from "./components/pick-for/pick-for-element.js";

// Type exports
export type {
  IComponentInitializer,
  ILifecycleManager,
  IReactiveState,
  SubscriptionCleanup,
  BehaviorMetadata,
} from "./types/interfaces.js";
export type { IObjectRegistry } from "./utils/object-registry.js";
export type { IDependencyTracker } from "./reactive/dependency-tracker.interface.js";

export { ObjectRegistryToken } from "./utils/object-registry.js";
