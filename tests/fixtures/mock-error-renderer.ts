import type { IErrorRenderer } from "../../src/rendering/pipeline/error-renderer.js";
import { IDomContext } from "../../src/rendering/dom-context/dom-context.interface.js";
import type { ErrorRenderOptions } from "../../src/rendering/pipeline/error-renderer.js";

/**
 * Mock implementation of IErrorRenderer for unit testing.
 *
 * @description
 * Tracks error rendering calls without actual DOM manipulation.
 */
export class MockErrorRenderer implements IErrorRenderer {
  public renderCalls: Array<{
    domContext: IDomContext;
    errorMessage: string;
    options?: ErrorRenderOptions;
  }> = [];

  async render(
    domContext: IDomContext,
    errorMessage: string,
    options?: ErrorRenderOptions,
  ): Promise<void> {
    this.renderCalls.push({ domContext, errorMessage, options });
  }

  reset(): void {
    this.renderCalls = [];
  }

  getRenderCount(): number {
    return this.renderCalls.length;
  }

  wasErrorRendered(errorMessage: string): boolean {
    return this.renderCalls.some((call) => call.errorMessage === errorMessage);
  }
}
