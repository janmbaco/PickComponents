import type { ASTNode } from "../types.js";
import type { IEvaluator } from "../interfaces.js";

/**
 * Defines the responsibility of evaluating AST nodes using the Strategy pattern.
 * This interface enables the Open/Closed Principle by allowing new node types
 * to be evaluated without modifying existing code.
 */
export interface INodeEvaluatorStrategy {
  /**
   * Evaluates an AST node within a given scope.
   *
   * @param node - The AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @param evaluator - The main evaluator instance for recursive evaluation
   * @returns The evaluated result of the AST node
   * @throws Error if the node cannot be evaluated
   */
  evaluate(
    node: ASTNode,
    scope: Record<string, unknown>,
    evaluator: IEvaluator,
  ): unknown;
}
