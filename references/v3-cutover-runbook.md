# V3 Release Validation Runbook

## Scope
- This runbook is the authoritative V3 dense-200/dense-500 release checklist.
- It assumes the same-document shadow-root preview, V3 inline editing, and the dense fixtures are already merged.
- Use it for bake validation, manual profiling, and release signoff. It is not a rollback guide.

## One-command validation harness
Run the repeatable validation flow from the repo root before starting manual profiling:

- ensure the reference studio preview is already running, for example `pnpm --filter @builder/reference-studio preview --host 127.0.0.1 --port 4173`
- `pnpm release:validate`
- `pnpm release:validate -- --fixture dense-200`
- `pnpm release:validate -- --fixture dense-500 --headed`

The harness:
- opens the dense fixture URL
- performs one real drag across a valid target
- opens inline edit on a supported node
- scrolls the preview surface
- changes the responsive viewport once
- docks and floats the structure pane once
- prints the tracked perf counter deltas as JSON

It intercepts project persistence requests so local validation stays non-destructive.

## Dense profiling fixtures
- `http://127.0.0.1:4173/?fixture=dense-200`
- `http://127.0.0.1:4173/?fixture=dense-500`

Use the same fixture URLs for:
- manual Chrome profiling
- staging bake verification
- production regression checks when needed

## Release checklist
Run the same flow on `dense-200` and `dense-500`:
1. Open the fixture in a fresh tab.
2. Run `pnpm release:validate -- --fixture <dense-fixture>` and confirm the harness completes cleanly.
3. Confirm a nested-container drag completes.
4. Confirm inline edit opens, accepts text, and commits.
5. Scroll the preview and confirm overlays stay aligned.
6. Change the responsive viewport once.
7. Dock and undock Structure once.
8. Inspect `window.__builderPerf` and record the counters below.

## Perf counters to inspect
Open DevTools and inspect `window.__builderPerf`.

Required counters:
- `geometrySnapshotsPosted`
- `geometryFallbackSnapshots`
- `geometryInvalidations`
- `dragTargetUpdates`
- `overlayOnlyUpdates`
- `engineDragPointerDispatches`
- `candidateResolutionCount`

Expected V3 behavior during steady-state drag:
- `geometryFallbackSnapshots === 0`
- `engineDragPointerDispatches === 0`
- `candidateResolutionCount` increases during real target resolution
- `dragTargetUpdates` only increases when semantic targets change

## Manual Chrome profiling gate
Run the following on both `dense-200` and `dense-500`:

1. Start a Performance recording in Chrome DevTools.
2. Run `pnpm release:validate -- --fixture <dense-fixture> --headed` or execute the release checklist manually against the fixture.
3. Stop recording and inspect the timeline.

Accept only if:
- no full-document measurement sweeps occur during drag
- no long tasks exceed 50 ms in the drag loop
- no preview remount churn occurs during drag
- overlay and menu drift stays within 2 px
- navigator scrolling remains smooth under virtualization

## Environment settings
### Local and staging
- Default to V3 with no override required.
- Deprecated compatibility inputs are accepted but ignored:
  - `VITE_BUILDER_SHELL_VARIANT=legacy`
  - `VITE_BUILDER_SHELL_V3=false`
  - `VITE_BUILDER_INTERACTION_CORE_V3=false`
- Local and development environments emit warnings when those deprecated inputs are supplied.

### Production after cleanup
- Default to V3.
- Deprecated compatibility overrides are accepted but ignored:
  - `VITE_BUILDER_SHELL_VARIANT=legacy`
  - `VITE_BUILDER_SHELL_V3=false`
  - `VITE_BUILDER_INTERACTION_CORE_V3=false`

Recommended production settings:
- leave `VITE_BUILDER_INTERACTION_CORE_V3` unset
- leave `VITE_BUILDER_NAVIGATOR_VIRTUALIZATION` unset
- leave `VITE_BUILDER_SHELL_V3` unset
- leave `VITE_BUILDER_SHELL_VARIANT` unset

## Bake checklist
Before flipping production:
- `pnpm release:validate`
- `pnpm check`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm --filter @builder/reference-studio build`
- run the release harness on `dense-200` and `dense-500`
- manual Chrome profiling passes on `dense-200` and `dense-500`
- staging bake shows no blocker regressions with the counters above

After cleanup:
- monitor the same dense fixtures in staging and production
- keep compatibility warnings visible in local/dev environments
- use follow-up releases, not env coercion, for rollback fixes

## Rollback procedure
The legacy shell rollback path no longer exists after cleanup.

For blocker regressions:
1. Capture the failing dense fixture, perf counters, and reproduction steps.
2. Open a hotfix against the V3 shell.
3. Re-run the dense `200` and `500` smoke flows plus the automated gates before redeploying.

## Exit criteria for cleanup release
Legacy deletion is complete when:
- one stable production release cycle with V3 as the default has already passed
- no blocker regressions occurred during that cycle
- dense profiling and automated gates remain green
