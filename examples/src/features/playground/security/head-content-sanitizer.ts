export interface HeadContentSanitizationPolicy {
  readonly blockedTagNames: ReadonlySet<string>;
  readonly blockedMetaNames: ReadonlySet<string>;
  readonly removeMetaCharset: boolean;
}

export interface HeadContentSanitizerOptions {
  readonly document?: Document;
}

const SCRIPT_TAG_NAMES: ReadonlySet<string> = new Set(["script"]);
const NO_BLOCKED_META_NAMES: ReadonlySet<string> = new Set();
const DOWNLOAD_BLOCKED_META_NAMES: ReadonlySet<string> = new Set(["viewport"]);

export const previewHeadContentPolicy: HeadContentSanitizationPolicy = {
  blockedTagNames: SCRIPT_TAG_NAMES,
  blockedMetaNames: NO_BLOCKED_META_NAMES,
  removeMetaCharset: true,
};

export const downloadHeadContentPolicy: HeadContentSanitizationPolicy = {
  blockedTagNames: SCRIPT_TAG_NAMES,
  blockedMetaNames: DOWNLOAD_BLOCKED_META_NAMES,
  removeMetaCharset: true,
};

export function sanitizeHeadContent(
  headContent: string,
  policy: HeadContentSanitizationPolicy,
  options: HeadContentSanitizerOptions = {},
): string {
  const template = createTemplate(options.document);
  template.innerHTML = headContent;

  const elements = Array.from(template.content.querySelectorAll("*"));
  for (const element of elements) {
    if (shouldRemoveElement(element, policy)) {
      element.remove();
    }
  }

  return template.innerHTML.trim();
}

function createTemplate(documentOverride?: Document): HTMLTemplateElement {
  const documentRef = documentOverride ?? globalThis.document;
  if (!documentRef) {
    throw new Error("A DOM document is required to sanitize playground HTML.");
  }

  return documentRef.createElement("template");
}

function shouldRemoveElement(
  element: Element,
  policy: HeadContentSanitizationPolicy,
): boolean {
  const tagName = element.tagName.toLowerCase();
  if (policy.blockedTagNames.has(tagName)) {
    return true;
  }

  return tagName === "meta" && shouldRemoveMetaElement(element, policy);
}

function shouldRemoveMetaElement(
  element: Element,
  policy: HeadContentSanitizationPolicy,
): boolean {
  if (policy.removeMetaCharset && element.hasAttribute("charset")) {
    return true;
  }

  const metaName = element.getAttribute("name")?.trim().toLowerCase();
  return !!metaName && policy.blockedMetaNames.has(metaName);
}
