import { ValidationRules } from "../../types/interfaces.js";

/**
 * Defines the responsibility of resolving validation rules into HTML attributes.
 */
export interface IRulesResolver {
  /**
   * Resolves all [[RULES.field]] bindings in a template string.
   *
   * @param template - Template string with [[RULES.field]] bindings
   * @param rules - Rules registry from component.rules
   * @param componentName - Component name for error reporting
   * @returns Template with [[RULES.field]] replaced by HTML attributes
   */
  resolve(
    template: string,
    rules: ValidationRules,
    componentName: string,
  ): string;
}
