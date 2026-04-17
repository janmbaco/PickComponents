/**
 * Implements the responsibility of conditional branch rendering from a lightweight custom element.
 *
 * @description
 * Pure custom element that evaluates `<on condition="...">` branches and renders
 * every matching `<on>` branch in DOM order. When no `<on>` branch matches, it
 * falls back to all `<otherwise>` branches.
 *
 * Does not use the PickComponent rendering pipeline — no template compilation,
 * no reactive bindings, no lifecycle manager, no host projection registry.
 *
 * pick-select is transparent to the parent binding resolver, which recurses
 * into its children. This allows the parent component to set up reactive bindings
 * on `<on condition="{{expr}}">`, which pick-select then observes via MutationObserver.
 *
 * @example
 * ```html
 * <pick-select>
 *   <on condition="{{showReadOnlyHint}}">
 *     <p>Read only</p>
 *   </on>
 *
 *   <on condition="{{showSuccess}}">
 *     <p>Saved</p>
 *   </on>
 *
 *   <otherwise>
 *     <p>Nothing to show</p>
 *   </otherwise>
 * </pick-select>
 * ```
 */
import { Services } from "../../providers/service-provider.js";
import type { ITransparentHost } from "../../rendering/managed-host/transparent-host.interface.js";
import type { ITransparentHostFactory } from "../../rendering/managed-host/transparent-host-factory.interface.js";

interface Branch {
  /** The original <on> or <otherwise> Element captured from the host's children. */
  conditionElement: Element;
  /** Direct child nodes that form the branch content. */
  nodes: Node[];
  /** True for <otherwise> — always matches when no <on> branch matches. */
  isDefault: boolean;
}

export class PickSelectElement extends HTMLElement {
  private transparentHost: ITransparentHost | null = null;
  private branches: Branch[] = [];
  private placeholder: Comment | null = null;
  private observer: MutationObserver | null = null;
  private activeBranches: Branch[] = [];

  connectedCallback(): void {
    this.transparentHost = Services.get<ITransparentHostFactory>(
      "ITransparentHostFactory",
    ).create(this, "pick-select-anchor");
    this.transparentHost.connect();
    const transparentHost = this.transparentHost;
    if (!Array.isArray(this.branches)) {
      this.branches = [];
    }
    if (!Array.isArray(this.activeBranches)) {
      this.activeBranches = [];
    }

    if (this.branches.length === 0) {
      const originalElements = Array.from(this.children);

      this.branches = [];
      for (const el of originalElements) {
        const tagName = el.tagName.toLowerCase();

        if (tagName === "on") {
          this.branches.push({
            conditionElement: el,
            nodes: Array.from(el.childNodes),
            isDefault: false,
          });
        } else if (tagName === "otherwise") {
          this.branches.push({
            conditionElement: el,
            nodes: Array.from(el.childNodes),
            isDefault: true,
          });
        }
      }
    }

    this.innerHTML = "";
    this.placeholder = this.transparentHost.isTransparent
      ? document.createComment("pick-select-inline-anchor")
      : document.createComment("pick-select");
    this.transparentHost.insert(this.placeholder);

    const updateBranches = () => {
      if (!this.placeholder?.parentNode) {
        return;
      }

      const matchingBranches = this.resolveBranches();
      if (this.sameBranches(matchingBranches, this.activeBranches)) {
        return;
      }

      for (const branch of this.activeBranches) {
        for (const node of branch.nodes) {
          node.parentNode?.removeChild(node);
        }
      }

      this.activeBranches = [...matchingBranches];

      for (const branch of matchingBranches) {
        for (const node of branch.nodes) {
          transparentHost.insert(node, this.placeholder);
        }
      }
    };

    this.observer = new MutationObserver(updateBranches);
    for (const branch of this.branches) {
      if (!branch.isDefault) {
        this.observer.observe(branch.conditionElement, {
          attributes: true,
          attributeFilter: ["condition"],
        });
      }
    }

    updateBranches();
  }

  disconnectedCallback(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    for (const branch of this.activeBranches) {
      for (const node of branch.nodes) {
        node.parentNode?.removeChild(node);
      }
    }

    this.activeBranches = [];
    this.placeholder?.parentNode?.removeChild(this.placeholder);
    this.placeholder = null;
    this.transparentHost?.disconnect();
    this.transparentHost = null;
  }

  /**
   * Resolves the currently active branch set.
   * Returns every matching `<on>` branch in DOM order.
   * Falls back to every `<otherwise>` branch only when no `<on>` matches.
   */
  private resolveBranches(): Branch[] {
    const matchingOnBranches = this.branches.filter((branch) => {
      if (branch.isDefault) {
        return false;
      }

      const condition = branch.conditionElement.getAttribute("condition");
      return condition === "true" || condition === "";
    });

    if (matchingOnBranches.length > 0) {
      return matchingOnBranches;
    }

    return this.branches.filter((branch) => branch.isDefault);
  }

  private sameBranches(next: Branch[], current: Branch[]): boolean {
    if (next.length !== current.length) {
      return false;
    }

    return next.every((branch, index) => branch === current[index]);
  }
}
