import { PickComponent } from "../../core/pick-component.js";
import type { PickLifecycleManager } from "../../behaviors/pick-lifecycle-manager.js";
import { RenderResult } from "../render-engine.js";
import {
  IRenderPipeline,
  PipelineOptions,
} from "./render-pipeline.interface.js";
import type { IListenerInitializer } from "../../decorators/listen/listener-initializer.interface.js";
import { ITemplateCompiler } from "../templates/template-compiler.interface.js";
import { IErrorRenderer } from "./error-renderer.js";
import { DomContentType } from "../dom-context/dom-context.interface.js";
import { IOutletResolver, IHostStyleMigrator } from "../managed-host/index.js";
import type { IManagedElementRegistry } from "../managed-host/managed-element-registry.js";
import type { IHostResolver } from "../dom-context/host-resolver.interface.js";
import type { ISharedStylesRegistry } from "../styles/shared-styles-registry.js";

/**
 * Implements the responsibility of orchestrating the complete component rendering pipeline.
 *
 * @description
 * Coordinates the execution of the rendering pipeline steps: template
 * compilation, DOM replacement, and lifecycle management. Acts as the
 * central orchestrator for component rendering after initialization.
 *
 * @architecture
 * Pipeline Steps:
 * 1. Compile template with reactive bindings
 * 2. Replace skeleton with compiled element
 * 3. Start lifecycle manager
 * 4. Handle errors with overlay display
 */
export class RenderPipeline implements IRenderPipeline {
  private readonly outletResolver: IOutletResolver;
  private readonly styleMigrator: IHostStyleMigrator;
  private readonly managedRegistry: IManagedElementRegistry;
  private readonly listenerInitializer: IListenerInitializer;
  private readonly sharedStyles: ISharedStylesRegistry | null;

  /**
   * Creates a RenderPipeline instance
   *
   * @param hostResolver - Host resolver for component-DOM context mapping
   * @param templateCompiler - Compiler for template processing
   * @param errorHandler - Renderer for error display
   * @param outletResolver - Resolver for outlet element lookup
   * @param styleMigrator - Migrator for host styling
   * @param managedRegistry - Registry for managed element tracking
   * @param listenerInitializer - Initializer for event listener bindings
   * @param sharedStyles - Optional shared styles registry for adoptedStyleSheets
   */
  constructor(
    private readonly hostResolver: IHostResolver | null,
    private readonly templateCompiler: ITemplateCompiler,
    private readonly errorHandler: IErrorRenderer,
    outletResolver: IOutletResolver,
    styleMigrator: IHostStyleMigrator,
    managedRegistry: IManagedElementRegistry,
    listenerInitializer: IListenerInitializer,
    sharedStyles: ISharedStylesRegistry | null = null,
  ) {
    if (!templateCompiler) throw new Error("TemplateCompiler is required");
    if (!errorHandler) throw new Error("ErrorHandler is required");
    if (!outletResolver) throw new Error("OutletResolver is required");
    if (!styleMigrator) throw new Error("StyleMigrator is required");
    if (!managedRegistry) throw new Error("ManagedElementRegistry is required");
    if (!listenerInitializer)
      throw new Error("ListenerInitializer is required");

    this.outletResolver = outletResolver;
    this.styleMigrator = styleMigrator;
    this.managedRegistry = managedRegistry;
    this.listenerInitializer = listenerInitializer;
    this.sharedStyles = sharedStyles;
  }

