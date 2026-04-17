import { IPropertyExtractor } from "./property-extractor.interface.js";
import type { IExpressionParser } from "../expression-parser/interfaces.js";

/**
 * Implements the responsibility of extracting property dependencies from template expressions.
 */
export class PropertyExtractor implements IPropertyExtractor {
  private readonly parser: IExpressionParser;

  /**
   * Initializes a new instance of PropertyExtractor.
   *
   * @param parser - Parser for extracting dependencies from complex expressions
   * @throws Error if parser is null or undefined
   */
  constructor(parser: IExpressionParser) {
    if (!parser) throw new Error("Parser is required");

    this.parser = parser;
  }

  /**
   * Extracts property names from template bindings.
   *
   * @param template - Template string with {{bindings}}
   * @returns Array of unique property names
   * @throws Error if template is null or undefined
   *
   * @example
   * ```typescript
   * extract('Count: {{count}}')
   * // → ['count']
   *
   * extract('{{user?.name}} - {{user?.email}}')
   * // → ['user'] (deduplicated)
   *
   * extract('Result: {{x + y * 2}}')
   * // → ['x', 'y']
   * ```
   */
  extract(template: string): string[] {
    if (!template) throw new Error("Template is required");
    const regex = /\{\{([^}]+)\}\}/g;
    const props = new Set<string>();
    let match;

    while ((match = regex.exec(template)) !== null) {
      const expr = match[1].trim();

      const needsParsing =
        /[!+\-*/%<>=&|():?]/.test(expr) || expr.includes("(");

      if (needsParsing) {
        try {
          const parsed = this.parser.parse(expr);
          for (const dep of parsed.dependencies) {
            props.add(dep as string);
          }
        } catch {
          const rootProp = expr.split(/[.?]/)[0];
          if (rootProp) {
            props.add(rootProp);
          }
        }
      } else {
        const rootProp = expr.split(/[.?]/)[0];
        if (rootProp) {
          props.add(rootProp);
        }
      }
    }

    return Array.from(props);
  }
}
