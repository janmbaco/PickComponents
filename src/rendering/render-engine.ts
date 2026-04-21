import { PickComponent } from "../core/pick-component.js";
import type { PickInitializer } from "../behaviors/pick-initializer.js";
import type { ComponentMetadata } from "../core/component-metadata.js";
import type { IComponentMetadataRegistry } from "../core/component-metadata-registry.interface.js";
import { IComponentInstanceRegistry } from "../core/component-instance-registry.js";
import { ISkeletonRenderer } from "./skeleton/skeleton-renderer.js";
import { IRenderPipeline } from "./pipeline/render-pipeline.interface.js";
import { IDomContextFactory } from "./dom-context/dom-context-factory.js";
import { ITemplateAnalyzer } from "./templates/template-analyzer.js";
import { ITemplateProvider } from "./templates/template-provider.js";
import type { TemplateCompilationCache } from "./templates/template-compilation-cache.js";
import { getRestrictiveParentElement } from "./dom/restrictive-html-context.js";
import { ensureReactiveProperties } from "../decorators/reactive.decorator.js";
import type { IErrorRenderer } from "./pipeline/error-renderer.js";
import {
  DefaultPrerenderAdoptionDecider,
  type ClientRenderMode,
  type IPrerenderAdoptionDecider,
  type PickRootMode,
  type PrerenderAdoptionCandidate,
  type PrerenderAdoptionDecision,
} from "../ssr/prerender-manifest.js";

export interface ClientBootOptions {
  /** Client first-render strategy. Defaults to replace. */
  mode?: ClientRenderMode;
  /** Parsed prerender metadata for an existing DOM root, when available. */
  prerenderCandidate?: PrerenderAdoptionCandidate | null;
  /** Expected DOM root mode for the prerendered markup. Defaults to shadow. */
  rootMode?: PickRootMode;
  /** Log adoption fallback reasons to the console. */
  debug?: boolean;
}

/**
 * Defines the responsibility of configuring render operations for Pick Components.
 *
 * @template T - The PickComponent type being rendered
 *
 * @example
 * ```typescript
 * const options: RenderOptions<MyComponent> = {
 *   componentId: 'my-component',
 *   component: new MyComponent(),
 *   targetRoot: document.body
 * };
 * ```
 */
export interface RenderOptions<T extends PickComponent> {
  /** Component ID (selector) for metadata lookup */
  componentId: string;
  /** The component instance to render */
  component: T;
  /** Target DOM root (HTMLElement or ShadowRoot) */
  targetRoot: HTMLElement | ShadowRoot;
  /** The custom element itself (for host projection content) */
  hostElement?: HTMLElement;
  /** Optional first-boot strategy for prerendered HTML. */
  boot?: ClientBootOptions;
}

/**
 * Defines the responsibility of representing the outcome of a component render operation.
 *
 * @template T - The PickComponent type that was rendered
 *
 * @example
 * ```typescript
 * const result: RenderResult<MyComponent> = {
 *   component: myComponent,
 *   domContext: domContext,
 *   lifecycleManager: lifecycleManager,
 *   cleanup: () => {}
 * };
 * ```
 */
export interface RenderResult {
  /** Cleanup function to destroy component and remove from DOM */
  cleanup: () => void;
  /** Event target that should receive delegated pick-action listeners */
  eventTarget?: EventTarget;
}

/**
 * Defines the responsibility of rendering Pick Components and HTML fragments.
 *
 * @example
 * ```typescript
 * const renderEngine: IRenderEngine = new RenderEngine(
 *   skeletonRenderer,
 *   renderPipeline,
 *   fragmentRenderer,
 *   domContextFactory
 * );
 * ```
 */
export interface IRenderEngine {
  render<T extends PickComponent>(
    options: RenderOptions<T>,
  ): Promise<RenderResult>;
}

