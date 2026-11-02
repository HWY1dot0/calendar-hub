<svelte:options immutable />

<script lang="ts">
  import { onMount } from "svelte";

  import type { FolderRule } from "src/io/folderRules";
  import { getFolderCheckState } from "src/io/folderRules";
  import type { FolderNode } from "src/io/folderTree";
  import {
    flattenFolderTree,
    getExpansionForSelection,
  } from "src/io/folderTree";
  import { getVaultFolderTree } from "src/io/vaultFolders";

  export let rules: FolderRule[];
  export let onToggleFolder: (folder: string) => void;

  let folderTree: FolderNode[] = [];
  let expandedFolders: Set<string> = new Set();

  onMount(() => {
    folderTree = getVaultFolderTree();
    expandedFolders = getExpansionForSelection(
      rules.map((rule) => rule.path)
    );
  });

  $: visibleFolderRows = flattenFolderTree(folderTree, expandedFolders);
  // The vault root is the top of the tree: ticked means everything is in
  // scope, unticked means "only what I tick below".
  $: rootState = getFolderCheckState("", rules);

  function handleToggleFolderExpansion(folder: string): void {
    const next = new Set(expandedFolders);
    if (next.has(folder)) {
      next.delete(folder);
    } else {
      next.add(folder);
    }
    expandedFolders = next;
  }
</script>

<div class="calendar-folder-list">
  <div class="calendar-folder-row calendar-folder-root">
    <span class="calendar-folder-expand-spacer" />
    <label class="calendar-folder-option" title="Whole vault">
      <input
        type="checkbox"
        checked={rootState === "checked"}
        indeterminate={rootState === "partial"}
        on:change={() => onToggleFolder("")}
      />
      <span class="calendar-folder-path">Whole vault</span>
    </label>
  </div>
  {#each visibleFolderRows as row (row.path)}
    {@const state = getFolderCheckState(row.path, rules)}
    <div
      class="calendar-folder-row"
      style="padding-left: {(row.depth + 1) * 14}px"
    >
      {#if row.hasChildren}
        <button
          class="calendar-folder-expand"
          type="button"
          aria-expanded={row.expanded}
          aria-label={row.expanded ? "Collapse folder" : "Expand folder"}
          on:click={() => handleToggleFolderExpansion(row.path)}
        >
          {row.expanded ? "▾" : "▸"}
        </button>
      {:else}
        <span class="calendar-folder-expand-spacer" />
      {/if}
      <label class="calendar-folder-option" title={row.path}>
        <input
          type="checkbox"
          checked={state === "checked"}
          indeterminate={state === "partial"}
          on:change={() => onToggleFolder(row.path)}
        />
        <span class="calendar-folder-path">{row.name}</span>
      </label>
    </div>
  {/each}
</div>
