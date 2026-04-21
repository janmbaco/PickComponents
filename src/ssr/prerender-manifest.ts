import type { ComponentMetadata } from "../core/component-metadata.js";

export const PICK_PRERENDER_CONTRACT_VERSION = "1";

export const PICK_PRERENDER_ATTRIBUTES = {
  prerendered: "data-pick-prerendered",
  renderMode: "data-pick-render-mode",
  runtimeVersion: "data-pick-runtime-version",
  selector: "data-pick-selector",
  templateHash: "data-pick-template-hash",
} as const;

export type PickRootMode = "light" | "shadow";
export type ClientRenderMode = "replace" | "adopt";

export interface PrerenderAdoptionCandidate {
  readonly hostElement: HTMLElement;
  readonly rootElement: HTMLElement;
  readonly prerendered: boolean;
  readonly rootMode: PickRootMode | null;
  readonly runtimeVersion: string | null;
  readonly selector: string | null;
  readonly templateHash: string | null;
}

export interface PrerenderAdoptionRequest {
  readonly candidate: PrerenderAdoptionCandidate | null;
  readonly metadata: ComponentMetadata;
  readonly templateSource: string;
  readonly expectedRootMode: PickRootMode;
}

export interface PrerenderAdoptionDecision {
  readonly mode: ClientRenderMode;
  readonly reason: string;
  readonly candidate: PrerenderAdoptionCandidate | null;
  readonly expectedTemplateHash: string;
}

export interface IPrerenderAdoptionDecider {
  decide(request: PrerenderAdoptionRequest): PrerenderAdoptionDecision;
}

export function computePickTemplateHash(templateSource: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < templateSource.length; index++) {
    hash ^= templateSource.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function readPrerenderAdoptionCandidate(
  hostElement: HTMLElement,
): PrerenderAdoptionCandidate | null {
  if (typeof hostElement.hasAttribute !== "function") {
    return null;
  }

  if (!hostElement.hasAttribute(PICK_PRERENDER_ATTRIBUTES.prerendered)) {
    return null;
  }

  const rootElement = findPrerenderRootElement(hostElement);

  if (!rootElement) {
    return null;
  }

  return {
    hostElement,
    rootElement,
    prerendered:
      hostElement.getAttribute(PICK_PRERENDER_ATTRIBUTES.prerendered) ===
      "true",
    rootMode: readRootMode(
      hostElement.getAttribute(PICK_PRERENDER_ATTRIBUTES.renderMode),
    ),
    runtimeVersion: hostElement.getAttribute(
      PICK_PRERENDER_ATTRIBUTES.runtimeVersion,
    ),
    selector: hostElement.getAttribute(PICK_PRERENDER_ATTRIBUTES.selector),
    templateHash: hostElement.getAttribute(
      PICK_PRERENDER_ATTRIBUTES.templateHash,
    ),
  };
}

export function isLightDomPrerenderCandidate(
  candidate: PrerenderAdoptionCandidate | null,
): boolean {
  return candidate?.prerendered === true && candidate.rootMode === "light";
}

export class DefaultPrerenderAdoptionDecider implements IPrerenderAdoptionDecider {
  decide(request: PrerenderAdoptionRequest): PrerenderAdoptionDecision {
    const expectedTemplateHash = computePickTemplateHash(
      request.templateSource,
    );
    const candidate = request.candidate;

    if (!candidate) {
      return this.replace(
        "missing-prerender-candidate",
        null,
        expectedTemplateHash,
      );
    }

    if (!candidate.prerendered) {
      return this.replace(
        "not-marked-prerendered",
        candidate,
        expectedTemplateHash,
      );
    }

    if (candidate.runtimeVersion !== PICK_PRERENDER_CONTRACT_VERSION) {
      return this.replace(
        "runtime-version-mismatch",
        candidate,
        expectedTemplateHash,
      );
    }

    if (candidate.selector !== request.metadata.selector) {
      return this.replace("selector-mismatch", candidate, expectedTemplateHash);
    }

    if (candidate.rootMode !== request.expectedRootMode) {
      return this.replace(
        "root-mode-mismatch",
        candidate,
        expectedTemplateHash,
      );
    }

    if (candidate.templateHash !== expectedTemplateHash) {
      return this.replace(
        "template-hash-mismatch",
        candidate,
        expectedTemplateHash,
      );
    }

    return {
      mode: "adopt",
      reason: "compatible-prerender",
      candidate,
      expectedTemplateHash,
    };
  }

  private replace(
    reason: string,
    candidate: PrerenderAdoptionCandidate | null,
    expectedTemplateHash: string,
  ): PrerenderAdoptionDecision {
    return {
      mode: "replace",
      reason,
      candidate,
      expectedTemplateHash,
    };
  }
}

function readRootMode(rawValue: string | null): PickRootMode | null {
  return rawValue === "light" || rawValue === "shadow" ? rawValue : null;
}

function findPrerenderRootElement(
  hostElement: HTMLElement,
): HTMLElement | null {
  for (const child of Array.from(hostElement.children)) {
    const tagName = child.tagName.toLowerCase();

    if (tagName === "script" || tagName === "style") {
      continue;
    }

    return child as HTMLElement;
  }

  return hostElement;
}
