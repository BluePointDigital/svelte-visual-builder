<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { Editor } from "@tiptap/core";
  import {
    DEFAULT_INLINE_RICH_TEXT_ACTIONS,
    loadInlineRichTextRuntime,
    normalizeInlineRichTextValue,
    serializeInlineRichTextValue,
    type InlineRichTextChangeDetail,
    type InlineRichTextResolvedMode,
    type InlineRichTextToolbarAction,
    type InlineRichTextValueMode,
  } from "./inline-rich-text";

  export let value: string | null | undefined = "";
  export let valueMode: InlineRichTextValueMode = "auto";
  export let placeholder = "";
  export let editable = true;
  export let disabled = false;
  export let autofocus = false;
  export let showToolbar = true;
  export let showBubbleMenu = true;
  export let minHeight = "120px";
  export let className = "";
  export let style = "";
  export let ariaLabel = "Rich text editor";
  export let toolbarActions: InlineRichTextToolbarAction[] =
    DEFAULT_INLINE_RICH_TEXT_ACTIONS;
  export let bubbleMenuActions: InlineRichTextToolbarAction[] =
    DEFAULT_INLINE_RICH_TEXT_ACTIONS;
  export let onChange: (detail: InlineRichTextChangeDetail) => void = () => {};
  export let onBlur: () => void = () => {};
  export let onFocus: () => void = () => {};
  export let onReady: (editor: Editor) => void = () => {};
  export let onError: (error: unknown) => void = () => {};

  let editorElement: HTMLDivElement | null = null;
  let bubbleMenuElement: HTMLDivElement | null = null;
  let editor: Editor | undefined;
  let editorRevision = 0;
  let destroyEditor = () => {};
  let mounted = false;

  $: resolvedValue = normalizeInlineRichTextValue(value, valueMode);
  $: activeToolbarActions =
    toolbarActions.length > 0 ? toolbarActions : DEFAULT_INLINE_RICH_TEXT_ACTIONS;
  $: activeBubbleMenuActions =
    bubbleMenuActions.length > 0
      ? bubbleMenuActions
      : DEFAULT_INLINE_RICH_TEXT_ACTIONS;
  $: if (editor) {
    editor.setEditable(editable && !disabled);
  }
  $: if (editor && mounted) {
    syncExternalValue();
  }

  function syncExternalValue() {
    if (!editor) {
      return;
    }

    const currentValue = serializeInlineRichTextValue(
      editor,
      resolvedValue.mode,
    ).value;
    if (currentValue === resolvedValue.value) {
      return;
    }

    editor.commands.setContent(resolvedValue.html, { emitUpdate: false });
    editorRevision += 1;
  }

  function emitChange() {
    if (!editor) {
      return;
    }

    onChange(serializeInlineRichTextValue(editor, resolvedValue.mode));
  }

  function runAction(action: InlineRichTextToolbarAction) {
    if (!editor || disabled || !editable) {
      return;
    }

    action.run(editor);
    editor?.commands.focus();
  }

  function isActionActive(action: InlineRichTextToolbarAction) {
    return Boolean(editor && action.active?.(editor));
  }

  function isActionDisabled(action: InlineRichTextToolbarAction) {
    return Boolean(
      disabled || !editable || (editor && action.disabled?.(editor)),
    );
  }

  function isBubbleMenuVisible() {
    return showBubbleMenu && editor && activeBubbleMenuActions.length > 0;
  }

  onMount(() => {
    mounted = true;
    let cancelled = false;

    void (async () => {
      try {
        const runtime = await loadInlineRichTextRuntime({
          bubbleMenu: showBubbleMenu,
        });
        if (cancelled || !mounted || !editorElement) {
          return;
        }

        const extensions = [runtime.StarterKit];
        if (showBubbleMenu && runtime.BubbleMenu && bubbleMenuElement) {
          extensions.push(
            (runtime.BubbleMenu as {
              configure: (config: Record<string, unknown>) => unknown;
            }).configure({
              element: bubbleMenuElement,
              pluginKey: "inline-rich-text-bubble-menu",
              updateDelay: 0,
              shouldShow: ({ editor }: { editor: Editor }) =>
                !disabled && editable && !editor.state.selection.empty,
            }),
          );
        }

        const EditorCtor = runtime.Editor as unknown as new (
          options: Record<string, unknown>,
        ) => Editor;

        editor = new EditorCtor({
          element: editorElement,
          extensions,
          editable: editable && !disabled,
          content: resolvedValue.html,
          editorProps: {
            attributes: {
              class: "inline-rich-text__content",
              "data-inline-rich-text": "true",
              "data-inline-rich-text-mode": resolvedValue.mode,
              "aria-label": ariaLabel,
              spellcheck: "true",
              ...(placeholder ? { "data-placeholder": placeholder } : {}),
            },
          },
          onCreate: ({ editor }) => {
            editorRevision += 1;
            onReady(editor);
          },
          onUpdate: ({ editor }) => {
            editorRevision += 1;
            onChange(serializeInlineRichTextValue(editor, resolvedValue.mode));
          },
          onSelectionUpdate: () => {
            editorRevision += 1;
          },
          onFocus: () => {
            editorRevision += 1;
            onFocus();
          },
          onBlur: () => {
            editorRevision += 1;
            onBlur();
          },
          onTransaction: () => {
            editorRevision += 1;
          },
        });

        if (autofocus) {
          editor.commands.focus("end");
        }

        destroyEditor = () => {
          editor?.destroy();
          editor = undefined;
        };
      } catch (error) {
        if (!cancelled) {
          onError(error);
        }
      }
    })();

    return () => {
      cancelled = true;
      mounted = false;
      destroyEditor();
    };
  });

  onDestroy(() => {
    mounted = false;
    destroyEditor();
  });
