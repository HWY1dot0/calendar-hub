# Multi Note Calendar

Multi Note Calendar is an Obsidian plugin for people who keep more than one date-based note for the same day.

Instead of assuming that one calendar date maps to one file, it can gather matching Markdown notes across folders and show them together when you select a day.

Example matches for one date:

- `Daily/2026-05-29.md`
- `Credit News/credit news 20260529.md`
- `Iran tracker/Iran 20260529.md`

## Highlights

- Select a day and see every matching note for that date below the calendar.
- Keep notes in separate folders while navigating them from one date view.
- Scan the whole vault or limit matching to specific folders.
- Match exact Daily Notes filenames and dates embedded inside longer filenames.
- Add extra filename date formats such as `YYYYMMDD`.
- Use frontmatter date fields as a fallback when the filename has no date.
- Use note-count dots to see how many matching notes exist on each day.
- Keep optional weekly-note support for existing Calendar workflows.

## Date Matching

Multi Note Calendar maps Markdown files to calendar dates in this order:

1. Exact Daily Notes filename match using your configured Daily Notes format.
2. Date embedded in the filename using the Daily Notes format.
3. Date embedded in the filename using any extra formats you configure.
4. Frontmatter date fallback, only when the filename does not contain a matching date.

Filename dates take priority over frontmatter dates. Folder filters apply to both filename and frontmatter matching.

## Settings

- **Detect daily notes in all folders**: Scan Markdown files outside the configured Daily Notes folder.
- **Folders to scan for daily notes**: Limit matching to comma-separated folder paths. Leave blank to scan the whole vault.
- **Date format inside daily note filenames**: Add extra comma-separated formats, such as `YYYYMMDD`.
- **Use frontmatter date fallback**: Read configured frontmatter fields when the filename has no matching date.
- **Frontmatter date fields**: Choose fields such as `date`, `daily_date`, or `calendar.date`.
- **Note count dots**: Solid dots show how many matching notes exist for the day, up to 5 dots.
- **Confirm before creating new note**: Ask before creating a new Daily Note.
- **Show week number**: Show week numbers and keep legacy weekly-note behavior.

The folder filter can also be adjusted directly from the calendar sidebar.

## Installation

Install through Obsidian's Community Plugins directory after publication.

Before publication, install with BRAT using this repository:

```text
HWY1dot0/multi-note-calendar
```

Manual installation uses the files attached to each GitHub release:

- `main.js`
- `manifest.json`
- `styles.css`

Copy those files into `.obsidian/plugins/multi-note-calendar/` inside your vault, then reload Obsidian and enable the plugin.

## Commands

- **Open calendar view**: Opens the Multi Note Calendar sidebar view.
- **Reveal active note in calendar**: Moves the calendar to the month for the active date-based note.
- **Open weekly note**: Opens or creates the current weekly note when legacy weekly-note support is enabled.

## Compatibility

Multi Note Calendar requires Obsidian `0.9.11` or newer.

The plugin uses Obsidian theme variables and should follow light and dark themes without custom CSS.

## Relationship To Calendar

This plugin is based on Liam Cain's original Calendar plugin for Obsidian:

https://github.com/liamcain/obsidian-calendar-plugin

The original project is MIT licensed. The original copyright notice remains in `LICENSE`, alongside copyright for this fork's modifications.

Multi Note Calendar uses its own plugin id, `multi-note-calendar`, so it can be installed separately from the original Calendar plugin.

## Development

```bash
npm test
npm run build
```

## Say Thanks

If Multi Note Calendar helps your workflow, you can buy me a coffee:

https://www.buymeacoffee.com/hwy1dot0
