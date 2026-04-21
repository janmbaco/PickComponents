import { PickComponent } from "../../core/pick-component.js";
import { IDomContext } from "../dom-context/dom-context.interface.js";
import { ITemplateCompiler } from "./template-compiler.interface.js";
import { IDomAdapter } from "../dom/dom-adapter.interface.js";
import type { IManagedElementRegistry } from "../managed-host/managed-element-registry.js";
import type { IComponentMetadataRegistry } from "../../core/component-metadata-registry.interface.js";
import { ComponentMetadata } from "../../core/component-metadata.js";
import { IBindingResolver } from "../bindings/binding-resolver.js";
import { NodeType } from "../dom/node-types.js";

/**
 * Implements the responsibility of compiling template HTML with reactive bindings.
 *
 * @description
 * Transforms template strings into live DOM elements with reactive state bindings.
 * Creates subscriptions for property changes. Content projection is handled
 * natively by the browser via Shadow DOM <slot> elements.
 *
 * @architecture
 * Compilation Process:
 * 1. Parse template HTML into DOM element using IDomAdapter
 * 2. Bind reactive properties to DOM updates
 */
export class TemplateCompiler implements ITemplateCompiler {
  /**
   * Framework built-in elements that manage their own child binding scope.
   * The BindingResolver must not recurse into these — their children serve
   * as templates compiled separately with a different reactive context.
   */
  private static readonly TEMPLATE_BOUNDARY_ELEMENTS = new Set(["pick-for"]);
  private static readonly SMART_FOR_TEMPLATE_PLACEHOLDER =
    "data-pick-for-template-placeholder";
  private static readonly SMART_FOR_TEMPLATE_EXCLUDED_ELEMENTS = new Set([
    "template",
    "script",
    "style",
  ]);

  /**
   * Initializes a new instance of TemplateCompiler.
   *
   * @param domAdapter - Adapter for DOM element creation
   * @param bindingResolver - Resolver for attribute/text bindings with input cleanup
   * @param metadataSource - Read-only source for component metadata lookup
   * @param managedRegistry - Registry for managed element tracking
   * @throws Error if domAdapter or bindingResolver is null or undefined
   */
  constructor(
    private readonly domAdapter: IDomAdapter,
    private readonly bindingResolver: IBindingResolver,
    private readonly metadataSource: IComponentMetadataRegistry,
    private readonly managedRegistry?: IManagedElementRegistry,
  ) {
    if (!domAdapter) {
      throw new Error("Dom adapter is required");
    }
    if (!bindingResolver) {
      throw new Error("Binding resolver is required");
    }
  }
  /**
   * Compiles template source into a reactive DOM element
   *
   * @param templateSource - HTML template string
   * @param component - Component instance for property access
   * @param domContext - DOM context for subscription management
   * @param metadata - Optional component metadata for selector and configuration
   * @returns Promise resolving to compiled HTMLElement
   * @throws Error if any parameter is null or undefined
   *
   * @example
   * ```typescript
   * const compiler = new TemplateCompiler();
   * const element = await compiler.compile(
   *   '<div>{{message}}</div>',
   *   myComponent,
   *   domContext,
   *   metadata
   * );
   * ```
   */
  async compile<T extends PickComponent>(
    templateSource: string,
    component: T,
    domContext: IDomContext,
    metadata?: ComponentMetadata,
  ): Promise<HTMLElement> {
    if (!templateSource) throw new Error("Template source is required");
    if (!component) throw new Error("Component is required");
    if (!domContext) throw new Error("DOM context is required");

    const rootElement = this.createRootElementFromTemplate(
      templateSource,
      component,
      metadata,
    );

    // Register nested component elements as managed BEFORE binding so resolver can detect them
    this.registerNestedManagedElements(rootElement);

    // Use BindingResolver to compile all bindings (handles recursion internally)
    this.bindingResolver.bindElement(rootElement, component, domContext);

    this.prepareNestedPickForPresetTemplates(rootElement);

    return rootElement;
  }

