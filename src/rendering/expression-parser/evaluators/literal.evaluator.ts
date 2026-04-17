import type { ASTNode, LiteralNode } from "../types.js";
import type { IEvaluator } from "../interfaces.js";
import type { INodeEvaluatorStrategy } from "./base.js";

/**
 * Implements the responsibility of evaluating literal AST nodes.
 * Handles evaluation of primitive values like strings, numbers, booleans, etc.
 */
export class LiteralEvaluator implements INodeEvaluatorStrategy {
  /**
   * Evaluates a literal AST node by returning its primitive value.
   *
   * @param node - The literal AST node to evaluate
   * @param _scope - The evaluation scope (not used for literals)
   * @param _evaluator - The main evaluator instance (not used for literals)
   * @returns The primitive value of the literal node
   * @throws Error if node is null or undefined
   *
   * @example
   * ```typescript
   * const evaluator = new LiteralEvaluator();
   * const result = evaluator.evaluate(literalNode, scope, evaluator);
   * // Returns the primitive value (string, number, boolean, etc.)
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  evaluate(
    node: ASTNode,
    _scope: Record<string, unknown>,
    _evaluator: IEvaluator,
  ): unknown {
    if (!node) throw new Error("Node is required");

    return (node as LiteralNode).value;
  }
}
