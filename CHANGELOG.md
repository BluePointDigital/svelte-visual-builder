# Changelog

All notable changes to Svelte Visual Builder are documented here.

This project uses semantic versioning for workspace package releases:

- `MAJOR` changes can include breaking schema, SDK, runtime, adapter, or public import changes.
- `MINOR` changes add features, APIs, docs, import coverage, or integration capabilities in a backward-compatible way.
- `PATCH` changes fix bugs, tighten behavior, improve tests, or clarify docs without changing public contracts.

Schema serialization versions are tracked separately in `@builder/schema` as `BUILDER_SCHEMA_VERSION` and `BUILDER_PACKAGE_VERSION`.

## [Unreleased]

### Added

- Added an MIT open source license and package manifest metadata for the workspace packages.

### Fixed

- Fixed published/runtime layout drift where padded `width: 100%` children could overflow grid or flex tracks by scoping `box-sizing: border-box` to builder-rendered runtime content.
- Fixed standalone image nodes so default media sizing shrinks safely inside flex/grid containers instead of overflowing the selected parent.

## [0.2.8] - 2026-05-01

### Added

- Added undo and redo actions to the editor footer for quick history navigation from the left shell.
- Added a collapsed-sidebar preview mode that expands the canvas and suppresses editor selection chrome while keeping preview links disabled to avoid accidental navigation.
- Added a dedicated full-workspace management view for the Menu shell area so Documents, Site Editor, Preview Presets, Assignments, Components, and Import Diagnostics have room to render.
- Added Border Radius controls for `Container` and `Grid Container` style panels.
- Added the full exported open-source homepage as the reference studio default shipping/demo page fixture.
- Added dropdown-backed animation, background position, and background size controls for faster inspector selection.

### Changed

- Overhauled Page Settings, History, Menu, and Globals panels with dark-native cards, readable loading states, tighter section rhythm, and consistent shell styling.
- Moved the commonly used Elements entry to the left-panel header and removed redundant shell/navigation icons from crowded header and footer regions.
- Tightened container Sizing & Overflow controls by replacing large range sliders with compact value/unit inputs.
- Tightened Position & Layer controls by grouping Top, Right, Bottom, and Left into a single side-by-side Offset control and removing range sliders.
- Removed remaining low-value numeric range sliders from Gap, Width, Max Width, Min Height, Order, Transition Duration, Animation Duration, and Perspective controls.
- Tightened Responsive Visibility into inline desktop/tablet/mobile toggles and condensed the Structure navigator indentation by removing redundant type badges.
- Updated the reference studio default header and homepage CTAs for the open-source project, including GitHub and docs links.
- Improved responsive/sidebar layout behavior so collapsed preview mode uses the available canvas area instead of leaving an empty sidebar gutter.

### Fixed

- Fixed light/white padded gutters and unreadable loading cards that appeared inside dark shell panels.
- Fixed shell tab and panel state mismatches that could leave Globals or management content visible after returning to node editing.
- Fixed dark select/dropdown readability in updated settings and inspector controls.
- Fixed preview mode so hidden nodes and empty "Drop items" container placeholders are suppressed for a true front-end preview.
- Fixed hidden nodes in authoring mode so they remain selectable while appearing visibly muted instead of disappearing from the canvas.
- Fixed default/effective spacing values by showing inherited margin and padding defaults as muted placeholders in empty inputs.
- Fixed root runtime slot spacing so assigned header, page, and footer documents can render seamlessly when their own styles do not add gaps.

### Tests

- Added inspector contract coverage for container Border Radius controls, compact sizing inputs, and grouped slider-free positioning offsets.
- Added inspector contract coverage for slider-free controls plus animation/background dropdown metadata.
- Added runtime coverage for authoring-mode hidden node rendering.

## [0.2.7] - 2026-04-30

### Added

- Expanded host SDK, plugin API, adapter, and runtime integration coverage for custom editor/runtime extension points.
- Added runtime component forwarding support and tests for builder attributes, class names, styles, props, and children in custom Svelte runtime components.
- Broadened AI creation and editing test coverage around the editor AI tool surface.
- Added Template Library export actions for saved library items.
- Added full-page template saving from the Template Library, separate from selection-based reusable snippets.

### Changed

- Updated reference studio bundle budgets to match the current deferred editor JavaScript and editor CSS output.
- Improved Globals panel routing so Classes, Variables, Components, and Library render their own management views consistently.

### Fixed

- Fixed Globals tab state drift where the Library tab could appear selected while Classes rendered underneath.
- Fixed canvas node selection after template import so the left editor panel returns to Content/Style/Advanced editing instead of staying stuck on the Globals Library body.
- Fixed Variables tab refresh behavior after switching between shell sections.
- Fixed unreadable native select dropdown options in dark inspector controls.
- Fixed the top-right responsive selector so tablet/mobile editing modes can reopen the responsive controls and return to desktop mode.

### Tests

- Added editor regression coverage for full-page template saving, Globals tab restoration, and returning from Globals Library to canvas node editing.

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
