import type { IExpressionParser } from "./interfaces.js";
import type {
  ASTNode,
  IdentifierNode,
  MemberExpressionNode,
  CallExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  ConditionalExpressionNode,
  ParsedExpression,
} from "./types.js";
import { Tokenizer } from "./tokenizer.js";
import { Parser } from "./parser.js";

/**
 * Implements the responsibility of parsing expression strings into structured representations.
 * Coordinates tokenization, AST construction, dependency analysis, and result caching.
 * Cache and dependency extraction are implementation details private to this class.
 */
export class ExpressionParserService implements IExpressionParser {
  private readonly cache = new Map<string, ParsedExpression>();

  /**
   * Parses an expression string, utilizing caching for performance.
   * If the expression has been parsed before, returns the cached result.
   * Otherwise, parses the expression and stores it in the cache.
   *
   * @param expression - The expression string to parse
   * @returns The parsed expression containing AST, dependencies, and original expression
   * @throws Error if expression is null/undefined or contains syntax errors
   *
   * @example
   * ```typescript
   * const service = new ExpressionParserService();
   * const parsed = service.parse('x + y * 2');
   * // Returns { ast: ASTNode, dependencies: ['x', 'y'], originalExpression: 'x + y * 2' }
   * ```
   */
  parse(expression: string): ParsedExpression {
    if (!expression) throw new Error("Expression string is required");

    const cached = this.cache.get(expression);
    if (cached) {
      return cached;
    }

    const tokenizer = new Tokenizer(expression);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const dependencies = this.extractDependencies(ast);

    const parsed: ParsedExpression = {
      ast,
      dependencies,
      originalExpression: expression,
    };

    this.cache.set(expression, parsed);
    return parsed;
  }

  private extractDependencies(node: ASTNode): string[] {
    const deps = new Set<string>();
    this.traverseForDependencies(node, deps);
    return Array.from(deps);
  }

  private traverseForDependencies(node: ASTNode, deps: Set<string>): void {
    switch (node.type) {
      case "Identifier":
        deps.add((node as IdentifierNode).name);
        break;

      case "MemberExpression": {
        const memberExpr = node as MemberExpressionNode;
        if (memberExpr.object.type === "Identifier") {
          deps.add(memberExpr.object.name);
        } else {
          this.traverseForDependencies(memberExpr.object, deps);
        }
        break;
      }

      case "CallExpression": {
        const callExpr = node as CallExpressionNode;
        this.traverseForDependencies(callExpr.callee, deps);
        callExpr.arguments.forEach((arg) =>
          this.traverseForDependencies(arg, deps),
        );
        break;
      }

      case "BinaryExpression": {
        const binaryExpr = node as BinaryExpressionNode;
        this.traverseForDependencies(binaryExpr.left, deps);
        this.traverseForDependencies(binaryExpr.right, deps);
        break;
      }

      case "UnaryExpression": {
        const unaryExpr = node as UnaryExpressionNode;
        this.traverseForDependencies(unaryExpr.argument, deps);
        break;
      }

      case "ConditionalExpression": {
        const conditionalExpr = node as ConditionalExpressionNode;
        this.traverseForDependencies(conditionalExpr.test, deps);
        this.traverseForDependencies(conditionalExpr.consequent, deps);
        this.traverseForDependencies(conditionalExpr.alternate, deps);
        break;
      }

      case "Literal":
        // No dependencies for literal values
        break;
    }
  }
}
