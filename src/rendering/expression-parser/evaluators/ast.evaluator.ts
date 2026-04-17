import type { IEvaluator } from "../interfaces.js";
import type { ASTNode } from "../types.js";
import type { INodeEvaluatorStrategy } from "./base.js";
import type { ISafeMethodValidator } from "../safe-method-validator.interface.js";
import { LiteralEvaluator } from "./literal.evaluator.js";
import { IdentifierEvaluator } from "./identifier.evaluator.js";
import { MemberExpressionEvaluator } from "./member.evaluator.js";
import { CallExpressionEvaluator } from "./call.evaluator.js";
import { BinaryExpressionEvaluator } from "./binary.evaluator.js";
import { UnaryExpressionEvaluator } from "./unary.evaluator.js";
import { ConditionalExpressionEvaluator } from "./conditional.evaluator.js";

/**
 * Implements the responsibility of evaluating Abstract Syntax Tree (AST) nodes
 * using the Strategy pattern. This class serves as the main evaluator that
 * delegates evaluation to specific strategies based on node type, enabling
 * the Open/Closed Principle for extensibility.
 */
export class ASTEvaluator implements IEvaluator {
  private static readonly MAX_EVAL_DEPTH = 64;
  private readonly strategies: Map<string, INodeEvaluatorStrategy> = new Map();
  private evalDepth: number = 0;

  /**
   * Initializes a new instance of ASTEvaluator with default strategies.
   * Registers all built-in evaluators for common AST node types.
   *
   * @param safeMethodValidator - Validator for safe method invocation in call expressions
   */
  constructor(safeMethodValidator: ISafeMethodValidator) {
    if (!safeMethodValidator)
      throw new Error("SafeMethodValidator is required");

    // Register default strategies
    this.registerStrategy("Literal", new LiteralEvaluator());
    this.registerStrategy("Identifier", new IdentifierEvaluator());
    this.registerStrategy("MemberExpression", new MemberExpressionEvaluator());
    this.registerStrategy(
      "CallExpression",
      new CallExpressionEvaluator(safeMethodValidator),
    );
    this.registerStrategy("BinaryExpression", new BinaryExpressionEvaluator());
    this.registerStrategy("UnaryExpression", new UnaryExpressionEvaluator());
    this.registerStrategy(
      "ConditionalExpression",
      new ConditionalExpressionEvaluator(),
    );
  }

  /**
   * Registers a new evaluation strategy for a specific AST node type.
   * This method enables extension of the evaluator without modifying existing code.
   *
   * @param nodeType - The AST node type this strategy handles
   * @param strategy - The strategy implementation for the node type
   * @throws Error if nodeType or strategy is null or undefined
   *
   * @example
   * ```typescript
   * const evaluator = new ASTEvaluator();
   * evaluator.registerStrategy('CustomNode', new CustomEvaluator());
   * ```
   */
  registerStrategy(nodeType: string, strategy: INodeEvaluatorStrategy): void {
    if (!nodeType) throw new Error("Node type is required");
    if (!strategy) throw new Error("Strategy is required");

    this.strategies.set(nodeType, strategy);
  }

  /**
   * Evaluates an AST node within the provided scope.
   * Delegates to the appropriate strategy based on the node type.
   *
   * @param node - The AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @returns The evaluated result of the AST node
   * @throws Error if node is null/undefined or no strategy exists for the node type
   *
   * @example
   * ```typescript
   * const evaluator = new ASTEvaluator();
   * const result = evaluator.evaluate(astNode, { x: 42 });
   * ```
   */
  evaluate(node: ASTNode, scope: Record<string, unknown>): unknown {
    if (!node) throw new Error("Node is required");
    if (!scope) throw new Error("Scope is required");

    if (++this.evalDepth > ASTEvaluator.MAX_EVAL_DEPTH) {
      throw new Error(
        `Expression evaluation depth exceeds maximum of ${ASTEvaluator.MAX_EVAL_DEPTH}`,
      );
    }

    try {
      const strategy = this.strategies.get(node.type);
      if (!strategy) {
        throw new Error(`Unknown node type: ${node.type}`);
      }
      return strategy.evaluate(node, scope, this);
    } finally {
      this.evalDepth--;
    }
  }
}
