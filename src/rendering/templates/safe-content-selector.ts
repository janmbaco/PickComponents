import type {
  IInterpolableContentSelector,
  InterpolableFragment,
} from "./interpolable-content-selector.interface.js";
import type { ParsedNode } from "./html-fragment-parser.interface.js";

type ParsedTag = {
  readonly name: string;
  readonly isClosing: boolean;
  readonly isSelfClosing: boolean;
  readonly attributes: ReadonlyArray<{
    name: string;
    value: string;
  }>;
  readonly endIndex: number;
};

/**
 * Implements the responsibility of selecting safe content for interpolation from parsed HTML.
 *
 * @description
 * Traverses a normalized HTML fragment and extracts only:
 * - Text nodes (excluding those inside script/style/template elements)
 * - Attribute values (excluding on*, style, and attributes inside excluded elements)
 *
 * Excluded contexts (no tokenization) are:
 * - Tag names and attribute names (HTML structure)
 * - Content inside `<script>`, `<style>`, `<template>` elements
 * - HTML comments
 * - Event handler attributes (`onclick`, `oninput`, etc.)
 * - `style` attribute values
 *
 * @example
 * ```typescript
 * const parser = new Parse5FragmentParser();
 * const selector = new SafeContentSelector();
 * const fragment = parser.parse('<div>{{message}}</div>');
 * const fragments = selector.selectInterpolableFragments(fragment);
 * // fragments = [{ content: '{{message}}', type: 'text' }]
 * ```
 */
export class SafeContentSelector implements IInterpolableContentSelector {
  private readonly excludedElements = new Set(["script", "style", "template"]);
  private readonly excludedAttributePrefix = "on";
  private readonly excludedAttributes = new Set(["style"]);

  /**
   * Extracts interpolable fragments from a normalized HTML fragment.
   *
   * @param parsedHtml - Normalized HTML fragment
   * @returns Array of safe content fragments for tokenization
   * @throws Error if parsedHtml is null or undefined
   *
   * @example
   * ```typescript
   * const selector = new SafeContentSelector();
   * const fragments = selector.selectInterpolableFragments(parsedFragment);
   * ```
   */
  selectInterpolableFragments(parsedHtml: ParsedNode): InterpolableFragment[] {
    if (parsedHtml === null || parsedHtml === undefined) {
      throw new Error("ParsedHtml is required");
    }
    if (typeof parsedHtml !== "string") {
      throw new Error("ParsedHtml must be a string");
    }

    const fragments: InterpolableFragment[] = [];
    let currentIndex = 0;
    let textStartIndex = 0;

    while (currentIndex < parsedHtml.length) {
      if (parsedHtml.startsWith("<!--", currentIndex)) {
        this.pushTextFragment(
          parsedHtml.slice(textStartIndex, currentIndex),
          fragments,
        );
        currentIndex = this.findCommentEnd(parsedHtml, currentIndex);
        textStartIndex = currentIndex;
        continue;
      }

      const tag = this.readTag(parsedHtml, currentIndex);
      if (tag) {
        this.pushTextFragment(
          parsedHtml.slice(textStartIndex, currentIndex),
          fragments,
        );

        if (!tag.isClosing) {
          this.pushAttributeFragments(tag, fragments);
        }

        currentIndex = tag.endIndex;
        textStartIndex = currentIndex;

        if (!tag.isClosing && !tag.isSelfClosing && this.isExcludedElement(tag)) {
          currentIndex = this.findExcludedElementEnd(parsedHtml, currentIndex, tag.name);
          textStartIndex = currentIndex;
        }
        continue;
      }

      currentIndex++;
    }

    this.pushTextFragment(parsedHtml.slice(textStartIndex), fragments);
    return fragments;
  }

  private pushTextFragment(
    content: string,
    fragments: InterpolableFragment[],
  ): void {
    if (content && content.trim() && !this.looksLikeHtmlStructure(content)) {
      fragments.push({
        content,
        type: "text",
      });
    }
  }

  private isAttributeAllowed(attrName: string): boolean {
    if (attrName.startsWith(this.excludedAttributePrefix)) {
      return false;
    }

    if (this.excludedAttributes.has(attrName)) {
      return false;
    }

    if (this.looksLikeInterpolation(attrName)) {
      return false;
    }

    return true;
  }

  private looksLikeInterpolation(attrName: string): boolean {
    return (
      attrName.includes("{{") ||
      attrName.includes("}}") ||
      attrName.includes("${") ||
      attrName.includes("[[") ||
      attrName.includes("]]")
    );
  }

  private looksLikeHtmlStructure(textValue: string): boolean {
    const trimmed = textValue.trim();
    return trimmed.startsWith("<") && trimmed.includes(">");
  }

  private findCommentEnd(html: string, startIndex: number): number {
    const commentEndIndex = html.indexOf("-->", startIndex + 4);
    return commentEndIndex === -1 ? html.length : commentEndIndex + 3;
  }

