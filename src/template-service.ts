import {
  App,
  normalizePath,
  parseFrontMatterEntry,
  TFile,
  TFolder,
} from "obsidian";
import type { FrontmatterTemplaterSettings } from "./settings";
import {
  ancestorFoldersNearestFirst,
  FOLDER_TEMPLATE_PROPERTY,
  folderNotePath,
  normalizeVaultPath,
  unwrapTemplateReference,
} from "./template-utils";

export interface FolderTemplateRule {
  folder: TFolder;
  folderNote: TFile;
  configuredValue: string;
  template: TFile | null;
}

export interface ResolvedTemplate {
  template: TFile;
  source: "folder" | "default";
  folderNote?: TFile;
}

interface IndexedFolderTemplate {
  folderPath: string;
  folderNotePath: string;
  configuredValue: string;
}

export class TemplateService {
  private readonly rulesByFolder = new Map<string, IndexedFolderTemplate>();
  private readonly folderByNotePath = new Map<string, string>();

  constructor(
    private readonly app: App,
    private readonly settings: () => FrontmatterTemplaterSettings,
  ) {}

  getFolderNote(folder: TFolder): TFile | null {
    const conventionalPath = folderNotePath(folder.path);
    if (!conventionalPath) return null;
    const note = this.app.vault.getAbstractFileByPath(conventionalPath);
    return note instanceof TFile && note.extension === "md" ? note : null;
  }