</script>

<section
  class={`inline-rich-text ${className}`}
  class:inline-rich-text--disabled={disabled}
  data-inline-rich-text-root="true"
  data-mode={resolvedValue.mode}
  data-revision={editorRevision}
  style={`--inline-rich-text-min-height:${minHeight};${style}`}
>
  {#if showToolbar}
    <div class="inline-rich-text__toolbar" aria-label="Rich text toolbar">
      <slot
        name="toolbar"
        {editor}
        {resolvedValue}
        {activeToolbarActions}
        {runAction}
        {isActionActive}
        {isActionDisabled}
      >
        {#if editor}
          {#each activeToolbarActions as action (action.id)}
            <button
              type="button"
              class:inline-rich-text__toolbar-button--active={isActionActive(
                action,
              )}
              class="inline-rich-text__toolbar-button"
              title={action.title || action.label}
              aria-pressed={isActionActive(action)}
              disabled={isActionDisabled(action)}
              onclick={() => runAction(action)}
            >
              {action.label}
            </button>
          {/each}
        {/if}
      </slot>
    </div>
  {/if}

  <div class="inline-rich-text__frame">
    <div
      bind:this={editorElement}
      class="inline-rich-text__editor"
      aria-label={ariaLabel}
    ></div>

    {#if isBubbleMenuVisible()}
      <div bind:this={bubbleMenuElement} class="inline-rich-text__bubble-menu">
        <slot
          name="bubbleMenu"
          {editor}
          {resolvedValue}
          {activeBubbleMenuActions}
          {runAction}
          {isActionActive}
          {isActionDisabled}
        >
          {#if editor}
            {#each activeBubbleMenuActions as action (action.id)}
              <button
                type="button"
                class:inline-rich-text__bubble-button--active={isActionActive(
                  action,
                )}
                class="inline-rich-text__bubble-button"
                title={action.title || action.label}
                aria-pressed={isActionActive(action)}
                disabled={isActionDisabled(action)}
                onclick={() => runAction(action)}
              >
                {action.label}
              </button>
            {/each}
          {/if}
        </slot>
      </div>
    {/if}
  </div>
</section>

<style>
  .inline-rich-text {
    display: grid;
    gap: 0.45rem;
    width: 100%;
    min-width: 0;
    color: var(--builder-shell-text, #1e293b);
  }

  .inline-rich-text__toolbar {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }

  .inline-rich-text__toolbar-button,
  .inline-rich-text__bubble-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 0.72rem;
    border: 1px solid var(--builder-shell-border-color-bold, rgba(113, 128, 150, 0.42));
    border-radius: 0.7rem;
    background: var(--builder-shell-bg-surface, #fff);
    color: inherit;
    font: inherit;
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }

  .inline-rich-text__toolbar-button:hover,
  .inline-rich-text__bubble-button:hover {
    border-color: var(--builder-shell-accent, #93003f);
    box-shadow: 0 0 0 1px rgba(147, 0, 63, 0.12);
  }

  .inline-rich-text__toolbar-button--active,
  .inline-rich-text__bubble-button--active {
    border-color: var(--builder-shell-accent, #93003f);
    background: var(--builder-shell-accent-soft, rgba(147, 0, 63, 0.12));
    color: var(--builder-shell-accent, #93003f);
  }

  .inline-rich-text__frame {
    position: relative;
    min-width: 0;
  }

  .inline-rich-text__editor {
    min-height: var(--inline-rich-text-min-height);
    padding: 0.75rem 0.85rem;
    border: 1px solid var(--builder-shell-border-color-bold, rgba(113, 128, 150, 0.42));
    border-radius: 0.8rem;
    background: var(--builder-shell-bg-surface, #fff);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .inline-rich-text--disabled .inline-rich-text__editor {
    opacity: 0.72;
  }

  .inline-rich-text__bubble-menu {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem;
    border: 1px solid rgba(113, 128, 150, 0.18);
    border-radius: 999px;
    background: rgba(16, 24, 40, 0.97);
    color: #fff;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24);
  }

  .inline-rich-text__bubble-button {
    min-height: 26px;
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
  }

  .inline-rich-text__bubble-button:hover,
  .inline-rich-text__bubble-button--active {
    border-color: rgba(255, 255, 255, 0.24);
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }

  .inline-rich-text__editor :global(.ProseMirror) {
    min-height: calc(var(--inline-rich-text-min-height) - 1.5rem);
    outline: none;
    font: inherit;
    line-height: 1.55;
    color: inherit;
  }

  .inline-rich-text__editor :global(.ProseMirror p) {
    margin: 0 0 0.8em;
  }

  .inline-rich-text__editor :global(.ProseMirror p:last-child) {
    margin-bottom: 0;
  }

  .inline-rich-text__editor :global(.ProseMirror p.is-editor-empty:first-child::before),
  .inline-rich-text__editor :global(.ProseMirror p.is-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
    color: var(--builder-shell-text-muted, #687385);
  }

  .inline-rich-text__editor :global(.ProseMirror ul),
  .inline-rich-text__editor :global(.ProseMirror ol) {
    margin: 0 0 0.8em 1.25em;
    padding: 0;
  }

  .inline-rich-text__editor :global(.ProseMirror blockquote) {
    margin: 0 0 0.8em;
    padding-inline-start: 0.85rem;
    border-inline-start: 3px solid rgba(147, 0, 63, 0.18);
    color: var(--builder-shell-text-muted, #687385);
  }
</style>
