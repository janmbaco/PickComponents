import type { IEvaluator } from "../../src/rendering/expression-parser/interfaces.js";
import type { ASTNode } from "../../src/rendering/expression-parser/types.js";

/**
 * Defines the responsibility of providing a sequenced mock evaluator for tests.
 * The mock returns pre-seeded values on successive `evaluate` calls.
 */
export type SequencedMockEvaluator = IEvaluator & {
  /**
   * Seeds the values that will be returned on successive `evaluate` invocations.
   * @param values - Sequence of values to return
   */
  _setReturnValues: (...values: any[]) => void;
};

/**
 * Implements the responsibility of creating a sequenced mock evaluator.
 * Use this in unit tests to avoid duplicating inline evaluator mocks.
 *
 * @returns A mock `IEvaluator` that returns seeded values in order
 *
 * @example
 * const mock = createSequencedEvaluator();
 * mock._setReturnValues(1, 2);
 * const a = mock.evaluate({} as ASTNode, {});
 * const b = mock.evaluate({} as ASTNode, {});
 */
export function createSequencedEvaluator(): SequencedMockEvaluator {
  let index = 0;
  const values: any[] = [];

  return {
    evaluate: (_node: ASTNode, _scope: Record<string, any>) => values[index++],
    _setReturnValues: (...vals: any[]) => {
      values.length = 0;
      values.push(...vals);
      index = 0;
    },
  } as SequencedMockEvaluator;
}
