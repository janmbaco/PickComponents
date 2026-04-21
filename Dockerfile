# Build stage
FROM docker.io/library/node:22-alpine AS builder

WORKDIR /build

# Copy package files and install
COPY package*.json ./
RUN npm ci

# Copy source and config
COPY tsconfig.json rollup.config.mjs ./
COPY scripts/ ./scripts/
COPY src/ ./src/
COPY examples/ ./examples/

# Build library and examples (includes playground bundles)
RUN npm run build:lib && npm run build:examples

# Production stage — lightweight SPA server
FROM docker.io/library/nginx:alpine

# Core app assets
COPY --from=builder /build/examples/index.html /usr/share/nginx/html/
COPY --from=builder /build/examples/bundle.js /usr/share/nginx/html/
COPY --from=builder /build/examples/bundle.js.map /usr/share/nginx/html/
COPY --from=builder /build/examples/pico.min.css /usr/share/nginx/html/
COPY --from=builder /build/examples/styles.css /usr/share/nginx/html/

# Playground runtime assets
COPY --from=builder /build/examples/vendor/ /usr/share/nginx/html/vendor/

# Playground example source files
COPY --from=builder /build/examples/playground-examples/ /usr/share/nginx/html/playground-examples/

# SEO prerendered public routes
COPY --from=builder /build/examples/es/ /usr/share/nginx/html/es/
COPY --from=builder /build/examples/en/ /usr/share/nginx/html/en/

COPY examples/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
