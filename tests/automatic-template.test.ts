import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NEW_NOTE_OPEN_WINDOW_MS,
  shouldApplyTemplateOnOpen,
} from "../src/automatic-template";

describe("automatic template fallback", () => {
  it("accepts a newly created Markdown note opened by Obsidian", () => {
    assert.equal(
      shouldApplyTemplateOnOpen(
        { extension: "md", stat: { ctime: 1_000 } },
        1_500,
      ),
      true,
    );
  });

  it("does not treat an older empty note as newly created", () => {
    assert.equal(
      shouldApplyTemplateOnOpen(
        { extension: "md", stat: { ctime: 1_000 } },
        1_001 + NEW_NOTE_OPEN_WINDOW_MS,
      ),
      false,
    );
  });

  it("ignores recently created non-Markdown files", () => {
    assert.equal(
      shouldApplyTemplateOnOpen(
        { extension: "canvas", stat: { ctime: 1_000 } },
        1_500,
      ),
      false,
    );
  });

  it("ignores files whose creation time is in the future", () => {
    assert.equal(
      shouldApplyTemplateOnOpen(
        { extension: "md", stat: { ctime: 2_000 } },
        1_500,
      ),
      false,
    );
  });
});
