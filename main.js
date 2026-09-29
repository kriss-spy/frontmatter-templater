"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FrontmatterTemplaterPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/automatic-template.ts
var NEW_NOTE_OPEN_WINDOW_MS = 1e4;
function shouldApplyTemplateOnOpen(file, now = Date.now()) {
  const age = now - file.stat.ctime;
  return file.extension === "md" && age >= 0 && age <= NEW_NOTE_OPEN_WINDOW_MS;
}

// src/settings-tab.ts
var import_obsidian3 = require("obsidian");

// src/folder-template-modal.ts
var import_obsidian2 = require("obsidian");

// src/suggesters.ts
var import_obsidian = require("obsidian");

// src/input-utils.ts
function setInputValueAndNotify(input, value) {
  input.value = value;
  input.trigger("input");
}

// src/suggesters.ts
var _PathSuggest = class _PathSuggest extends import_obsidian.AbstractInputSuggest {
  constructor(app, inputEl, items) {
    super(app, inputEl);
    this.pathInputEl = inputEl;
    this.sortedItems = items().sort((a, b) => a.path.localeCompare(b.path));
  }
  getSuggestions(query) {
    const normalized = query.trim().toLowerCase();
    const suggestions = [];
    for (const item of this.sortedItems) {
      if (!item.path.toLowerCase().includes(normalized)) continue;
      suggestions.push(item);
      if (suggestions.length >= _PathSuggest.MAX_RESULTS) break;
    }
    return suggestions;
  }
  renderSuggestion(item, el) {
    el.setText(item.path);
  }
  selectSuggestion(item) {
    setInputValueAndNotify(this.pathInputEl, item.path);
    this.close();
  }
};
_PathSuggest.MAX_RESULTS = 100;
var PathSuggest = _PathSuggest;
var MarkdownFileSuggest = class extends PathSuggest {
  constructor(app, inputEl) {
    super(app, inputEl, () => app.vault.getMarkdownFiles());
  }
};
var FolderSuggest = class extends PathSuggest {
  constructor(app, inputEl) {
    super(app, inputEl, () => {
      const folders = [];
      const visit = (folder) => {
        for (const child of folder.children) {
          if (child instanceof import_obsidian.TFolder) {
            folders.push(child);
            visit(child);
          }
        }
      };
      visit(app.vault.getRoot());
      return folders;
    });
  }
};

// src/folder-template-modal.ts
var FolderTemplateModal = class extends import_obsidian2.Modal {
  constructor(app, service, initial, onSaved) {
    var _a, _b;
    super(app);
    this.service = service;
    this.onSaved = onSaved;
    this.folderPath = (_a = initial.folderPath) != null ? _a : "";
    this.templatePath = (_b = initial.templatePath) != null ? _b : "";
    this.editingExistingRule = initial.folderPath !== void 0;
  }
  onOpen() {
    this.titleEl.setText(
      this.editingExistingRule ? "Edit folder template" : "Add folder template"
    );
    this.contentEl.addClass("frontmatter-templater-modal");
    new import_obsidian2.Setting(this.contentEl).setName("Folder").setDesc(
      this.editingExistingRule ? "Remove this rule and add another one to change its folder." : "The folder whose same-name folder note stores the rule."
    ).addSearch((search) => {
      search.setPlaceholder("Projects/example").setValue(this.folderPath).setDisabled(this.editingExistingRule);
      search.onChange((value) => this.folderPath = value);
      if (!this.editingExistingRule) {
        new FolderSuggest(this.app, search.inputEl);
      }
    });
    new import_obsidian2.Setting(this.contentEl).setName("Template").setDesc("Any Markdown file in the vault.").addSearch((search) => {
      search.setPlaceholder("Templates/Project.md").setValue(this.templatePath);
      search.onChange((value) => this.templatePath = value);
      new MarkdownFileSuggest(this.app, search.inputEl);
    });
    new import_obsidian2.Setting(this.contentEl).addButton(
      (button) => button.setButtonText("Cancel").onClick(() => this.close())
    ).addButton(
      (button) => button.setButtonText("Save").setCta().onClick(() => void this.save())
    );
  }
  onClose() {
    this.contentEl.empty();
  }
  async save() {
    const folder = this.service.getFolder(this.folderPath);
    if (!(folder instanceof import_obsidian2.TFolder)) {
      new import_obsidian2.Notice("Choose an existing folder.");
      return;
    }
    const template = this.service.resolveTemplateReference(this.templatePath, "");
    if (!(template instanceof import_obsidian2.TFile)) {
      new import_obsidian2.Notice("Choose an existing Markdown template.");
      return;
    }
    try {
      await this.service.setRule(folder, template);
      await this.onSaved();
      this.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian2.Notice(`Could not save folder template: ${message}`);
    }
  }
};

