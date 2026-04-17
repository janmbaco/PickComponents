import { PickComponent } from "./pick-component.js";
import { ComponentMetadata } from "./component-metadata.js";

/**
 * Defines the responsibility of storing component instance state.
 *
 * @template T - The PickComponent type
 *
 * @description
 * Tracks a single component instance in 1:1 relationship with its host element.
 * Each custom element has its own component instance.
 */
export interface ComponentInstanceEntry<
  T extends PickComponent = PickComponent,
> {
  /** The component instance */
  instance: T;

  /** Metadata for rendering */
  metadata: ComponentMetadata;

  /** Initialization promise (null if not async or completed) */
  initPromise: Promise<boolean> | null;

  /** DOM context ID for this instance */
  contextId: string;
}

/**
 * Defines the responsibility of managing component instance lifetimes.
 *
 * @description
 * Maps contextIds to component instances (1:1 per host element).
 * Injected into RenderEngine — one registry per engine instance.
 */
export interface IComponentInstanceRegistry {
  /**
   * Gets an existing instance for the context, or creates one via factory.
   *
   * @param contextId - Unique DOM context identifier
   * @param factory - Factory function called only when no instance exists for the context
   * @param metadata - Component metadata
   * @returns Component instance entry
   * @throws Error if any parameter is null or undefined
   */
  getOrCreate<T extends PickComponent>(
    contextId: string,
    factory: () => T,
    metadata: ComponentMetadata,
  ): ComponentInstanceEntry<T>;

  /**
   * Destroys the instance for the given context and removes it from the registry.
   *
   * @param contextId - DOM context identifier
   * @throws Error if contextId is null or undefined
   */
  release(contextId: string): void;
}

/**
 * Implements the responsibility of managing component instances in 1:1 relationship with hosts.
 *
 * @description
 * Each custom element host creates its own component instance.
 * Registry tracks instances by contextId for lifecycle management.
 *
 * @example
 * ```typescript
 * const registry = new ComponentInstanceRegistry();
 *
 * const entry = registry.getOrCreate(
 *   'context-1',
 *   () => new UserBadge(),
 *   metadata
 * );
 *
 * registry.release('context-1');
 * ```
 */
export class ComponentInstanceRegistry implements IComponentInstanceRegistry {
  private readonly instances = new Map<string, ComponentInstanceEntry>();

  /**
   * Gets an existing instance for the context, or creates one via factory.
   *
   * @param contextId - Unique DOM context identifier
   * @param factory - Factory called only when no instance exists for this context
   * @param metadata - Component metadata
   * @returns Component instance entry
   * @throws Error if any parameter is null or undefined
   *
   * @example
   * ```typescript
   * const entry = registry.getOrCreate(
   *   'dom-ctx-1',
   *   () => new Counter(),
   *   metadata
   * );
   * ```
   */
  getOrCreate<T extends PickComponent>(
    contextId: string,
    factory: () => T,
    metadata: ComponentMetadata,
  ): ComponentInstanceEntry<T> {
    if (!contextId) throw new Error("ContextId is required");
    if (!factory) throw new Error("Factory is required");
    if (!metadata) throw new Error("Metadata is required");

    const existing = this.instances.get(contextId);
    if (existing) {
      return existing as ComponentInstanceEntry<T>;
    }

    const entry: ComponentInstanceEntry<T> = {
      instance: factory(),
      metadata,
      initPromise: null,
      contextId,
    };

    this.instances.set(contextId, entry as ComponentInstanceEntry);
    return entry;
  }

  /**
   * Destroys the instance for the given context and removes it from the registry.
   *
   * @param contextId - DOM context identifier
   * @throws Error if contextId is null or undefined
   *
   * @example
   * ```typescript
   * registry.release('dom-ctx-1');
   * ```
   */
  release(contextId: string): void {
    if (!contextId) throw new Error("ContextId is required");

    const entry = this.instances.get(contextId);
    if (!entry) {
      return;
    }

    if (entry.instance.onDestroy) {
      entry.instance.onDestroy();
    }
    this.instances.delete(contextId);
  }
}
