import { moment, Notice, Plugin, TFile, TFolder } from "obsidian";
import { shouldApplyTemplateOnOpen } from "./automatic-template";
import { FrontmatterTemplaterSettingTab } from "./settings-tab";
import {
  DEFAULT_SETTINGS,
  type FrontmatterTemplaterSettings,
  sanitizeSettings,
} from "./settings";
import { TemplatePicker } from "./template-picker";
import { TemplateService } from "./template-service";
import { renderTemplate } from "./template-utils";

const formatMoment = moment as unknown as (
  input: Date,
) => { format: (pattern: string) => string };

export default class FrontmatterTemplaterPlugin extends Plugin {
  settings: FrontmatterTemplaterSettings = { ...DEFAULT_SETTINGS };
  templateService!: TemplateService;
  private pendingFiles = new Map<TFile, number>();
  private vaultIsReady = false;
  private automaticTemplateHandlersRegistered = false;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.templateService = new TemplateService(this.app, () => this.settings);
    this.addSettingTab(new FrontmatterTemplaterSettingTab(this.app, this));
    this.registerCommands();

    let metadataIndexReady = false;
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => {
        if (metadataIndexReady) return;
        metadataIndexReady = this.templateService.rebuildIndex();
        if (this.vaultIsReady && metadataIndexReady) {
          this.registerAutomaticTemplateHandlers();
        }
      }),
    );

    // Obsidian emits `create` while it is building the vault on a cold start.
    // Those events describe existing files, not notes the user just created.
    // Processing them schedules work for every Markdown file in a large vault
    // and can keep the renderer in a CPU-bound startup loop.
    this.app.workspace.onLayoutReady(() => {
      this.vaultIsReady = true;
      // Build immediately for already-cached vaults. Otherwise automatic
      // processing stays disabled until MetadataCache emits `resolved`.
      metadataIndexReady = this.templateService.rebuildIndex();
      if (metadataIndexReady) this.registerAutomaticTemplateHandlers();
    });

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.vaultIsReady) this.templateService.updateFolderNote(file);
      }),
    );

    this.registerEvent(
      this.app.vault.on("delete", (abstractFile) => {
        if (abstractFile instanceof TFile) {
          this.templateService.removeFolderNoteFromIndex(abstractFile.path);
        } else if (this.vaultIsReady && abstractFile instanceof TFolder) {
          this.templateService.rebuildIndex();
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (abstractFile, oldPath) => {
        this.templateService.removeFolderNoteFromIndex(oldPath);
        if (abstractFile instanceof TFile) {
          this.templateService.updateFolderNote(abstractFile);
        } else if (this.vaultIsReady && abstractFile instanceof TFolder) {
          this.templateService.rebuildIndex();
        }
      }),
    );

  }

  async loadSettings(): Promise<void> {
    this.settings = sanitizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async onExternalSettingsChange(): Promise<void> {
    await this.loadSettings();
  }

  onunload(): void {
    this.vaultIsReady = false;
    for (const timeoutId of this.pendingFiles.values()) {
      window.clearTimeout(timeoutId);
    }
    this.pendingFiles.clear();
  }

  private registerCommands(): void {
    this.addCommand({
      id: "apply-configured-template",
      name: "Apply configured template to the current empty note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!(file instanceof TFile) || file.extension !== "md") return false;
        if (!checking) void this.applyConfiguredTemplate(file, true);
        return true;
      },
    });

    this.addCommand({
      id: "insert-template",
      name: "Insert template",
      editorCheckCallback: (checking, editor, view) => {
        const templates = this.templateService.listKnownTemplates();
        if (templates.length === 0) return false;
        if (!checking) {
          new TemplatePicker(this.app, templates, async (template) => {
            const content = await this.app.vault.cachedRead(template);
            editor.replaceSelection(this.renderForFile(content, view.file));
          }).open();
        }
        return true;
      },
    });
  }

  private registerAutomaticTemplateHandlers(): void {
    if (this.automaticTemplateHandlersRegistered) return;
    this.automaticTemplateHandlersRegistered = true;
    this.registerEvent(
      this.app.vault.on("create", (abstractFile) => {
        if (abstractFile instanceof TFile && abstractFile.extension === "md") {
          this.scheduleAutomaticTemplate(abstractFile);
        }
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file instanceof TFile && shouldApplyTemplateOnOpen(file)) {
          this.scheduleAutomaticTemplate(file);
        }
      }),
    );
  }

  private scheduleAutomaticTemplate(file: TFile): void {
    if (this.pendingFiles.has(file)) return;
    const timeout = window.setTimeout(() => {
      this.pendingFiles.delete(file);
      const current = this.app.vault.getAbstractFileByPath(file.path);
      if (!(current instanceof TFile)) return;
      void this.applyConfiguredTemplate(current, false);
    }, 500);
    this.pendingFiles.set(file, timeout);
  }

  private async applyConfiguredTemplate(
    file: TFile,
    showNotices: boolean,
  ): Promise<void> {
    try {
      if (this.templateService.isKnownTemplate(file)) return;
      const resolved = await this.templateService.resolveFor(file);
      if (!resolved) {
        if (showNotices) new Notice("No template is configured for this note.");
        return;
      }
      if (resolved.template.path === file.path) return;

      const template = await this.app.vault.cachedRead(resolved.template);
      let applied = false;
      await this.app.vault.process(file, (current) => {
        if (current.trim().length > 0) return current;
        applied = true;
        return this.renderForFile(template, file);
      });
      if (showNotices && applied) {
        new Notice(`Applied ${resolved.template.basename}.`);
      } else if (showNotices) {
        new Notice("The current note is not empty.");
      }
    } catch (error) {
      console.error("Frontmatter Templater: failed to apply template", error);
      if (showNotices) new Notice("Could not apply the configured template.");
    }
  }

  private renderForFile(content: string, file: TFile | null): string {
    const now = new Date();
    const pad = (value: number): string => String(value).padStart(2, "0");
    return renderTemplate(content, {
      title: file?.basename ?? "",
      folder: file?.parent?.path ?? "",
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      formatDate: (format) => formatMoment(now).format(format),
      formatTime: (format) => formatMoment(now).format(format),
    });
  }
}
