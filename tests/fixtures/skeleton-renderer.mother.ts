/**
 * Factory (Mother) for creating SkeletonRenderer instances for tests.
 */
import { SkeletonRenderer } from "../../src/rendering/skeleton/skeleton-renderer.js";
import type { IDomAdapter } from "../../src/rendering/dom/dom-adapter.interface.js";
import { MockSkeletonValidator } from "./mock-skeleton-validator.js";
import { TemplateMother } from "./template.mother.js";

export class SkeletonRendererMother {
  /**
   * Creates a SkeletonRenderer with a MockSkeletonValidator by default.
   */
  static create(domAdapter: IDomAdapter): SkeletonRenderer {
    return new SkeletonRenderer(
      domAdapter,
      new MockSkeletonValidator(),
      TemplateMother.createExpressionResolver(),
    );
  }

  /**
   * Creates a SkeletonRenderer with a provided validator double.
   */
  static withValidator(
    domAdapter: IDomAdapter,
    validator: MockSkeletonValidator,
  ): SkeletonRenderer {
    return new SkeletonRenderer(
      domAdapter,
      validator,
      TemplateMother.createExpressionResolver(),
    );
  }
}
