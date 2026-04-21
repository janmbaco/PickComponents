import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import {
  DefaultPrerenderAdoptionDecider,
  PICK_PRERENDER_CONTRACT_VERSION,
  computePickTemplateHash,
  readPrerenderAdoptionCandidate,
} from "../../../src/ssr/prerender-manifest.js";
import type { ComponentMetadata } from "../../../src/core/component-metadata.js";

test.describe("DefaultPrerenderAdoptionDecider", () => {
  let dom: JSDOM;
  let document: Document;

  const metadata: ComponentMetadata = {
    selector: "seo-card",
    template: "<article>{{title}}</article>",
  };

  test.beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body></body></html>");
    document = dom.window.document;
  });

  test("adopts when prerender markers match the template contract", () => {
    // Arrange
    const host = document.createElement("seo-card");
    host.setAttribute("data-pick-prerendered", "true");
    host.setAttribute("data-pick-render-mode", "light");
    host.setAttribute(
      "data-pick-runtime-version",
      PICK_PRERENDER_CONTRACT_VERSION,
    );
    host.setAttribute("data-pick-selector", metadata.selector);
    host.setAttribute(
      "data-pick-template-hash",
      computePickTemplateHash(metadata.template),
    );
    host.innerHTML = "<article>Rendered title</article>";

    // Act
    const candidate = readPrerenderAdoptionCandidate(host);
    const decision = new DefaultPrerenderAdoptionDecider().decide({
      candidate,
      metadata,
      templateSource: metadata.template,
      expectedRootMode: "light",
    });

    // Assert
    expect(decision.mode).toBe("adopt");
    expect(decision.reason).toBe("compatible-prerender");
    expect(decision.candidate?.rootElement.tagName).toBe("ARTICLE");
  });

  test("falls back to replace when the template hash differs", () => {
    // Arrange
    const host = document.createElement("seo-card");
    host.setAttribute("data-pick-prerendered", "true");
    host.setAttribute("data-pick-render-mode", "light");
    host.setAttribute(
      "data-pick-runtime-version",
      PICK_PRERENDER_CONTRACT_VERSION,
    );
    host.setAttribute("data-pick-selector", metadata.selector);
    host.setAttribute("data-pick-template-hash", "fnv1a-deadbeef");
    host.innerHTML = "<article>Stale title</article>";

    // Act
    const decision = new DefaultPrerenderAdoptionDecider().decide({
      candidate: readPrerenderAdoptionCandidate(host),
      metadata,
      templateSource: metadata.template,
      expectedRootMode: "light",
    });

    // Assert
    expect(decision.mode).toBe("replace");
    expect(decision.reason).toBe("template-hash-mismatch");
  });
});
