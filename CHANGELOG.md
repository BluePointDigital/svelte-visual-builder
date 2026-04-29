# Changelog

All notable changes to Svelte Visual Builder are documented here.

This project uses semantic versioning for workspace package releases:

- `MAJOR` changes can include breaking schema, SDK, runtime, adapter, or public import changes.
- `MINOR` changes add features, APIs, docs, import coverage, or integration capabilities in a backward-compatible way.
- `PATCH` changes fix bugs, tighten behavior, improve tests, or clarify docs without changing public contracts.

Schema serialization versions are tracked separately in `@builder/schema` as `BUILDER_SCHEMA_VERSION` and `BUILDER_PACKAGE_VERSION`.

## [Unreleased]

- No unreleased changes documented yet.

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

