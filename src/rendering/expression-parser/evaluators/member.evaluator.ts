import type { ASTNode, MemberExpressionNode } from "../types.js";
import type { IEvaluator } from "../interfaces.js";
import type { INodeEvaluatorStrategy } from "./base.js";

/**
 * Implements the responsibility of evaluating member expression AST nodes.
 * Handles property access on objects with support for optional chaining.
 */
export class MemberExpressionEvaluator implements INodeEvaluatorStrategy {
  /**
   * Evaluates a member expression AST node by accessing a property on an object.
   * Supports optional chaining where accessing properties on null/undefined returns undefined.
   *
   * @param node - The member expression AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @param evaluator - The main evaluator instance for recursive evaluation
   * @returns The value of the accessed property, or undefined for optional chaining on null/undefined
   * @throws Error if node, scope, or evaluator is null/undefined
   *
   * @example
   * ```typescript
   * const evaluator = new MemberExpressionEvaluator();
   * const scope = { obj: { prop: 'value' } };
   * const result = evaluator.evaluate(memberNode, scope, evaluator);
   * // Returns 'value' for obj.prop
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

    const memberExpr = node as MemberExpressionNode;
    const obj = evaluator.evaluate(memberExpr.object, scope);

    if (obj == null) {
      return memberExpr.optional ? undefined : obj;
    }

    return (obj as Record<string, unknown>)[memberExpr.property.name];
  }
}