  /**
   * Applies template bindings to an existing prerendered root element.
   *
   * @description
   * The prerendered DOM contains already-resolved user-visible HTML, so binding
   * markers are not present in the document. This method parses the matching
   * template, copies only binding-bearing attributes/text into the existing DOM,
   * then lets BindingResolver attach subscriptions and resolve the current state.
   */
  async adoptExisting<T extends PickComponent>(
    templateSource: string,
    existingRoot: HTMLElement,
    component: T,
    domContext: IDomContext,
    metadata?: ComponentMetadata,
  ): Promise<HTMLElement> {
    if (!templateSource) throw new Error("Template source is required");
    if (!existingRoot) throw new Error("Existing root element is required");
    if (!component) throw new Error("Component is required");
    if (!domContext) throw new Error("DOM context is required");

    const templateRoot = this.createRootElementFromTemplate(
      templateSource,
      component,
      metadata,
    );

    this.copyTemplateBindingsToExistingRoot(templateRoot, existingRoot);

    for (const className of Array.from(templateRoot.classList)) {
      if (!existingRoot.classList.contains(className)) {
        existingRoot.classList.add(className);
      }
    }

    // Register nested component elements before binding, but leave the adopted
    // root unregistered until the pipeline records it. BindingResolver must be
    // able to recurse into the root itself.
    this.registerNestedManagedElements(existingRoot);
    this.bindingResolver.bindElement(existingRoot, component, domContext);
    this.prepareNestedPickForPresetTemplates(existingRoot);

    return existingRoot;
  }

  private createRootElementFromTemplate<T extends PickComponent>(
    templateSource: string,
    component: T,
    metadata?: ComponentMetadata,
  ): HTMLElement {
    // Use provided metadata or fallback to registry lookup
    const resolvedMetadata =
      metadata && typeof metadata === "object" && "selector" in metadata
        ? (metadata as ComponentMetadata)
        : this.metadataSource.get(component.constructor.name.toLowerCase());
    const selector =
      resolvedMetadata?.selector || component.constructor.name.toLowerCase();

    const template = this.domAdapter.createTemplateElement();
    template.innerHTML = this.preparePickForTemplateBoundaries(
      templateSource.trim(),
    );

    let rootElement: HTMLElement;
    if (template.content.children.length === 1) {
      rootElement = template.content.firstElementChild as HTMLElement;
    } else {
      const wrapper = this.domAdapter.createElement("div");
      wrapper.className = selector;
      while (template.content.firstChild) {
        wrapper.appendChild(template.content.firstChild);
      }
      rootElement = wrapper;
    }

    if (!rootElement.classList.contains(selector)) {
      rootElement.classList.add(selector);
    }

    return this.restorePickForTemplatePlaceholders(rootElement);
  }

  private copyTemplateBindingsToExistingRoot(
    templateElement: Element,
    existingElement: Element,
  ): void {
    if (!this.areStructurallyCompatible(templateElement, existingElement)) {
      return;
    }

    this.copyBindingAttributes(templateElement, existingElement);
    this.copyBindingTextNodes(templateElement, existingElement);

    if (this.isManagedTemplateBoundary(templateElement)) {
      if (!this.hasMeaningfulChildren(templateElement)) {
        existingElement.replaceChildren();
      }
      return;
    }

    const existingChildren = Array.from(existingElement.children);
    let searchStart = 0;

    for (const templateChild of Array.from(templateElement.children)) {
      const match = this.findNextCompatibleExistingChild(
        templateChild,
        existingChildren,
        searchStart,
      );

      if (!match) {
        continue;
      }

      this.copyTemplateBindingsToExistingRoot(templateChild, match);
      searchStart = existingChildren.indexOf(match) + 1;
    }
  }

