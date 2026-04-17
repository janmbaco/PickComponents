import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const createBaseConfig = (input, file, minified = false) => ({
  input,
  output: {
    file,
    format: "esm",
    inlineDynamicImports: true,
    sourcemap: true,
  },
  external: [],
  plugins: minified ? [nodeResolve(), createTerserPlugin()] : [nodeResolve()],
});

const createTerserPlugin = () =>
  terser({
    compress: {
      passes: 3,
      drop_console: true,
      pure_funcs: ["console.log", "console.warn", "console.info"],
      dead_code: true,
      conditionals: true,
      evaluate: true,
      booleans: true,
      loops: true,
      unused: true,
      hoist_funs: true,
      hoist_vars: true,
      if_return: true,
      join_vars: true,
      reduce_vars: true,
      side_effects: true,
    },
    mangle: {
      toplevel: true,
      properties: {
        regex: /^_/,
      },
    },
    format: {
      comments: false,
    },
  });

export default [
  createBaseConfig("dist/index.js", "dist/browser/pick-components.js"),
  createBaseConfig("dist/index.js", "dist/browser/pick-components.min.js", true),
  createBaseConfig(
    "dist/bootstrap.js",
    "dist/browser/pick-components-bootstrap.js",
  ),
  createBaseConfig(
    "dist/bootstrap.js",
    "dist/browser/pick-components-bootstrap.min.js",
    true,
  ),
];
