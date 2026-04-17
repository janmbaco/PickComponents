import type { IServiceRegistry } from "./service-provider.interface.js";

import { BrowserDomAdapter } from "../rendering/dom/browser-dom-adapter.js";
import { SkeletonValidator } from "../rendering/skeleton/skeleton-validator.js";
import { SkeletonRenderer } from "../rendering/skeleton/skeleton-renderer.js";
import { ComponentMetadataRegistry } from "../core/component-metadata-registry.js";
import { ComponentInstanceRegistry } from "../core/component-instance-registry.js";
import { DomContextHostResolver } from "../rendering/dom-context/dom-context-host-resolver.js";
import { ExpressionParserService } from "../rendering/expression-parser/expression-parser.service.js";
import { ASTEvaluator } from "../rendering/expression-parser/evaluators/ast.evaluator.js";
import { SafeMethodValidator } from "../rendering/expression-parser/safe-methods.js";
import { ExpressionResolver } from "../rendering/bindings/expression-resolver.js";
import { PropertyExtractor } from "../rendering/bindings/property-extractor.js";
import { ManagedElementResolver } from "../rendering/managed-host/managed-element-resolver.js";
import { ManagedElementRegistry } from "../rendering/managed-host/managed-element-registry.js";
import { OutletResolver } from "../rendering/managed-host/outlet-resolver.js";
import { HostStyleMigrator } from "../rendering/managed-host/host-style-migrator.js";
import { TransparentHostFactory } from "../rendering/managed-host/transparent-host.factory.js";
import { BindingResolver } from "../rendering/bindings/binding-resolver.js";
import { ErrorRenderer } from "../rendering/pipeline/error-renderer.js";
import { TemplateCompiler } from "../rendering/templates/template-compiler.js";
import { TemplateAnalyzer } from "../rendering/templates/template-analyzer.js";
import { TemplateCompilationCache } from "../rendering/templates/template-compilation-cache.js";
import { RenderPipeline } from "../rendering/pipeline/render-pipeline.js";
import { DomContextFactory } from "../rendering/dom-context/dom-context-factory.js";
import { TemplateProviderFactory } from "../rendering/templates/template-provider.factory.js";
import { RenderEngine } from "../rendering/render-engine.js";
import { PickElementFactory } from "../registration/pick-element-factory.js";
import { PickElementRegistrar } from "../registration/pick-element-registrar.js";
import { DefaultPickComponentFactory } from "../decorators/pick/pick-component-factory.js";
import { DefaultListenerMetadataRegistry } from "../decorators/listen/listener-metadata-registry.js";
import { DefaultListenerInitializer } from "../decorators/listen/listener-initializer.js";
import { DependencyTracker } from "../reactive/dependency-tracker.js";
import { WeakRefObjectRegistry } from "../utils/object-registry.js";
import { BrowserNavigationService } from "../components/pick-router/navigation.js";
import { SharedStylesRegistry } from "../rendering/styles/shared-styles-registry.js";

/**
 * Map of service token overrides.
 * Each key is a service token (string), each value is a factory function or instance
 * that replaces the framework default for that token.
 */
export type FrameworkOverrides = Record<string, (() => unknown) | unknown>;

/**
 * Defines the decorator mode for the framework.
 *
 * - `'auto'`: Both TC39 Stage 3 and `experimentalDecorators` decorator
 *   contexts are accepted. This is the default so consumer projects do not need
 *   to change their TypeScript/Vite decorator configuration.
 * - `'strict'`: Only TC39 Stage 3 decorators are accepted. Using an
 *   `experimentalDecorators` context throws an error at decoration time.
 *   Use this only when a project intentionally wants to accept TC39-only emit.
 */
export type DecoratorMode = "strict" | "auto";

/**
 * Configuration options for `bootstrapFramework`.
 */