  private copyBindingAttributes(
    templateElement: Element,
    existingElement: Element,
  ): void {
    for (const attr of Array.from(templateElement.attributes)) {
      if (attr.value.includes("{{")) {
        existingElement.setAttribute(attr.name, attr.value);
      }
    }
  }

  private copyBindingTextNodes(
    templateElement: Element,
    existingElement: Element,
  ): void {
    const existingTextNodes = Array.from(existingElement.childNodes).filter(
      (node) => node.nodeType === NodeType.TEXT_NODE,
    );
    let textIndex = 0;

    for (const node of Array.from(templateElement.childNodes)) {
      if (node.nodeType !== NodeType.TEXT_NODE) {
        continue;
      }

      const target = existingTextNodes[textIndex];
      textIndex += 1;

      if (node.textContent?.includes("{{") && target) {
        target.textContent = node.textContent;
      }
    }
  }

  private findNextCompatibleExistingChild(
    templateChild: Element,
    existingChildren: Element[],
    startIndex: number,
  ): Element | null {
    for (let index = startIndex; index < existingChildren.length; index++) {
      const existingChild = existingChildren[index];

      if (this.areStructurallyCompatible(templateChild, existingChild)) {
        return existingChild;
      }
    }

    return null;
  }

  private areStructurallyCompatible(
    templateElement: Element,
    existingElement: Element,
  ): boolean {
    return (
      templateElement.tagName.toLowerCase() ===
      existingElement.tagName.toLowerCase()
    );
  }

  private isManagedTemplateBoundary(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();

    return (
      TemplateCompiler.TEMPLATE_BOUNDARY_ELEMENTS.has(tagName) ||
      (tagName.includes("-") && this.metadataSource.has(tagName))
    );
  }

  private hasMeaningfulChildren(element: Element): boolean {
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === NodeType.ELEMENT_NODE) {
        return true;
      }

