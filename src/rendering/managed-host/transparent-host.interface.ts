/**
 * Defines the responsibility of managing transparent rendering for lightweight custom elements.
 *
 * @description
 * A transparent host hides the custom element wrapper when it lives under a
 * restrictive HTML parent and inserts rendered nodes beside the host through
 * an anchor comment. When the parent is not restrictive, it falls back to
 * regular host-local insertion with `display: contents`.
 *
 * @example
 * ```typescript
 * const transparentHost = transparentHostFactory.create(hostElement, "my-anchor");
 * transparentHost.connect();
 * transparentHost.insert(renderedNode);
 * transparentHost.disconnect();
 * ```
 */
export interface ITransparentHost {
  /**
   * Indicates whether the host is currently rendering transparently.
   *
   * @returns True when the host is using anchor-based transparent placement
   *
   * @example
   * ```typescript
   * if (transparentHost.isTransparent) {
   *   return anchorNode;
   * }
   * ```
   */
  readonly isTransparent: boolean;

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
  connect(defaultDisplay?: string): void;

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
  disconnect(): void;

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
  insert(node: Node, before?: ChildNode | null): void;
}
