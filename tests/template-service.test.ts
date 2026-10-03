import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { build } from "esbuild";
import { sanitizeSettings } from "../src/settings";

// Bundle the real service against a small vault API double: Obsidian's npm
// package contains declarations, but its runtime exists only inside the app.
const result = await build({
  stdin: {
    contents: 'export { TemplateService } from "./src/template-service"; export { TFile, TFolder } from "obsidian";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [{
    name: "obsidian-vault-double",
    setup(builder) {
      builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: `
        export class TFolder {
          children = [];
          constructor(path) { this.path = path; this.name = path.split('/').pop(); }
        }
        export class TFile {
          constructor(path, parent) {
            this.path = path; this.parent = parent;
            this.extension = path.split('.').pop();
            this.basename = path.split('/').pop().replace(/\\.[^.]+$/, '');
          }
        }
        export const normalizePath = path => path.replace(/^\\/+|\\/+$/g, '');
        export const parseFrontMatterEntry = (frontmatter, key) => frontmatter?.[key];
      ` }));
    },
  }],
});
const { TemplateService, TFile, TFolder } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.text).toString("base64")}`
);

function fixture(stored: Record<string, unknown>) {
  const paths = new Map();
  function folder(path: string, parent?: { children: unknown[] }) {
    const value = new TFolder(path);
    parent?.children.push(value);
    paths.set(path, value);
    return value;
  }
  function file(path: string, parent: { children: unknown[] }) {
    const value = new TFile(path, parent);
    parent.children.push(value);
    paths.set(path, value);
    return value;
  }
  const root = folder("");
  const templates = folder("Templates", root);
  const bases = folder("Templates/bases", templates);
  const deeper = folder("Templates/bases/deeper", bases);
  const other = folder("Templates-extra", root);
  file("Templates/Default.md", templates);
  file("Templates/bases/minimal base.md", bases);
  file("Templates/bases/deeper/map view base.md", deeper);
  file("Templates/article.tex", templates);
  file("Templates-extra/Other.md", other);
  file("Root default.md", root);
  const settings = sanitizeSettings(stored);
  const service = new TemplateService({
    vault: { getAbstractFileByPath: (path: string) => paths.get(path) },
    metadataCache: { getFirstLinkpathDest: (path: string) => paths.get(`${path}.md`) },
  }, () => settings);
  return { service, settings, paths, file, deeper };
}

describe("recursive template discovery", () => {
  it("finds nested Markdown templates without requiring folder rules", () => {
    const { service, paths } = fixture({ templateFolder: "Templates" });
    assert.deepEqual(service.listKnownTemplates().map((file: { path: string }) => file.path), [
      "Templates/bases/deeper/map view base.md",
      "Templates/bases/minimal base.md",
      "Templates/Default.md",
    ]);
    assert.equal(service.isKnownTemplate(paths.get("Templates/bases/minimal base.md")), true);
    assert.equal(service.isKnownTemplate(paths.get("Templates-extra/Other.md")), false);
    assert.equal(service.isKnownTemplate(paths.get("Templates/article.tex")), false);
  });

  it("uses the default template's parent for existing settings and deduplicates it", () => {
    const { service } = fixture({ defaultTemplate: "Templates/Default.md" });
    assert.equal(service.listKnownTemplates().length, 3);
  });

  it("honors an explicit folder while retaining the default outside it", () => {
    const { service } = fixture({ defaultTemplate: "Templates/Default.md", templateFolder: "Templates-extra" });
    assert.deepEqual(service.listKnownTemplates().map((file: { path: string }) => file.path), [
      "Templates-extra/Other.md", "Templates/Default.md",
    ]);
  });

  it("does not interpret a root-level default as a template vault", () => {
    const { service } = fixture({ defaultTemplate: "Root default.md" });
    assert.equal(service.listKnownTemplates().length, 1);
  });

  it("handles a missing folder and discovers newly added templates on the next listing", () => {
    const { service, settings, file, deeper } = fixture({ templateFolder: "Missing" });
    assert.deepEqual(service.listKnownTemplates(), []);
    settings.templateFolder = "Templates";
    file("Templates/bases/deeper/new base.md", deeper);
    assert.equal(service.listKnownTemplates().length, 4);
  });
});
