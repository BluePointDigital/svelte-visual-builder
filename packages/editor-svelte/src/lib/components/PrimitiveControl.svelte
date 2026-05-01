<script lang="ts">
  import { onDestroy } from "svelte";
  import EditorShellIcon from "./EditorShellIcon.svelte";
  import { createDebouncedPrimitiveCommitController } from "./PrimitiveControl.draft";
  import type { JsonValue } from "@builder/schema";
  import type {
    PrimitiveControlInput,
    PrimitiveControlState,
    PrimitiveDimensionsValue,
    PrimitiveMediaValue,
    PrimitiveSliderValue,
    PrimitiveUrlValue,
  } from "./PrimitiveControl.helpers";
  import {
    isTokenLikeValue,
    normalizeDimensionsValue,
    normalizeMediaValue,
    normalizeSliderValue,
    normalizeUrlValue,
    parseJsonLikeValue,
    resolvePrimitiveControl,
    stringifyPrimitiveValue,
  } from "./PrimitiveControl.helpers";
  import type { BuilderMediaAssetMetadata } from "../media";

  type PrimitiveControlStateView = Omit<
    PrimitiveControlState,
    "activeStateTab"
  > & { activeStateTab?: string };
  type DynamicProviderOption = {
    id: string;
    label: string;
    group: string;
    categories?: string[];
  };
  type DynamicBindingView = {
    id: string;
    providerId: string;
    label: string;
    category?: string;
    fallback?: JsonValue;
    before?: string;
    after?: string;
    args?: Record<string, JsonValue>;
    preview?: string;
  };

  export let primitive: PrimitiveControlInput = null;
  export let value: JsonValue = null;
  export let label = "";
  export let description = "";
  export let placeholder = "";
  export let fieldType = "";
  export let controlPath = "";
  export let layoutDisplay = "";
  export let layoutDirection = "";
  export let disabled = false;
  export let error = "";
  export let state: PrimitiveControlState | string | null | undefined = {};
  export let dynamicProviders: DynamicProviderOption[] = [];
  export let dynamicBinding: DynamicBindingView | undefined = undefined;
  export let mediaAssets: BuilderMediaAssetMetadata[] = [];
  export let mediaDiagnostics: string[] = [];
  export let onChange: (nextValue: JsonValue) => void = () => {};
  export let onReset: () => void = () => {};
  export let onStateTabChange: (nextStateTab: string) => void = () => {};
  export let onBlur: () => void = () => {};
  export let onDynamicSelect: (providerId: string) => void = () => {};
  export let onDynamicClear: () => void = () => {};
  export let onMediaRefresh: () => Promise<void> | void = () => {};
  export let onMediaUpload: (file: File) => Promise<BuilderMediaAssetMetadata> = async () => {
    throw new Error("Media uploads are not configured.");
  };
  export let onMediaUpdate: (
    assetId: string,
    patch: Partial<BuilderMediaAssetMetadata>,
  ) => Promise<BuilderMediaAssetMetadata | undefined> = async () => undefined;
  export let onMediaDelete: (assetId: string) => Promise<void> = async () => {};

  let sectionExpanded = true;
  let sectionStateKey = "";
  let controlSyncKey = "";
  let stateObject: PrimitiveControlStateView = {};
  let textDraft = "";
  let textDraftDirty = false;
  let numberDraft = "";
  let numberDraftDirty = false;
  let dimensionsValue: PrimitiveDimensionsValue = {};
  let dimensionsPlaceholderValue: PrimitiveDimensionsValue = {};
  let dimensionsDraftDirty = false;
  let urlValue: PrimitiveUrlValue = {};
  let urlDraftDirty = false;
  let mediaValue: PrimitiveMediaValue = {};
  let mediaDraftDirty = false;
  let mediaPickerOpen = false;
  let mediaPickerStatus = "";
  let mediaSelectedAssetId = "";
  let mediaMetadataDraft: Partial<BuilderMediaAssetMetadata> = {};
  let colorDraft = "";
  let colorDraftDirty = false;
  const draftCommitController = createDebouncedPrimitiveCommitController();
  const colorCommitController = createDebouncedPrimitiveCommitController(50);
  const shellIcons = new Set([
    "assignment",
    "document-browser",
    "menu",
    "elements",
    "editor",
    "page-settings",
    "settings",
    "history",
    "globals",
    "revision",
    "responsive",
    "navigator",
    "preview",
    "search",
    "help",
    "close",
    "expand",
    "chevronLeft",
    "chevronRight",
    "dots",
    "desktop",
    "tablet",
    "mobile",
    "component",
    "align-left",
    "align-center",
    "align-right",
    "align-justify",
    "items-start",
    "items-center",
    "items-end",
    "items-stretch",
    "justify-start",
    "justify-center",
    "justify-end",
    "space-between",
    "space-around",
    "space-evenly",
    "justify-start-horizontal",
    "justify-center-horizontal",
    "justify-end-horizontal",
    "space-between-horizontal",
    "space-around-horizontal",
    "space-evenly-horizontal",
    "justify-start-vertical",
    "justify-center-vertical",
    "justify-end-vertical",
    "space-between-vertical",
    "space-around-vertical",
    "space-evenly-vertical",
    "align-top",
    "align-middle",
    "align-bottom",
    "align-stretch",
    "items-start-horizontal",
    "items-center-horizontal",
    "items-end-horizontal",
    "items-stretch-horizontal",
    "items-start-vertical",
    "items-center-vertical",
    "items-end-vertical",
    "items-stretch-vertical",
    "arrow-up",
    "arrow-down",
    "block",
    "flex",
    "grid",
    "flex-row",
    "flex-row-reverse",
    "flex-column",
    "flex-column-reverse",
    "wrap",
    "wrap-reverse",
    "nowrap",
  ]);

  $: resolved = resolvePrimitiveControl(primitive, label, description);
  $: stateObject = (
    typeof state === "string" ? { activeStateTab: state } : (state ?? {})
  ) as PrimitiveControlState & { activeStateTab?: string };
  $: disabled = Boolean(
    disabled || stateObject.disabled || stateObject.readOnly,
  );
  $: activeStateTab =
    stateObject.activeStateTab ?? resolved.stateTabs[0] ?? "normal";
  $: responsiveBreakpointLabel =
    stateObject.breakpointLabel ?? stateObject.breakpoint ?? "";
  $: showResponsiveChip = Boolean(
    (stateObject.responsive || resolved.responsive) && responsiveBreakpointLabel,
  );
  $: responsiveStatusLabel = stateObject.hasOverride
    ? "override"
    : stateObject.inherited
      ? "inherited"
      : "";
  $: if (resolved.kind === "section") {
    const nextKey = `${resolved.label}|${resolved.defaultCollapsed ? "1" : "0"}|${stateObject.collapsed ? "1" : "0"}`;
    if (nextKey !== sectionStateKey) {
      sectionStateKey = nextKey;
      sectionExpanded = !(
        stateObject.collapsed ??
        resolved.defaultCollapsed ??
        false
      );
    }
  }

  $: rawValue = stringifyPrimitiveValue(value);
  $: nextControlSyncKey = [
    controlPath,
    resolved.kind,
    activeStateTab,
    stateObject.breakpoint ?? "desktop",
    rawValue,
  ].join("|");
  $: if (nextControlSyncKey !== controlSyncKey) {
    controlSyncKey = nextControlSyncKey;
    draftCommitController.cancel();
    textDraftDirty = false;
    numberDraftDirty = false;
    dimensionsDraftDirty = false;
    urlDraftDirty = false;
    mediaDraftDirty = false;
    colorCommitController.cancel();
    colorDraftDirty = false;
    colorDraft = rawValue;
  }
  $: selectValue = rawValue;
  $: choiceValues = Array.isArray(value)
    ? value.map((item) => stringifyPrimitiveValue(item))
    : selectValue
      ? [selectValue]
      : [];
  $: sliderValue = normalizeSliderValue(value, resolved.units[0]?.value ?? "");
  $: if (resolved.kind === "dimensions" && !dimensionsDraftDirty) {
    dimensionsValue = normalizeDimensionsValue(
      value,
      resolved.units[0]?.value ?? "px",
    );
  }
  $: dimensionsPlaceholderValue =
    resolved.kind === "dimensions"
      ? normalizeDimensionsValue(
          resolved.placeholder || placeholder,
          resolved.units[0]?.value ?? "px",
        )
      : {};
  $: if (resolved.kind === "url" && !urlDraftDirty) {
    urlValue = normalizeUrlValue(value);
  }
  $: if (resolved.kind === "media" && !mediaDraftDirty) {
    mediaValue = normalizeMediaValue(value);
  }
  $: if (resolved.kind === "color" && !colorDraftDirty) {
    colorDraft = rawValue;
  }
  $: dynamicProvidersByGroup = groupDynamicProviders(dynamicProviders);
  $: if (
    (resolved.fieldType === "number" || fieldType === "number") &&
    !numberDraftDirty
  ) {
    numberDraft = stringifyPrimitiveValue(value);
  }
  $: if (
    !(
      resolved.kind === "dimensions" ||
      resolved.kind === "url" ||
      resolved.kind === "media" ||
      resolved.fieldType === "number" ||
      fieldType === "number"
    ) &&
    !textDraftDirty
  ) {
    textDraft = stringifyPrimitiveValue(value);
  }

  function commit(nextValue: JsonValue) {
    if (disabled) {
      return;
    }

    onChange(nextValue);
  }

  function commitString(nextValue: string) {
    commit(nextValue as JsonValue);
  }

  function commitBoolean(nextValue: boolean) {
    commit(nextValue as JsonValue);
  }

  function commitNumber(nextValue: number | undefined) {
    commit(
      nextValue === undefined || Number.isNaN(nextValue)
        ? null
        : (nextValue as JsonValue),
    );
  }

  function commitJson(nextValue: string) {
    commit(parseJsonLikeValue(nextValue));
  }

  function scheduleCommit(callback: () => void) {
    draftCommitController.schedule(callback);
  }

  function commitTextDraft() {
    textDraftDirty = false;
    commitString(textDraft);
  }

  function commitNumberDraft() {
    numberDraftDirty = false;
    commitNumber(numberDraft.trim() === "" ? undefined : Number(numberDraft));
  }

  function handleDraftEnter(event: KeyboardEvent, commitFn: () => void) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    draftCommitController.flush(commitFn);
  }

  function handleDraftBlur(commitFn: () => void) {
    draftCommitController.flush(commitFn);
    onBlur();
  }

  function toggleSection() {
    sectionExpanded = !sectionExpanded;
  }

  function toggleChoice(optionValue: string) {
    if (resolved.multiple) {
      const next = new Set(choiceValues);
      next.has(optionValue) ? next.delete(optionValue) : next.add(optionValue);
      commit(Array.from(next) as unknown as JsonValue);
      return;
    }

    commitString(optionValue);
  }

  function updateSlider(
    nextValue: string,
    nextUnit = sliderValue.unit ?? resolved.units[0]?.value ?? "",
  ) {
    const parsed = normalizeSliderValue(nextValue, nextUnit);
    const resolvedUnit = parsed.unit ?? nextUnit;
    const parsedValue = parsed.value;
    const numeric =
      parsedValue === "" || parsedValue === undefined
        ? undefined
        : typeof parsedValue === "number"
          ? parsedValue
          : Number(parsedValue);
    const committedValue =
      typeof parsedValue === "string" &&
      parsedValue.trim() !== "" &&
      Number.isNaN(numeric)
        ? parsedValue
        : numeric;
    if (resolved.range || resolved.handles === "range") {
      commit({
        value: committedValue,
        unit: resolvedUnit,
        start: committedValue,
        end: committedValue,
      } as unknown as JsonValue);
      return;
    }

    if (resolved.units.length || sliderValue.unit) {
      commit({
        value: committedValue,
        unit: resolvedUnit,
      } as unknown as JsonValue);
      return;
    }

    if (typeof committedValue === "string") {
      commitString(committedValue);
      return;
    }

    commitNumber(committedValue);
  }

  function updateDimensions(patch: Partial<PrimitiveDimensionsValue>) {
    const next = {
      ...dimensionsValue,
      ...patch,
    };
    if (next.linked) {
      const linkedValue =
        patch.top ??
        patch.right ??
        patch.bottom ??
        patch.left ??
        next.top ??
        next.right ??
        next.bottom ??
        next.left ??
        "";
      next.top = linkedValue;
      next.right = linkedValue;
      next.bottom = linkedValue;
      next.left = linkedValue;
    }
    dimensionsValue = next;
    dimensionsDraftDirty = true;
    scheduleCommit(commitDimensionsDraft);
  }

  function updateUrl(patch: Partial<PrimitiveUrlValue>) {
    urlValue = { ...urlValue, ...patch };
    urlDraftDirty = true;
    scheduleCommit(commitUrlDraft);
  }

  function updateMedia(patch: Partial<PrimitiveMediaValue>) {
    mediaValue = { ...mediaValue, ...patch };
    mediaDraftDirty = true;
    scheduleCommit(commitMediaDraft);
  }

  function updateTextDraft(nextValue: string) {
    textDraft = nextValue;
    textDraftDirty = true;
    scheduleCommit(commitTextDraft);
  }

  function updateNumberDraft(nextValue: string) {
    numberDraft = nextValue;
    numberDraftDirty = true;
    scheduleCommit(commitNumberDraft);
  }

  function updateColorDraft(nextValue: string) {
    colorDraft = nextValue;
    colorDraftDirty = true;
    colorCommitController.schedule(commitColorDraft);
  }

  function commitDimensionsDraft() {
    dimensionsDraftDirty = false;
    commit(dimensionsValue as unknown as JsonValue);
  }

  function commitUrlDraft() {
    urlDraftDirty = false;
    commit(urlValue as unknown as JsonValue);
  }

  function commitMediaDraft() {
    mediaDraftDirty = false;
    commit(mediaValue as unknown as JsonValue);
  }

  async function openMediaPicker() {
    mediaPickerOpen = !mediaPickerOpen;
    if (mediaPickerOpen) {
      mediaPickerStatus = "Loading media";
      try {
        await onMediaRefresh();
        mediaPickerStatus = "";
      } catch (error) {
        mediaPickerStatus =
          error instanceof Error ? error.message : "Unable to load media.";
      }
    }
  }

  function selectMediaAsset(asset: BuilderMediaAssetMetadata) {
    mediaValue = {
      src: asset.url,
      alt: asset.alt,
      id: asset.id,
      title: asset.title,
    };
    mediaDraftDirty = false;
    commit(mediaValue as unknown as JsonValue);
    mediaPickerOpen = false;
  }

  async function handleMediaFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    mediaPickerStatus = "Uploading media";
    try {
      const asset = await onMediaUpload(file);
      selectMediaAsset(asset);
      mediaPickerStatus = "";
    } catch (error) {
      mediaPickerStatus =
        error instanceof Error ? error.message : "Media upload failed.";
    }
  }

  function startMediaMetadataEdit(asset: BuilderMediaAssetMetadata) {
    mediaSelectedAssetId = asset.id;
    mediaMetadataDraft = {
      alt: asset.alt ?? "",
      title: asset.title ?? "",
      caption: asset.caption ?? "",
    };
  }

  async function saveMediaMetadata(assetId: string) {
    mediaPickerStatus = "Saving media details";
    try {
      const updated = await onMediaUpdate(assetId, mediaMetadataDraft);
      if (updated && (mediaValue.id === assetId || mediaValue.src === updated.url)) {
        mediaValue = {
          ...mediaValue,
          src: updated.url,
          alt: updated.alt,
          title: updated.title,
        };
        commit(mediaValue as unknown as JsonValue);
      }
      mediaSelectedAssetId = "";
      mediaMetadataDraft = {};
      await onMediaRefresh();
      mediaPickerStatus = "";
    } catch (error) {
      mediaPickerStatus =
        error instanceof Error ? error.message : "Unable to save media details.";
    }
  }

  async function removeMediaAsset(assetId: string) {
    mediaPickerStatus = "Removing media";
    try {
      await onMediaDelete(assetId);
      if (mediaValue.id === assetId) {
        commit(null);
      }
      await onMediaRefresh();
      mediaPickerStatus = "";
    } catch (error) {
      mediaPickerStatus =
        error instanceof Error ? error.message : "Unable to remove media.";
    }
  }

  function commitColorDraft() {
    if (!colorDraftDirty) {
      return;
    }
    colorDraftDirty = false;
    commitString(colorDraft);
  }

  function handleColorBlur() {
    colorCommitController.flush(commitColorDraft);
    onBlur();
  }

  function defaultColorValue() {
    const displayValue = colorDraftDirty ? colorDraft : rawValue;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(displayValue)) {
      return displayValue;
    }

    return "#000000";
  }

  function groupDynamicProviders(providers: DynamicProviderOption[]) {
    const groups = new Map<string, DynamicProviderOption[]>();
    for (const provider of providers) {
      const group = provider.group || "Dynamic";
      groups.set(group, [...(groups.get(group) ?? []), provider]);
    }
    return Array.from(groups.entries()).map(([group, items]) => ({
      group,
      items,
    }));
  }

  function resolveShellIconName(value: string | undefined) {
    if (!value) {
      return undefined;
    }

    const normalizedValue = value.trim();
    const normalizedPath = controlPath.trim().toLowerCase();
    const normalizedDisplay = layoutDisplay.trim().toLowerCase();
    const normalizedDirection =
      layoutDirection.trim().toLowerCase().startsWith("column") ? "column" : "row";
    const isJustifyContentControl = /justify[-.]?content/.test(normalizedPath);
    const isAlignItemsControl = /align[-.]?items/.test(normalizedPath);
    const isAlignContentControl = /align[-.]?content/.test(normalizedPath);
    const isJustifyItemsControl = /justify[-.]?items/.test(normalizedPath);

    const horizontalDistributionIcons: Record<string, string> = {
      "justify-start": "justify-start-horizontal",
      "justify-center": "justify-center-horizontal",
      "justify-end": "justify-end-horizontal",
      "space-between": "space-between-horizontal",
      "space-around": "space-around-horizontal",
      "space-evenly": "space-evenly-horizontal",
    };
    const verticalDistributionIcons: Record<string, string> = {
      "justify-start": "justify-start-vertical",
      "justify-center": "justify-center-vertical",
      "justify-end": "justify-end-vertical",
      "space-between": "space-between-vertical",
      "space-around": "space-around-vertical",
      "space-evenly": "space-evenly-vertical",
    };
    const horizontalAlignmentIcons: Record<string, string> = {
      "items-start": "items-start-horizontal",
      "items-center": "items-center-horizontal",
      "items-end": "items-end-horizontal",
      "items-stretch": "items-stretch-horizontal",
    };
    const verticalAlignmentIcons: Record<string, string> = {
      "items-start": "items-start-vertical",
      "items-center": "items-center-vertical",
      "items-end": "items-end-vertical",
      "items-stretch": "items-stretch-vertical",
    };

    if (normalizedDisplay === "flex") {
      if (isJustifyContentControl) {
        return (
          (normalizedDirection === "column"
            ? verticalDistributionIcons[normalizedValue]
            : horizontalDistributionIcons[normalizedValue]) ??
          (shellIcons.has(normalizedValue) ? normalizedValue : undefined)
        );
      }
      if (isAlignItemsControl) {
        return (
          (normalizedDirection === "column"
            ? horizontalAlignmentIcons[normalizedValue]
            : verticalAlignmentIcons[normalizedValue]) ??
          (shellIcons.has(normalizedValue) ? normalizedValue : undefined)
        );
      }
      if (isAlignContentControl) {
        return (
          (normalizedDirection === "column"
            ? {
                ...horizontalAlignmentIcons,
                ...horizontalDistributionIcons,
              }[normalizedValue]
            : {
                ...verticalAlignmentIcons,
                ...verticalDistributionIcons,
              }[normalizedValue]) ??
          (shellIcons.has(normalizedValue) ? normalizedValue : undefined)
        );
      }
    }

    if (normalizedDisplay === "grid") {
      if (isJustifyContentControl) {
        return horizontalDistributionIcons[normalizedValue] ??
          (shellIcons.has(normalizedValue) ? normalizedValue : undefined);
      }
      if (isAlignContentControl) {
        return ({
          ...verticalAlignmentIcons,
          ...verticalDistributionIcons,
        }[normalizedValue]) ??
          (shellIcons.has(normalizedValue) ? normalizedValue : undefined);
      }
      if (isJustifyItemsControl) {
        return horizontalAlignmentIcons[normalizedValue] ??
          (shellIcons.has(normalizedValue) ? normalizedValue : undefined);
      }
      if (isAlignItemsControl) {
        return verticalAlignmentIcons[normalizedValue] ??
          (shellIcons.has(normalizedValue) ? normalizedValue : undefined);
      }
    }

    return shellIcons.has(normalizedValue) ? normalizedValue : undefined;
  }

  onDestroy(() => {
    draftCommitController.cancel();
    colorCommitController.cancel();
  });
