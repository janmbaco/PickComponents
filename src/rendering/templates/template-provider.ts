import { PickComponent } from "../../core/pick-component.js";
import { RenderOptions } from "../render-engine.js";
import type { ValidationRules } from "../../types/interfaces.js";
import type { IComponentMetadataRegistry } from "../../core/component-metadata-registry.interface.js";
import { IRulesResolver } from "../bindings/rules-resolver.interface.js";

/**
 * Implements the responsibility of handling template sourcing and static preprocessing.
 *
 * @description
 * Responsible for retrieving component templates from @PickRender decorator metadata
 * and preprocessing [[RULES.field]] bindings before reactive compilation.
 * Content projection is handled natively by Shadow DOM <slot> elements.
 *
 * @architecture
 * Template Processing Pipeline:
 * 1. Load template from metadata.template (already in bundle)
 * 2. Preprocess [[RULES.field]] bindings (converted to HTML validation attributes)
 * 3. Return preprocessed template for reactive {{binding}} compilation
 */

/**
 * Defines the responsibility of retrieving component templates from metadata and preprocessing.
 *
 * @description
 * Defines the contract for retrieving component templates from metadata and preprocessing
 * validation rules bindings before reactive compilation.
 */
export interface ITemplateProvider {
  /**
   * Retrieves and preprocesses the template source for a component.
   *
   * @param component - The component instance
   * @param options - Render options containing the component selector lookup key
   * @returns Promise resolving to preprocessed template HTML string
   * @throws Error if no template found in component metadata
   */
  getSource(
    component: PickComponent,
    options: RenderOptions<PickComponent>,
  ): Promise<string>;
}

export class TemplateProvider implements ITemplateProvider {
  /**
   * Rules resolver for [[RULES.field]] preprocessing
   */
  private readonly rulesResolver: IRulesResolver;

  /**
   * Read-only metadata source for component metadata lookup
   */
  private readonly metadataSource: IComponentMetadataRegistry | undefined;

  /**
   * Initializes a new instance of TemplateProvider.
   *
   * @param rulesResolver - Resolver for validation rules bindings
   * @param metadataSource - Read-only source for component metadata lookup
   * @throws Error if any dependency is null or undefined
   */
  constructor(
    rulesResolver: IRulesResolver,
    metadataSource?: IComponentMetadataRegistry,
  ) {
    if (!rulesResolver) throw new Error("RulesResolver is required");

    this.rulesResolver = rulesResolver;
    this.metadataSource = metadataSource;
  }

  /**
   * Retrieves and preprocesses the template source for a component
   *
   * @description
   * Gets template HTML from component metadata and resolves validation rules.
   *
   * @param component - Component instance
   * @param options - Render options with hostElement
   * @returns Promise<string> - Template HTML with [[RULES.field]] bindings resolved
   * @throws Error if no template found in metadata
   *
   * @example
   * ```typescript
   * // Component with rules
   * @PickRender({
   *   selector: 'login-form',
   *   template: `
   *     <form>
   *       <input [[RULES.username]] class="form-control" placeholder="Username" />
   *       <input [[RULES.password]] class="form-control" type="password" placeholder="Password" />
   *       <button event="login-submit">Login</button>
   *     </form>
   *   `
   * })
   * class LoginForm extends PickComponent {
   *   rules = {
   *     username: { required: true, minlength: 3 },
   *     password: { required: true, minlength: 8 }
   *   };
   * }
   *
   * // After getSource():
   * // `<form>
   * //    <input required minlength="3" class="form-control" placeholder="Username" />
   * //    <input required minlength="8" class="form-control" type="password" placeholder="Password" />
   * //    <button event="login-submit">Login</button>
   * //  </form>`
   * ```
   */
  async getSource(
    component: PickComponent,
    options: RenderOptions<PickComponent>,
  ): Promise<string> {
    if (!component) throw new Error("Component is required");
    if (!options) throw new Error("Options are required");

    const metadata = this.metadataSource?.get(options.componentId);
    let template = metadata?.template || "<slot></slot>";

    // Resolve [[RULES.field]] bindings using component.rules (duck-typed: only present on form components)
    if (this.hasRules(component) && Object.keys(component.rules).length > 0) {
      template = this.rulesResolver.resolve(
        template,
        component.rules,
        component.constructor.name,
      );
    }

    return template;
  }

  /**
   * Type guard — returns true when a component has validation rules (duck-typing).
   * Not all components are forms; rules are only present when injected via ctx.rules()
   * or assigned explicitly. Avoids polluting the PickComponent base class.
   */
  private hasRules(
    component: unknown,
  ): component is { rules: ValidationRules } {
    const candidate = (component as Record<string, unknown>)["rules"];
    return typeof candidate === "object" && candidate !== null;
  }
}
