import {
  defaultAttributeBindingPolicy,
  type IAttributeBindingPolicy,
} from "./attribute-binding-policy.js";

export interface ITemplateStaticValidator {
  validate(root: DocumentFragment | Element): void;
}

const DANGEROUS_STATIC_ELEMENTS = new Set([
  "animate",
  "animatemotion",
  "animatetransform",
  "applet",
  "base",
  "embed",
  "foreignobject",
  "frame",
  "frameset",
  "iframe",
  "link",
  "meta",
  "object",
  "script",
  "set",
]);

const BLOCKED_STATIC_ATTRIBUTES = new Set(["srcdoc", "style", "srcset"]);

const URL_STATIC_ATTRIBUTES = new Set([
  "action",
  "background",
  "cite",
  "formaction",
  "href",
  "lowsrc",
  "poster",
  "src",
  "xlink:href",
]);

const SHOW_ELEMENT = 1;

export class TemplateStaticValidator implements ITemplateStaticValidator {
  constructor(
    private readonly attributePolicy: IAttributeBindingPolicy = defaultAttributeBindingPolicy,
  ) {}

  validate(root: DocumentFragment | Element): void {
    if (!root) {
      return;
    }

    if (this.isElement(root)) {
      this.validateElement(root);
    }

    const walker = root.ownerDocument.createTreeWalker(root, SHOW_ELEMENT);
    while (walker.nextNode()) {
      this.validateElement(walker.currentNode as Element);
    }
  }

  private validateElement(element: Element): void {
    const tagName = element.tagName.toLowerCase();
    if (DANGEROUS_STATIC_ELEMENTS.has(tagName)) {
      throw new Error(
        `[PickComponents] Unsafe static template element <${tagName}> found.\n` +
          "Executable elements are not allowed in Pick Components templates.\n" +
          "Use @Listen, pick-action, lifecycle methods, or a dedicated component instead.",
      );
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();

      if (attributeName === "data-preset-template") {
        this.validateHtmlFragmentValue(element, attribute.value);
        continue;
      }

      if (attributeName.startsWith("on")) {
        throw new Error(
          `[PickComponents] Unsafe static template attribute "${attributeName}" found on <${tagName}>.\n` +
            "Inline JavaScript is not allowed in templates.\n" +
            "Use @Listen, pick-action, lifecycle methods, or a dedicated component instead.",
        );
      }

      if (BLOCKED_STATIC_ATTRIBUTES.has(attributeName)) {
        throw new Error(
          `[PickComponents] Unsafe static template attribute "${attributeName}" found on <${tagName}>.\n` +
            `${this.getBlockedAttributeReason(attributeName)}\n` +
            `${this.getBlockedAttributeRemediation(attributeName)}`,
        );
      }

      if (!URL_STATIC_ATTRIBUTES.has(attributeName)) {
        continue;
      }

      if (attribute.value.includes("{{")) {
        continue;
      }

      if (
        this.attributePolicy.sanitizeStaticAttribute(
          attributeName,
          attribute.value,
          element,
        ) === null
      ) {
        throw new Error(
          `[PickComponents] Unsafe static URL "${attribute.value}" found in ${attributeName} on <${tagName}>.\n` +
            "Only http:, https:, mailto:, tel:, relative URLs, and fragment URLs are allowed.",
        );
      }
    }

    if (this.isTemplateElement(element)) {
      this.validate(element.content);
    }
  }

  private validateHtmlFragmentValue(element: Element, value: string): void {
    const template = element.ownerDocument.createElement("template");
    template.innerHTML = value;

    try {
      this.validate(template.content);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      throw new Error(
        `${error.message}\nFound while validating data-preset-template on <${element.tagName.toLowerCase()}>.`,
      );
    }
  }

  private getBlockedAttributeReason(attributeName: string): string {
    if (attributeName === "srcdoc") {
      return "The srcdoc attribute creates an executable HTML document and is not allowed in templates.";
    }

    if (attributeName === "style") {
      return "Inline style attributes are not allowed in templates.";
    }

    return "The srcset attribute is blocked by static template validation policy.";
  }

  private getBlockedAttributeRemediation(attributeName: string): string {
    if (attributeName === "srcdoc") {
      return "Use a dedicated component with reviewed static markup instead.";
    }

    if (attributeName === "style") {
      return "Use classes, CSS parts, or component-scoped styles instead.";
    }

    return "Use a safe static src URL or a controlled component strategy for responsive images.";
  }

  private isElement(root: DocumentFragment | Element): root is Element {
    return "tagName" in root;
  }

  private isTemplateElement(element: Element): element is HTMLTemplateElement {
    return element.tagName.toLowerCase() === "template" && "content" in element;
  }
}
