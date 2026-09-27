import { AbstractInputSuggest, App, TFile, TFolder } from "obsidian";

abstract class PathSuggest<T extends TFile | TFolder> extends AbstractInputSuggest<T> {
  private static readonly MAX_RESULTS = 100;
  private readonly sortedItems: T[];

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    items: () => T[],
  ) {
    super(app, inputEl);
    this.sortedItems = items().sort((a, b) => a.path.localeCompare(b.path));
  }

  getSuggestions(query: string): T[] {
    const normalized = query.trim().toLowerCase();
    const suggestions: T[] = [];
    for (const item of this.sortedItems) {
      if (!item.path.toLowerCase().includes(normalized)) continue;
      suggestions.push(item);
      if (suggestions.length >= PathSuggest.MAX_RESULTS) break;
    }
    return suggestions;
  }

  renderSuggestion(item: T, el: HTMLElement): void {
    el.setText(item.path);
  }

  selectSuggestion(item: T): void {
    this.setValue(item.path);
    this.close();
  }
}

export class MarkdownFileSuggest extends PathSuggest<TFile> {
  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl, () => app.vault.getMarkdownFiles());
  }
}

export class FolderSuggest extends PathSuggest<TFolder> {
  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl, () => {
      const folders: TFolder[] = [];
      const visit = (folder: TFolder): void => {
        for (const child of folder.children) {
          if (child instanceof TFolder) {
            folders.push(child);
            visit(child);
          }
        }
      };
      visit(app.vault.getRoot());
      return folders;
    });
  }
}
