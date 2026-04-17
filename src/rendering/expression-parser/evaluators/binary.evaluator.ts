import type { ASTNode, BinaryExpressionNode } from "../types.js";
import type { IEvaluator } from "../interfaces.js";
import type { INodeEvaluatorStrategy } from "./base.js";

/**
 * Implements the responsibility of evaluating binary expression AST nodes.
 * Handles arithmetic, comparison, and logical operations between two operands.
 */
export class BinaryExpressionEvaluator implements INodeEvaluatorStrategy {
  private readonly operators: Record<
    string,
    (left: unknown, right: unknown) => unknown
  > = {
    "+": (l, r) => (l as number) + (r as number),
    "-": (l, r) => (l as number) - (r as number),
    "*": (l, r) => (l as number) * (r as number),
    "/": (l, r) => (l as number) / (r as number),
    "%": (l, r) => (l as number) % (r as number),
    "===": (l, r) => l === r,
    "!==": (l, r) => l !== r,
    ">": (l, r) => (l as number) > (r as number),
    "<": (l, r) => (l as number) < (r as number),
    ">=": (l, r) => (l as number) >= (r as number),
    "<=": (l, r) => (l as number) <= (r as number),
    "&&": (l, r) => l && r,
    "||": (l, r) => l || r,
  };

  /**
   * Evaluates a binary expression AST node by applying the operator to both operands.
   *
   * @param node - The binary expression AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @param evaluator - The main evaluator instance for recursive evaluation
   * @returns The result of applying the binary operator to the operands
   * @throws Error if node, scope, or evaluator is null/undefined, or if operator is unknown
   *
   * @example
   * ```typescript
   * const evaluator = new BinaryExpressionEvaluator();
   * const scope = { a: 5, b: 3 };
   * const result = evaluator.evaluate(binaryNode, scope, evaluator);
   * // Returns 8 for a + b
   * ```
   */
  evaluate(
    node: ASTNode,
    scope: Record<string, unknown>,
    evaluator: IEvaluator,
  ): unknown {
    if (!node) throw new Error("Node is required");
    if (!scope) throw new Error("Scope is required");
    if (!evaluator) throw new Error("Evaluator is required");

    const binaryExpr = node as BinaryExpressionNode;
    const left = evaluator.evaluate(binaryExpr.left, scope);
    const right = evaluator.evaluate(binaryExpr.right, scope);

    const operation = this.operators[binaryExpr.operator];
    if (!operation) {
      throw new Error(`Unknown operator: ${binaryExpr.operator}`);
    }

    return operation(left, right);
  }
}
