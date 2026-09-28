# Changelog

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
