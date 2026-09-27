# Similar Obsidian template plugins

Research date: 2026-09-26. Sources are limited to Obsidian's official community-plugin registry, official Obsidian help, and plugin-owned GitHub repositories and releases.

## Bottom line

Yes: the basic requirement is established and intuitive. At least three maintained plugins already implement **default/root template + per-folder template + closest/deepest folder wins**. What is unusual here is not the matching rule; it is storing the rule in the folder note's `folder-template` frontmatter so the vault's Markdown, rather than a plugin `data.json`, is the source of truth.

The closest existing substitute is **Default Template**. It already does default-template fallback, per-folder overrides, and walks from the target folder toward the root. If folder-note-backed configuration is not important, maintaining another plugin is difficult to justify. [README](https://github.com/raeperd/obsidian-default-template/blob/a43c6c85beda91abfff30fa2b4006a0d6b0a802e/README.md#folder-templates) · [implementation](https://github.com/raeperd/obsidian-default-template/blob/a43c6c85beda91abfff30fa2b4006a0d6b0a802e/main.ts#L35-L55)

No reviewed official-registry candidate stores general note-template inheritance in folder-note frontmatter. That remains this plugin's clear differentiator.

## Feature comparison

| Plugin | Default template | Per-folder | Closest/deepest inheritance | Rules live in folder notes | Interactive management / order | Important limitation |
| --- | --- | --- | --- | --- | --- | --- |
| **Frontmatter Templater (this project)** | Yes | Yes | Yes | **Yes** | Derived rule list; add/edit/open/remove; display order | Small placeholder engine only |
| **Default Template** | Yes | Yes | **Yes** | No, `data.json` mapping | Folder and template suggesters; add/delete; no meaningful precedence order | Functionally almost identical unless Markdown-owned rules matter |
| **Templater** | Root `/` rule acts as catch-all | Yes | **Yes; deepest match wins** | No, settings list | Mature picker/list UI; broad scripting system | Far larger attack/performance surface than the requested simple copier |
| **Notebook Navigator** | Root folder template | Yes | **Yes; closest wins** | No | Right-click folders, settings list, icons | Only applies to notes created through Notebook Navigator, not Obsidian or other plugins |
| **Folder Templates** | Can emulate with a catch-all rule | Path rules, not semantic folder assignments | Not inherently; first/all matching rule order | No | Named, enabled, testable, duplicable ordered rules | Regex/glob rule engine is more general and less intuitive; very new v0.1.x |
| **Ruled Template** | Can emulate with final catch-all | Regex/glob rules | No; first match wins | No | Up/down ordering, delete, rule tester | Last released in 2023; designed to cooperate with template plugins |
| **Folder Notes** | No | Template for a folder note itself | No | N/A | One configured folder-note template | Solves creation of the folder note, not templating ordinary notes inside that folder |
| **Core Templates + Daily Notes** | No automatic global default | Daily Notes can name one template | No | No | Native picker | Core Templates inserts manually; Daily Notes covers only daily notes |

## Candidate notes

### Default Template — closest match

The project explicitly positions itself as a minimal alternative to Templater. Its README lists automatic application, folder templates, hierarchy fallback, ignore paths, and the core `{{date}}`, `{{time}}`, and `{{title}}` variables. The implementation waits for layout readiness, ignores non-Markdown files, refuses to overwrite non-empty notes, checks folders from most specific to least specific, and then falls back to the default. Its settings enumerate a folder-to-template mapping with path suggestions. [README](https://github.com/raeperd/obsidian-default-template/blob/a43c6c85beda91abfff30fa2b4006a0d6b0a802e/README.md#features) · [create handler and resolver](https://github.com/raeperd/obsidian-default-template/blob/a43c6c85beda91abfff30fa2b4006a0d6b0a802e/main.ts#L21-L84) · [settings UI](https://github.com/raeperd/obsidian-default-template/blob/a43c6c85beda91abfff30fa2b4006a0d6b0a802e/main.ts#L124-L219)

The gap is architectural: mappings live in plugin settings, so they are not visible beside folder content, editable as normal Markdown properties, or naturally portable with an individual folder. Manual list order has no matching significance because folder depth determines precedence.

Maintenance: latest release **1.2.6** was published 2026-05-16, and the repository's latest code commit at review time was 2026-08-31. [release](https://github.com/raeperd/obsidian-default-template/releases/tag/1.2.6) · [latest reviewed commit](https://github.com/raeperd/obsidian-default-template/commit/a43c6c85beda91abfff30fa2b4006a0d6b0a802e)

### Templater — established full-featured implementation

Templater now documents the same folder semantics directly: a folder template applies to the selected folder and its children, the deepest match wins, and `/` is the catch-all. It also offers regex templates, excluded folders, startup templates, JavaScript user functions, and system commands. [settings documentation](https://github.com/SilentVoid13/Templater/blob/5333a68ac332ccb7ec126e4214312423fc0161a6/docs/src/settings.md#folder-templates)

That validates the requirement, but also validates the rationale for a smaller plugin: most Templater capabilities are unrelated to inherited folder defaults. Its rules remain centralized in settings rather than folder notes.

Maintenance: latest release **2.25.1** was published 2026-09-19 and code was still changing on 2026-09-25. [release](https://github.com/SilentVoid13/Templater/releases/tag/2.25.1) · [latest reviewed commit](https://github.com/SilentVoid13/Templater/commit/5333a68ac332ccb7ec126e4214312423fc0161a6)

### Notebook Navigator — exact semantics, restricted creation path

Notebook Navigator lets users set a template from a folder's context menu, applies it to subfolders by default, selects the closest configured folder, and treats the root template as a vault-wide default. It can render through its own engine or Templater. However, its documentation is explicit that folder templates apply only to notes it creates; notes created by Obsidian or other plugins are not filled. [template documentation](https://github.com/johansan/notebook-navigator/blob/beabb0d3aa985477792307c5c10ea5b804b03850/README.md#folder-templates)

It also supports folder notes, but that is a creation target, not where template configuration is stored. It is therefore a viable workflow replacement only if the user adopts Notebook Navigator's note-creation commands.

Maintenance: latest release **3.4.3** was published 2026-09-24 and code changed on 2026-09-26. [release](https://github.com/johansan/notebook-navigator/releases/tag/3.4.3) · [latest reviewed commit](https://github.com/johansan/notebook-navigator/commit/beabb0d3aa985477792307c5c10ea5b804b03850)

### Folder Templates — new general path-rule engine

Folder Templates applies templates automatically or manually using ordered regex/glob rules, can apply the first or all matches, supports capture substitutions in template paths, and includes rule tests and previews. [README](https://github.com/imbalet/folder-templates/blob/60096b0fba198b2304e3c875ac0b443ec62f7d03/README.md#settings-and-rules) · [settings implementation](https://github.com/imbalet/folder-templates/blob/60096b0fba198b2304e3c875ac0b443ec62f7d03/src/settings.ts#L183-L339)

It can reproduce folder behavior with carefully ordered patterns, but it does not model parent inheritance or a default template as first-class concepts, and it stores rules centrally. It is also too new to treat as proven: latest release **0.1.2** was published 2026-09-10. The official registry flags its entry as not manually reviewed by Obsidian staff. [release](https://github.com/imbalet/folder-templates/releases/tag/0.1.2) · [official registry entry](https://github.com/obsidianmd/obsidian-releases/blob/99d3671fa0e074476ebbddac6e6c05db46a31685/community-plugins.json)

### Ruled Template — older ordered-rule alternative

Ruled Template selects the first matching regex or glob, exposes up/down sorting and a tester, and is intended for use with templating plugins. This covers manual precedence but not semantic folder inheritance or folder-note configuration. [README](https://github.com/YPetremann/obsidian-ruled-template/blob/885419592d3ff4180ca91243ee16cfe7f3310f96/README.md#description)

Maintenance is the concern: latest release **1.1.0** and the last code commit are both from 2023-07-25. [release](https://github.com/YPetremann/obsidian-ruled-template/releases/tag/1.1.0) · [latest reviewed commit](https://github.com/YPetremann/obsidian-ruled-template/commit/885419592d3ff4180ca91243ee16cfe7f3310f96)

### Folder Notes and Obsidian core — adjacent, not substitutes

Folder Notes supports applying a configured template when creating the folder note itself; it does not use each folder note to configure templates for ordinary descendants. Its open integration issue also illustrates lifecycle fragility when Folder Notes and Templater both participate in creation. [repository](https://github.com/LostPaul/obsidian-folder-notes) · [Templater integration issue](https://github.com/LostPaul/obsidian-folder-notes/issues/322)

Obsidian's core Templates plugin provides a template folder and manual insertion into the active note. Daily Notes can apply one selected template to daily-note creation. Neither documents an automatic default template for every new note or inherited per-folder rules. [official Templates help](https://obsidian.md/help/Plugins/Templates) · [official Daily Notes help](https://obsidian.md/help/Plugins/Daily%2Bnotes)

## Product conclusion

The review changes the justification for this project:

- **Do not position it merely as “simple Templater folder templates.”** Default Template already occupies that exact space.
- Position it as **folder-note-native template inheritance**: configuration travels with the folder, remains human-readable, and can be edited from Properties or the consolidated index.
- Treat the settings list as an index and editor, not the canonical rule store. Its manual order is presentation only; changing it must never alter closest-folder precedence.
- Keep the narrow engine and safety properties: only new empty Markdown notes, no JavaScript or shell execution, no startup-wide processing, and template files excluded.
- If folder-note-native configuration is not valuable enough to defend, use Default Template instead of maintaining this plugin.

## Registry scope

The official registry identifies Templater, Default Template, Ruled Template, Folder Templates, and adjacent template tools. The registry is the source Obsidian uses for its community-plugin directory; plugin details are then pulled from each repository. [official registry README](https://github.com/obsidianmd/obsidian-releases/blob/99d3671fa0e074476ebbddac6e6c05db46a31685/README.md#how-community-plugins-are-pulled) · [registry data](https://github.com/obsidianmd/obsidian-releases/blob/99d3671fa0e074476ebbddac6e6c05db46a31685/community-plugins.json)
