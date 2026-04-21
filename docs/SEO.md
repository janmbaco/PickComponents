# SEO-Compatible Delivery

Pick Components supports SEO-friendly public routes through an HTML-first delivery model. Public URLs return complete, navigable HTML, and the browser runtime enhances that document after load.

The important rule is that crawler and browser requests receive the same canonical HTML. Detection can tune cache or observability, but it should not decide whether the page has content.

## Build Output

`npm run build:examples` generates prerendered route files under:

```text
examples/es/<route>/index.html
examples/en/<route>/index.html
```

Each generated page includes:

- canonical and alternate language links;
- real navigation anchors;
- prerender contract attributes for DOM adoption;
- serialized initial state for the playground shell;
- the client bundle as progressive enhancement.

## Local And Nginx Delivery

Both development and production static servers use file-first routing:

```text
/es/01-hello
  -> /es/01-hello/index.html
  -> /es/01-hello
  -> /index.html
```

Static assets with extensions do not use the SPA fallback. A missing `bundle.js` stays a `404`, which prevents broken assets from returning HTML by mistake.

Relevant files:

- `scripts/serve-examples.mjs`
- `scripts/serve-dist.mjs`
- `examples/nginx.conf`

## Docker

The Docker image builds the library and examples, then copies the generated public routes into Nginx:

```bash
docker build -t pick-components .
docker run -p 8080:8080 pick-components
```

After the container starts, public routes such as `/es/01-hello` should return the prerendered page directly.

## Edge Worker

For Cloudflare Workers-style deployments, use:

- `deploy/cloudflare/public-route-worker.mjs`
- `deploy/cloudflare/wrangler.example.toml`

The worker uses the same policy as Nginx: public HTML first, SPA shell only for app-only paths, and no crawler-specific content branch.

## Runtime Adoption

Generated pages mark prerendered hosts with the Pick prerender contract. On first boot, the runtime checks the contract version, selector, root mode, and template hash. Compatible markup is adopted; incompatible markup falls back to normal rendering.

## Related Docs

- Pick vs PickRender: [PICK-VS-PICKRENDER.md](PICK-VS-PICKRENDER.md)
- Rendering architecture: [RENDERING-ARCHITECTURE.md](RENDERING-ARCHITECTURE.md)
- Spanish version: [SEO.es.md](SEO.es.md)
