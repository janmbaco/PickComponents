# Examples

This directory contains the interactive Pick Components example app, the playground UI used to render demos, and the browser assets served to playground iframe sandboxes.

The examples site is not a separate stack. It is built with the same Pick Components primitives used in the library itself: `@PickRender`, `PickComponent`, initializers, lifecycle managers, reactive properties, and framework services registered through `Services`.

## What Lives Here

- `index.html`, `styles.css`, `bundle.js`: the browser app entry, styles, and generated bundle.
- `src/`: source code for the examples shell, authored demos, and feature-oriented UI.
- `playground-examples/`: generated browser-served playground assets built from `src/demos/`.
- `vendor/`: browser-facing runtime assets used by the app and playground.

## Development

From the repository root:

```bash
npm run build:examples
npm run serve:dev
```

`npm run build:examples` bundles `examples/src/main.ts` into `examples/bundle.js`, copies Pico CSS, and prepares the playground runtime assets.

`npm run serve:dev` serves the `examples/` directory at `http://localhost:3000/`.

## High-Level Architecture

The examples app is a small Pick Components application.

- `examples/src/main.ts` is the stable public entry used by the build.
- `examples/src/bootstrap/main.ts` imports the framework bootstrap, registers shell components, and configures feature services.
- `examples/src/bootstrap.ts` bootstraps Pick Components, registers shared Pico CSS for shadow roots, and propagates theme changes.
- `examples/src/bootstrap/configure-examples-services.ts` registers the browser implementations for routing, theme, playground source loading, preview rendering, downloading, host theme inspection, and TypeScript transpilation.
- `examples/src/features/` contains the actual app features: shell, routing, navigation, examples catalog, and playground.

In practice, the examples app is a composition root plus a set of Pick Components organized by feature.

## Structure

- `src/main.ts`: stable external entry for the examples app.
- `src/bootstrap/`: composition root and app bootstrap.
- `src/demos/`: source of truth for demo metadata, sections, and authored playground files/manifests.
- `src/features/`: feature-oriented shell, playground, navigation, routing, and related components.
- `src/polyfills/`: browser compatibility helpers used by the examples app.
- `playground-examples/`: generated fixtures consumed by the playground iframe sandbox.

## Playground Architecture

The playground itself is also implemented as a PickComponent.

- `examples/src/features/playground/components/code-playground.pick.ts` is the public component surface. It owns reactive state, exposes the component API (`run`, `reset`, `download`, `setCode`), and acts as the single view surface seen by its lifecycle.
- `examples/src/features/playground/initializers/code-playground.initializer.ts` performs initial source loading. It does not touch the DOM; it only loads data and hydrates component state.
- `examples/src/features/playground/lifecycles/code-playground.lifecycle.ts` subscribes to user intents and orchestrates playground behavior: source reloads, preview runs, reset, and download.
- `examples/src/features/playground/components/code-playground.view.ts` is an internal composed view helper used by the component. It manages editor instances and preview rendering, but the lifecycle never talks to it directly.

That split is intentional:

- initializer: preload data
- lifecycle: coordinate behavior
- component: own the view contract
- internal view helpers: keep DOM and editor code composed and small

### Editor And Preview

The editor surface uses CodeMirror `EditorView`, mounted inside the playground component.

- `CodePlaygroundView` creates and owns the editor instances for each tab.
- The component resolves the required DOM elements and passes them into the internal view layer.
- The preview is rendered into a sandboxed iframe using generated `srcdoc`.
- The iframe allows scripts and forms, but not same-origin access. This keeps examples executable while preserving an opaque sandbox.

The preview pipeline is browser-side:

- `playground-source.port.ts` loads the example source files.
- `typescript-transpiler.port.ts` lazy-loads `vendor/typescript-standalone.js` so the examples bundle does not include the TypeScript compiler.
- `playground-preview.port.ts` builds iframe `srcdoc`, injects locale, and injects the runtime import map used by the sandboxed preview.

### Manifest-Driven Examples

All playground examples are manifest-driven.

