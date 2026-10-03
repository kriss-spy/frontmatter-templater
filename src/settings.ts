import { normalizeVaultPath } from "./template-utils";

export interface FrontmatterTemplaterSettings {
  defaultTemplate: string;
  templateFolder: string;
  folderTemplateOrder: string[];
}

export const DEFAULT_SETTINGS: FrontmatterTemplaterSettings = {
  defaultTemplate: "",
  templateFolder: "",
  folderTemplateOrder: [],
};

function sanitizeFolderTemplateOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const paths: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const path = normalizeVaultPath(item);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}

export function reconcileFolderTemplateOrder(
  configuredOrder: readonly string[],
  availablePaths: readonly string[],
): string[] {
  const available = new Set(sanitizeFolderTemplateOrder(availablePaths));
  const ordered: string[] = [];
  const seen = new Set<string>();

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

export function sanitizeSettings(value: unknown): FrontmatterTemplaterSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SETTINGS };
  }

  const stored = value as Record<string, unknown>;
  const defaultTemplate = stored.defaultTemplate;
  return {
    defaultTemplate:
      typeof defaultTemplate === "string" ? defaultTemplate.trim() : "",
    templateFolder:
      typeof stored.templateFolder === "string"
        ? normalizeVaultPath(stored.templateFolder)
        : "",
    folderTemplateOrder: sanitizeFolderTemplateOrder(
      stored.folderTemplateOrder,
    ),
  };
}
