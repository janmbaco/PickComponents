import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { css as cssLang } from "@codemirror/lang-css";
import { html as htmlLang } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";
import type {
  CodePlaygroundSessionState,
  CodePlaygroundTabSnapshot,
} from "../models/code-playground.session.js";
import type { LoadedPlaygroundTab } from "../models/playground-tab.manifest.js";
import type { PlaygroundEditorTheme } from "../ports/playground-host.port.js";
import type { IPlaygroundPreviewPort } from "../ports/playground-preview.port.js";

export interface CodePlaygroundViewElements {
  editorPanel: HTMLElement;
  previewFrame: HTMLIFrameElement;
  tabBar: HTMLElement;
}

interface MountedPlaygroundTab extends LoadedPlaygroundTab {
  button: HTMLButtonElement | null;
  editor: EditorView | null;
  wrap: HTMLElement | null;
}

class CodePlaygroundEditors {
  private tabs: MountedPlaygroundTab[] = [];
  private activeTabIndex = 0;
  private readonly themeCompartment = new Compartment();

  mount(
    elements: CodePlaygroundViewElements,
    session: CodePlaygroundSessionState,
    theme: PlaygroundEditorTheme,
  ): void {
    this.tabs = session.tabs.map((tab) => ({
      ...tab,
      button: null,
      editor: null,
      wrap: null,
    }));
    this.activeTabIndex = 0;

    elements.tabBar.replaceChildren();
    for (const [index, tab] of this.tabs.entries()) {
      const button = document.createElement("button");
      button.className = `file-tab${index === 0 ? " active" : ""}`;
      button.dataset.tabIndex = String(index);

      const icon = document.createElement("span");
      icon.className = `file-icon ${iconClassNameForTab(tab.descriptor.lang)}`;
      icon.textContent = iconLabelForTab(tab.descriptor.lang);
      button.appendChild(icon);

      const label = document.createElement("span");
      label.textContent = tab.descriptor.file;
      button.appendChild(label);

      button.addEventListener("click", () => this.switchTab(index));
      elements.tabBar.appendChild(button);
      tab.button = button;
    }

    elements.editorPanel.replaceChildren();
    for (const [index, tab] of this.tabs.entries()) {
      const wrap = document.createElement("div");
      wrap.id = tab.containerId;
      wrap.className = `editor-wrap${index === 0 ? " active" : ""}`;
      elements.editorPanel.appendChild(wrap);
      tab.wrap = wrap;
    }

    this.mountEditors(theme);
  }

  reset(elements: CodePlaygroundViewElements): void {
    this.dispose();
    elements.tabBar.replaceChildren();
    elements.editorPanel.replaceChildren();
  }

  dispose(): void {
    for (const tab of this.tabs) {
      tab.editor?.destroy();
      tab.editor = null;
      tab.button = null;
      tab.wrap = null;
    }

    this.tabs = [];
    this.activeTabIndex = 0;
  }

  snapshotTabs(): CodePlaygroundTabSnapshot[] {
    return this.tabs.map((tab) => ({
      descriptor: tab.descriptor,
      initialCode: tab.initialCode,
      code: tab.editor?.state.doc.toString() ?? tab.initialCode,
    }));
  }

  restoreInitialCode(): void {
    for (const tab of this.tabs) {
      if (!tab.editor) {
        continue;
      }

      tab.editor.dispatch({
        changes: {
          from: 0,
          to: tab.editor.state.doc.length,
          insert: tab.initialCode,
        },
      });
    }
  }

  setPrimaryTypeScriptCode(code: string): void {
    const firstTypeScriptTab = this.tabs.find(
      (tab) => tab.descriptor.lang === "ts",
    );
    if (!firstTypeScriptTab) {
      return;
    }

    firstTypeScriptTab.initialCode = code;
    if (!firstTypeScriptTab.editor) {
      return;
    }

    firstTypeScriptTab.editor.dispatch({
      changes: {
        from: 0,
        to: firstTypeScriptTab.editor.state.doc.length,
        insert: code,
      },
    });
  }

