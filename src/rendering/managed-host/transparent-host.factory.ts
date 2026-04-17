import type { ITransparentHostFactory } from "./transparent-host-factory.interface.js";
import type { ITransparentHost } from "./transparent-host.interface.js";
import { TransparentHost } from "./transparent-host.js";

/**
 * Implements the responsibility of creating transparent host placement helpers.
 *
 * @description
 * Factory-first composition-root adapter that creates `TransparentHost`
 * instances for lightweight custom elements. This keeps concrete
 * instantiation inside framework bootstrap paths.
 *
 * @example
 * ```typescript
 * const helper = factory.create(hostElement, "pick-for-anchor");
 * helper.connect();
 * ```
 */
export class TransparentHostFactory implements ITransparentHostFactory {
  /**
   * Creates a transparent host helper for a specific custom element.
   *
   * @param hostElement - The custom element host
   * @param anchorLabel - The comment label used for debugging anchor placement
   * @returns A transparent host helper bound to the given host element
   * @throws Error if any parameter is null, undefined, or empty
   *
   * @example
   * ```typescript
   * const helper = factory.create(hostElement, "pick-select-anchor");
   * ```
   */
  create(hostElement: HTMLElement, anchorLabel: string): ITransparentHost {
    if (!hostElement) {
      throw new Error("Host element is required");
    }
    if (!anchorLabel) {
      throw new Error("Anchor label is required");
    }

    return new TransparentHost(hostElement, anchorLabel);
  }
}
