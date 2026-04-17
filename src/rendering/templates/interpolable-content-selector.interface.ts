import { ParsedNode } from "./html-fragment-parser.interface.js";

/**
 * Represents a fragment of content where interpolation tokens can be extracted.
 */
export interface InterpolableFragment {
  /** The content string to scan for tokens */
  readonly content: string;
  /** The type of fragment (text node or attribute value) */
  readonly type: "text" | "attribute";
}

/**
 * Defines the responsibility of selecting content fragments where interpolation is permitted.
 *
 * @description
 * Identifies text nodes and attribute values that are safe for token extraction,
 * excluding:
 * - Tag names and attribute names (HTML structure)
 * - Content inside `<script>` and `<style>` elements
 * - HTML comments
 * - Content inside `<template>` elements (raw/unparsed)
 * - Sensitive attributes: `on*` event handlers and `style` attribute
 */
export interface IInterpolableContentSelector {
  /**
   * Extracts fragments from a parsed HTML structure where interpolation is allowed.
   *
   * @param parsedHtml - Parsed HTML structure (from IHtmlFragmentParser)
   * @returns Array of content fragments safe for tokenization
   * @throws Error if parsedHtml is null or undefined
   */
  selectInterpolableFragments(parsedHtml: ParsedNode): InterpolableFragment[];
}