  reconfigureTheme(theme: PlaygroundEditorTheme): void {
    const extension = this.themeExtension(theme);
    for (const tab of this.tabs) {
      tab.editor?.dispatch({
        effects: this.themeCompartment.reconfigure(extension),
      });
    }
  }

  private switchTab(index: number): void {
    if (
      index === this.activeTabIndex ||
      index < 0 ||
      index >= this.tabs.length
    ) {
      return;
    }

    this.activeTabIndex = index;

    for (
      let currentIndex = 0;
      currentIndex < this.tabs.length;
      currentIndex += 1
    ) {
      const isActive = currentIndex === index;
      this.tabs[currentIndex]?.button?.classList.toggle("active", isActive);
      this.tabs[currentIndex]?.wrap?.classList.toggle("active", isActive);
      if (isActive) {
        this.tabs[currentIndex]?.editor?.requestMeasure();
      }
    }
  }

  private mountEditors(theme: PlaygroundEditorTheme): void {
    for (const tab of this.tabs) {
      if (!tab.wrap) {
        continue;
      }

      const langExt =
        tab.descriptor.lang === "html"
          ? htmlLang()
          : tab.descriptor.lang === "css"
            ? cssLang()
            : javascript({ typescript: true });

      const state = EditorState.create({
        doc: tab.initialCode,
        extensions: [
          basicSetup,
          langExt,
          this.themeCompartment.of(this.themeExtension(theme)),
          EditorView.lineWrapping,
        ],
      });

      tab.editor = new EditorView({ state, parent: tab.wrap });
    }
  }

  private themeExtension(theme: PlaygroundEditorTheme): Extension {
    return theme === "light" ? [] : oneDark;
  }
}

function iconClassNameForTab(
  lang: LoadedPlaygroundTab["descriptor"]["lang"],
): string {
  if (lang === "html") {
    return "icon-html";
  }

  if (lang === "css") {
    return "icon-css";
  }

  return "icon-ts";
}

function iconLabelForTab(
  lang: LoadedPlaygroundTab["descriptor"]["lang"],
): string {
  if (lang === "html") {
    return "</>";
  }

  if (lang === "css") {
    return "CSS";
  }

  return "TS";
}

class CodePlaygroundPreviewSurface {
  constructor(private readonly previewPort: IPlaygroundPreviewPort) {}

  reset(previewFrame: HTMLIFrameElement, theme: PlaygroundEditorTheme): void {
    previewFrame.srcdoc = this.previewPort.buildPlaceholderSrcdoc(theme);
  }

  render(previewFrame: HTMLIFrameElement, srcdoc: string): void {
    previewFrame.srcdoc = srcdoc;
  }
}

export class CodePlaygroundView {
  private readonly editors: CodePlaygroundEditors;
  private readonly preview: CodePlaygroundPreviewSurface;

  constructor(previewPort: IPlaygroundPreviewPort) {
    this.editors = new CodePlaygroundEditors();
    this.preview = new CodePlaygroundPreviewSurface(previewPort);
  }

  mountSession(
    elements: CodePlaygroundViewElements,
    session: CodePlaygroundSessionState,
    theme: PlaygroundEditorTheme,
  ): void {
    this.reset(elements, theme);
    this.editors.mount(elements, session, theme);
  }

  reset(
    elements: CodePlaygroundViewElements,
    theme: PlaygroundEditorTheme,
  ): void {
    this.editors.reset(elements);
    this.preview.reset(elements.previewFrame, theme);
  }

  dispose(): void {
    this.editors.dispose();
  }

  snapshotTabs(): CodePlaygroundTabSnapshot[] {
    return this.editors.snapshotTabs();
  }

  restoreInitialCode(): void {
    this.editors.restoreInitialCode();
  }

  setPrimaryTypeScriptCode(code: string): void {
    this.editors.setPrimaryTypeScriptCode(code);
  }

  renderPreview(elements: CodePlaygroundViewElements, srcdoc: string): void {
    this.preview.render(elements.previewFrame, srcdoc);
  }

  reconfigureEditorTheme(theme: PlaygroundEditorTheme): void {
    this.editors.reconfigureTheme(theme);
  }
}