export interface BootstrapOptions {
  /**
   * Controls which decorator system is accepted at runtime.
   * Defaults to `'auto'` (TC39 Stage 3 and `experimentalDecorators`).
   */
  readonly decorators?: DecoratorMode;
}

/**
 * Registers all framework services in the given registry.
 *
 * @description
 * Centralised composition root for the Pick Components framework.
 * Every concrete instantiation lives here — the rest of the codebase
 * depends only on abstractions resolved through the registry.
 *
 * @param registry - Service registry to populate
 * @param overrides - Optional map of service overrides. Tokens present here
 *                    replace the framework default — the default is never registered.
 * @param options - Optional framework configuration options.
 * @throws Error if registry is null or undefined
 *
 * @example
 * ```typescript
 * // Default bootstrap
 * await bootstrapFramework(Services);
 *
 * // With SSR adapter override
 * await bootstrapFramework(Services, {
 *   'IDomAdapter': () => new SSRDomAdapter()
 * });
 *
 * // Strict mode — accept TC39 standard decorators only
 * await bootstrapFramework(Services, {}, { decorators: 'strict' });
 * ```
 */
export async function bootstrapFramework(
  registry: IServiceRegistry,
  overrides: FrameworkOverrides = {},
  options: BootstrapOptions = {},
): Promise<void> {
  if (!registry) throw new Error("Service registry is required");

  const decoratorMode: DecoratorMode = options.decorators ?? "auto";

  const register = <T>(token: string, defaultFactory: () => T): void => {
    if (token in overrides) {
      registry.register(token, overrides[token] as T | (() => T));
      return;
    }
    if (!registry.has(token)) {
      registry.register(token, defaultFactory);
    }
  };

  register("IDecoratorMode", () => decoratorMode);

  // DOM
  register("IDomAdapter", () => new BrowserDomAdapter());

  // Reactivity
  register("IDependencyTracker", () => new DependencyTracker());

  // Object Registry
  register("IObjectRegistry", () => new WeakRefObjectRegistry());

  // Safe method validation (security boundary)
  register("ISafeMethodValidator", () => new SafeMethodValidator());

  // Navigation
  register("INavigationService", () => new BrowserNavigationService());

  // Shared styles (adoptedStyleSheets across all Shadow Roots)
  register("ISharedStylesRegistry", () => new SharedStylesRegistry());

  // Skeleton
  register("ISkeletonValidator", () => new SkeletonValidator());
  register(
    "ISkeletonRenderer",
    () =>
      new SkeletonRenderer(
        registry.get("IDomAdapter"),
        registry.get("ISkeletonValidator"),
        registry.get("IExpressionResolver"),
      ),
  );

  // Metadata & instances
  register("IComponentMetadataRegistry", () => new ComponentMetadataRegistry());
  register("IComponentInstanceRegistry", () => new ComponentInstanceRegistry());

  // Host resolution
  register("IHostResolver", () => new DomContextHostResolver());

  // Expression parsing
  register("IExpressionParser", () => new ExpressionParserService());
  register(
    "IEvaluator",
    () => new ASTEvaluator(registry.get("ISafeMethodValidator")),
  );

  // Bindings
  register(
    "IExpressionResolver",
    () =>
      new ExpressionResolver(
        registry.get("IExpressionParser"),
        registry.get("IEvaluator"),
      ),
  );
  register(
    "IPropertyExtractor",
    () => new PropertyExtractor(registry.get("IExpressionParser")),
  );
  register("IManagedElementRegistry", () => ManagedElementRegistry);
  register("IOutletResolver", () => new OutletResolver());
  register("IHostStyleMigrator", () => new HostStyleMigrator());
  register("ITransparentHostFactory", () => new TransparentHostFactory());
  register(
    "IManagedElementResolver",
    () => new ManagedElementResolver(registry.get("IManagedElementRegistry")),
  );
  register(
    "IBindingResolver",
    () =>
      new BindingResolver(
        registry.get("IExpressionResolver"),
        registry.get("IPropertyExtractor"),
        registry.get("IManagedElementResolver"),
        registry.get("IDependencyTracker"),
        registry.get("IObjectRegistry"),
      ),
  );

  // Templates
  register(
    "IErrorRenderer",
    () =>
      new ErrorRenderer(
        registry.get("IDomAdapter"),
        registry.get("IExpressionResolver"),
      ),
  );
  register(
    "ITemplateCompiler",
    () =>
      new TemplateCompiler(
        registry.get("IDomAdapter"),
        registry.get("IBindingResolver"),
        registry.get("IComponentMetadataRegistry"),
        registry.get("IManagedElementRegistry"),
      ),
  );
  register("ITemplateAnalyzer", () => new TemplateAnalyzer());
  register("ITemplateCompilationCache", () => new TemplateCompilationCache());

  // Pipeline
  register(
    "IRenderPipeline",
    () =>
      new RenderPipeline(
        registry.get("IHostResolver"),
        registry.get("ITemplateCompiler"),
        registry.get("IErrorRenderer"),
        registry.get("IOutletResolver"),
        registry.get("IHostStyleMigrator"),
        registry.get("IManagedElementRegistry"),
        registry.get("IListenerInitializer"),
        registry.get("ISharedStylesRegistry"),
      ),
  );

  // DOM Context
  register(
    "IDomContextFactory",
    () => new DomContextFactory(registry.get("ITransparentHostFactory")),
  );

  // Template Provider
  register("ITemplateProvider", () =>
    TemplateProviderFactory.createDefault(
      registry.get("IComponentMetadataRegistry"),
    ),
  );

  // Render Engine
  register(
    "IRenderEngine",
    () =>
      new RenderEngine(
        registry.get("ISkeletonRenderer"),
        registry.get("IErrorRenderer"),
        registry.get("IRenderPipeline"),
        registry.get("IDomContextFactory"),
        registry.get("ITemplateCompilationCache"),
        registry.get("ITemplateAnalyzer"),
        registry.get("ITemplateProvider"),
        registry.get("IComponentInstanceRegistry"),
        registry.get("IComponentMetadataRegistry"),
      ),
  );

  // Pick Component class factory (@Pick decorator)
  register("IPickComponentFactory", () => new DefaultPickComponentFactory());

  // Listener metadata registry (@Listen decorator)
  register(
    "IListenerMetadataRegistry",
    () => new DefaultListenerMetadataRegistry(),
  );
  register("IListenerInitializer", () => new DefaultListenerInitializer());

  // Pick Element infrastructure
  register("IPickElementFactory", () => new PickElementFactory(registry));
  register(
    "IPickElementRegistrar",
    () =>
      new PickElementRegistrar(registry, registry.get("IPickElementFactory")),
  );

  // Framework custom elements (dynamic imports avoid HTMLElement in Node)
  if (typeof customElements !== "undefined") {
    const [
      { PickForElement },
      { PickActionElement },
      { PickLinkElement },
      { PickRouterElement },
      { PickSelectElement },
    ] = await Promise.all([
      import("../components/pick-for/pick-for-element.js"),
      import("../components/pick-action/pick-action-element.js"),
      import("../components/pick-link/pick-link-element.js"),
      import("../components/pick-router/pick-router-element.js"),
      import("../components/pick-select/pick-select-element.js"),
    ]);

    const behaviors: Array<[string, CustomElementConstructor]> = [
      ["pick-for", PickForElement],
      ["pick-action", PickActionElement],
      ["pick-link", PickLinkElement],
      ["pick-router", PickRouterElement],
    ];

    for (const [tag, elementClass] of behaviors) {
      if (!customElements.get(tag)) {
        customElements.define(tag, elementClass);
      }
    }

    if (!customElements.get("pick-select")) {
      customElements.define("pick-select", PickSelectElement);
    }
  }
}
