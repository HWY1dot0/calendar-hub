<svelte:options immutable />

<script lang="ts">
  import type { TFile } from "obsidian";

  import type { FolderRule } from "src/io/folderRules";
  import {
    parseFolderRules,
    serializeFolderRules,
    toggleFolderRule,
  } from "src/io/folderRules";
  import type { ISettings } from "src/settings";
  import FolderRuleTree from "./FolderRuleTree.svelte";
  import type {
    ListGrouping,
    ListSortOrder,
    ListYearGroup,
  } from "./listViewModel";
  import { buildListModel, getListKeysForDate } from "./listViewModel";
  import { dailyNotesByDate, settings } from "./stores";

  export let onOpenNote: (file: TFile, inNewSplit: boolean) => Promise<void>;
  export let onUpdateSettings: (
    changeOpts: (settings: ISettings) => Partial<ISettings>
  ) => Promise<void>;

  let isListFilterOpen = false;
  let listFilterRules: FolderRule[] = [];
  let expandedListGroups: Set<string> | null = null;
  let listModel: ListYearGroup[] = [];
  let listTotalNotes = 0;

  $: listFilterRules = parseFolderRules($settings.listFolderFilter);
  $: listFilterSummary = getFilterSummary($settings.listFolderFilter);
  $: listModel = buildListModel(
    $dailyNotesByDate,
    $settings.listGrouping,
    $settings.listSortOrder,
    listFilterRules
  );
  $: listTotalNotes = listModel.reduce(
    (count, year) => count + year.noteCount,
    0
  );
  $: if (expandedListGroups === null) {
    expandedListGroups = getTodayListExpansion($settings.listGrouping);
  }

  function getTodayListExpansion(grouping: ListGrouping): Set<string> {
    const keys = getListKeysForDate(window.moment(), grouping);
    return new Set([keys.yearKey, keys.subgroupKey]);
  }

  function handleChangeListGrouping(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement)
      .value as ListGrouping;
    expandedListGroups = getTodayListExpansion(value);
    void onUpdateSettings(() => ({ listGrouping: value }));
  }

  function handleChangeListSort(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement)
      .value as ListSortOrder;
    void onUpdateSettings(() => ({ listSortOrder: value }));
  }

  function handleToggleListGroup(key: string): void {
    const next = new Set(expandedListGroups ?? []);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    expandedListGroups = next;
  }

  function handleToggleListFilterFolder(folder: string): void {
    void onUpdateSettings(() => ({
      listFolderFilter: serializeFolderRules(
        toggleFolderRule(folder, listFilterRules)
      ),
    }));
  }

  function handleClearListFilter(): void {
    void onUpdateSettings(() => ({ listFolderFilter: "" }));
  }

  function handleOpenNote(event: MouseEvent, file: TFile): void {
    event.preventDefault();
    void onOpenNote(file, event.metaKey || event.ctrlKey);
  }

  function getFilterSummary(value: string): string {
    const rules = parseFolderRules(value);
    const includes = rules.filter((rule) => !rule.excluded).length;
    const excludes = rules.length - includes;
    if (!includes && !excludes) {
      return "All notes";
    }
    if (!includes) {
      return `All notes − ${excludes}`;
    }
    const base = `${includes} folder${includes === 1 ? "" : "s"}`;
    return excludes ? `${base} − ${excludes}` : base;
  }

  function formatNoteCount(count: number): string {
    return `${count} note${count === 1 ? "" : "s"}`;
  }
</script>

<div class="calendar-hub-list-panel">
  <div class="calendar-list-controls">
    <select
      class="dropdown calendar-list-select"
      value={$settings.listGrouping}
      on:change={handleChangeListGrouping}
    >
      <option value="year">Year</option>
      <option value="quarter">Year › Quarter</option>
      <option value="month">Year › Month</option>
      <option value="week">Year › Week</option>
    </select>
    <select
      class="dropdown calendar-list-select"
      value={$settings.listSortOrder}
      on:change={handleChangeListSort}
    >
      <option value="desc">Newest first</option>
      <option value="asc">Oldest first</option>
    </select>
    <span class="calendar-list-total">{formatNoteCount(listTotalNotes)}</span>
  </div>

  <button
    class="calendar-filter-toggle calendar-list-filter-toggle"
    type="button"
    aria-expanded={isListFilterOpen}
    on:click={() => (isListFilterOpen = !isListFilterOpen)}
  >
    <span>Filter folders</span>
    <span class="calendar-filter-summary">{listFilterSummary}</span>
  </button>
  {#if isListFilterOpen}
    <div class="calendar-list-filter-body">
      <FolderRuleTree
        rules={listFilterRules}
        onToggleFolder={handleToggleListFilterFolder}
      />
      <div class="calendar-filter-actions">
        <button
          class="calendar-filter-action"
          type="button"
          disabled={!$settings.listFolderFilter}
          on:click={handleClearListFilter}
        >
          All notes
        </button>
      </div>
    </div>
  {/if}

  {#if listModel.length}
    <div class="calendar-list-tree">
      {#each listModel as yearGroup (yearGroup.key)}
        <button
          class="calendar-list-group"
          type="button"
          aria-expanded={expandedListGroups?.has(yearGroup.key) ?? false}
          on:click={() => handleToggleListGroup(yearGroup.key)}
        >
          <span class="calendar-list-caret">
            {expandedListGroups?.has(yearGroup.key) ? "▾" : "▸"}
          </span>
          <span class="calendar-list-label">{yearGroup.label}</span>
          <span class="calendar-list-count">{yearGroup.noteCount}</span>
        </button>
        {#if expandedListGroups?.has(yearGroup.key)}
          {#each yearGroup.subgroups as subgroup (subgroup.key)}
            {#if subgroup.label !== null}
              <button
                class="calendar-list-group calendar-list-subgroup"
                type="button"
                aria-expanded={expandedListGroups?.has(subgroup.key) ?? false}
                on:click={() => handleToggleListGroup(subgroup.key)}
              >
                <span class="calendar-list-caret">
                  {expandedListGroups?.has(subgroup.key) ? "▾" : "▸"}
                </span>
                <span class="calendar-list-label">{subgroup.label}</span>
                <span class="calendar-list-count">
                  {subgroup.noteCount}
                </span>
              </button>
            {/if}
            {#if subgroup.label === null || expandedListGroups?.has(subgroup.key)}
              <div
                class="calendar-list-days"
                class:calendar-list-days-nested={subgroup.label !== null}
              >
                {#each subgroup.days as day (day.dateStr)}
                  <div class="calendar-list-day">{day.label}</div>
                  {#each day.files as note (note.path)}
                    <button
                      class="calendar-list-note"
                      type="button"
                      title={note.path}
                      on:click={(event) => handleOpenNote(event, note)}
                    >
                      {note.basename}
                    </button>
                  {/each}
                {/each}
              </div>
            {/if}
          {/each}
        {/if}
      {/each}
    </div>
  {:else}
    <div class="calendar-note-empty">No dated notes</div>
  {/if}
</div>
