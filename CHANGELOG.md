# Changelog

All notable changes to Svelte Visual Builder are documented here.

This project uses semantic versioning for workspace package releases:

- `MAJOR` changes can include breaking schema, SDK, runtime, adapter, or public import changes.
- `MINOR` changes add features, APIs, docs, import coverage, or integration capabilities in a backward-compatible way.
- `PATCH` changes fix bugs, tighten behavior, improve tests, or clarify docs without changing public contracts.

Schema serialization versions are tracked separately in `@builder/schema` as `BUILDER_SCHEMA_VERSION` and `BUILDER_PACKAGE_VERSION`.

## [Unreleased]

- No unreleased changes documented yet.

## [0.2.7] - 2026-04-30

### Added

- Expanded host SDK, plugin API, adapter, and runtime integration coverage for custom editor/runtime extension points.
- Added runtime component forwarding support and tests for builder attributes, class names, styles, props, and children in custom Svelte runtime components.
- Broadened AI creation and editing test coverage around the editor AI tool surface.

### Changed

- Updated reference studio bundle budgets to match the current deferred editor JavaScript and editor CSS output.

## [0.2.6] - 2026-04-30

### Fixed

- Fixed margin and padding dimension controls so unlinking equal side values stays unlinked instead of immediately normalizing back into a linked CSS shorthand.
- Preserved CSS-compatible storage for explicitly unlinked equal dimensions by serializing them as four-value box shorthand.

### Tests

- Added regression coverage for normalizing and serializing explicitly unlinked matching dimension values.

## [0.2.5] - 2026-04-30

### Changed

- Smoothed drag-and-drop targeting from the Elements panel into the canvas, with larger and more stable insertion hit zones.
- Made `Container` and `Grid Container` palette drags use the same visible before/after insertion bands as content elements when dropping between existing children.
- Improved empty-container and container-interior affordances so users can intentionally drop inside a container without pixel-perfect aiming.
- Added selective `@dnd-kit/svelte` droppable registration for stable canvas, slot, empty-container, and navigator regions while keeping the custom resolver as the final semantic authority.
- Improved palette tile drag start reliability and kept click-to-insert behavior intact.
- Clarified inside-vs-before-vs-after visual feedback so the highlighted target matches the actual resolved drop intent.

### Fixed

- Fixed new `Container` drops over filled containers being promoted above/outside the target instead of landing inside or between children.
- Fixed layout-node drag commits so explicit `into`, `before`, and `after` targets are respected by the core engine.

### Tests

- Added unit coverage for forgiving insertion zones, empty-container drops, container edge drops, target stability, and layout-node drag commits.
- Added Playwright coverage for palette drag overlays, click-to-insert preservation, dropping into filled containers, and using insertion bands with `Container` palette items.

## [0.2.0] - 2026-04-29

### Added

- Added full end-to-end builder documentation covering architecture, schema, editor SDK, runtime rendering, SvelteKit integration, host extensions, imports, media, AI, production readiness, and troubleshooting.
- Added expanded SDK embedding guidance for host extensions, custom elements, dynamic providers, runtime components, and runtime/editor parity.
- Added a README documentation section linking the full builder reference and focused SDK embedding guide.

### Changed

- Bumped the root workspace, reference apps, and all builder package manifests from `0.1.0` to `0.2.0`.
- Updated the README top matter to identify the current release as version `0.2.0`.

### Notes

- The serialized Builder schema/package constants remain at `2.0.0`; those describe project JSON compatibility, not the workspace npm package version.
