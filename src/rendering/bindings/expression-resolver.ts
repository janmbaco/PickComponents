import { PickComponent } from "../../core/pick-component.js";
import { IExpressionResolver } from "./expression-resolver.interface.js";
import type {
  IExpressionParser,
  IEvaluator,
} from "../expression-parser/interfaces.js";

/**
 * Implements the responsibility of safely resolving {{template}} expressions to component property values.
 */
export class ExpressionResolver implements IExpressionResolver {
  private readonly parser: IExpressionParser;
  private readonly evaluator: IEvaluator;
  private readonly scopeCache = new Map<string, Set<string>>();

  /**
   * Initializes the expression resolver with a parser and evaluator.
   *
   * @param parser - Parser for complex expression analysis
   * @param evaluator - Evaluator for executing parsed AST expressions
   * @throws Error if parser or evaluator is null or undefined
   */
  constructor(parser: IExpressionParser, evaluator: IEvaluator) {
    if (!parser) throw new Error("Parser is required");
    if (!evaluator) throw new Error("Evaluator is required");

    this.parser = parser;
    this.evaluator = evaluator;
  }

  private tryAddSafeProperty(
    prop: string,
    component: PickComponent,
    safeProps: Set<string>,
    blacklist: Set<string>,
  ): void {
    if (prop.startsWith("_")) return;
    if (blacklist.has(prop)) return;

    try {
      const value = (component as unknown as Record<string, unknown>)[prop];
      if (typeof value !== "function") {
        safeProps.add(prop);
      }
    } catch {
      // Defensive: skip getter properties that throw on access.
    }
  }

  private getSafeProperties(component: PickComponent): Set<string> {
    if (!component) {
      throw new Error(
        "[ExpressionResolver] Component is required for property whitelisting",
      );
    }

    const constructorName = component.constructor.name;
    if (this.scopeCache.has(constructorName)) {
      return this.scopeCache.get(constructorName)!;
    }

    const safeProps = new Set<string>();
    let current: object | null = Object.getPrototypeOf(component);
    const BLACKLIST = new Set([
      "constructor",
      "onDestroy",
      "onInit",
      "onRenderComplete",
    ]);

    for (const prop of Object.getOwnPropertyNames(component)) {
      this.tryAddSafeProperty(prop, component, safeProps, BLACKLIST);
    }

    while (current && current !== Object.prototype) {
      for (const prop of Object.getOwnPropertyNames(current)) {
        this.tryAddSafeProperty(prop, component, safeProps, BLACKLIST);
      }
      current = Object.getPrototypeOf(current);
    }

    this.scopeCache.set(constructorName, safeProps);
    return safeProps;
  }
  /**
   * Resolves {{bindings}} in a string using component properties.
   *
   * @param template - String with {{bindings}} to resolve
   * @param component - Component instance providing property values
   * @returns Resolved string with all expressions replaced by their values
   * @throws Error if template or component is not provided
   *
   * @example
   * ```typescript
   * component.count = 42;
   * resolver.resolve('Count: {{count}}', component); // "Count: 42"
   * resolver.resolve('Result: {{count + 1}}', component); // "Result: 43"
   * ```
   */
  resolve(template: string, component: PickComponent): string {
    if (!template) {
      throw new Error("[ExpressionResolver] Template is required");
    }
    if (!component) {
      throw new Error("[ExpressionResolver] Component is required");
    }

    const safeProps = this.getSafeProperties(component);
    return template.replace(/\{\{([^}]+)\}\}/g, (_, expr) =>
      this.resolveExpression(expr.trim(), component, safeProps),
    );
  }

  private resolveExpression(
    expression: string,
    component: PickComponent,
    safeProps: Set<string>,
  ): string {
    if (this.requiresParsing(expression)) {
      return this.resolveParsedExpression(expression, component, safeProps);
    }

    if (expression.includes(".")) {
      return this.resolveNestedProperty(expression, component, safeProps);
    }

    return this.resolveDirectProperty(expression, component, safeProps);
  }

  private requiresParsing(expression: string): boolean {
    return /[!+\-*/%<>=&|()?]/.test(expression) || expression.includes("(");
  }

  private resolveParsedExpression(
    expression: string,
    component: PickComponent,
    safeProps: Set<string>,
  ): string {
    try {
      const scope = this.buildScopeFromSafeProps(component, safeProps);
      const parsed = this.parser.parse(expression);
      const result = this.evaluator.evaluate(parsed.ast, scope);
      return result !== null && result !== undefined ? String(result) : "";
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[ExpressionResolver] Expression evaluation error: ${errorMsg} in "${expression}"`,
      );
      return "";
    }
  }

  private buildScopeFromSafeProps(
    component: PickComponent,
    safeProps: Set<string>,
  ): Record<string, unknown> {
    const scope: Record<string, unknown> = {};

    for (const prop of safeProps) {
      try {
        const value = (component as unknown as Record<string, unknown>)[prop];
        scope[prop] = value;
      } catch {
        // Defensive: skip getter properties that throw on access.
      }
    }

    return scope;
  }

  private resolveNestedProperty(
    expression: string,
    component: PickComponent,
    safeProps: Set<string>,
  ): string {
    const parts = expression.split(".");
    const rootProp = parts[0];

    if (!safeProps.has(rootProp)) {
      if (this.isTemplateScopeIdentifier(rootProp)) {
        return "";
      }
      console.warn(
        `[ExpressionResolver] Accessing non-whitelisted property "${rootProp}" in expression "${expression}"`,
      );
      return "";
    }

    let current: unknown = (component as unknown as Record<string, unknown>)[
      rootProp
    ];

    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined) {
        return "";
      }

      try {
        current = (current as Record<string, unknown>)[parts[i]];
      } catch {
        return "";
      }
    }

    return current !== undefined && current !== null ? String(current) : "";
  }

  private resolveDirectProperty(
    expression: string,
    component: PickComponent,
    safeProps: Set<string>,
  ): string {
    if (!safeProps.has(expression)) {
      if (this.isTemplateScopeIdentifier(expression)) {
        return "";
      }
      return "";
    }

    try {
      const value = (component as unknown as Record<string, unknown>)[
        expression
      ];
      return value !== null && value !== undefined ? String(value) : "";
    } catch {
      return "";
    }
  }

  /**
   * Clears the internal property whitelist cache.
   */
  clearCache(): void {
    this.scopeCache.clear();
  }

  private isTemplateScopeIdentifier(prop: string): boolean {
    return prop.startsWith("$");
  }
}
