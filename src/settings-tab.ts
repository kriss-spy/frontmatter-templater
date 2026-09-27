import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import FrontmatterTemplaterPlugin from "./main";
import { FolderTemplateModal } from "./folder-template-modal";
import { reconcileFolderTemplateOrder } from "./settings";
import { MarkdownFileSuggest } from "./suggesters";
import type { FolderTemplateRule } from "./template-service";

export class FrontmatterTemplaterSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: FrontmatterTemplaterPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.renderSettings();
  }

  private renderSettings(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Default template")
      .setDesc(
        "Used when no folder note rule applies. For agent discoverability, document this path and the inheritance convention in the agent instructions file at the vault root.",
      )
      .addSearch((search) => {
        search
          .setPlaceholder("Templates/Default.md")
          .setValue(this.plugin.settings.defaultTemplate)
          .onChange(async (value) => {
            this.plugin.settings.defaultTemplate = value.trim();
            await this.plugin.saveSettings();
          });
        new MarkdownFileSuggest(this.app, search.inputEl);
      });

    new Setting(containerEl).setName("Folder templates").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Rules live in the folder-template property of same-name folder notes. The closest folder wins; parent rules are inherited. Reordering changes only this display.",
    });

    new Setting(containerEl)
      .setClass("frontmatter-templater-add-row")
      .setName("Add folder template")
      .setDesc("Create or update a folder note rule.")
      .addButton((button) =>
        button.setButtonText("Add").setCta().onClick(() => {
          new FolderTemplateModal(
            this.app,
            this.plugin.templateService,
            {},
            () => this.renderSettings(),
          ).open();
        }),
      );

    const rules = this.getOrderedRules();
    if (rules.length === 0) {
      containerEl.createEl("p", {
        cls: "frontmatter-templater-empty-state",
        text: "No folder templates found.",
      });
      return;
    }

    for (const [index, rule] of rules.entries()) {
      const description = rule.template
        ? rule.template.path
        : `${rule.configuredValue} (template not found)`;
      const row = new Setting(containerEl)
        .setClass("frontmatter-templater-rule")
        .setName(rule.folder.path)
        .setDesc(description)
        .addExtraButton((button) =>
          button
            .setIcon("arrow-up")
            .setTooltip("Move up")
            .setDisabled(index === 0)
            .onClick(() => void this.moveRule(rules, index, -1)),
        )
        .addExtraButton((button) =>
          button
            .setIcon("arrow-down")
            .setTooltip("Move down")
            .setDisabled(index === rules.length - 1)
            .onClick(() => void this.moveRule(rules, index, 1)),
        )
        .addExtraButton((button) =>
          button
            .setIcon("file-pen-line")
            .setTooltip("Edit folder template")
            .onClick(() => {
              new FolderTemplateModal(
                this.app,
                this.plugin.templateService,
                {
                  folderPath: rule.folder.path,
                  templatePath: rule.template?.path ?? rule.configuredValue,
                },
                () => this.renderSettings(),
              ).open();
            }),
        )
        .addExtraButton((button) =>
          button
            .setIcon("file-text")
            .setTooltip("Open folder note")
            .onClick(() => {
              void this.app.workspace.getLeaf(false).openFile(rule.folderNote);
            }),
        )
        .addExtraButton((button) =>
          button
            .setIcon("trash-2")
            .setTooltip("Remove rule")
            .onClick(async () => {
              await this.plugin.templateService.removeRule(rule.folderNote);
              this.plugin.settings.folderTemplateOrder =
                this.plugin.settings.folderTemplateOrder.filter(
                  (path) => path !== rule.folder.path,
                );
              await this.plugin.saveSettings();
              new Notice(`Removed template rule for ${rule.folder.path}.`);
              this.renderSettings();
            }),
        );
      if (!rule.template) row.setClass("frontmatter-templater-invalid-rule");
    }
  }

  private getOrderedRules(): FolderTemplateRule[] {
    const rules = this.plugin.templateService.listRules();
    const rulesByPath = new Map(rules.map((rule) => [rule.folder.path, rule]));
    const order = reconcileFolderTemplateOrder(
      this.plugin.settings.folderTemplateOrder,
      rules.map((rule) => rule.folder.path),
    );

    return order
      .map((path) => rulesByPath.get(path))
      .filter((rule): rule is FolderTemplateRule => rule !== undefined);
  }

  private async moveRule(
    rules: readonly FolderTemplateRule[],
    index: number,
    offset: -1 | 1,
  ): Promise<void> {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const order = rules.map((rule) => rule.folder.path);
    const current = order[index];
    const target = order[targetIndex];
    if (current === undefined || target === undefined) return;
    order[index] = target;
    order[targetIndex] = current;

    this.plugin.settings.folderTemplateOrder = order;
    await this.plugin.saveSettings();
    this.renderSettings();
  }
}
