# Frontmatter Templater

Frontmatter Templater is a small, agent-readable templating plugin for
Obsidian. It automatically fills new, empty Markdown notes from either:

1. the closest `folder-template` rule found in a same-name folder note, or
2. the default template configured in the plugin settings.

Unlike rule lists stored only in plugin settings, folder assignments live in
the vault itself. A person or agent exploring a folder can discover its
template by reading the folder note. The plugin does not execute JavaScript or
shell commands.

## Folder templates

For a folder named `Projects/Acme`, its folder note is:

```text
Projects/Acme/Acme.md
```

Set the folder note property to a Markdown template:

```yaml
---
folder-template: "[[Templates/Project]]"
---
```

The rule applies to notes in `Projects/Acme` and every descendant folder. A
rule in a deeper folder wins over its parent. If no valid folder rule exists,
the configured default template is used.

Only this same-name, inside-folder note is canonical. This keeps resolution
deterministic and matches the inside-folder mode of the Folder Notes community
plugin.

The settings page is a derived index of the rules stored in folder notes. From
there you can add, edit, open, remove, or visually reorder a rule. Reordering
changes only the settings display; resolution always follows folder ancestry.
Adding a rule reuses the canonical folder note or creates it when needed.
Removing a rule removes only the `folder-template` property; it never deletes
the folder note.

## Agent discovery

Folder rules require no plugin data file to understand. To make the global
fallback discoverable too, document it in the vault-root `AGENTS.md`:

```markdown
## Folder templates

The default note template is `Templates/Default.md`.

For folder-specific templates, inspect the folder's same-name folder note and
read its `folder-template` property. The closest folder declaration wins;
otherwise use the default template above.
```

The plugin does not edit `AGENTS.md` automatically.

## Commands

- **Apply configured template to the current empty note** applies the closest
  folder rule or the default template.
- **Insert template** opens a searchable picker containing the default template
  and every valid template referenced by a folder note, then inserts the chosen
  template at the cursor.

Referenced template files are never automatically templated themselves.

## Placeholders

The plugin expands these placeholders when inserting content:

| Placeholder | Value |
| --- | --- |
| `{{title}}` | Note filename without `.md` |
| `{{folder}}` | Note's vault-relative folder path |
| `{{date}}` | Current date as `YYYY-MM-DD` |
| `{{date:FORMAT}}` | Current date using a Moment.js format |
| `{{time}}` | Current time as `HH:mm` |
| `{{time:FORMAT}}` | Current time using a Moment.js format |

Placeholder names are case-insensitive. Everything else is copied unchanged.

## Compatibility

Automatic template application waits briefly for the note creator to finish,
then uses Obsidian's atomic vault processing API and writes only when the note
is still empty. Avoid enabling overlapping automatic-template rules in other
plugins for the same folders. Core Daily Notes can remain enabled; when it has
already populated a note, Frontmatter Templater leaves that note unchanged.

The plugin uses only Obsidian APIs and supports desktop and mobile.

## Development

```bash
npm install
npm test
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` to:

```text
<vault>/.obsidian/plugins/frontmatter-templater/
```

## Release assets

Each GitHub release must use a tag matching `manifest.json` exactly and include
`main.js`, `manifest.json`, and `styles.css` as separate assets.
