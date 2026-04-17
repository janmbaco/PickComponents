import { getRestrictiveParentElement } from "../dom/restrictive-html-context.js";
import type { ITransparentHost } from "./transparent-host.interface.js";

/**
 * Implements the responsibility of managing transparent rendering for lightweight custom elements.
 *
 * @description
 * Handles the low-level DOM placement strategy for built-in custom elements
 * such as `pick-for`, `pick-select`, `pick-action`, `pick-link`, and
 * `pick-router`. When the host is placed under a restrictive HTML parent,
 * the helper inserts a comment anchor before the host and hides the wrapper so
 * rendered nodes can be placed directly in the valid parent context.
 *
 * @example
 * ```typescript
 * const host = new TransparentHost(hostElement, "pick-for-anchor");
 * host.connect();
 * host.insert(renderedNode);
 * host.disconnect();
 * ```
 */
export class TransparentHost implements ITransparentHost {
  private anchor: Comment | null = null;

  /**
   * Initializes a new instance of TransparentHost.
   *
   * @param hostElement - The custom element host that owns the rendered content
   * @param anchorLabel - The label used for the transparent comment anchor
   * @throws Error if any parameter is null, undefined, or empty
   *
   * @example
   * ```typescript
   * const host = new TransparentHost(hostElement, "pick-link-anchor");
   * ```
   */
  constructor(
    private readonly hostElement: HTMLElement,
    private readonly anchorLabel: string,
  ) {
    if (!hostElement) {
      throw new Error("Host element is required");
    }
    if (!anchorLabel) {
      throw new Error("Anchor label is required");
    }
  }

  /**
   * Indicates whether the host is currently rendering transparently.
   *
   * @returns True when a transparent anchor exists
   *
   * @example
   * ```typescript
   * if (transparentHost.isTransparent) {
   *   return anchorNode;
   * }
   * ```
   */
  get isTransparent(): boolean {
    return this.anchor !== null;
  }

  /**
   * Connects the host to its render parent.
   *
   * @param defaultDisplay - The display value to use when transparent mode is not required
   * @returns Nothing
   * @throws Error if defaultDisplay is empty
   *
   * @example
   * ```typescript
   * transparentHost.connect();
   * transparentHost.connect("block");
   * ```
   */
  connect(defaultDisplay = "contents"): void {
    if (!defaultDisplay) {
      throw new Error("Default display is required");
    }

    const restrictiveParent = getRestrictiveParentElement(this.hostElement);
    if (!restrictiveParent) {
      this.hostElement.style.display = defaultDisplay;
      return;
    }

    if (!this.anchor) {
      this.anchor = document.createComment(this.anchorLabel);
      restrictiveParent.insertBefore(this.anchor, this.hostElement);
    }

    this.hostElement.style.display = "none";
  }

  /**
   * Disconnects the host and removes any transparent anchor.
   *
   * @returns Nothing
   *
   * @example
   * ```typescript
   * transparentHost.disconnect();
   * ```
   */
  disconnect(): void {
    if (this.anchor?.parentNode) {
      this.anchor.parentNode.removeChild(this.anchor);
    }

    this.anchor = null;
    this.hostElement.style.removeProperty("display");
  }

  /**
   * Inserts a node using the active placement strategy.
   *
   * @param node - The node to insert
   * @param before - Optional reference node for insertion order
   * @returns Nothing
   * @throws Error if node is null or undefined
   *
   * @example
   * ```typescript
   * transparentHost.insert(renderedElement);
   * transparentHost.insert(renderedElement, anchorComment);
   * ```
   */
  insert(node: Node, before: ChildNode | null = null): void {
    if (!node) {
      throw new Error("Node is required");
    }

    const targetParent = this.anchor?.parentNode ?? this.hostElement;
    const targetBefore = before ?? this.anchor;
    targetParent.insertBefore(node, targetBefore);
  }
}
