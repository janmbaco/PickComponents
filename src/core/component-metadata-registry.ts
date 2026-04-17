import { ComponentMetadata } from "./component-metadata.js";
import type { IComponentMetadataRegistry } from "./component-metadata-registry.interface.js";

/**
 * Exports ComponentMetadata for use in test files and components
 */
export type { ComponentMetadata };

/**
 * Implements the responsibility of storing and retrieving component metadata.
 *
 * @description
 * Instanciable registry for component metadata indexed by selector (tag name).
 * Registered in the service container under `'IComponentMetadataRegistry'` by `bootstrapFramework`.
 *
 * @example
 * ```typescript
 * // Register metadata
 * const registry = new ComponentMetadataRegistry();
 * registry.register('my-counter', {
 *   selector: 'my-counter',
 *   template: '<div>{{count}}</div>'
 * });
 *
 * // Retrieve metadata
 * const metadata = registry.get('my-counter');
 *
 * // Check existence
 * if (registry.has('my-counter')) {
 *   // ...
 * }
 *
 * // Clear for testing
 * registry.clear();
 * ```
 */
export class ComponentMetadataRegistry implements IComponentMetadataRegistry {
  private readonly metadata = new Map<string, ComponentMetadata>();

  /**
   * Registers component metadata in the registry.
   *
   * @param componentId - Component selector (tag name)
   * @param metadata - Component metadata
   * @throws Error if componentId or metadata is null or undefined
   * @throws Error if componentId is already registered
   *
   * @example
   * ```typescript
   * registry.register('my-counter', {
   *   selector: 'my-counter',
   *   template: '<div>Count: {{count}}</div>'
   * });
   * ```
   */
  register(componentId: string, metadata: ComponentMetadata): void {
    if (!componentId) throw new Error("ComponentId is required");
    if (!metadata) throw new Error("Metadata is required");

    if (this.metadata.has(componentId)) {
      throw new Error(`Component ${componentId} is already registered`);
    }

    this.metadata.set(componentId, metadata);
  }

  /**
   * Retrieves component metadata from the registry.
   *
   * @param componentId - Component selector (tag name)
   * @returns Component metadata or undefined if not found
   * @throws Error if componentId is null or undefined
   *
   * @example
   * ```typescript
   * const metadata = registry.get('my-counter');
   * if (metadata) {
   *   console.log(metadata.template);
   * }
   * ```
   */
  get(componentId: string): ComponentMetadata | undefined {
    if (!componentId) throw new Error("ComponentId is required");
    return this.metadata.get(componentId);
  }

  /**
   * Checks if component metadata exists in the registry.
   *
   * @param componentId - Component selector (tag name)
   * @returns true if metadata exists, false otherwise
   * @throws Error if componentId is null or undefined
   *
   * @example
   * ```typescript
   * if (registry.has('my-counter')) {
   *   // Component is registered
   * }
   * ```
   */
  has(componentId: string): boolean {
    if (!componentId) throw new Error("ComponentId is required");
    return this.metadata.has(componentId);
  }

  /**
   * Clears all registered metadata.
   *
   * @description
   * Used for testing to ensure test isolation.
   *
   * @example
   * ```typescript
   * afterEach(() => {
   *   registry.clear();
   * });
   * ```
   */
  clear(): void {
    this.metadata.clear();
  }
}