// src/template-utils.ts
var FOLDER_TEMPLATE_PROPERTY = "folder-template";
function normalizeVaultPath(path) {
  return path.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}
function folderNotePath(folderPath) {
  const normalized = normalizeVaultPath(folderPath);
  if (!normalized) return null;
  const segments = normalized.split("/");
  const name = segments[segments.length - 1];
  return name ? `${normalized}/${name}.md` : null;
}
function ancestorFoldersNearestFirst(folderPath) {
  const normalized = normalizeVaultPath(folderPath);
  if (!normalized) return [];
  const segments = normalized.split("/");
  const ancestors = [];
  for (let length = segments.length; length > 0; length -= 1) {
    ancestors.push(segments.slice(0, length).join("/"));
  }
  return ancestors;
}
function unwrapTemplateReference(value) {
  var _a, _b;
  const trimmed = value.trim();
  const wikiLink = trimmed.match(/^\[\[([^\]]+)\]\]$/);
  const target = (_b = (_a = wikiLink == null ? void 0 : wikiLink[1]) == null ? void 0 : _a.split("|")[0]) != null ? _b : trimmed;
  return normalizeVaultPath(target.replace(/\.md$/i, ""));
}
function renderTemplate(content, variables) {
  const withDateAndTime = content.replace(
    /{{\s*(date|time)(?:\s*:\s*([^{}]+?))?\s*}}/gi,
    (match, rawKey, rawFormat) => {
      const key = rawKey.toLowerCase();
      const format = rawFormat == null ? void 0 : rawFormat.trim();
      if (!format) return key === "date" ? variables.date : variables.time;
      const formatter = key === "date" ? variables.formatDate : variables.formatTime;
      return formatter ? formatter(format) : match;
    }
  );
  return withDateAndTime.replace(
    /{{\s*(title|folder)\s*}}/gi,
    (_, key) => key.toLowerCase() === "title" ? variables.title : variables.folder
  );
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  defaultTemplate: "",
  folderTemplateOrder: []
};
function sanitizeFolderTemplateOrder(value) {
  if (!Array.isArray(value)) return [];
  const paths = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const path = normalizeVaultPath(item);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}
function reconcileFolderTemplateOrder(configuredOrder, availablePaths) {
  const available = new Set(sanitizeFolderTemplateOrder(availablePaths));
  const ordered = [];
  const seen = /* @__PURE__ */ new Set();
  for (const path of sanitizeFolderTemplateOrder(configuredOrder)) {
    if (!available.has(path) || seen.has(path)) continue;
    seen.add(path);
    ordered.push(path);
  }
  for (const path of available) {
    if (seen.has(path)) continue;
    seen.add(path);
    ordered.push(path);
  }
  return ordered;
}
function sanitizeSettings(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  const stored = value;
  const defaultTemplate = stored.defaultTemplate;
  return {
    defaultTemplate: typeof defaultTemplate === "string" ? defaultTemplate.trim() : "",
    folderTemplateOrder: sanitizeFolderTemplateOrder(
      stored.folderTemplateOrder
    )
  };
}

