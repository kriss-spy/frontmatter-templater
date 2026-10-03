# Changelog

## 1.0.2 - 2026-10-03

### Fixed

- Discover Markdown templates recursively so Insert template includes templates in nested folders such as `bases`.
- Use the default template's folder for discovery, with an optional Template folder setting to select another root.
- Protect templates in the discovered folder from automatic template application.
- Apply configured templates to newly opened notes when their creator does not emit Obsidian's normal vault creation event.

## 1.0.1 - 2026-09-28

### Fixed

- Persist the complete Markdown file path selected from settings suggestions instead of retaining the partial search query.
- Apply the same suggestion-selection fix to folder template configuration.

## 1.0.0

- Require Obsidian 1.5.7 or later for external settings synchronization.
- Store folder assignments exclusively in canonical same-name folder notes.
- Resolve the closest folder rule before falling back to the configured default.
- Cache folder rules and bound file/folder suggestions for large vaults.
- Apply templates only to still-empty notes through Obsidian's atomic vault API.
- Support core-style formatted date and time placeholders.
- Provide a settings index with manual display ordering.
