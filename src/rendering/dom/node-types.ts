/**
 * Node type constants for SSR compatibility.
 *
 * @description
 * Provides environment-agnostic node type constants to avoid using
 * browser globals like `Node.ELEMENT_NODE` which are not available in SSR contexts.
 *
 * @example
 * ```typescript
 * if (node.nodeType === NodeType.ELEMENT_NODE) {
 *   // Process element node
 * }
 * ```
 */
export const NodeType = {
  /** Element node type (e.g., <div>, <span>) */
  ELEMENT_NODE: 1,
  /** Text node type (e.g., text content) */
  TEXT_NODE: 3,
} as const;
