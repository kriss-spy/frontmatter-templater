import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ancestorFoldersNearestFirst,
  findNearestAncestorValue,
  folderNotePath,
  normalizeVaultPath,
  renderTemplate,
  unwrapTemplateReference,
} from "../src/template-utils";
import {
  reconcileFolderTemplateOrder,
  sanitizeSettings,
} from "../src/settings";

describe("folder template settings", () => {
  it("preserves a manual order and appends newly discovered rules", () => {
    assert.deepEqual(
      reconcileFolderTemplateOrder(
        ["Work/Z", "Work/A"],
        ["Work/A", "Work/B", "Work/Z"],
      ),
      ["Work/Z", "Work/A", "Work/B"],
    );
  });

  it("drops missing and duplicate paths from a stored order", () => {
    assert.deepEqual(
      reconcileFolderTemplateOrder(
        ["/Work/A/", "Missing", "Work/A"],
        ["Work/A", "Work/B"],
      ),
      ["Work/A", "Work/B"],
    );
  });

  it("sanitizes legacy settings without an order", () => {
    assert.deepEqual(sanitizeSettings({ defaultTemplate: " Default.md " }), {
      defaultTemplate: "Default.md",
      folderTemplateOrder: [],
    });
  });
});

describe("template path utilities", () => {
  it("walks from the current folder to its parents", () => {
    assert.deepEqual(ancestorFoldersNearestFirst("Work/Clients/Acme"), [
      "Work/Clients/Acme",
      "Work/Clients",
      "Work",
    ]);
  });

  it("prioritizes a current-folder value over a parent value", () => {
    const values = new Map([
      ["Work", "work-template"],
      ["Work/Clients/Acme", "acme-template"],
    ]);
    assert.equal(
      findNearestAncestorValue(
        "Work/Clients/Acme",
        (folder) => values.get(folder) ?? null,
      ),
      "acme-template",
    );
  });

  it("inherits the closest usable parent value", () => {
    const values = new Map([
      ["Work", "work-template"],
      ["Work/Clients", "client-template"],
    ]);
    assert.equal(
      findNearestAncestorValue(
        "Work/Clients/Acme",
        (folder) => values.get(folder) ?? null,
      ),
      "client-template",
    );
  });

  it("continues to a parent when a local rule cannot resolve", () => {
    const configured = new Map([
      ["Work", "work-template"],
      ["Work/Clients/Acme", "missing-template"],
    ]);
    assert.equal(
      findNearestAncestorValue("Work/Clients/Acme", (folder) => {
        const value = configured.get(folder);
        return value === "missing-template" ? null : (value ?? null);
      }),
      "work-template",
    );
  });

  it("derives a same-name folder note", () => {
    assert.equal(folderNotePath("Work/Clients"), "Work/Clients/Clients.md");
    assert.equal(folderNotePath("/"), null);
  });

  it("normalizes vault paths without escaping the vault", () => {
    assert.equal(normalizeVaultPath("/Work\\Clients//"), "Work/Clients");
  });

  it("accepts wikilinks, aliases, and markdown paths", () => {
    assert.equal(
      unwrapTemplateReference("[[Templates/Project.md|Project]]"),
      "Templates/Project",
    );
    assert.equal(
      unwrapTemplateReference("Templates/Default.md"),
      "Templates/Default",
    );
  });

});

describe("template rendering", () => {
  it("replaces the small built-in variable set case-insensitively", () => {
    assert.equal(
      renderTemplate("# {{ title }}\n{{DATE}} {{time}} in {{folder}}", {
        title: "Roadmap",
        folder: "Work/Planning",
        date: "2026-09-25",
        time: "14:30",
      }),
      "# Roadmap\n2026-09-25 14:30 in Work/Planning",
    );
  });

  it("leaves unsupported placeholders untouched", () => {
    assert.equal(
      renderTemplate("{{title}} {{unknown}}", {
        title: "Note",
        folder: "",
        date: "",
        time: "",
      }),
      "Note {{unknown}}",
    );
  });

  it("uses explicit date and time formatters", () => {
    assert.equal(
      renderTemplate("{{date:dddd, MMMM D}} at {{time:HH:mm:ss}}", {
        title: "Note",
        folder: "",
        date: "2026-09-27",
        time: "09:05",
        formatDate: (format) => `date(${format})`,
        formatTime: (format) => `time(${format})`,
      }),
      "date(dddd, MMMM D) at time(HH:mm:ss)",
    );
  });

  it("preserves formatted variables when no formatter is available", () => {
    assert.equal(
      renderTemplate("{{date:YYYY-MM-DD}}", {
        title: "Note",
        folder: "",
        date: "2026-09-27",
        time: "09:05",
      }),
      "{{date:YYYY-MM-DD}}",
    );
  });
});
