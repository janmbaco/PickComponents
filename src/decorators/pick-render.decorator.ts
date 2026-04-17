import { Services } from "../providers/service-provider.js";
import type { IComponentMetadataRegistry } from "../core/component-metadata-registry.interface.js";
import type { IPickElementRegistrar } from "../registration/pick-element-registrar.interface.js";
import type { PickElementOptions } from "../registration/pick-element-factory.js";
import type { ComponentMetadata } from "../core/component-metadata.js";
import type { PickComponent } from "../core/pick-component.js";

/**
 * Defines the configuration for a PickComponent decorator.
 * Derived from ComponentMetadata — all fields are optional at decoration time.
 */
export type ComponentConfig = Partial<ComponentMetadata>;

function getRequiredDecoratorService<T>(token: string): T {
  if (!Services.has(token)) {
    throw new Error(
      `[PickRender] Framework services are not available. ` +
        `Call bootstrapFramework(Services) before importing or defining components ` +
        `that use @PickRender. Missing service: '${token}'.`,
    );
  }

  return Services.get<T>(token);
}

/**
 * @PickRender decorator - Marks a class as a PickComponent with declarative configuration.
 *
 * @param config - Component configuration (selector, template, lifecycle, etc.)
 * @throws Error if config is null or undefined
 *
 * @example
 * ```typescript
 * @PickRender({
 *   selector: 'todo-app',
 *   template: '<div>{{count}}</div>',
 *   initializer: () => new TodoAppInitializer(Services.get(ApiService)),
 *   lifecycle: () => new TodoAppLifecycle(Services.get(EventBus))
 * })
 * class TodoApp extends PickComponent {
 *   @Reactive count = 0;
 * }
 * ```
 */
export function PickRender(config: ComponentConfig): ClassDecorator {
  if (!config) throw new Error("Config is required");

  return (target) => {
    if (config.selector) {
      const metadata: ComponentMetadata = {
        ...config,
        selector: config.selector,
        template: config.template || "",
      };

      getRequiredDecoratorService<IComponentMetadataRegistry>(
        "IComponentMetadataRegistry",
      ).register(config.selector, metadata);

      const options: PickElementOptions<PickComponent> = {
        initializer: config.initializer,
        lifecycle: config.lifecycle,
      };

      getRequiredDecoratorService<IPickElementRegistrar>(
        "IPickElementRegistrar",
      ).register(
        config.selector,
        target as unknown as new (...args: unknown[]) => PickComponent,
        options,
      );
    }

    return target;
  };
}