/**
 * Implements the responsibility of orchestrating the complete rendering lifecycle of Pick Components.
 *
 * @description
 * The RenderEngine is the core rendering system that transforms Pick Components into
 * interactive DOM elements. It manages the entire lifecycle from skeleton display
 * through initialization, template compilation, reactive binding, and cleanup.
 *
 * Now uses composition with specialized modules for each responsibility.
 *
 * @architecture
 * **Rendering Pipeline (6 Steps):**
 *
 * 1. **Skeleton Display** - Show loading state immediately (synchronous)
 * 2. **Initializer Check** - Detect if component requires async initialization
 * 3. **Initialize & Wait** - Run initializer.initialize() and await completion
 * 4. **Template Preparation** - Resolve [[RULES.*]] and analyze/cache the final template
 * 5. **Template Compilation** - Parse template, bind reactive state with {{bindings}}
 * 6. **Lifecycle Start** - Begin lifecycle manager event listeners
 *
 * **Reactive Binding System:**
 * - Scans template for {{propertyName}} expressions
 * - Creates state$.subscribe() for each binding
 * - Updates DOM automatically when component.setState() is called
 * - Subscriptions managed by DomContext, cleaned up on destroy
 *
 * **Skeleton Strategy:**
 * - Metadata: metadata.skeleton property from @PickRender decorator
 * - Fallback: Default skeleton with animated dots
 *
 * @example
 * ```typescript
 * // RenderEngine is called automatically by @PickRender decorator
 * @PickRender({
 *   selector: 'my-counter',
 *   template: `<div>Count: {{count}}</div>
 *              <button @click="increment">+</button>`,
 *   initializer: CounterInitializer,
 *   lifecycle: CounterLifecycle
 * })
 * class Counter extends PickComponent {
 *   @Reactive count = 0;
 *
 *   increment() {
 *     this.count++; // Auto-triggers state$.next() → DOM update
 *   }
 * }
 *
 * // Manual render (advanced):
 * const renderEngine = new RenderEngine();
 * const result = await renderEngine.render({
 *   component: new Counter(),
 *   componentCtor: Counter,
 *   tagName: 'my-counter',
 *   targetRoot: shadowRoot
 * });
 *
 * result.cleanup(); // Destroys component, removes DOM, cleans subscriptions
 * ```
 *
 * @remarks
 * - render() returns immediately with skeleton, completes asynchronously
 * - Template must be provided via @PickRender decorator metadata
 * - Error handling shows error overlay on skeleton
 * - All subscriptions automatically cleaned up on component destroy
 * - RenderEngine requires IServiceProvider for dependency resolution
 */
