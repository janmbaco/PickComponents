// Core rendering engine and factory
export { RenderEngine } from "./render-engine.js";
export type {
  ClientBootOptions,
  IRenderEngine,
  RenderOptions,
  RenderResult,
} from "./render-engine.js";

// Reference management types (for framework internals only)
// Note: DomRefResolver is internal API
// It should NOT be used in user code - refs are resolved via rendering layer

// DOM Adapter (for environment-specific DOM operations)
export { BrowserDomAdapter } from "./dom/browser-dom-adapter.js";
export type { IDomAdapter } from "./dom/dom-adapter.interface.js";
export { NodeType } from "./dom/node-types.js";

// DOM Context
export { DomContext } from "./dom-context/dom-context.js";
export { DomContextFactory } from "./dom-context/dom-context-factory.js";
export type {
  IDomContext,
  DomContentType,
} from "./dom-context/dom-context.interface.js";
export type { IDomContextFactory } from "./dom-context/dom-context-factory.js";

// Template analysis (new API)
export { TemplateAnalyzer } from "./templates/template-analyzer.js";
export type { ITemplateAnalyzer } from "./templates/template-analyzer.js";
export type { ICompiledTemplate } from "./templates/compiled-template.interface.js";
export { TemplateCompilationCache } from "./templates/template-compilation-cache.js";

// Token extractors for dialect configuration
export type {
  ITemplateTokenExtractor,
  TemplateToken,
} from "./templates/template-token.interface.js";
export { DelimitedTokenExtractor } from "./templates/delimited-token-extractor.js";
export { CompositeTokenExtractor } from "./templates/composite-token-extractor.js";

// HTML-aware extraction (context-sensitive tokenization)
export { HtmlAwareTokenExtractor } from "./templates/html-aware-token-extractor.js";
export type { IHtmlFragmentParser } from "./templates/html-fragment-parser.interface.js";
export type {
  IInterpolableContentSelector,
  InterpolableFragment,
} from "./templates/interpolable-content-selector.interface.js";
export { Parse5FragmentParser } from "./templates/parse5-fragment-parser.js";
export { SafeContentSelector } from "./templates/safe-content-selector.js";
export { TemplateStaticValidator } from "./templates/template-static-validator.js";
export type { ITemplateStaticValidator } from "./templates/template-static-validator.js";

// Interfaces for dependency injection
export type { ISkeletonRenderer } from "./skeleton/skeleton-renderer.js";
export type { ITemplateProvider } from "./templates/template-provider.js";
export type { IBindingResolver } from "./bindings/binding-resolver.js";
export type { IErrorRenderer } from "./pipeline/error-renderer.js";
export type { ErrorRenderOptions } from "./pipeline/error-renderer.js";
export type { IRenderPipeline } from "./pipeline/render-pipeline.interface.js";
export type { ITemplateCompiler } from "./templates/template-compiler.interface.js";

// Concrete implementations (for advanced usage)
export { SkeletonRenderer } from "./skeleton/skeleton-renderer.js";
export { TemplateProvider } from "./templates/template-provider.js";
export { BindingResolver } from "./bindings/binding-resolver.js";
export { ErrorRenderer } from "./pipeline/error-renderer.js";
export { RenderPipeline } from "./pipeline/render-pipeline.js";
