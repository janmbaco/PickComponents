import type { ITransparentHost } from "./transparent-host.interface.js";

/**
 * Defines the responsibility of creating transparent host placement helpers.
 *
 * @description
 * Provides a single composition-root managed entry point for lightweight custom
 * elements that need transparent rendering behavior under restrictive HTML
 * parents such as `select`, `tbody`, `tr`, `ul`, or `ol`.
 *
 * @example
 * ```typescript
 * const transparentHost = factory.create(hostElement, "pick-for-anchor");
 * transparentHost.connect();
 * ```
 */
export interface ITransparentHostFactory {
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
  create(hostElement: HTMLElement, anchorLabel: string): ITransparentHost;
}
