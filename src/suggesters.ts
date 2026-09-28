import { AbstractInputSuggest, App, TFile, TFolder } from "obsidian";
import { setInputValueAndNotify } from "./input-utils";

abstract class PathSuggest<T extends TFile | TFolder> extends AbstractInputSuggest<T> {
  private static readonly MAX_RESULTS = 100;
  private readonly sortedItems: T[];
  private readonly pathInputEl: HTMLInputElement;

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    items: () => T[],
  ) {
    super(app, inputEl);
    this.pathInputEl = inputEl;
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
    // AbstractInputSuggest.setValue() only replaces the visible text. Emit the
    // input event too so SearchComponent.onChange persists the selected path.
    setInputValueAndNotify(this.pathInputEl, item.path);
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
