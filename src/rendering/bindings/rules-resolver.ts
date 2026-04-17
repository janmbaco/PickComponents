import { ValidationRules } from "../../types/interfaces.js";
import { IRulesResolver } from "./rules-resolver.interface.js";

/**
 * Implements the responsibility of resolving validation rules into HTML attributes.
 */
export class RulesResolver implements IRulesResolver {
  private static readonly RULES_REGEX =
    /\[\[RULES\.([a-zA-Z_][a-zA-Z0-9_]*)\]\]/g;

  /**
   * Resolves all [[RULES.field]] bindings in a template string.
   *
   * @param template - Template string with [[RULES.field]] bindings
   * @param rules - Rules registry from component.rules
   * @param componentName - Component name for error reporting
   * @returns Template with [[RULES.field]] replaced by HTML attributes
   *
   * @example
   * ```typescript
   * resolve(
   *   `<input [[RULES.username]] type="text" />`,
   *   { username: { required: true, minlength: 3 } },
   *   'LoginForm'
   * );
   * // → `<input required minlength="3" type="text" />`
   * ```
   */
  resolve(
    template: string,
    rules: ValidationRules,
    componentName: string = "Unknown",
  ): string {
    return template.replace(RulesResolver.RULES_REGEX, (match, fieldName) => {
      try {
        const ruleSet = rules[fieldName];

        if (!ruleSet) {
          console.warn(
            `[RulesResolver] Rule not found: "${fieldName}" in component "${componentName}". ` +
              `Available rules: ${Object.keys(rules).join(", ") || "none"}`,
          );
          return match;
        }

        return this.convertRulesToAttributes(ruleSet);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[RulesResolver] Error resolving rules for "${fieldName}" in component "${componentName}":`,
          errorMessage,
        );
        return match;
      }
    });
  }

  private convertRulesToAttributes(rules: ValidationRules[string]): string {
    const attributes: string[] = [];

    if (rules.required) {
      attributes.push("required");
    }

    const quotedAttributes = [
      "minlength",
      "maxlength",
      "pattern",
      "min",
      "max",
      "step",
      "accept",
      "autocomplete",
      "placeholder",
      "title",
    ];

    for (const attr of quotedAttributes) {
      const value = (rules as Record<string, unknown>)[attr];
      if (value !== undefined && value !== null) {
        const escapedValue = String(value).replace(/"/g, "&quot;");
        attributes.push(`${attr}="${escapedValue}"`);
      }
    }

    return attributes.join(" ");
  }
}
