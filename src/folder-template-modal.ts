import { App, Modal, Notice, Setting, TFile, TFolder } from "obsidian";
import { FolderSuggest, MarkdownFileSuggest } from "./suggesters";
import type { TemplateService } from "./template-service";

export class FolderTemplateModal extends Modal {
  private folderPath: string;
  private templatePath: string;
  private readonly editingExistingRule: boolean;

  constructor(
    app: App,
    private readonly service: TemplateService,
    initial: { folderPath?: string; templatePath?: string },
    private readonly onSaved: () => void | Promise<void>,
  ) {
    super(app);
    this.folderPath = initial.folderPath ?? "";
    this.templatePath = initial.templatePath ?? "";
    this.editingExistingRule = initial.folderPath !== undefined;
  }

  onOpen(): void {
    this.titleEl.setText(
      this.editingExistingRule ? "Edit folder template" : "Add folder template",
    );
    this.contentEl.addClass("frontmatter-templater-modal");

    new Setting(this.contentEl)
      .setName("Folder")
      .setDesc(
        this.editingExistingRule
          ? "Remove this rule and add another one to change its folder."
          : "The folder whose same-name folder note stores the rule.",
      )
      .addSearch((search) => {
        search
          .setPlaceholder("Projects/example")
          .setValue(this.folderPath)
          .setDisabled(this.editingExistingRule);
        search.onChange((value) => (this.folderPath = value));
        if (!this.editingExistingRule) {
          new FolderSuggest(this.app, search.inputEl);
        }
      });

    new Setting(this.contentEl)
      .setName("Template")
      .setDesc("Any Markdown file in the vault.")
      .addSearch((search) => {
        search.setPlaceholder("Templates/Project.md").setValue(this.templatePath);
        search.onChange((value) => (this.templatePath = value));
        new MarkdownFileSuggest(this.app, search.inputEl);
      });

    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText("Cancel").onClick(() => this.close()),
      )
      .addButton((button) =>
        button
          .setButtonText("Save")
          .setCta()
          .onClick(() => void this.save()),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async save(): Promise<void> {
    const folder = this.service.getFolder(this.folderPath);
    if (!(folder instanceof TFolder)) {
      new Notice("Choose an existing folder.");
      return;
    }
    const template = this.service.resolveTemplateReference(this.templatePath, "");
    if (!(template instanceof TFile)) {
      new Notice("Choose an existing Markdown template.");
      return;
    }

    try {
      await this.service.setRule(folder, template);
      await this.onSaved();
      this.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Could not save folder template: ${message}`);
    }
  }
}
