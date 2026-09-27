import { App, FuzzySuggestModal, TFile } from "obsidian";

export class TemplatePicker extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private readonly templates: TFile[],
    private readonly onChoose: (template: TFile) => void | Promise<void>,
  ) {
    super(app);
    this.setPlaceholder("Choose a template");
  }

  getItems(): TFile[] {
    return this.templates;
  }

  getItemText(item: TFile): string {
    return item.path;
  }

  onChooseItem(item: TFile): void {
    void this.onChoose(item);
  }
}