      if (
        node.nodeType === NodeType.TEXT_NODE &&
        node.textContent?.trim().length
      ) {
        return true;
      }
    }

    return false;
  }

  private prepareNestedPickForPresetTemplates(rootElement: HTMLElement): void {
    // Pre-capture templates for nested pick-for elements AFTER binding (so the items
    // attribute is already resolved) but BEFORE DOM insertion.  Uses a data attribute
    // because elements in <template> content fragments are NOT upgraded to Custom
    // Elements — instance methods like setPresetTemplate() do not exist on them.
    // This prevents a browser Custom Elements ordering race where an inner pick-for's
    // connectedCallback fires before the outer's, clearing its innerHTML and corrupting
    // the outer's template.
    const nestedPickFors = rootElement.querySelectorAll("pick-for");
    for (let i = 0; i < nestedPickFors.length; i++) {
      const sf = nestedPickFors[i] as HTMLElement;
      if (!sf.hasAttribute("data-preset-template")) {
        sf.setAttribute("data-preset-template", sf.innerHTML);
      }
    }
  }

  private preparePickForTemplateBoundaries(templateSource: string): string {
    let result = "";
    let cursor = 0;

    while (cursor < templateSource.length) {
      const openStart = this.findNextPickForOpening(templateSource, cursor);
      if (openStart === -1) {
        result += templateSource.slice(cursor);
        break;
      }

      const openEnd = this.findTagEnd(templateSource, openStart);
      if (openEnd === -1) {
        result += templateSource.slice(cursor);
        break;
      }

      const closeStart = this.findMatchingPickForClose(
        templateSource,
        openEnd + 1,
      );
      if (closeStart === -1) {
        result += templateSource.slice(cursor);
        break;
      }

      const closeEnd = this.findTagEnd(templateSource, closeStart);
      if (closeEnd === -1) {
        result += templateSource.slice(cursor);
        break;
      }

      const openingTag = templateSource.slice(openStart, openEnd + 1);
      const attributes = this.extractPickForAttributes(openingTag);
      const templateBody = templateSource.slice(openEnd + 1, closeStart);

      result += templateSource.slice(cursor, openStart);
      result += `<template ${TemplateCompiler.SMART_FOR_TEMPLATE_PLACEHOLDER}${attributes}>${templateBody}</template>`;
      cursor = closeEnd + 1;
    }

    return result;
  }

  private restorePickForTemplatePlaceholders(
    rootElement: HTMLElement,
  ): HTMLElement {
    if (this.isPickForTemplatePlaceholder(rootElement)) {
      const pickFor = this.createPickForFromPlaceholder(
        rootElement as HTMLTemplateElement,
      );
      rootElement.replaceWith(pickFor);
      return pickFor;
    }

    const placeholders = rootElement.querySelectorAll(
      `template[${TemplateCompiler.SMART_FOR_TEMPLATE_PLACEHOLDER}]`,
    );

    for (let i = 0; i < placeholders.length; i++) {
      const placeholder = placeholders[i] as HTMLTemplateElement;
      placeholder.replaceWith(this.createPickForFromPlaceholder(placeholder));
    }

    return rootElement;
  }

  private createPickForFromPlaceholder(
    placeholder: HTMLTemplateElement,
  ): HTMLElement {
    const pickFor = this.domAdapter.createElement("pick-for");

    for (const attr of Array.from(placeholder.attributes)) {
      if (attr.name === TemplateCompiler.SMART_FOR_TEMPLATE_PLACEHOLDER) {
        continue;
      }

      pickFor.setAttribute(attr.name, attr.value);
    }

    pickFor.setAttribute("data-preset-template", placeholder.innerHTML);
    return pickFor;
  }

  private isPickForTemplatePlaceholder(element: Element): boolean {
    return (
      element.tagName.toLowerCase() === "template" &&
      element.hasAttribute(TemplateCompiler.SMART_FOR_TEMPLATE_PLACEHOLDER)
    );
  }

  private findMatchingPickForClose(
    templateSource: string,
    startIndex: number,
  ): number {
    let cursor = startIndex;
    let depth = 1;

    while (cursor < templateSource.length) {
      const nextOpen = this.findNextPickForOpening(templateSource, cursor);
      const nextClose = this.findNextPickForClosing(templateSource, cursor);

      if (nextClose === -1) {
        return -1;
      }

      if (nextOpen !== -1 && nextOpen < nextClose) {
        const openEnd = this.findTagEnd(templateSource, nextOpen);
        if (openEnd === -1) {
          return -1;
        }

        depth += 1;
        cursor = openEnd + 1;
        continue;
      }

      depth -= 1;
      if (depth === 0) {
        return nextClose;
      }

      const closeEnd = this.findTagEnd(templateSource, nextClose);
      if (closeEnd === -1) {
        return -1;
      }
      cursor = closeEnd + 1;
    }

    return -1;
  }

  private findNextPickForOpening(
    templateSource: string,
    startIndex: number,
  ): number {
    return this.findNextPickForTagOutsideExcludedElement(
      templateSource,
      startIndex,
      "<pick-for",
    );
  }

  private findNextPickForClosing(
    templateSource: string,
    startIndex: number,
  ): number {
    return this.findNextPickForTagOutsideExcludedElement(
      templateSource,
      startIndex,
      "</pick-for",
    );
  }

  private findNextPickForTagOutsideExcludedElement(
    templateSource: string,
    startIndex: number,
    needle: string,
  ): number {
    let cursor = startIndex;

    while (cursor < templateSource.length) {
      const index = this.findNextPickForTag(templateSource, cursor, needle);
      if (index === -1) {
        return -1;
      }

      if (!this.isInsidePickForTemplateExcludedElement(templateSource, index)) {
        return index;
      }

      cursor = index + needle.length;
    }

    return -1;
  }

  private findNextPickForTag(
    templateSource: string,
    startIndex: number,
    needle: string,
  ): number {
    const lowerSource = templateSource.toLowerCase();
    let index = lowerSource.indexOf(needle, startIndex);

    while (index !== -1) {
      const nextCharacter = lowerSource[index + needle.length];
      if (!nextCharacter || /[\s>/]/.test(nextCharacter)) {
        return index;
      }

      index = lowerSource.indexOf(needle, index + 1);
    }

    return -1;
  }

  private isInsidePickForTemplateExcludedElement(
    templateSource: string,
    targetIndex: number,
  ): boolean {
    const openElements: string[] = [];
    let cursor = 0;

    while (cursor < targetIndex) {
      const tagStart = templateSource.indexOf("<", cursor);
      if (tagStart === -1 || tagStart >= targetIndex) {
        break;
      }

      if (templateSource.startsWith("<!--", tagStart)) {
        const commentEnd = templateSource.indexOf("-->", tagStart + 4);
        cursor = commentEnd === -1 ? targetIndex : commentEnd + 3;
        continue;
      }

      const tagEnd = this.findTagEnd(templateSource, tagStart);
      if (tagEnd === -1 || tagEnd >= targetIndex) {
        break;
      }

      const tagName = this.readTagName(templateSource, tagStart, tagEnd);
      if (!tagName) {
        cursor = tagEnd + 1;
        continue;
      }

      const isClosingTag = templateSource[tagStart + 1] === "/";
      const isSelfClosingTag = /\/\s*>$/.test(
        templateSource.slice(tagStart, tagEnd + 1),
      );

      if (
        TemplateCompiler.SMART_FOR_TEMPLATE_EXCLUDED_ELEMENTS.has(tagName) &&
        !isSelfClosingTag
      ) {
        if (isClosingTag) {
          const lastIndex = openElements.lastIndexOf(tagName);
          if (lastIndex !== -1) {
            openElements.splice(lastIndex, 1);
          }
        } else {
          openElements.push(tagName);
        }
      }

      cursor = tagEnd + 1;
    }

    return openElements.length > 0;
  }

  private readTagName(
    templateSource: string,
    tagStart: number,
    tagEnd: number,
  ): string | null {
    const tagContent = templateSource.slice(tagStart + 1, tagEnd).trim();
    const match = /^\/?\s*([^\s>/]+)/.exec(tagContent);
    return match?.[1].toLowerCase() ?? null;
  }

  private findTagEnd(templateSource: string, startIndex: number): number {
    let activeQuote: '"' | "'" | null = null;

    for (let i = startIndex + 1; i < templateSource.length; i++) {
      const character = templateSource[i];

      if (activeQuote) {
        if (character === activeQuote) {
          activeQuote = null;
        }
        continue;
      }

      if (character === '"' || character === "'") {
        activeQuote = character;
        continue;
      }

      if (character === ">") {
        return i;
      }
    }

    return -1;
  }

  private extractPickForAttributes(openingTag: string): string {
    const tagEndOffset = openingTag.endsWith(">") ? 1 : 0;
    return openingTag
      .slice("<pick-for".length, openingTag.length - tagEndOffset)
      .replace(/\/\s*$/, "");
  }

  /**
   * Registers nested custom elements that are Pick Components as managed.
   *
   * All registered Pick Components found in the template are marked as managed.
   * The binding resolver stops recursing into their children because each
   * nested component renders inside its own Shadow DOM scope.
   *
   * @param rootElement - Root element to scan for nested components
   */
  private registerNestedManagedElements(rootElement: HTMLElement): void {
    const allElements = rootElement.getElementsByTagName("*");

    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      const tagName = element.tagName.toLowerCase();

      if (
        tagName.includes("-") &&
        (this.metadataSource.has(tagName) ||
          TemplateCompiler.TEMPLATE_BOUNDARY_ELEMENTS.has(tagName))
      ) {
        this.managedRegistry?.register(element, tagName);
      }
    }
  }
}