// src/settings-tab.ts
var FrontmatterTemplaterSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.renderSettings();
  }
  renderSettings() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian3.Setting(containerEl).setName("Default template").setDesc(
      "Used when no folder note rule applies. For agent discoverability, document this path and the inheritance convention in the agent instructions file at the vault root."
    ).addSearch((search) => {
      search.setPlaceholder("Templates/Default.md").setValue(this.plugin.settings.defaultTemplate).onChange(async (value) => {
        this.plugin.settings.defaultTemplate = value.trim();
        await this.plugin.saveSettings();
      });
      new MarkdownFileSuggest(this.app, search.inputEl);
    });
    new import_obsidian3.Setting(containerEl).setName("Folder templates").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Rules live in the folder-template property of same-name folder notes. The closest folder wins; parent rules are inherited. Reordering changes only this display."
    });
    new import_obsidian3.Setting(containerEl).setClass("frontmatter-templater-add-row").setName("Add folder template").setDesc("Create or update a folder note rule.").addButton(
      (button) => button.setButtonText("Add").setCta().onClick(() => {
        new FolderTemplateModal(
          this.app,
          this.plugin.templateService,
          {},
          () => this.renderSettings()
        ).open();
      })
    );
    const rules = this.getOrderedRules();
    if (rules.length === 0) {
      containerEl.createEl("p", {
        cls: "frontmatter-templater-empty-state",
        text: "No folder templates found."
      });
      return;
    }
    for (const [index, rule] of rules.entries()) {
      const description = rule.template ? rule.template.path : `${rule.configuredValue} (template not found)`;
      const row = new import_obsidian3.Setting(containerEl).setClass("frontmatter-templater-rule").setName(rule.folder.path).setDesc(description).addExtraButton(
        (button) => button.setIcon("arrow-up").setTooltip("Move up").setDisabled(index === 0).onClick(() => void this.moveRule(rules, index, -1))
      ).addExtraButton(
        (button) => button.setIcon("arrow-down").setTooltip("Move down").setDisabled(index === rules.length - 1).onClick(() => void this.moveRule(rules, index, 1))
      ).addExtraButton(
        (button) => button.setIcon("file-pen-line").setTooltip("Edit folder template").onClick(() => {
          var _a, _b;
          new FolderTemplateModal(
            this.app,
            this.plugin.templateService,
            {
              folderPath: rule.folder.path,
              templatePath: (_b = (_a = rule.template) == null ? void 0 : _a.path) != null ? _b : rule.configuredValue
            },
            () => this.renderSettings()
          ).open();
        })
      ).addExtraButton(
        (button) => button.setIcon("file-text").setTooltip("Open folder note").onClick(() => {
          void this.app.workspace.getLeaf(false).openFile(rule.folderNote);
        })
      ).addExtraButton(
        (button) => button.setIcon("trash-2").setTooltip("Remove rule").onClick(async () => {
          await this.plugin.templateService.removeRule(rule.folderNote);
          this.plugin.settings.folderTemplateOrder = this.plugin.settings.folderTemplateOrder.filter(
            (path) => path !== rule.folder.path
          );
          await this.plugin.saveSettings();
          new import_obsidian3.Notice(`Removed template rule for ${rule.folder.path}.`);
          this.renderSettings();
        })
      );
      if (!rule.template) row.setClass("frontmatter-templater-invalid-rule");
    }
  }
  getOrderedRules() {
    const rules = this.plugin.templateService.listRules();
    const rulesByPath = new Map(rules.map((rule) => [rule.folder.path, rule]));
    const order = reconcileFolderTemplateOrder(
      this.plugin.settings.folderTemplateOrder,
      rules.map((rule) => rule.folder.path)
    );
    return order.map((path) => rulesByPath.get(path)).filter((rule) => rule !== void 0);
  }
  async moveRule(rules, index, offset) {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= rules.length) return;
    const order = rules.map((rule) => rule.folder.path);
    const current = order[index];
    const target = order[targetIndex];
    if (current === void 0 || target === void 0) return;
    order[index] = target;
    order[targetIndex] = current;
    this.plugin.settings.folderTemplateOrder = order;
    await this.plugin.saveSettings();
    this.renderSettings();
  }
};

// src/template-picker.ts
var import_obsidian4 = require("obsidian");
var TemplatePicker = class extends import_obsidian4.FuzzySuggestModal {
  constructor(app, templates, onChoose) {
    super(app);
    this.templates = templates;
    this.onChoose = onChoose;
    this.setPlaceholder("Choose a template");
  }
  getItems() {
    return this.templates;
  }
  getItemText(item) {
    return item.path;
  }
  onChooseItem(item) {
    void this.onChoose(item);
  }
};

