---
description: "Use when writing, reviewing, translating, or restructuring project documentation in docs/**, README.md, and architecture/design markdown files."
applyTo: "docs/**, README.md"
---

# Documentation Instructions

## Language Policy

- English is the canonical language for project documentation.
- Write new docs in English by default.
- Optional translations are allowed as companion files (for example, `*.es.md`).
- Keep semantic parity between canonical English docs and translations.
- If there is a conflict, the English version is the source of truth.

## Git and Repository Policy

- Documentation under `docs/**` is versioned and must be committed to Git.
- Keep architecture decisions, usage guides, and design rationale in repository docs.
- Never commit secrets, credentials, private tokens, or internal confidential data.
- If a document contains sensitive operational details, move it to a private location outside this repository.

## Authoring Conventions

- Use concise, technical, actionable language.
- Prefer "link, do not duplicate": link existing docs instead of repeating long sections.
- Keep headings stable so links remain valid.
- Include short examples when they clarify behavior or integration points.
- Mark historical plans clearly as draft/proposal if they are not current architecture.

## Maintenance Rules

- When architecture changes in `src/**`, update affected docs in the same change set when possible.
- Preserve filename consistency for discoverability (UPPERCASE topic files are acceptable in this repo).
- Validate cross-links after renames/moves.

## Suggested References

- Architecture overview: [docs/RENDERING-ARCHITECTURE.md](../../docs/RENDERING-ARCHITECTURE.md)
- DI model: [docs/DEPENDENCY-INJECTION.md](../../docs/DEPENDENCY-INJECTION.md)
- Pick vs PickRender: [docs/SMART-VS-SMARTRENDER.md](../../docs/SMART-VS-SMARTRENDER.md)
- Project onboarding: [README.md](../../README.md)
