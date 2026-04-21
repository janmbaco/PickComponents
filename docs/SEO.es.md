# Entrega Compatible con SEO

Pick Components soporta rutas publicas SEO-friendly con un modelo HTML-first. Las URLs publicas devuelven HTML completo y navegable, y el runtime del navegador mejora ese documento despues de cargar.

La regla importante es que crawlers y navegadores reciben el mismo HTML canonico. La deteccion puede ajustar cache u observabilidad, pero no debe decidir si la pagina tiene contenido.

## Salida de Build

`npm run build:examples` genera archivos prerenderizados bajo:

```text
examples/es/<ruta>/index.html
examples/en/<route>/index.html
```

Cada pagina generada incluye:

- enlaces canonical y alternate por idioma;
- anchors reales de navegacion;
- atributos del contrato de prerender para adopcion de DOM;
- estado inicial serializado para el shell del playground;
- el bundle cliente como enhancement progresivo.

## Entrega Local y Nginx

Tanto el servidor de desarrollo como el servidor estatico de produccion usan rutas file-first:

```text
/es/01-hello
  -> /es/01-hello/index.html
  -> /es/01-hello
  -> /index.html
```

Los assets estaticos con extension no usan fallback SPA. Un `bundle.js` inexistente sigue siendo `404`, evitando que assets rotos devuelvan HTML por error.

Archivos relevantes:

- `scripts/serve-examples.mjs`
- `scripts/serve-dist.mjs`
- `examples/nginx.conf`

## Docker

La imagen Docker compila la libreria y los examples, y despues copia las rutas publicas generadas a Nginx:

```bash
docker build -t pick-components .
docker run -p 8080:8080 pick-components
```

Cuando el contenedor arranca, rutas publicas como `/es/01-hello` deben devolver directamente la pagina prerenderizada.

## Edge Worker

Para despliegues estilo Cloudflare Workers, usa:

- `deploy/cloudflare/public-route-worker.mjs`
- `deploy/cloudflare/wrangler.example.toml`

El worker usa la misma politica que Nginx: HTML publico primero, shell SPA solo para rutas app-only, y ninguna rama de contenido especial para crawlers.

## Adopcion en Runtime

Las paginas generadas marcan los hosts prerenderizados con el contrato de prerender de Pick. En el primer arranque, el runtime comprueba version del contrato, selector, modo de root y hash del template. Si el markup es compatible, se adopta; si no, se usa el render normal como fallback.

## Documentos Relacionados

- Pick vs PickRender: [PICK-VS-PICKRENDER.es.md](PICK-VS-PICKRENDER.es.md)
- Arquitectura de renderizado: [RENDERING-ARCHITECTURE.es.md](RENDERING-ARCHITECTURE.es.md)
- Version en ingles: [SEO.md](SEO.md)
