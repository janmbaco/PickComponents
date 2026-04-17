import type { ITransparentHostFactory } from "../managed-host/transparent-host-factory.interface.js";
import { AnchoredDomContext, DomContext } from "./dom-context.js";
import type { IDomContext } from "./dom-context.interface.js";

/**
 * Defines the responsibility of creating DomContext instances.
 */
export interface IDomContextFactory {
  /**
   * Creates a new DomContext for the specified target root.
   *
   * @param targetRoot - The DOM root element (HTMLElement or ShadowRoot) for the context
   * @returns A new DomContext instance
   */
  create(targetRoot: HTMLElement | ShadowRoot): IDomContext;

  /**
   * Creates a DOM context that renders beside a hidden managed host.
   *
   * @param targetRoot - The restrictive parent that will own rendered nodes
   * @param hostElement - The managed custom element host
   * @returns A DOM context configured for transparent anchored rendering
   *
   * @example
   * ```typescript
   * const context = factory.createAnchored(tbodyElement, hostElement);
   * ```
   */
  createAnchored?(targetRoot: HTMLElement, hostElement: HTMLElement): IDomContext;
}

/**
 * Implements the responsibility of creating DomContext instances.
 *
 * @description
 * Factory for creating DomContext objects with proper dependency injection.
 * Ensures consistent creation and configuration of DOM contexts throughout the rendering system.
 */
export class DomContextFactory implements IDomContextFactory {
  private readonly transparentHostFactory: ITransparentHostFactory;

  /**
   * Initializes a new instance of DomContextFactory.
   *
   * @param transparentHostFactory - Factory for transparent host helpers
   * @throws Error if transparentHostFactory is null or undefined
   *
   * @example
   * ```typescript
   * const factory = new DomContextFactory(transparentHostFactory);
   * ```
   */
  constructor(transparentHostFactory: ITransparentHostFactory) {
    if (!transparentHostFactory) {
      throw new Error("TransparentHostFactory is required");
    }

    this.transparentHostFactory = transparentHostFactory;
  }

  /**
   * Creates a new DomContext for the specified target root.
   *
   * @param targetRoot - The DOM root element (HTMLElement or ShadowRoot) for the context
   * @returns A new DomContext instance configured for the target root
   */
  create(targetRoot: HTMLElement | ShadowRoot): DomContext {
    return new DomContext(targetRoot);
  }

  createAnchored(
    targetRoot: HTMLElement,
    hostElement: HTMLElement,
  ): AnchoredDomContext {
    return new AnchoredDomContext(
      targetRoot,
      this.transparentHostFactory.create(hostElement, "pick-component-anchor"),
    );
  }
}
