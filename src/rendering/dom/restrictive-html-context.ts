/**
 * Defines the native HTML parents that cannot safely host framework wrapper custom elements.
 *
 * @description
 * These parents have restrictive child-content models. The framework uses
 * transparent placement when one of these parents owns a lightweight custom
 * element wrapper.
 */
const RESTRICTIVE_PARENT_TAGS = new Set([
  "select",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "ul",
  "ol",
  "dl",
]);

/**
 * Determines whether an element lives under a restrictive native HTML parent.
 *
 * @param element - The element to inspect
 * @returns True when the direct parent is restrictive
 *
 * @example
 * ```typescript
 * const isRestrictive = hasRestrictiveParentContext(hostElement);
 * ```
 */
export function hasRestrictiveParentContext(
  element: Element | null,
): boolean {
  return getRestrictiveParentElement(element) !== null;
}

/**
 * Resolves the direct restrictive parent for an element.
 *
 * @param element - The element whose parent should be inspected
 * @returns The restrictive parent element, or null when the parent is not restrictive
 *
 * @example
 * ```typescript
 * const parent = getRestrictiveParentElement(hostElement);
 * ```
 */
export function getRestrictiveParentElement(
  element: Element | null,
): HTMLElement | null {
  const parent = element?.parentElement;
  if (!parent) {
    return null;
  }

  return RESTRICTIVE_PARENT_TAGS.has(parent.tagName.toLowerCase())
    ? parent
    : null;
}
