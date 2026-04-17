import { PickRender as PickComponentDecorator } from "./pick-render.decorator.js";
import type { InlineContext } from "./pick/types.js";
import type { IPickComponentFactory } from "./pick/pick-component-factory.interface.js";
import { Services } from "../providers/service-provider.js";

function getRequiredDecoratorService<T>(token: string): T {
  if (!Services.has(token)) {
    throw new Error(
      `[Pick] Framework services are not available. ` +
        `Call bootstrapFramework(Services) before importing or defining components ` +
        `that use @Pick. Missing service: '${token}'.`,
    );
  }

  return Services.get<T>(token);
}

/**
 * Implements the responsibility of providing a functional decorator for Pick Components.
 *
 * @template TState - Type of component state (from `ctx.state()`)
 * @param selector - Custom element tag name (e.g., "my-counter")
 * @param setup - Setup function receiving `InlineContext`
 * @returns Class decorator that transforms the target into a PickComponent
 *
 * @example
 * ```typescript
 * @Pick('hello-world', (ctx) => {
 *   ctx.state({ name: 'World' });
 *   ctx.html('<p>Hello {{name}}!</p>');
 * })
 * class HelloWorld {}
 * ```
 */
export function Pick<TState = unknown>(
  selector: string,
  setup: (ctx: InlineContext<TState>) => void,
): ClassDecorator {
  if (!selector) throw new Error("selector is required");
  if (!setup) throw new Error("setup is required");

  const decorator = ((target: unknown) => {
    const factory = getRequiredDecoratorService<IPickComponentFactory>(
      "IPickComponentFactory",
    );
    const config = factory.captureConfig(setup);
    const EnhancedClass = factory.createEnhancedClass(target, config);
    const InitializerClass = factory.createInitializerClass(config);
    const LifecycleClass = factory.createLifecycleClass(config);

    const ComponentDecorator = PickComponentDecorator({
      selector,
      template: config.template || "",
      skeleton: config.skeleton,
      errorTemplate: config.errorTemplate,
      styles: config.styles,
      initializer: InitializerClass ? () => new InitializerClass() : undefined,
      lifecycle: LifecycleClass ? () => new LifecycleClass() : undefined,
    });

    return ComponentDecorator(EnhancedClass);
  }) as ClassDecorator;

  return decorator;
}
