import type { PickInitializer } from "../behaviors/pick-initializer.js";
import type { PickLifecycleManager } from "../behaviors/pick-lifecycle-manager.js";

/**
 * Factory function that creates an initializer instance.
 */
export type InitializerFactory = () => PickInitializer<unknown>;

/**
 * Factory function that creates a lifecycle manager instance.
 */
export type LifecycleFactory = () => PickLifecycleManager<unknown>;

/**
 * Defines the responsibility of storing component rendering metadata.
 *
 * @description
 * Decouples metadata from constructor, enabling component reuse across contexts
 * and centralized metadata management via registry.
 *
 * @example
 * ```typescript
 * const metadata: ComponentMetadata = {
 *   selector: 'my-counter',
 *   template: '<div>{{count}}</div>',
 *   styles: ':host { display: block; } .container { color: red; }'
 * };
 * ```
 */
export interface ComponentMetadata {
  /** Component tag name */
  selector: string;

  /** HTML template string */
  template: string;

  /** Skeleton template when provided */
  skeleton?: string;

  /** Error template when provided */
  errorTemplate?: string;

  /** Component styles (CSS) */
  styles?: string;

  /** Factory function that creates the component initializer */
  initializer?: InitializerFactory;

  /** Factory function that creates the lifecycle manager */
  lifecycle?: LifecycleFactory;
}