  rebuildIndex(): boolean {
    this.rulesByFolder.clear();
    this.folderByNotePath.clear();
    let complete = true;
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!this.getCanonicalFolder(file)) continue;
      if (this.app.metadataCache.getFileCache(file) === null) {
        complete = false;
        continue;
      }
      this.updateFolderNote(file);
    }
    return complete;
  }

  updateFolderNote(file: TFile): void {
    this.removeFolderNoteFromIndex(file.path);
    const folder = this.getCanonicalFolder(file);
    if (!folder) return;

    const configuredValue = this.getFolderTemplateValue(file);
    if (!configuredValue) return;

    this.indexRule(folder, file, configuredValue);
  }

  private indexRule(
    folder: TFolder,
    folderNote: TFile,
    configuredValue: string,
  ): void {
    this.rulesByFolder.set(folder.path, {
      folderPath: folder.path,
      folderNotePath: folderNote.path,
      configuredValue,
    });
    this.folderByNotePath.set(folderNote.path, folder.path);
  }

  removeFolderNoteFromIndex(notePath: string): void {
    const folderPath = this.folderByNotePath.get(notePath);
    if (!folderPath) return;
    this.folderByNotePath.delete(notePath);
    this.rulesByFolder.delete(folderPath);
  }

  private getCanonicalFolder(file: TFile): TFolder | null {
    const folder = file.parent;
    if (!folder || !folder.path || file.basename !== folder.name) return null;
    return folder;
  }

  getFolderTemplateValue(folderNote: TFile): string | null {
    const cache = this.app.metadataCache.getFileCache(folderNote);
    const raw: unknown = parseFrontMatterEntry(
      cache?.frontmatter,
      FOLDER_TEMPLATE_PROPERTY,
    );
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }

  resolveTemplateReference(reference: string, sourcePath: string): TFile | null {
    const linkpath = unwrapTemplateReference(reference);
    if (!linkpath) return null;

    const linked = this.app.metadataCache.getFirstLinkpathDest(
      linkpath,
      sourcePath,
    );
    if (linked?.extension === "md") return linked;

    const sourceFolder = sourcePath.includes("/")
      ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
      : "";
    for (const candidatePath of [
      normalizePath(`${sourceFolder}/${linkpath}.md`),
      normalizePath(`${linkpath}.md`),
    ]) {
      const exact = this.app.vault.getAbstractFileByPath(candidatePath);
      if (exact instanceof TFile && exact.extension === "md") return exact;
    }
    return null;
  }

  resolveDefaultTemplate(): TFile | null {
    const configured = this.settings().defaultTemplate;
    if (!configured) return null;
    return this.resolveTemplateReference(configured, "");
  }

  async resolveFor(file: TFile): Promise<ResolvedTemplate | null> {
    const parentPath = file.parent?.path ?? "";
    for (const folderPath of ancestorFoldersNearestFirst(parentPath)) {
      const rule = this.rulesByFolder.get(folderPath);
      if (!rule) continue;
      const folderNote = this.app.vault.getAbstractFileByPath(
        rule.folderNotePath,
      );
      if (!(folderNote instanceof TFile)) continue;
      const template = this.resolveTemplateReference(
        rule.configuredValue,
        folderNote.path,
      );
      if (template) {
        return { template, source: "folder", folderNote };
      }
    }

    const fallback = this.resolveDefaultTemplate();
    return fallback ? { template: fallback, source: "default" } : null;
  }

  listRules(): FolderTemplateRule[] {
    const rules: FolderTemplateRule[] = [];
    for (const indexed of this.rulesByFolder.values()) {
      const folder = this.app.vault.getAbstractFileByPath(indexed.folderPath);
      const note = this.app.vault.getAbstractFileByPath(indexed.folderNotePath);
      if (!(folder instanceof TFolder) || !(note instanceof TFile)) continue;
      rules.push({
        folder,
        folderNote: note,
        configuredValue: indexed.configuredValue,
        template: this.resolveTemplateReference(
          indexed.configuredValue,
          note.path,
        ),
      });
    }
    return rules.sort((a, b) => a.folder.path.localeCompare(b.folder.path));
  }

  private getTemplateFolder(): TFolder | null {
    const configured = this.settings().templateFolder;
    if (configured) return this.getFolder(configured);
    const parent = this.resolveDefaultTemplate()?.parent;
    return parent?.path ? parent : null;
  }

  private listAssignedTemplates(): TFile[] {
    const files = new Map<string, TFile>();
    const defaultTemplate = this.resolveDefaultTemplate();
    if (defaultTemplate) files.set(defaultTemplate.path, defaultTemplate);
    for (const rule of this.listRules()) {
      if (rule.template) files.set(rule.template.path, rule.template);
    }
    return [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
  }

  listKnownTemplates(): TFile[] {
    const files = new Map(
      this.listAssignedTemplates().map((file) => [file.path, file]),
    );
    const root = this.getTemplateFolder();
    const pending = root ? [root] : [];
    while (pending.length > 0) {
      const folder = pending.pop()!;
      for (const child of folder.children) {
        if (child instanceof TFolder) pending.push(child);
        else if (child instanceof TFile && child.extension === "md") {
          files.set(child.path, child);
        }
      }
    }
    return [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
  }

  isKnownTemplate(file: TFile): boolean {
    const folder = this.getTemplateFolder();
    if (file.extension === "md" && folder && file.path.startsWith(`${folder.path}/`)) {
      return true;
    }
    return this.listAssignedTemplates().some(
      (template) => template.path === file.path,
    );
  }

  async setRule(folder: TFolder, template: TFile): Promise<TFile> {
    let folderNote = this.getFolderNote(folder);
    if (!folderNote) {
      const notePath = folderNotePath(folder.path);
      if (!notePath) {
        throw new Error("The vault root uses the default template.");
      }
      folderNote = await this.app.vault.create(notePath, "");
    }

    const storedValue = `[[${template.path}]]`;
    await this.app.fileManager.processFrontMatter(folderNote, (frontmatter) => {
      const properties = frontmatter as Record<string, unknown>;
      properties[FOLDER_TEMPLATE_PROPERTY] = storedValue;
    });
    this.indexRule(folder, folderNote, storedValue);
    return folderNote;
  }

  async removeRule(folderNote: TFile): Promise<void> {
    await this.app.fileManager.processFrontMatter(folderNote, (frontmatter) => {
      const properties = frontmatter as Record<string, unknown>;
      delete properties[FOLDER_TEMPLATE_PROPERTY];
    });
    this.removeFolderNoteFromIndex(folderNote.path);
  }

  getFolder(path: string): TFolder | null {
    const normalized = normalizeVaultPath(path);
    if (!normalized) return null;
    const folder = this.app.vault.getAbstractFileByPath(normalized);
    return folder instanceof TFolder ? folder : null;
  }

}