</script>

{#if resolved.kind === "section"}
  <section
    class={`primitive-control primitive-control--section primitive-control--density-${resolved.density ?? "default"}`}
  >
    <button
      type="button"
      class="primitive-control__section-button"
      aria-expanded={sectionExpanded}
      {disabled}
      onclick={toggleSection}
    >
      <span class="primitive-control__section-mark"
        >{sectionExpanded ? "▾" : "▸"}</span
      >
      <span class="primitive-control__section-copy">
        <strong>{resolved.label}</strong>
        {#if resolved.description}<span>{resolved.description}</span>{/if}
      </span>
      {#if resolved.section?.badge !== undefined}<span
          class="primitive-control__badge">{resolved.section.badge}</span
        >{/if}
    </button>

    {#if sectionExpanded}
      <div class="primitive-control__section-body">
        <slot />
      </div>
    {/if}
  </section>
{:else}
  <section
    class={`primitive-control primitive-control--kind-${resolved.kind}`}
    class:primitive-control--compact={resolved.kind === "slider" &&
      resolved.showRange === false}
    class:primitive-control--disabled={disabled}
  >
    <header class="primitive-control__header">
      <div class="primitive-control__title-row">
        <div class="primitive-control__copy">
          <strong>{resolved.label}</strong>
          {#if resolved.description}<span>{resolved.description}</span>{/if}
        </div>

        <div class="primitive-control__chips">
          {#if showResponsiveChip}
            <span
              class="primitive-control__chip primitive-control__chip--icon"
              title={`Responsive · ${responsiveBreakpointLabel}`}
            >
              <EditorShellIcon name="responsive" size={10} />
              <span>{responsiveBreakpointLabel}</span>
            </span>
          {/if}
          {#if responsiveStatusLabel}
            <span
              class="primitive-control__chip"
              title={`Value is ${responsiveStatusLabel} on ${responsiveBreakpointLabel}`}
            >
              {responsiveStatusLabel}
            </span>
          {/if}
          {#if stateObject.canReset}
            <button
              type="button"
              class="primitive-control__chip-button"
              onclick={onReset}
              aria-label={`Reset ${responsiveBreakpointLabel} override for ${resolved.label}`}
              title={`Reset ${responsiveBreakpointLabel} override`}
            >
              Reset
            </button>
          {/if}
          {#if (resolved.tokenAware || isTokenLikeValue(value)) && resolved.kind !== "color"}
            <span class="primitive-control__chip">token</span>
          {/if}
          {#if dynamicBinding}
            <span
              class="primitive-control__chip primitive-control__chip--dynamic"
              title={dynamicBinding.preview
                ? `Dynamic · ${dynamicBinding.preview}`
                : "Dynamic value"}
            >
              Dynamic
            </span>
          {:else if dynamicProviders.length}
            <details class="primitive-control__dynamic-header-picker">
              <summary title={`Bind ${resolved.label} to dynamic data`}>Dynamic</summary>
              <div class="primitive-control__dynamic-menu">
                {#each dynamicProvidersByGroup as providerGroup (providerGroup.group)}
                  <div class="primitive-control__dynamic-group">
                    <span>{providerGroup.group}</span>
                    {#each providerGroup.items as provider (provider.id)}
                      <button
                        type="button"
                        onclick={(event) => {
                          (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                          onDynamicSelect(provider.id);
                        }}
                      >
                        {provider.label}
                      </button>
                    {/each}
                  </div>
                {/each}
              </div>
            </details>
          {/if}
        </div>
      </div>

      {#if resolved.stateTabs.length > 1}
        <div
          class="primitive-control__state-tabs"
          role="tablist"
          aria-label={`${resolved.label} states`}
        >
          {#each resolved.stateTabs as tab (tab)}
            <button
              type="button"
              class:primitive-control__state-tab--active={activeStateTab ===
                tab}
              class="primitive-control__state-tab"
              onclick={() => onStateTabChange(tab)}>{tab}</button
            >
          {/each}
        </div>
      {/if}
    </header>

    <div class="primitive-control__body">
      {#if dynamicBinding}
        <div class="primitive-control__dynamic">
          <div class="primitive-control__dynamic-chip">
            <span>{dynamicBinding.label}</span>
            {#if dynamicBinding.preview}<small>{dynamicBinding.preview}</small>{/if}
            <button
              type="button"
              onclick={onDynamicClear}
              aria-label={`Clear dynamic value for ${resolved.label}`}
              title="Clear dynamic value"
            >
              ×
            </button>
          </div>
          {#if dynamicProviders.length}
            <details class="primitive-control__dynamic-picker">
              <summary>{dynamicBinding ? "Change dynamic value" : "Use dynamic value"}</summary>
              {#each dynamicProvidersByGroup as providerGroup (providerGroup.group)}
                <div class="primitive-control__dynamic-group">
                  <span>{providerGroup.group}</span>
                  {#each providerGroup.items as provider (provider.id)}
                    <button
                      type="button"
                      class:active={dynamicBinding?.providerId === provider.id}
                      onclick={(event) => {
                        (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                        onDynamicSelect(provider.id);
                      }}
                    >
                      {provider.label}
                    </button>
                  {/each}
                </div>
              {/each}
            </details>
          {/if}
        </div>
      {/if}
      {#if resolved.kind === "select"}
        <label class="primitive-control__field">
          <select
            {disabled}
            value={selectValue}
            class:primitive-control__placeholder={!selectValue &&
              Boolean(resolved.placeholder || placeholder)}
            onchange={(event) =>
              commitString((event.currentTarget as HTMLSelectElement).value)}
            onblur={onBlur}
          >
            {#if resolved.placeholder || placeholder}
              <option
                value=""
                disabled={!resolved.allowClear}
                selected={!selectValue}
                >{resolved.placeholder || placeholder}</option
              >
            {/if}
            {#each resolved.options as option (option.value)}
              <option value={option.value} disabled={option.disabled}
                >{option.label}</option
              >
            {/each}
          </select>
        </label>
      {:else if resolved.kind === "choose"}
        <div
          class:primitive-control__choices--inline={resolved.layout ===
            "inline"}
          class:primitive-control__choices--grid={resolved.layout === "grid"}
          class:primitive-control__choices--stack={resolved.layout === "stack"}
          class:primitive-control__choices--icon-only={resolved.presentation ===
            "icon-only"}
          class="primitive-control__choices"
          style={`--primitive-control-columns:${resolved.columns ?? (resolved.layout === "stack" ? 1 : 2)};`}
        >
          {#each resolved.options as option (option.value)}
            <button
              type="button"
              class="primitive-control__choice"
              class:primitive-control__choice--selected={resolved.multiple
                ? choiceValues.includes(option.value)
                : selectValue === option.value}
              class:primitive-control__choice--icon-only={resolved.presentation ===
                "icon-only"}
              class:primitive-control__choice--label-only={resolved.presentation ===
                "label-only"}
              class:primitive-control__choice--icon-top={resolved.iconPosition ===
                "top"}
              class:primitive-control__choice--icon-end={resolved.iconPosition ===
                "end"}
              disabled={disabled || option.disabled}
              title={option.label}
              aria-label={option.label}
              onclick={() => toggleChoice(option.value)}
            >
              {#if option.icon && resolved.presentation !== "label-only"}
                <span class="primitive-control__choice-icon" aria-hidden="true">
                  {#if resolveShellIconName(option.icon)}
                    <EditorShellIcon
                      name={resolveShellIconName(option.icon) as "menu"}
                      size={12}
                    />
                  {/if}
                </span>
              {/if}
              {#if resolved.presentation !== "icon-only"}<span
                  >{option.label}</span
                >{/if}
              {#if option.badge !== undefined}<span
                  class="primitive-control__badge">{option.badge}</span
                >{/if}
            </button>
          {/each}
        </div>
      {:else if resolved.kind === "tabs"}
        <div
          class="primitive-control__tabs"
          class:primitive-control__tabs--vertical={resolved.orientation ===
            "vertical"}
        >
          {#each resolved.tabs as tabItem (tabItem.id)}
            <button
              type="button"
              class="primitive-control__tab"
              class:primitive-control__tab--active={selectValue === tabItem.id}
              disabled={disabled || tabItem.disabled}
              title={tabItem.label}
              aria-label={tabItem.label}
              onclick={() => commitString(tabItem.id)}
            >
              {#if tabItem.icon}
                <span class="primitive-control__choice-icon" aria-hidden="true">
                  {#if resolveShellIconName(tabItem.icon)}
                    <EditorShellIcon
                      name={resolveShellIconName(tabItem.icon) as "menu"}
                      size={14}
                    />
                  {/if}
                </span>
              {/if}
              <span>{tabItem.label}</span>
              {#if tabItem.badge !== undefined}<span
                  class="primitive-control__badge">{tabItem.badge}</span
                >{/if}
            </button>
          {/each}
        </div>
      {:else if resolved.kind === "slider"}
        <div
          class="primitive-control__slider"
          class:primitive-control__slider--compact={resolved.showRange === false}
        >
          <div class="primitive-control__slider-row">
            <input
              class="primitive-control__text"
              type="text"
              inputmode="decimal"
              {disabled}
              value={sliderValue.value ?? ""}
              placeholder={resolved.placeholder || placeholder || "0"}
              oninput={(event) =>
                updateSlider((event.currentTarget as HTMLInputElement).value)}
              onblur={onBlur}
            />
            {#if resolved.units.length}
              <select
                class="primitive-control__unit"
                {disabled}
                value={sliderValue.unit ?? resolved.units[0]?.value ?? ""}
                onchange={(event) =>
                  updateSlider(
                    String(sliderValue.value ?? ""),
                    (event.currentTarget as HTMLSelectElement).value,
                  )}
              >
                {#each resolved.units as unit (unit.value)}
                  <option value={unit.value}
                    >{unit.shortLabel ?? unit.label}</option
                  >
                {/each}
              </select>
            {/if}
          </div>
          {#if resolved.showRange !== false}
            <input
              class="primitive-control__range"
              type="range"
              {disabled}
              min={String((primitive as { min?: number } | null)?.min ?? 0)}
              max={String((primitive as { max?: number } | null)?.max ?? 100)}
              step={String((primitive as { step?: number } | null)?.step ?? 1)}
              value={typeof sliderValue.value === "number"
                ? sliderValue.value
                : Number(sliderValue.value ?? 0)}
              oninput={(event) =>
                updateSlider(
                  String((event.currentTarget as HTMLInputElement).value),
                )}
              onblur={onBlur}
            />
          {/if}
        </div>
      {:else if resolved.kind === "dimensions"}
        <div class="primitive-control__dimensions">
          <div class="primitive-control__dimensions-grid">
            <label
              ><span>Top</span><input
                class="primitive-control__text"
                type="text"
                {disabled}
                value={dimensionsValue.top ?? ""}
                placeholder={dimensionsPlaceholderValue.top ?? ""}
                oninput={(event) =>
                  updateDimensions({
                    top: (event.currentTarget as HTMLInputElement).value,
                  })}
                onkeydown={(event) =>
                  handleDraftEnter(event, commitDimensionsDraft)}
                onblur={() => handleDraftBlur(commitDimensionsDraft)}
              /></label
            >
            <label
              ><span>Right</span><input
                class="primitive-control__text"
                type="text"
                {disabled}
                value={dimensionsValue.right ?? ""}
                placeholder={dimensionsPlaceholderValue.right ?? ""}
                oninput={(event) =>
                  updateDimensions({
                    right: (event.currentTarget as HTMLInputElement).value,
                  })}
                onkeydown={(event) =>
                  handleDraftEnter(event, commitDimensionsDraft)}
                onblur={() => handleDraftBlur(commitDimensionsDraft)}
              /></label
            >
            <label
              ><span>Bottom</span><input
                class="primitive-control__text"
                type="text"
                {disabled}
                value={dimensionsValue.bottom ?? ""}
                placeholder={dimensionsPlaceholderValue.bottom ?? ""}
                oninput={(event) =>
                  updateDimensions({
                    bottom: (event.currentTarget as HTMLInputElement).value,
                  })}
                onkeydown={(event) =>
                  handleDraftEnter(event, commitDimensionsDraft)}
                onblur={() => handleDraftBlur(commitDimensionsDraft)}
              /></label
            >
            <label
              ><span>Left</span><input
                class="primitive-control__text"
                type="text"
                {disabled}
                value={dimensionsValue.left ?? ""}
                placeholder={dimensionsPlaceholderValue.left ?? ""}
                oninput={(event) =>
                  updateDimensions({
                    left: (event.currentTarget as HTMLInputElement).value,
                  })}
                onkeydown={(event) =>
                  handleDraftEnter(event, commitDimensionsDraft)}
                onblur={() => handleDraftBlur(commitDimensionsDraft)}
              /></label
            >
          </div>
          <div class="primitive-control__dimensions-meta">
            <button
              type="button"
              class="primitive-control__toggle"
              aria-pressed={Boolean(dimensionsValue.linked)}
              {disabled}
              onclick={() =>
                updateDimensions({ linked: !dimensionsValue.linked })}
              >{dimensionsValue.linked ? "Linked" : "Unlinked"}</button
            >
            {#if resolved.units.length}
              <select
                class="primitive-control__unit"
                {disabled}
                value={dimensionsValue.unit ?? resolved.units[0]?.value ?? "px"}
                onchange={(event) =>
                  updateDimensions({
                    unit: (event.currentTarget as HTMLSelectElement).value,
                  })}
              >
                {#each resolved.units as unit (unit.value)}
                  <option value={unit.value}
                    >{unit.shortLabel ?? unit.label}</option
                  >
                {/each}
              </select>
            {/if}
          </div>
        </div>
      {:else if resolved.kind === "switcher"}
        <button
          type="button"
          class="primitive-control__switcher"
          class:primitive-control__switcher--active={Boolean(value)}
          {disabled}
          onclick={() =>
            commitBoolean(!(value === true || rawValue === "true"))}
        >
          <span class="primitive-control__switcher-track"
            ><span class="primitive-control__switcher-thumb"></span></span
          >
          <span
            >{value === true || rawValue === "true"
              ? ((primitive as { onLabel?: string } | null)?.onLabel ?? "On")
              : ((primitive as { offLabel?: string } | null)?.offLabel ??
                "Off")}</span
          >
        </button>
      {:else if resolved.kind === "color"}
        <div class="primitive-control__color">
          <input
            type="color"
            value={defaultColorValue()}
            {disabled}
            oninput={(event) =>
              updateColorDraft((event.currentTarget as HTMLInputElement).value)}
            onchange={() => colorCommitController.flush(commitColorDraft)}
            onblur={handleColorBlur}
          />
          <input
            type="text"
            value={colorDraftDirty ? colorDraft : rawValue}
            {placeholder}
            {disabled}
            oninput={(event) =>
              updateColorDraft((event.currentTarget as HTMLInputElement).value)}
            onkeydown={(event) =>
              handleDraftEnter(event, () => colorCommitController.flush(commitColorDraft))}
            onblur={handleColorBlur}
          />
        </div>
        {#if resolved.tokenAware || isTokenLikeValue(value)}
          <div class="primitive-control__token-note">
            <span class="primitive-control__chip">Token</span><span
              >{isTokenLikeValue(value)
                ? "Linked token value"
                : "Token-aware field"}</span
            >
          </div>
        {/if}
      {:else if resolved.kind === "media"}
        <div class="primitive-control__media">
          <div class="primitive-control__media-preview">
            {#if mediaValue.src}
              {#if resolved.assetType === "image"}
                <img
                  src={mediaValue.src}
                  alt={mediaValue.alt ?? mediaValue.title ?? resolved.label}
                />
              {:else}
                <strong>{mediaValue.title ?? mediaValue.src}</strong>
              {/if}
            {:else}
              <div class="primitive-control__media-empty">
                No media selected
              </div>
            {/if}
          </div>
          <input
            type="text"
            value={mediaValue.src ?? ""}
            placeholder={resolved.placeholder ||
              placeholder ||
              "Paste media URL"}
            {disabled}
            oninput={(event) =>
              updateMedia({
                src: (event.currentTarget as HTMLInputElement).value,
              })}
            onkeydown={(event) => handleDraftEnter(event, commitMediaDraft)}
            onblur={() => handleDraftBlur(commitMediaDraft)}
          />
          <div class="primitive-control__media-row">
            <input
              type="text"
              value={mediaValue.alt ?? ""}
              placeholder="Alt text"
              {disabled}
              oninput={(event) =>
                updateMedia({
                  alt: (event.currentTarget as HTMLInputElement).value,
                })}
              onkeydown={(event) => handleDraftEnter(event, commitMediaDraft)}
              onblur={() => handleDraftBlur(commitMediaDraft)}
            />
            <button
              type="button"
              class="primitive-control__ghost-action"
              disabled={disabled || !mediaValue.src}
              onclick={() => commit(null)}>Remove</button
            >
          </div>
          {#if resolved.showLibrary || resolved.showUpload}
            <div class="primitive-control__media-actions">
              {#if resolved.showLibrary}
                <button
                  type="button"
                  class="primitive-control__ghost-action"
                  {disabled}
                  aria-expanded={mediaPickerOpen}
                  onclick={openMediaPicker}>Media Library</button
                >
              {/if}
              {#if resolved.showUpload}
                <label class="primitive-control__upload-action">
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    {disabled}
                    onchange={handleMediaFileChange}
                  />
                </label>
              {/if}
            </div>
          {/if}
          {#if mediaPickerOpen}
            <div class="primitive-control__media-library" aria-label="Media library">
              {#if mediaPickerStatus}
                <p class="primitive-control__media-status">{mediaPickerStatus}</p>
              {/if}
              {#if mediaDiagnostics.length}
                <ul class="primitive-control__media-diagnostics">
                  {#each mediaDiagnostics.slice(0, 4) as diagnostic, index (`${index}-${diagnostic}`)}
                    <li>{diagnostic}</li>
                  {/each}
                </ul>
              {/if}
              {#if mediaAssets.length}
                <div class="primitive-control__media-grid">
                  {#each mediaAssets as asset (asset.id)}
                    <article
                      class:primitive-control__media-card--active={asset.url === mediaValue.src}
                      class="primitive-control__media-card"
                    >
                      <button
                        type="button"
                        class="primitive-control__media-thumb"
                        onclick={() => selectMediaAsset(asset)}
                      >
                        <img src={asset.url} alt={asset.alt ?? asset.title ?? "Media asset"} />
                      </button>
                      <div class="primitive-control__media-card-body">
                        <strong>{asset.title ?? asset.url.split("/").pop() ?? "Media asset"}</strong>
                        <small>{asset.source ?? "media"}{asset.alt ? "" : " • missing alt"}</small>
                      </div>
                      {#if mediaSelectedAssetId === asset.id}
                        <div class="primitive-control__media-metadata">
                          <input
                            type="text"
                            value={mediaMetadataDraft.title ?? ""}
                            placeholder="Title"
                            oninput={(event) =>
                              (mediaMetadataDraft = {
                                ...mediaMetadataDraft,
                                title: (event.currentTarget as HTMLInputElement).value,
                              })}
                          />
                          <input
                            type="text"
                            value={mediaMetadataDraft.alt ?? ""}
                            placeholder="Alt text"
                            oninput={(event) =>
                              (mediaMetadataDraft = {
                                ...mediaMetadataDraft,
                                alt: (event.currentTarget as HTMLInputElement).value,
                              })}
                          />
                          <input
                            type="text"
                            value={mediaMetadataDraft.caption ?? ""}
                            placeholder="Caption"
                            oninput={(event) =>
                              (mediaMetadataDraft = {
                                ...mediaMetadataDraft,
                                caption: (event.currentTarget as HTMLInputElement).value,
                              })}
                          />
                          <button type="button" onclick={() => saveMediaMetadata(asset.id)}>Save details</button>
                        </div>
                      {:else}
                        <div class="primitive-control__media-card-actions">
                          <button type="button" onclick={() => startMediaMetadataEdit(asset)}>Edit</button>
                          <button type="button" onclick={() => removeMediaAsset(asset.id)}>Delete</button>
                        </div>
                      {/if}
                    </article>
                  {/each}
                </div>
              {:else if !mediaPickerStatus}
                <p class="primitive-control__media-empty">No media assets yet.</p>
              {/if}
            </div>
          {/if}
        </div>
      {:else if resolved.kind === "url"}
        <div class="primitive-control__url">
          <div class="primitive-control__url-row">
            <input
              type="url"
              value={urlValue.url ?? ""}
              placeholder={resolved.placeholder ||
                placeholder ||
                "https://example.com"}
              {disabled}
              oninput={(event) =>
                updateUrl({
                  url: (event.currentTarget as HTMLInputElement).value,
                })}
              onkeydown={(event) => handleDraftEnter(event, commitUrlDraft)}
              onblur={() => handleDraftBlur(commitUrlDraft)}
            />
            {#if resolved.allowDynamic || (primitive as { allowDynamic?: boolean } | null)?.allowDynamic}<span
                class="primitive-control__chip">Dynamic</span
              >{/if}
          </div>
          <div class="primitive-control__url-options">
            {#if resolved.showNewTab}<label
                ><input
                  type="checkbox"
                  {disabled}
                  checked={Boolean(urlValue.newTab)}
                  onchange={(event) =>
                    updateUrl({
                      newTab: (event.currentTarget as HTMLInputElement).checked,
                    })}
                /> New tab</label
              >{/if}
            {#if resolved.showNoFollow}<label
                ><input
                  type="checkbox"
                  {disabled}
                  checked={Boolean(urlValue.noFollow)}
                  onchange={(event) =>
                    updateUrl({
                      noFollow: (event.currentTarget as HTMLInputElement)
                        .checked,
                    })}
                /> No follow</label
              >{/if}
            {#if resolved.showDownload}<label
                ><input
                  type="checkbox"
                  {disabled}
                  checked={Boolean(urlValue.download)}
                  onchange={(event) =>
                    updateUrl({
                      download: (event.currentTarget as HTMLInputElement)
                        .checked,
                    })}
                /> Download</label
              >{/if}
          </div>
          {#if resolved.showCustomAttributes}
            <textarea
              rows="3"
              value={urlValue.customAttributes ?? ""}
              placeholder="Custom attributes"
              {disabled}
              oninput={(event) =>
                updateUrl({
                  customAttributes: (event.currentTarget as HTMLTextAreaElement)
                    .value,
                })}
              onblur={onBlur}
            ></textarea>
          {/if}
          {#if resolved.showLinkIcon}
            <input
              type="text"
              value={urlValue.linkIcon ?? ""}
              placeholder="Link icon"
              {disabled}
              oninput={(event) =>
                updateUrl({
                  linkIcon: (event.currentTarget as HTMLInputElement).value,
                })}
              onblur={onBlur}
            />
          {/if}
        </div>
      {:else if resolved.kind === "shadow" || resolved.kind === "filter" || resolved.kind === "json"}
        <textarea
          rows={resolved.kind === "json" ? 5 : 3}
          value={rawValue}
          placeholder={placeholder || "Edit JSON"}
          {disabled}
          oninput={(event) =>
            commitJson((event.currentTarget as HTMLTextAreaElement).value)}
          onblur={onBlur}
        ></textarea>
      {:else if resolved.kind === "textarea" || resolved.fieldType === "textarea" || resolved.fieldType === "rich-text" || fieldType === "textarea" || fieldType === "rich-text"}
        <textarea
          rows={resolved.kind === "textarea" ? 3 : 4}
          value={rawValue}
          {placeholder}
          {disabled}
          oninput={(event) =>
            commitString((event.currentTarget as HTMLTextAreaElement).value)}
          onblur={onBlur}
        ></textarea>
      {:else if resolved.fieldType === "number" || fieldType === "number"}
        <input
          type="number"
          value={numberDraft}
          placeholder={placeholder || "0"}
          {disabled}
          oninput={(event) =>
            updateNumberDraft((event.currentTarget as HTMLInputElement).value)}
          onkeydown={(event) => handleDraftEnter(event, commitNumberDraft)}
          onblur={() => handleDraftBlur(commitNumberDraft)}
        />
      {:else}
        <input
          type="text"
          value={textDraft}
          placeholder={placeholder || resolved.placeholder || "Enter value"}
          {disabled}
          oninput={(event) =>
            updateTextDraft((event.currentTarget as HTMLInputElement).value)}
          onkeydown={(event) => handleDraftEnter(event, commitTextDraft)}
          onblur={() => handleDraftBlur(commitTextDraft)}
        />
      {/if}
    </div>

    {#if error}
      <div class="primitive-control__error">{error}</div>
    {/if}
  </section>
{/if}

<style>
  .primitive-control {
    display: grid;
    gap: 6px;
    inline-size: 100%;
    padding: 0 0 11px;
    border-bottom: 1px solid
      var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
    font-size: 12px;
    line-height: 1.4;
    color: var(--builder-shell-text, #1d2433);
    min-width: 0;
  }

  .primitive-control--section {
    gap: 0;
    padding-bottom: 0;
  }

  .primitive-control--compact {
    gap: 4px;
    padding-bottom: 7px;
  }

  .primitive-control--disabled {
    opacity: 0.66;
  }

  .primitive-control__header,
  .primitive-control__title-row,
  .primitive-control__slider-row,
  .primitive-control__dimensions-meta,
  .primitive-control__media-row,
  .primitive-control__url-row,
  .primitive-control__url-options,
  .primitive-control__chips,
  .primitive-control__state-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .primitive-control__header {
    gap: 4px;
    padding-top: 2px;
    min-width: 0;
  }

  .primitive-control__title-row {
    justify-content: space-between;
    min-width: 0;
  }

  .primitive-control__chips {
    position: relative;
  }

  .primitive-control__copy {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .primitive-control__copy strong,
  .primitive-control__section-copy strong {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    color: var(--builder-shell-heading, inherit);
  }

  .primitive-control__copy span,
  .primitive-control__section-copy span {
    font-size: 10px;
    color: var(--builder-shell-text-muted, #687385);
  }

  .primitive-control__chip,
  .primitive-control__badge,
  .primitive-control__chip-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    padding: 0 5px;
    border-radius: 999px;
    border: 1px solid
      var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
    background: rgba(255, 255, 255, 0.055);
    color: var(--builder-shell-text-muted, #687385);
    font-size: 9px;
    line-height: 1;
    white-space: nowrap;
  }

  .primitive-control__chip--icon {
    gap: 4px;
  }

  .primitive-control__chip--dynamic {
    color: #f0abfc;
    border-color: rgba(216, 70, 239, 0.38);
    background: rgba(168, 85, 247, 0.14);
  }

  .primitive-control__dynamic-header-picker {
    position: relative;
  }

  .primitive-control__dynamic-header-picker summary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    padding: 0 5px;
    border: 1px solid rgba(216, 70, 239, 0.28);
    border-radius: 999px;
    color: #f0abfc;
    background: rgba(168, 85, 247, 0.1);
    font-size: 9px;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;
    list-style: none;
    white-space: nowrap;
  }

  .primitive-control__dynamic-header-picker summary::-webkit-details-marker {
    display: none;
  }

  .primitive-control__dynamic-menu {
    position: absolute;
    z-index: 40;
    top: calc(100% + 4px);
    right: 0;
    display: grid;
    gap: 5px;
    width: min(220px, calc(100vw - 24px));
    max-height: 280px;
    overflow: auto;
    padding: 7px;
    border: 1px solid var(--builder-shell-border, #d5dce7);
    border-radius: 7px;
    background: var(--builder-shell-surface, #ffffff);
    box-shadow: 0 14px 36px rgba(15, 23, 42, 0.18);
  }

  .primitive-control__chip-button {
    appearance: none;
    cursor: pointer;
  }

  .primitive-control__state-tab,
  .primitive-control__choice,
  .primitive-control__tab,
  .primitive-control__ghost-action,
  .primitive-control__section-button,
  .primitive-control__toggle,
  .primitive-control__switcher {
    border: 1px solid
      var(--builder-shell-border-color-bold, rgba(113, 128, 150, 0.42));
    border-radius: 5px;
    background: var(--builder-shell-bg-surface, #fff);
    color: inherit;
    font: inherit;
    font-size: 10.5px;
    line-height: 1.2;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .primitive-control__state-tab:hover,
  .primitive-control__choice:hover,
  .primitive-control__tab:hover,
  .primitive-control__ghost-action:hover,
  .primitive-control__section-button:hover,
  .primitive-control__toggle:hover,
  .primitive-control__switcher:hover,
  .primitive-control__field select:hover,
  .primitive-control input:hover,
  .primitive-control textarea:hover {
    border-color: var(--builder-shell-accent, #93003f);
  }

  .primitive-control__state-tab--active,
  .primitive-control__choice--selected,
  .primitive-control__tab--active,
  .primitive-control__switcher--active,
  .primitive-control__toggle[aria-pressed="true"] {
    background: rgba(208, 4, 212, 0.16);
    border-color: var(--builder-shell-accent, #93003f);
    color: var(--builder-shell-heading, #fff);
    box-shadow: inset 0 -2px 0 var(--builder-shell-accent, #93003f);
  }

  .primitive-control__state-tabs {
    padding-top: 0;
    gap: 2px;
    flex-wrap: nowrap;
    padding: 2px;
    border: 1px solid var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.035);
    overflow: hidden;
  }

  .primitive-control__state-tab {
    padding: 0 8px;
    min-height: 22px;
    border-radius: 999px;
    border-color: transparent;
    background: transparent;
    font-size: 9.5px;
    text-transform: capitalize;
  }

  .primitive-control__body {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .primitive-control input,
  .primitive-control textarea,
  .primitive-control select {
    width: 100%;
    box-sizing: border-box;
    min-height: 27px;
    padding: 0 8px;
    border: 1px solid
      var(--builder-shell-border-color-bold, rgba(113, 128, 150, 0.42));
    border-radius: 5px;
    background: var(--builder-shell-bg-surface, #fff);
    color: inherit;
    font: inherit;
    font-size: 11px;
  }

  .primitive-control textarea {
    min-height: 64px;
    padding-block: 7px;
    resize: vertical;
  }

  .primitive-control input:focus-visible,
  .primitive-control textarea:focus-visible,
  .primitive-control select:focus-visible,
  .primitive-control button:focus-visible {
    outline: none;
    box-shadow: var(--builder-shell-focus-ring, 0 0 0 2px rgba(208, 4, 212, 0.25));
  }

  .primitive-control__field {
    position: relative;
    display: block;
  }

  .primitive-control__dynamic {
    display: grid;
    gap: 4px;
    padding: 5px;
    max-width: 100%;
    overflow: hidden;
    border: 1px solid rgba(216, 70, 239, 0.24);
    border-radius: 6px;
    background: rgba(168, 85, 247, 0.08);
  }

  .primitive-control__dynamic-chip {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 2px 6px;
    font-size: 10.5px;
  }

  .primitive-control__dynamic-chip span,
  .primitive-control__dynamic-chip small {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .primitive-control__dynamic-chip small {
    grid-column: 1;
    color: var(--builder-shell-text-muted, #687385);
  }

  .primitive-control__dynamic-chip button {
    grid-column: 2;
    grid-row: 1 / span 2;
    min-width: 22px;
    min-height: 22px;
    border-radius: 5px;
  }

  .primitive-control__dynamic-picker {
    max-width: 100%;
    min-width: 0;
  }

  .primitive-control__dynamic-picker summary {
    min-height: 25px;
    display: flex;
    align-items: center;
    padding: 4px 7px;
    border: 1px solid var(--builder-shell-border, #d5dce7);
    border-radius: 5px;
    color: var(--builder-shell-accent, #7c3aed);
    background: var(--builder-shell-surface, #ffffff);
    font-size: 10.5px;
    font-weight: 700;
    cursor: pointer;
    list-style: none;
  }

  .primitive-control__dynamic-picker summary::-webkit-details-marker {
    display: none;
  }

  .primitive-control__dynamic-group {
    display: grid;
    gap: 3px;
    margin-top: 4px;
  }

  .primitive-control__dynamic-group span {
    color: var(--builder-shell-text-muted, #687385);
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .primitive-control__dynamic-group button {
    justify-content: flex-start;
    min-width: 0;
    min-height: 24px;
    padding: 4px 7px;
    border-radius: 5px;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .primitive-control__dynamic-group button.active {
    border-color: rgba(124, 58, 237, 0.44);
    color: var(--builder-shell-accent, #7c3aed);
    background: rgba(124, 58, 237, 0.1);
  }

  .primitive-control__field select {
    min-height: 27px;
    padding-inline: 6px 20px;
    background-image:
      linear-gradient(
        45deg,
        transparent 50%,
        var(--builder-shell-text-muted, #687385) 50%
      ),
      linear-gradient(
        135deg,
        var(--builder-shell-text-muted, #687385) 50%,
        transparent 50%
      );
    background-position:
      calc(100% - 13px) 11px,
      calc(100% - 9px) 11px;
    background-size:
      4px 4px,
      4px 4px;
    background-repeat: no-repeat;
    appearance: none;
  }

  .primitive-control__placeholder {
    color: var(--builder-shell-text-muted, #687385);
  }

  .primitive-control__text::placeholder,
  .primitive-control__dimensions-grid input::placeholder {
    color: var(--builder-shell-text-muted, #687385);
    opacity: 0.7;
  }

  .primitive-control__choices {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .primitive-control__choices--icon-only {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    align-items: stretch;
  }

  .primitive-control__choices--inline {
    grid-template-columns: repeat(
      var(--primitive-control-columns, 2),
      minmax(0, 1fr)
    );
  }

  .primitive-control__choices--grid {
    grid-template-columns: repeat(
      var(--primitive-control-columns, 2),
      minmax(0, 1fr)
    );
  }

  .primitive-control__choices--stack {
    grid-template-columns: 1fr;
  }

  .primitive-control__choice,
  .primitive-control__tab {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    padding: 0 6px;
    min-height: 30px;
    min-width: 0;
    border-radius: 5px;
    overflow: hidden;
  }

  .primitive-control__choice--icon-only {
    padding-inline: 4px;
    min-width: 34px;
    inline-size: 34px;
    aspect-ratio: auto;
  }

  .primitive-control__choice--icon-top {
    flex-direction: column;
  }

  .primitive-control__choice--icon-only
    > span:not(.primitive-control__choice-icon):not(.primitive-control__badge) {
    display: none;
  }

  .primitive-control__choice--icon-end {
    flex-direction: row-reverse;
  }

  .primitive-control__choice span:last-child,
  .primitive-control__tab span:last-child {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .primitive-control__choice-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 12px;
    block-size: 12px;
    flex-shrink: 0;
  }

  .primitive-control__choice--icon-only .primitive-control__choice-icon {
    inline-size: 14px;
    block-size: 14px;
  }

  .primitive-control__slider {
    display: grid;
    gap: 6px;
  }

  .primitive-control__slider--compact {
    gap: 0;
  }

  .primitive-control__slider-row > *,
  .primitive-control__dimensions-meta > *,
  .primitive-control__url-row > *,
  .primitive-control__media-row > * {
    flex: 1;
  }

  .primitive-control__slider-row {
    gap: 4px;
  }

  .primitive-control__slider-row .primitive-control__unit,
  .primitive-control__dimensions-meta .primitive-control__unit {
    flex: 0 0 52px;
    max-width: 52px;
  }

  .primitive-control__slider-row .primitive-control__text {
    flex: 1 1 auto;
    min-width: 0;
  }

  .primitive-control__slider-row .primitive-control__text {
    text-align: end;
  }

  .primitive-control__range {
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    accent-color: var(--builder-shell-accent, #93003f);
  }

  .primitive-control__range::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
  }

  .primitive-control__range::-moz-range-track {
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
  }

  .primitive-control__dimensions-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
  }

  .primitive-control__dimensions-grid label {
    display: grid;
    gap: 2px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--builder-shell-text-muted, #687385);
    min-width: 0;
  }

  .primitive-control__dimensions-grid label .primitive-control__text {
    text-align: end;
  }

  .primitive-control__switcher {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    min-height: 27px;
    padding: 0 8px;
  }

  .primitive-control__switcher-track {
    position: relative;
    width: 28px;
    height: 16px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
  }

  .primitive-control__switcher-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: #fff;
    transition: transform 120ms ease;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  }

  .primitive-control__switcher--active .primitive-control__switcher-track {
    background: var(--builder-shell-accent, #93003f);
  }

  .primitive-control__switcher--active .primitive-control__switcher-thumb {
    transform: translateX(12px);
  }

  .primitive-control__color {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 6px;
  }

  .primitive-control__color input[type="color"] {
    padding: 0;
    height: 27px;
    cursor: pointer;
  }

  .primitive-control__token-note {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    color: var(--builder-shell-text-muted, #687385);
  }

  .primitive-control__media {
    display: grid;
    gap: 5px;
  }

  .primitive-control__media-actions {
    display: flex;
    gap: 5px;
    align-items: center;
    flex-wrap: wrap;
  }

  .primitive-control__upload-action {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--builder-shell-border-color, rgba(148, 163, 184, 0.22));
    background: rgba(255, 255, 255, 0.06);
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }

  .primitive-control__upload-action input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .primitive-control__media-library {
    display: grid;
    gap: 7px;
    max-height: 360px;
    overflow: auto;
    padding: 7px;
    border-radius: 7px;
    border: 1px solid var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
    background: rgba(15, 23, 42, 0.32);
  }

  .primitive-control__media-status,
  .primitive-control__media-diagnostics {
    margin: 0;
    color: var(--builder-shell-text-muted, #687385);
    font-size: 10px;
  }

  .primitive-control__media-diagnostics {
    padding-left: 16px;
  }

  .primitive-control__media-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .primitive-control__media-card {
    display: grid;
    gap: 5px;
    min-width: 0;
    padding: 5px;
    border-radius: 7px;
    border: 1px solid var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
    background: rgba(255, 255, 255, 0.04);
  }

  .primitive-control__media-card--active {
    border-color: var(--builder-shell-accent, #d900ff);
    box-shadow: inset 0 0 0 1px var(--builder-shell-accent, #d900ff);
  }

  .primitive-control__media-thumb {
    width: 100%;
    aspect-ratio: 4 / 3;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }

  .primitive-control__media-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .primitive-control__media-card-body {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .primitive-control__media-card-body strong,
  .primitive-control__media-card-body small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .primitive-control__media-card-body strong {
    font-size: 10.5px;
  }

  .primitive-control__media-card-body small {
    color: var(--builder-shell-text-muted, #687385);
    font-size: 9px;
  }

  .primitive-control__media-card-actions {
    display: flex;
    gap: 4px;
  }

  .primitive-control__media-card-actions button,
  .primitive-control__media-metadata button {
    min-height: 22px;
    padding: 0 6px;
    border-radius: 5px;
    border: 1px solid var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
    background: rgba(255, 255, 255, 0.06);
    color: inherit;
    font-size: 9.5px;
    cursor: pointer;
  }

  .primitive-control__media-metadata {
    display: grid;
    gap: 4px;
    grid-column: 1 / -1;
  }

  .primitive-control__media-preview {
    min-height: 80px;
    border: 1px dashed
      var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.035);
    overflow: hidden;
    display: grid;
    place-items: center;
    color: var(--builder-shell-text-muted, #687385);
  }

  .primitive-control__media-preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .primitive-control__url,
  .primitive-control__section-body {
    display: grid;
    gap: 5px;
  }

  .primitive-control__url-options {
    font-size: 9.5px;
    color: var(--builder-shell-text-muted, #687385);
    flex-wrap: wrap;
  }

  .primitive-control__section-button {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 40px;
    padding: 0 6px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    text-align: start;
  }

  .primitive-control__section-mark {
    display: inline-flex;
    width: 11px;
    flex-shrink: 0;
    color: var(--builder-shell-text-muted, #687385);
  }

  .primitive-control__section-copy {
    display: grid;
    gap: 0;
    min-width: 0;
    flex: 1;
  }

  .primitive-control__section-body {
    padding-left: 10px;
    padding-bottom: 0;
    border-inline-start: 1px solid
      var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
  }

  .primitive-control--section .primitive-control__section-button strong {
    letter-spacing: -0.01em;
  }

  .primitive-control--section
    .primitive-control__section-button:hover
    .primitive-control__section-mark {
    color: var(--builder-shell-accent, #93003f);
  }

  .primitive-control--section .primitive-control__section-button:hover {
    border-color: var(--builder-shell-border-color, rgba(148, 163, 184, 0.18));
    background: rgba(255, 255, 255, 0.035);
  }

  .primitive-control--section
    .primitive-control__section-body
    :global(.primitive-control) {
    padding-inline: 0;
    padding-block: 0 12px;
    border-bottom-color: rgba(148, 163, 184, 0.12);
  }

  .primitive-control--section
    .primitive-control__section-body
    :global(.primitive-control:last-child) {
    border-bottom: 0;
  }

  .primitive-control__choices--stack .primitive-control__choice,
  .primitive-control__tabs--vertical .primitive-control__tab {
    justify-content: flex-start;
  }

  .primitive-control__tabs {
    display: grid;
    grid-auto-flow: column;
    gap: 4px;
    min-width: 0;
  }

  .primitive-control__tabs--vertical {
    grid-auto-flow: row;
  }

  .primitive-control__tabs .primitive-control__tab {
    width: 100%;
  }

  .primitive-control__ghost-action {
    padding: 0 8px;
    min-height: 27px;
  }

  .primitive-control__error {
    font-size: 11px;
    color: #b42318;
  }
</style>
