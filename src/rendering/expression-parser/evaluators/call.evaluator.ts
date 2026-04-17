import type { ISafeMethodValidator } from "../safe-method-validator.interface.js";
import type { ASTNode, CallExpressionNode } from "../types.js";
import type { IEvaluator } from "../interfaces.js";
import type { INodeEvaluatorStrategy } from "./base.js";

/**
 * Implements the responsibility of evaluating call expression AST nodes.
 * Handles method calls on objects with security validation to prevent unsafe operations.
 */
export class CallExpressionEvaluator implements INodeEvaluatorStrategy {
  private readonly safeMethodValidator: ISafeMethodValidator;

  /**
   * Creates a CallExpressionEvaluator instance.
   *
   * @param safeMethodValidator - Validator for safe method invocation in expressions
   */
  constructor(safeMethodValidator: ISafeMethodValidator) {
    if (!safeMethodValidator)
      throw new Error("SafeMethodValidator is required");
    this.safeMethodValidator = safeMethodValidator;
  }

  /**
   * Evaluates a call expression AST node by invoking a method on an object.
   * Includes security checks to ensure only safe methods can be called.
   *
   * @param node - The call expression AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @param evaluator - The main evaluator instance for recursive evaluation
   * @returns The result of the method call
   * @throws Error if node, scope, or evaluator is null/undefined, if the method is not safe,
   *         if the target is null/undefined, or if the property is not a function
   *
   * @example
   * ```typescript
   * const evaluator = new CallExpressionEvaluator(safeMethodValidator);
   * const scope = { str: 'hello' };
   * const result = evaluator.evaluate(callNode, scope, evaluator);
   * // Returns result of calling safe method like str.toUpperCase()
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

    const callExpr = node as CallExpressionNode;
    const obj = evaluator.evaluate(callExpr.callee.object, scope);

    if (obj == null) {
      throw new Error(`Cannot call method on null or undefined`);
    }

    const methodName = callExpr.callee.property.name;

    if (!this.safeMethodValidator.isSafeMethod(obj, methodName)) {
      const safeMethods = this.safeMethodValidator.getSafeMethodsForType(obj);
      throw new Error(
        `Method "${methodName}" is not allowed for security reasons.\n` +
          `Allowed methods: ${safeMethods.join(", ")}`,
      );
    }

    const method = (obj as Record<string, unknown>)[methodName];
    if (typeof method !== "function") {
      throw new Error(`"${methodName}" is not a function`);
    }

    const args = callExpr.arguments.map((arg) =>
      evaluator.evaluate(arg, scope),
    );
    return (method as (...args: unknown[]) => unknown).apply(obj, args);
  }
}
