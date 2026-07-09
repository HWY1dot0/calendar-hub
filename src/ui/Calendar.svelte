<svelte:options immutable />

<script lang="ts">
  import type { Moment } from "../obsidian-moment";
  import type { TFile } from "obsidian";
  import {
    Calendar as CalendarBase,
    configureGlobalMomentLocale,
  } from "obsidian-calendar-ui";
  import type { ICalendarSource } from "obsidian-calendar-ui";
  import { onDestroy } from "svelte";

  import type { ISettings } from "src/settings";
  import { getDailyNotesForDate } from "src/io/dailyNoteIndex";
  import type { FolderRule } from "src/io/folderRules";
  import {
    parseFolderRules,
    serializeFolderRules,
    toggleFolderRule,
  } from "src/io/folderRules";
  import { getWeeklyNotesForDate } from "src/io/weeklyNotes";
  import FolderRuleTree from "./FolderRuleTree.svelte";
  import type {
    ListGrouping,
    ListSortOrder,
    ListYearGroup,
  } from "./listViewModel";
  import { buildListModel, getListKeysForDate } from "./listViewModel";
  import {
    activeFile,
    dailyNotes,
    dailyNotesByDate,
    settings,
    weeklyNotes,
    weeklyNotesByDate,
  } from "./stores";

  let today: Moment = null;
  let selectedDate: Moment = null;
  let selectedWeek: Moment = null;
  let selectionMode: "day" | "week" = "day";
  let selectedNotes: TFile[] = [];
  let panelLabel = "";
  let hasSelection = false;
  let isListFilterOpen = false;
  let listFilterRules: FolderRule[] = [];
  let expandedListGroups: Set<string> | null = null;
  let listModel: ListYearGroup[] = [];
  let listTotalNotes = 0;

  $: today = getToday($settings);
  $: if (!displayedMonth && today) {
    displayedMonth = today.clone();
  }
  $: if (!selectedDate && today) {
    selectedDate = today.clone();
  }
  $: selectedNotes =
    selectionMode === "week" && selectedWeek
      ? getWeeklyNotesForDate(selectedWeek, $weeklyNotesByDate, $weeklyNotes)
      : selectedDate
      ? getDailyNotesForDate(selectedDate, $dailyNotesByDate, $dailyNotes)
      : [];
  $: hasSelection =
    selectionMode === "week" ? !!selectedWeek : !!selectedDate;
  $: panelLabel =
    selectionMode === "week" && selectedWeek
      ? `${selectedWeek.format("GGGG")} · ${selectedWeek.format("[W]WW")}`
      : selectedDate
      ? selectedDate.format("LL")
      : "";
  $: listFilterRules = parseFolderRules($settings.listFolderFilter);
  $: listFilterSummary = getScanFoldersSummary(
    $settings.listFolderFilter,
    "All notes"
  );
  $: listModel = $settings.showListPanel
    ? buildListModel(
        $dailyNotesByDate,
        $settings.listGrouping,
        $settings.listSortOrder,
        listFilterRules
      )
    : [];
  $: listTotalNotes = listModel.reduce(
    (count, year) => count + year.noteCount,
    0
  );
  $: if ($settings.showListPanel && expandedListGroups === null && today) {
    expandedListGroups = getTodayListExpansion($settings.listGrouping);
  }

  export let displayedMonth: Moment = null;
  export let sources: ICalendarSource[];
  export let onHoverDay: (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ) => void;
  export let onHoverWeek: (
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ) => void;
  export let onClickDay: (
    date: Moment,
    isMetaPressed: boolean
  ) => Promise<void>;
  export let onClickWeek: (
    date: Moment,
    isMetaPressed: boolean
  ) => Promise<void>;
  export let onContextMenuDay: (date: Moment, event: MouseEvent) => void;
  export let onContextMenuWeek: (date: Moment, event: MouseEvent) => void;
  export let onOpenDayNote: (
    file: TFile,
    inNewSplit: boolean
  ) => Promise<void>;
  export let onUpdateSettings: (
    changeOpts: (settings: ISettings) => Partial<ISettings>
  ) => Promise<void>;

  export function tick() {
    today = window.moment();
  }

  function getToday(settings: ISettings) {
    configureGlobalMomentLocale(settings.localeOverride, settings.weekStart);
    dailyNotes.reindex();
    weeklyNotes.reindex();
    return window.moment();
  }

  // 1 minute heartbeat to keep `today` reflecting the current day
  let heartbeat = setInterval(() => {
    tick();

    const isViewingCurrentMonth = displayedMonth.isSame(today, "day");
    if (isViewingCurrentMonth) {
      // if it's midnight on the last day of the month, this will
      // update the display to show the new month.
      displayedMonth = today;
    }
  }, 1000 * 60);

  onDestroy(() => {
    clearInterval(heartbeat);
  });

  function handleClickDay(date: Moment, isMetaPressed: boolean): void {
    selectionMode = "day";
    selectedDate = date.clone();
    void onClickDay(date, isMetaPressed);
  }

  function handleClickWeek(date: Moment, isMetaPressed: boolean): void {
    selectionMode = "week";
    selectedWeek = date.clone();
    void onClickWeek(date, isMetaPressed);
  }

  function handleResetDisplayedMonth(date: Moment): void {
    today = date.clone();
    displayedMonth = date.clone();

    // "Today" should also move the selection (and the note panel) back to
    // today, not leave it on the last-visited day. We only *open* today's note
    // when it already exists — clicking Today never creates a file.
    selectionMode = "day";
    selectedWeek = null;
    selectedDate = date.clone();

    const todaysNotes = getDailyNotesForDate(
      date,
      $dailyNotesByDate,
      $dailyNotes
    );
    if (todaysNotes.length === 1) {
      void onOpenDayNote(todaysNotes[0], false);
    }
  }

  function handleHoverDay(
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed?: boolean
  ): void {
    onHoverDay(date, targetEl, isMetaPressed ?? false);
  }

  function handleHoverWeek(
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed?: boolean
  ): void {
    onHoverWeek(date, targetEl, isMetaPressed ?? false);
  }

  function handleContextMenuDay(date: Moment, event: MouseEvent): boolean {
    onContextMenuDay(date, event);
    return true;
  }

  function handleContextMenuWeek(date: Moment, event: MouseEvent): boolean {
    onContextMenuWeek(date, event);
    return true;
  }

  function handleOpenDayNote(event: MouseEvent, file: TFile): void {
    event.preventDefault();
    void onOpenDayNote(file, event.metaKey || event.ctrlKey);
  }

  function getTodayListExpansion(grouping: ListGrouping): Set<string> {
    const keys = getListKeysForDate(window.moment(), grouping);
    return new Set([keys.yearKey, keys.subgroupKey]);
  }

  function handleToggleListPanel(): void {
    const opening = !$settings.showListPanel;
    void onUpdateSettings(() => ({ showListPanel: opening }));
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

  function getScanFoldersSummary(value: string, baseLabel = "All vault"): string {
    const rules = parseFolderRules(value);
    const includes = rules.filter((rule) => !rule.excluded).length;
    const excludes = rules.length - includes;
    if (!includes && !excludes) {
      return baseLabel;
    }
    if (!includes) {
      return `${baseLabel} − ${excludes}`;
    }
    const base = `${includes} folder${includes === 1 ? "" : "s"}`;
    return excludes ? `${base} − ${excludes}` : base;
  }

  function formatNoteCount(count: number): string {
    return `${count} note${count === 1 ? "" : "s"}`;
  }
</script>

<CalendarBase
  {sources}
  {today}
  onHoverDay={handleHoverDay}
  onHoverWeek={handleHoverWeek}
  onContextMenuDay={handleContextMenuDay}
  onContextMenuWeek={handleContextMenuWeek}
  onClickDay={handleClickDay}
  onClickWeek={handleClickWeek}
  onResetDisplayedMonth={handleResetDisplayedMonth}
  bind:displayedMonth
  localeData={today.localeData()}
  selectedId={$activeFile}
  showWeekNums={$settings.showWeeklyNote}
/>

{#if hasSelection}
  <section class="calendar-note-panel">
    <div class="calendar-note-panel-header">
      <span>{panelLabel}</span>
      <span class="calendar-note-count">
        {formatNoteCount(selectedNotes.length)}
      </span>
    </div>

    {#if selectedNotes.length}
      <ul class="calendar-note-list">
        {#each selectedNotes as note (note.path)}
          <li>
            <button
              class="calendar-note-list-item"
              type="button"
              title={note.path}
              on:click={(event) => handleOpenDayNote(event, note)}
            >
              <span class="calendar-note-title">{note.basename}</span>
              <span class="calendar-note-path">{note.path}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="calendar-note-empty">No notes</div>
    {/if}
  </section>
{/if}

<section class="calendar-filter-panel">
  <button
    class="calendar-filter-toggle"
    type="button"
    aria-expanded={$settings.showListPanel}
    on:click={handleToggleListPanel}
  >
    <span>List</span>
    <span class="calendar-filter-summary">
      {$settings.showListPanel ? formatNoteCount(listTotalNotes) : ""}
    </span>
  </button>

  {#if $settings.showListPanel}
    <div class="calendar-filter-body">
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
                    aria-expanded={expandedListGroups?.has(subgroup.key) ??
                      false}
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
                          on:click={(event) => handleOpenDayNote(event, note)}
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
  {/if}
</section>