export class RenderEngine implements IRenderEngine {
  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  /**
   * Creates a new RenderEngine instance with injected dependencies
   *
   * @param skeletonRenderer - Module for skeleton rendering
   * @param renderPipeline - Module for executing render pipeline
   * @param domContextFactory - Factory for creating DOM contexts
   * @param templateCache - Optional template compilation cache
   * @param templateAnalyzer - Optional template analyzer
   * @throws Error if any required dependency is null or undefined
   *
   * @example
   * ```typescript
   * // Resolve from container (recommended)
   * const renderEngine = registry.get<IRenderEngine>('IRenderEngine');
   *
   * // Manual construction (advanced — all params required)
   * const renderEngine = new RenderEngine(
   *   skeletonRenderer,
   *   renderPipeline,
   *   domContextFactory,
   *   templateCache,
   *   templateAnalyzer,
   *   templateProvider,
   *   instanceRegistry,
   *   metadataSource
   * );
   * ```
   */
  constructor(
    private readonly skeletonRenderer: ISkeletonRenderer,
    private readonly errorRenderer: IErrorRenderer,
    private readonly renderPipeline: IRenderPipeline,
    private readonly domContextFactory: IDomContextFactory,
    private readonly templateCache: TemplateCompilationCache,
    private readonly templateAnalyzer: ITemplateAnalyzer,
    private readonly templateProvider: ITemplateProvider,
    private readonly instanceRegistry: IComponentInstanceRegistry,
    private readonly metadataSource: IComponentMetadataRegistry,
    private readonly prerenderAdoptionDecider: IPrerenderAdoptionDecider = new DefaultPrerenderAdoptionDecider(),
  ) {
    if (!skeletonRenderer) throw new Error("SkeletonRenderer is required");
    if (!errorRenderer) throw new Error("ErrorRenderer is required");
    if (!renderPipeline) throw new Error("RenderPipeline is required");
    if (!domContextFactory) throw new Error("DomContextFactory is required");
    if (!templateCache) throw new Error("TemplateCompilationCache is required");
    if (!templateAnalyzer) throw new Error("TemplateAnalyzer is required");
    if (!templateProvider) throw new Error("TemplateProvider is required");
    if (!instanceRegistry) throw new Error("InstanceRegistry is required");
    if (!metadataSource) throw new Error("MetadataSource is required");
    if (!prerenderAdoptionDecider) {
      throw new Error("PrerenderAdoptionDecider is required");
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Renders a PickComponent with full lifecycle support
   *
   * @description
   * Main entry point for rendering a component. Looks up metadata from registry,
   * manages component instance lifecycle (1:1 with DomContext),
   * and executes the render pipeline.
   *
   * @template T - The PickComponent type being rendered
   * @param options - Render configuration options
   * @returns Promise<RenderResult> - Cleanup function for this render context
   * @throws Error if component metadata not found or rendering fails
   *
   * @example
   * ```typescript
   * const renderEngine = new RenderEngine();
   * const result = await renderEngine.render({
   *   componentId: 'my-component',
   *   component: myComponent,
   *   targetRoot: document.getElementById('app')!
   * });
   *
   * result.cleanup(); // Full cleanup
   * ```
   */
  async render<T extends PickComponent>(
    options: RenderOptions<T>,
  ): Promise<RenderResult> {
    let domContext:
      | ReturnType<IDomContextFactory["create"]>
      | ReturnType<NonNullable<IDomContextFactory["createAnchored"]>>
      | null = null;
    const metadata = this.metadataSource.get(options.componentId);
    let instance: T | null = null;

    // 1. Lookup metadata
    if (!metadata) {
      throw new Error(
        `Component ${options.componentId} not registered in metadata registry`,
      );
    }

    // 2. Create unique DOM context
    const restrictiveParent = options.hostElement
      ? getRestrictiveParentElement(options.hostElement)
      : null;
    domContext =
      restrictiveParent &&
      typeof this.domContextFactory.createAnchored === "function"
        ? this.domContextFactory.createAnchored(
            restrictiveParent,
            options.hostElement!,
          )
        : this.domContextFactory.create(options.targetRoot);

    // 3. Get or create component instance (1:1 per contextId)
    const entry = this.instanceRegistry.getOrCreate<T>(
      domContext.contextId,
      () => options.component,
      metadata,
    );
    instance = entry.instance;
    ensureReactiveProperties(instance);

    try {
      const wantsAdoption = options.boot?.mode === "adopt";

      if (!wantsAdoption) {
        // 4. Inject component styles into Shadow Root before skeleton so skeleton
        // content can use component CSS classes and custom properties.
        const skeletonTargetRoot = domContext.getTargetRoot();
        if (
          metadata.styles &&
          typeof ShadowRoot !== "undefined" &&
          skeletonTargetRoot instanceof ShadowRoot
        ) {
          const styleEl =
            skeletonTargetRoot.ownerDocument.createElement("style");
          styleEl.setAttribute("data-skeleton-styles", "true");
          styleEl.textContent = metadata.styles;
          skeletonTargetRoot.prepend(styleEl);
        }

        // 5. Render skeleton before the main template is compiled.
        await this.skeletonRenderer.render(instance, metadata, domContext);
      }

      // 5. Initialize component state BEFORE resolving [[RULES.*]].
      const wasInitialized = await this.initializeComponent(
        instance,
        metadata,
        domContext,
      );
      if (!wasInitialized) {
        return this.wrapCleanup(
          {
            eventTarget: domContext.getElement() ?? undefined,
            cleanup: () => {
              domContext.destroy();
            },
          },
          domContext.contextId,
        );
      }

      // 6. Resolve [[RULES.field]] bindings AFTER initializer hydration.
      const resolvedTemplate = await this.templateProvider.getSource(instance, {
        ...options,
        component: instance,
      });

      // 7. Get or compile template
      const compiledTemplate = this.templateCache.getOrCompile(
        options.componentId,
        resolvedTemplate,
        this.templateAnalyzer,
      );
      const adoptionDecision = wantsAdoption
        ? this.prerenderAdoptionDecider.decide({
            candidate: options.boot?.prerenderCandidate ?? null,
            metadata,
            templateSource: resolvedTemplate,
            expectedRootMode: options.boot?.rootMode ?? "shadow",
          })
        : null;

      if (
        adoptionDecision &&
        adoptionDecision.mode === "replace" &&
        options.boot?.debug
      ) {
        console.debug(
          `[Pick Components] Prerender adoption skipped for <${metadata.selector}>: ${adoptionDecision.reason}`,
        );
      }

      // 8. Execute pipeline
      const result = await this.renderPipeline.execute(
        {
          component: instance,
          metadata,
          domContext,
          compiledTemplate,
          hostElement: options.hostElement,
          renderMode: adoptionDecision?.mode ?? "replace",
          adoptedElement: this.resolveAdoptedElement(adoptionDecision),
        },
        domContext,
      );

      return this.wrapCleanup(result, domContext.contextId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Render engine failed";

      if (domContext && metadata && instance) {
        await this.errorRenderer.render(domContext, errorMessage, {
          errorTemplate: metadata.errorTemplate,
          component: instance,
        });
        return this.wrapCleanup(
          {
            eventTarget: domContext.getElement() ?? undefined,
            cleanup: () => {
              domContext.destroy();
            },
          },
          domContext.contextId,
        );
      }

      throw error;
    }
  }

  private async initializeComponent<T extends PickComponent>(
    component: T,
    metadata: ComponentMetadata,
    domContext: ReturnType<IDomContextFactory["create"]>,
  ): Promise<boolean> {
    const initializerFactory = metadata.initializer;
    if (!initializerFactory) {
      return true;
    }

    const initializerInstance = initializerFactory() as PickInitializer<T>;
    const success = await initializerInstance.initialize(component);

    if (!success) {
      const errorMsg = "Component initialization failed";
      await this.errorRenderer.render(domContext, errorMsg, {
        errorTemplate: metadata.errorTemplate,
        component,
      });
    }

    return success;
  }

  private wrapCleanup(result: RenderResult, contextId: string): RenderResult {
    const originalCleanup = result.cleanup;
    return {
      ...result,
      cleanup: () => {
        originalCleanup();
        this.instanceRegistry.release(contextId);
      },
    };
  }

  private resolveAdoptedElement(
    decision: PrerenderAdoptionDecision | null,
  ): HTMLElement | null {
    if (decision?.mode !== "adopt") {
      return null;
    }

    return decision.candidate?.rootElement ?? null;
  }
}