  private readTag(html: string, startIndex: number): ParsedTag | null {
    if (html[startIndex] !== "<") {
      return null;
    }

    const tagEndIndex = this.findTagEnd(html, startIndex);
    if (tagEndIndex === -1) {
      return null;
    }

    const tagContent = html.slice(startIndex + 1, tagEndIndex);
    const trimmedTagContent = tagContent.trim();
    if (!trimmedTagContent) {
      return null;
    }
    if (tagContent.includes("<")) {
      return null;
    }

    const firstCharacter = trimmedTagContent[0];
    if (!this.isTagStartCharacter(firstCharacter)) {
      return null;
    }

    const isClosing = firstCharacter === "/";
    const isSelfClosing = trimmedTagContent.endsWith("/");
    const nameMatch = trimmedTagContent.match(
      isClosing ? /^\/\s*([^\s/>]+)/ : /^([^\s/>]+)/,
    );

    if (!nameMatch) {
      return null;
    }

    const name = nameMatch[1].toLowerCase();
    const attributesSource = isClosing
      ? ""
      : trimmedTagContent.slice(nameMatch[0].length);
    const attributes = isClosing
      ? []
      : this.readAttributes(attributesSource, isSelfClosing);

    return {
      name,
      isClosing,
      isSelfClosing,
      attributes,
      endIndex: tagEndIndex + 1,
    };
  }

  private findTagEnd(html: string, startIndex: number): number {
    let currentIndex = startIndex + 1;
    let activeQuote: '"' | "'" | null = null;

    while (currentIndex < html.length) {
      const currentCharacter = html[currentIndex];
      if (activeQuote) {
        if (currentCharacter === activeQuote) {
          activeQuote = null;
        }
      } else if (currentCharacter === '"' || currentCharacter === "'") {
        activeQuote = currentCharacter;
      } else if (currentCharacter === ">") {
        return currentIndex;
      }
      currentIndex++;
    }

    return -1;
  }

  private isTagStartCharacter(character: string): boolean {
    return /[A-Za-z!/]/.test(character) || character === "/" || character === "?";
  }

  private readAttributes(
    attributesSource: string,
    isSelfClosing: boolean,
  ): ReadonlyArray<{ name: string; value: string }> {
    const attributes: Array<{ name: string; value: string }> = [];
    const sanitizedSource = isSelfClosing
      ? attributesSource.replace(/\/\s*$/, "")
      : attributesSource;

    let currentIndex = 0;
    while (currentIndex < sanitizedSource.length) {
      while (
        currentIndex < sanitizedSource.length &&
        /\s/.test(sanitizedSource[currentIndex])
      ) {
        currentIndex++;
      }

      if (currentIndex >= sanitizedSource.length) {
        break;
      }
      if (/[<>/]/.test(sanitizedSource[currentIndex])) {
        break;
      }

      const nameStartIndex = currentIndex;
      while (
        currentIndex < sanitizedSource.length &&
        !/[\s=/>]/.test(sanitizedSource[currentIndex])
      ) {
        currentIndex++;
      }

      const name = sanitizedSource.slice(nameStartIndex, currentIndex);
      while (
        currentIndex < sanitizedSource.length &&
        /\s/.test(sanitizedSource[currentIndex])
      ) {
        currentIndex++;
      }

      let value = "";
      if (sanitizedSource[currentIndex] === "=") {
        currentIndex++;
        while (
          currentIndex < sanitizedSource.length &&
          /\s/.test(sanitizedSource[currentIndex])
        ) {
          currentIndex++;
        }

        const quoteCharacter = sanitizedSource[currentIndex];
        if (quoteCharacter === '"' || quoteCharacter === "'") {
          currentIndex++;
          const valueStartIndex = currentIndex;
          while (
            currentIndex < sanitizedSource.length &&
            sanitizedSource[currentIndex] !== quoteCharacter
          ) {
            currentIndex++;
          }
          value = sanitizedSource.slice(valueStartIndex, currentIndex);
          if (currentIndex < sanitizedSource.length) {
            currentIndex++;
          }
        } else {
          const valueStartIndex = currentIndex;
          while (
            currentIndex < sanitizedSource.length &&
            !/[\s>]/.test(sanitizedSource[currentIndex])
          ) {
            currentIndex++;
          }
          value = sanitizedSource.slice(valueStartIndex, currentIndex);
        }
      }

      if (name) {
        attributes.push({
          name,
          value,
        });
      }
    }

    return attributes;
  }

  private pushAttributeFragments(
    tag: ParsedTag,
    fragments: InterpolableFragment[],
  ): void {
    for (const attribute of tag.attributes) {
      if (this.isAttributeAllowed(attribute.name) && attribute.value) {
        fragments.push({
          content: attribute.value,
          type: "attribute",
        });
      }
    }
  }

  private isExcludedElement(tag: ParsedTag): boolean {
    return this.excludedElements.has(tag.name);
  }

  private findExcludedElementEnd(
    html: string,
    startIndex: number,
    tagName: string,
  ): number {
    const closingTagPattern = new RegExp(`</\\s*${tagName}\\b`, "i");
    const remainingHtml = html.slice(startIndex);
    const closingTagMatch = closingTagPattern.exec(remainingHtml);

    if (!closingTagMatch || closingTagMatch.index === undefined) {
      return html.length;
    }

    const closingTagStartIndex = startIndex + closingTagMatch.index;
    const closingTagEndIndex = this.findTagEnd(html, closingTagStartIndex);
    return closingTagEndIndex === -1 ? html.length : closingTagEndIndex + 1;
  }
}