// src/template-service.ts
var import_obsidian5 = require("obsidian");
var TemplateService = class {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
    this.rulesByFolder = /* @__PURE__ */ new Map();
    this.folderByNotePath = /* @__PURE__ */ new Map();
  }
  getFolderNote(folder) {
    const conventionalPath = folderNotePath(folder.path);
    if (!conventionalPath) return null;
    const note = this.app.vault.getAbstractFileByPath(conventionalPath);
    return note instanceof import_obsidian5.TFile && note.extension === "md" ? note : null;
  }
  rebuildIndex() {
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
  updateFolderNote(file) {
    this.removeFolderNoteFromIndex(file.path);
    const folder = this.getCanonicalFolder(file);
    if (!folder) return;
    const configuredValue = this.getFolderTemplateValue(file);
    if (!configuredValue) return;
    this.indexRule(folder, file, configuredValue);
  }
  indexRule(folder, folderNote, configuredValue) {
    this.rulesByFolder.set(folder.path, {
      folderPath: folder.path,
      folderNotePath: folderNote.path,
      configuredValue
    });
    this.folderByNotePath.set(folderNote.path, folder.path);
  }
  removeFolderNoteFromIndex(notePath) {
    const folderPath = this.folderByNotePath.get(notePath);
    if (!folderPath) return;
    this.folderByNotePath.delete(notePath);
    this.rulesByFolder.delete(folderPath);
  }
  getCanonicalFolder(file) {
    const folder = file.parent;
    if (!folder || !folder.path || file.basename !== folder.name) return null;
    return folder;
  }
  getFolderTemplateValue(folderNote) {
    const cache = this.app.metadataCache.getFileCache(folderNote);
    const raw = (0, import_obsidian5.parseFrontMatterEntry)(
      cache == null ? void 0 : cache.frontmatter,
      FOLDER_TEMPLATE_PROPERTY
    );
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  resolveTemplateReference(reference, sourcePath) {
    const linkpath = unwrapTemplateReference(reference);
    if (!linkpath) return null;
    const linked = this.app.metadataCache.getFirstLinkpathDest(
      linkpath,
      sourcePath
    );
    if ((linked == null ? void 0 : linked.extension) === "md") return linked;
    const sourceFolder = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : "";
    for (const candidatePath of [
      (0, import_obsidian5.normalizePath)(`${sourceFolder}/${linkpath}.md`),
      (0, import_obsidian5.normalizePath)(`${linkpath}.md`)
    ]) {
      const exact = this.app.vault.getAbstractFileByPath(candidatePath);
      if (exact instanceof import_obsidian5.TFile && exact.extension === "md") return exact;
    }
    return null;
  }
  resolveDefaultTemplate() {
    const configured = this.settings().defaultTemplate;
    if (!configured) return null;
    return this.resolveTemplateReference(configured, "");
  }
  async resolveFor(file) {
    var _a, _b;
    const parentPath = (_b = (_a = file.parent) == null ? void 0 : _a.path) != null ? _b : "";
    for (const folderPath of ancestorFoldersNearestFirst(parentPath)) {
      const rule = this.rulesByFolder.get(folderPath);
      if (!rule) continue;
      const folderNote = this.app.vault.getAbstractFileByPath(
        rule.folderNotePath
      );
      if (!(folderNote instanceof import_obsidian5.TFile)) continue;
      const template = this.resolveTemplateReference(
        rule.configuredValue,
        folderNote.path
      );
      if (template) {
        return { template, source: "folder", folderNote };
      }
    }
    const fallback = this.resolveDefaultTemplate();
    return fallback ? { template: fallback, source: "default" } : null;
  }
  listRules() {
    const rules = [];
    for (const indexed of this.rulesByFolder.values()) {
      const folder = this.app.vault.getAbstractFileByPath(indexed.folderPath);
      const note = this.app.vault.getAbstractFileByPath(indexed.folderNotePath);
      if (!(folder instanceof import_obsidian5.TFolder) || !(note instanceof import_obsidian5.TFile)) continue;
      rules.push({
        folder,
        folderNote: note,
        configuredValue: indexed.configuredValue,
        template: this.resolveTemplateReference(
          indexed.configuredValue,
          note.path
        )
      });
    }
    return rules.sort((a, b) => a.folder.path.localeCompare(b.folder.path));
  }
  listKnownTemplates() {
    const files = /* @__PURE__ */ new Map();
    const defaultTemplate = this.resolveDefaultTemplate();
    if (defaultTemplate) files.set(defaultTemplate.path, defaultTemplate);
    for (const rule of this.listRules()) {
      if (rule.template) files.set(rule.template.path, rule.template);
    }
    return [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
  }
  isKnownTemplate(file) {
    return this.listKnownTemplates().some(
      (template) => template.path === file.path
    );
  }
  async setRule(folder, template) {
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
      const properties = frontmatter;
      properties[FOLDER_TEMPLATE_PROPERTY] = storedValue;
    });
    this.indexRule(folder, folderNote, storedValue);
    return folderNote;
  }
  async removeRule(folderNote) {
    await this.app.fileManager.processFrontMatter(folderNote, (frontmatter) => {
      const properties = frontmatter;
      delete properties[FOLDER_TEMPLATE_PROPERTY];
    });
    this.removeFolderNoteFromIndex(folderNote.path);
  }
  getFolder(path) {
    const normalized = normalizeVaultPath(path);
    if (!normalized) return null;
    const folder = this.app.vault.getAbstractFileByPath(normalized);
    return folder instanceof import_obsidian5.TFolder ? folder : null;
  }
};

