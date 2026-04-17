import type { ASTNode, IdentifierNode } from "../types.js";
import type { IEvaluator } from "../interfaces.js";
import type { INodeEvaluatorStrategy } from "./base.js";

/**
 * Implements the responsibility of evaluating identifier AST nodes.
 * Resolves variable names by looking them up in the evaluation scope.
 */
export class IdentifierEvaluator implements INodeEvaluatorStrategy {
  /**
   * Evaluates an identifier AST node by resolving its name in the scope.
   *
   * @param node - The identifier AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @param _evaluator - The main evaluator instance (not used for identifiers)
   * @returns The value of the identifier from the scope
   * @throws Error if node or scope is null/undefined
   *
   * @example
   * ```typescript
   * const evaluator = new IdentifierEvaluator();
   * const scope = { x: 42 };
   * const result = evaluator.evaluate(identifierNode, scope, evaluator);
   * // Returns 42 for identifier 'x'
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  evaluate(
    node: ASTNode,
    scope: Record<string, unknown>,
    _evaluator: IEvaluator,
  ): unknown {
    if (!node) throw new Error("Node is required");
    if (!scope) throw new Error("Scope is required");

    const identifier = node as IdentifierNode;
    return scope[identifier.name];
  }
}