- Each demo directory under `src/demos/` provides four explicit variants under `variants/`: `en-light`, `en-dark`, `es-light`, and `es-dark`.
- Each variant provides its own `tabs.json` manifest plus the files declared by that manifest.
- During `npm run build:examples`, the build copies those files into `examples/playground-examples/<demo-id>/<variant>/`.
- If a demo is missing any required variant or its `tabs.json`, the build fails fast.

The playground loads all declared files, creates one editor tab per file, and chooses the manifest `entry` file as the runtime entry point when it is provided.

`locale` and `theme` resolve a concrete example variant. Changing either value reloads the active example source instead of mutating the same preview in place.

### Why The Playground Uses Pick Components Too

The goal of `examples/` is not only to display the library, but to exercise it in a realistic app.

That means the playground is dogfooded:

- shell components are Pick Components
- routing and navigation are wired through framework services
- the code playground itself uses Pick Components patterns
- the code executed inside the iframe can bootstrap Pick Components again in isolation

Each preview run creates a fresh iframe sandbox with its own runtime and element registry, which avoids cross-example custom element collisions.

## Adding Or Updating Examples

For any playground example:

1. Create or update a demo folder under `examples/src/demos/`.
2. Add the four required variant folders under `variants/`.
3. Add a `tabs.json` manifest inside each variant folder.
4. Add the files declared by that manifest, for example `hello.example.ts`, `index.html`, `main.ts`, `services.ts`.
5. Set `entry` when the runnable module is not simply the first TypeScript tab.
6. Run `npm run build:examples` to regenerate `examples/playground-examples/`.

`examples/playground-examples/` is build output. Treat `examples/src/demos/` as the authored source of truth.

## TypeScript Notes

`examples/tsconfig.json` is the TypeScript project for this folder.

`assets.d.ts` declares `*.html` and `*.css` imports so editor tooling understands component template/style imports used inside `examples/src/`.

The authored examples use TypeScript 5+ standard decorator emit, but the
component code intentionally avoids requiring `accessor`. The same
`@Reactive count = 0` syntax also works in projects that use
`experimentalDecorators`.

The playground/download build uses:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "experimentalDecorators": false
  }
}
```

Most examples use plain `@Reactive` fields:

```typescript
class Example extends PickComponent {
  @Reactive count = 0;
}
```

`@Reactive accessor count = 0` remains supported, but examples avoid it because
Pick Components treats plain reactive fields as the default authoring style.
Example `11-di` passes in the playground because the decorator supports
standard field emit without `accessor`.

Downloaded example folders use the same rule. Their `scripts/build.mjs` transpiles
the TypeScript source locally with:

- `target: ES2022`
- `module: ESNext`
- `experimentalDecorators: false`
- `sourceMap: true`
- `inlineSources: true`

If a downloaded folder fails with an error mentioning an
`experimentalDecorators` signature, check that the generated build script has
been run. If you are using a custom bootstrap with
`{ decorators: "strict" }`, remove that strict opt-in or switch the project to
standard decorator emit.

## Build Notes

The examples build uses esbuild with these loaders:

- `.html` -> `text`
- `.css` -> `text`
- `.example.ts` -> `text`

That allows Pick Components example shells to import templates and styles directly, and lets the playground load source files as plain text.

The build script also:

- copies browser-ready runtime assets into `examples/vendor/`
- copies `typescript.js` to `examples/vendor/typescript-standalone.js` for lazy browser transpilation
- regenerates `examples/playground-examples/` from `examples/src/demos/`

## Playground Downloads

The playground download button creates a self-contained folder for the active
variant. It includes:

- the original `.ts`, `.html`, and `.css` source tabs
- `vendor/pick-components.js`
- `vendor/typescript-standalone.js`
- `vendor/injectkit.js` when the example imports InjectKit
- `scripts/build.mjs`
- `package.json` with `npm run build` and `npm start`

Run the downloaded folder with:

```bash
npm start
```

That command transpiles TypeScript, generates `.css.js` and `.template.html.js`
text modules for local imports, writes source maps, and serves the folder over
HTTP. Opening `index.html` directly with `file://` is intentionally unsupported.