// src/main.ts
var formatMoment = import_obsidian6.moment;
var FrontmatterTemplaterPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.pendingFiles = /* @__PURE__ */ new Map();
    this.vaultIsReady = false;
    this.automaticTemplateHandlersRegistered = false;
  }
  async onload() {
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
      })
    );
    this.app.workspace.onLayoutReady(() => {
      this.vaultIsReady = true;
      metadataIndexReady = this.templateService.rebuildIndex();
      if (metadataIndexReady) this.registerAutomaticTemplateHandlers();
    });
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.vaultIsReady) this.templateService.updateFolderNote(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (abstractFile) => {
        if (abstractFile instanceof import_obsidian6.TFile) {
          this.templateService.removeFolderNoteFromIndex(abstractFile.path);
        } else if (this.vaultIsReady && abstractFile instanceof import_obsidian6.TFolder) {
          this.templateService.rebuildIndex();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (abstractFile, oldPath) => {
        this.templateService.removeFolderNoteFromIndex(oldPath);
        if (abstractFile instanceof import_obsidian6.TFile) {
          this.templateService.updateFolderNote(abstractFile);
        } else if (this.vaultIsReady && abstractFile instanceof import_obsidian6.TFolder) {
          this.templateService.rebuildIndex();
        }
      })
    );
  }
  async loadSettings() {
    this.settings = sanitizeSettings(await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async onExternalSettingsChange() {
    await this.loadSettings();
  }
  onunload() {
    this.vaultIsReady = false;
    for (const timeoutId of this.pendingFiles.values()) {
      window.clearTimeout(timeoutId);
    }
    this.pendingFiles.clear();
  }
  registerCommands() {
    this.addCommand({
      id: "apply-configured-template",
      name: "Apply configured template to the current empty note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!(file instanceof import_obsidian6.TFile) || file.extension !== "md") return false;
        if (!checking) void this.applyConfiguredTemplate(file, true);
        return true;
      }
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
      }
    });
  }
  registerAutomaticTemplateHandlers() {
    if (this.automaticTemplateHandlersRegistered) return;
    this.automaticTemplateHandlersRegistered = true;
    this.registerEvent(
      this.app.vault.on("create", (abstractFile) => {
        if (abstractFile instanceof import_obsidian6.TFile && abstractFile.extension === "md") {
          this.scheduleAutomaticTemplate(abstractFile);
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file instanceof import_obsidian6.TFile && shouldApplyTemplateOnOpen(file)) {
          this.scheduleAutomaticTemplate(file);
        }
      })
    );
  }
  scheduleAutomaticTemplate(file) {
    if (this.pendingFiles.has(file)) return;
    const timeout = window.setTimeout(() => {
      this.pendingFiles.delete(file);
      const current = this.app.vault.getAbstractFileByPath(file.path);
      if (!(current instanceof import_obsidian6.TFile)) return;
      void this.applyConfiguredTemplate(current, false);
    }, 500);
    this.pendingFiles.set(file, timeout);
  }
  async applyConfiguredTemplate(file, showNotices) {
    try {
      if (this.templateService.isKnownTemplate(file)) return;
      const resolved = await this.templateService.resolveFor(file);
      if (!resolved) {
        if (showNotices) new import_obsidian6.Notice("No template is configured for this note.");
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
        new import_obsidian6.Notice(`Applied ${resolved.template.basename}.`);
      } else if (showNotices) {
        new import_obsidian6.Notice("The current note is not empty.");
      }
    } catch (error) {
      console.error("Frontmatter Templater: failed to apply template", error);
      if (showNotices) new import_obsidian6.Notice("Could not apply the configured template.");
    }
  }
  renderForFile(content, file) {
    var _a, _b, _c;
    const now = /* @__PURE__ */ new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return renderTemplate(content, {
      title: (_a = file == null ? void 0 : file.basename) != null ? _a : "",
      folder: (_c = (_b = file == null ? void 0 : file.parent) == null ? void 0 : _b.path) != null ? _c : "",
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      formatDate: (format) => formatMoment(now).format(format),
      formatTime: (format) => formatMoment(now).format(format)
    });
  }
};