  /**
   * Executes the complete render pipeline for a component
   *
   * @description
   * Runs the post-initialization rendering sequence: compilation, DOM update,
   * and lifecycle setup. Handles errors by showing error overlays.
   *
   * @param options - Pipeline execution options
   * @returns Promise<RenderResult> - Component, DOM context, lifecycle, and cleanup
   *
   * @example
   * ```typescript
   * const result = await pipeline.execute({
   *   component,
   *   metadata,
   *   domContext,
   *   compiledTemplate,
   *   hostElement
   * });
   * // Result includes cleanup function
   * ```
   */
  async execute<T extends PickComponent>(
    options: PipelineOptions<T>,
  ): Promise<RenderResult> {
    const {
      component,
      metadata,
      domContext,
      compiledTemplate,
      hostElement,
      renderMode = "replace",
      adoptedElement = null,
    } = options;

    let lifecycleManager: PickLifecycleManager<T> | null = null;
    let rootElement: HTMLElement | null = null;

    try {
      if (renderMode === "adopt" && adoptedElement) {
        rootElement = adoptedElement;

        if (hostElement) {
          this.managedRegistry.register(hostElement, metadata.selector);
        }

        domContext.adoptElement(rootElement, DomContentType.COMPONENT);
        await this.templateCompiler.adoptExisting(
          compiledTemplate.templateString,
          rootElement,
          component,
          domContext,
          metadata,
        );
        this.managedRegistry.register(rootElement, metadata.selector);
      } else {
        // Compile template to HTML element
        const templateSource = compiledTemplate.templateString;
        const compiledElement = await this.templateCompiler.compile(
          templateSource,
          component,
          domContext,
          metadata,
        );
        rootElement = compiledElement;

        // Apply managed host processing if host element provided
        if (hostElement) {
          // Register host element as managed BEFORE processing
          this.managedRegistry.register(hostElement, metadata.selector);
          this.processManagedHost(compiledElement, hostElement, metadata);
        }

        // Register root element as managed component element
        this.managedRegistry.register(compiledElement, metadata.selector);

        // Register element in DOM context — this also replaces the skeleton in the DOM.
        domContext.setElement(compiledElement, DomContentType.COMPONENT);
      }

      // Apply shared stylesheets via adoptedStyleSheets (Lit pattern)
      const targetRoot = domContext.getTargetRoot();
      if (
        this.sharedStyles &&
        typeof ShadowRoot !== "undefined" &&
        targetRoot instanceof ShadowRoot
      ) {
        this.sharedStyles.applyTo(targetRoot);
      }

      // Inject component styles into the Shadow Root after setElement.
      // Reuse the style element injected before skeleton rendering if present.
      if (metadata.styles) {
        const targetRoot = domContext.getTargetRoot();
        const existing = (targetRoot as Element | ShadowRoot).querySelector?.(
          "style[data-skeleton-styles]",
        );
        if (existing) {
          existing.removeAttribute("data-skeleton-styles");
        } else if (rootElement) {
          const styleEl = rootElement.ownerDocument.createElement("style");
          styleEl.textContent = metadata.styles;
          targetRoot.prepend(styleEl);
        }
      }

      // Initialize event listeners after DOM replacement
      this.listenerInitializer.initialize(domContext, component);

      // Notify component of render completion
      component.onRenderComplete?.();

      // Register component in host resolver before starting lifecycle
      if (this.hostResolver) {
        this.hostResolver.register(component, domContext);
      }

      // Start lifecycle manager if configured
      const lifecycleFactory = metadata.lifecycle;
      if (lifecycleFactory) {
        const lifecycleManagerInstance =
          lifecycleFactory() as PickLifecycleManager<T>;
        lifecycleManagerInstance.startListening(component);
        lifecycleManager = lifecycleManagerInstance;
      }

      return {
        eventTarget: rootElement ?? undefined,
        cleanup: () => {
          // Unregister from host resolver
          if (this.hostResolver) {
            this.hostResolver.unregister(component);
          }

          // Unregister managed elements on cleanup
          if (hostElement) {
            this.managedRegistry.unregister(hostElement);
          }
          if (rootElement) {
            this.managedRegistry.unregister(rootElement);
          }

          if (lifecycleManager) {
            lifecycleManager.stopListening();
            lifecycleManager.dispose();
          }
          domContext.destroy();
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Render pipeline failed";
      console.error("[RenderPipeline] Pipeline failed:", errorMsg, error);
      await this.errorHandler.render(domContext, errorMsg, {
        errorTemplate: metadata.errorTemplate,
        component,
      });

      return {
        eventTarget: domContext.getElement() ?? undefined,
        cleanup: () => {
          domContext.destroy();
        },
      };
    }
  }

  /**
   * Processes a managed host element with PickComponent association.
   *
   * @description
   * Executes the managed host policy for elements rendered by the Pick Components engine:
   * 1. Resolve outlet element (target for styling migration)
   * 2. Migrate class/id from host to outlet
   *
   * @param rootElement - The compiled root element
   * @param hostElement - The managed host element
   * @param metadata - Component metadata for input declarations
   */
  private processManagedHost(
    rootElement: HTMLElement,
    hostElement: HTMLElement,
    _metadata: unknown,
  ): void {
    // Step 1: Resolve outlet element
    const outlet = this.outletResolver.resolve(rootElement);

    // Step 2: Migrate class/id styling from host to outlet
    this.styleMigrator.migrate(hostElement, outlet);
  }
}
