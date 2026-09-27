export const FOLDER_TEMPLATE_PROPERTY = "folder-template";

export function normalizeVaultPath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

export function folderNotePath(folderPath: string): string | null {
  const normalized = normalizeVaultPath(folderPath);
  if (!normalized) return null;

  const segments = normalized.split("/");
  const name = segments[segments.length - 1];
  return name ? `${normalized}/${name}.md` : null;
}

export function ancestorFoldersNearestFirst(folderPath: string): string[] {
  const normalized = normalizeVaultPath(folderPath);
  if (!normalized) return [];

  const segments = normalized.split("/");
  const ancestors: string[] = [];
  for (let length = segments.length; length > 0; length -= 1) {
    ancestors.push(segments.slice(0, length).join("/"));
  }
  return ancestors;
}

export function findNearestAncestorValue<T>(
  folderPath: string,
  resolve: (ancestorPath: string) => T | null,
): T | null {
  for (const ancestor of ancestorFoldersNearestFirst(folderPath)) {
    const value = resolve(ancestor);
    if (value !== null) return value;
  }
  return null;
}

export function unwrapTemplateReference(value: string): string {
  const trimmed = value.trim();
  const wikiLink = trimmed.match(/^\[\[([^\]]+)\]\]$/);
  const target = wikiLink?.[1]?.split("|")[0] ?? trimmed;
  return normalizeVaultPath(target.replace(/\.md$/i, ""));
}

export interface TemplateVariables {
  title: string;
  folder: string;
  date: string;
  time: string;
  formatDate?: (format: string) => string;
  formatTime?: (format: string) => string;
}

export function renderTemplate(
  content: string,
  variables: TemplateVariables,
): string {
  const withDateAndTime = content.replace(
    /{{\s*(date|time)(?:\s*:\s*([^{}]+?))?\s*}}/gi,
    (match, rawKey: string, rawFormat: string | undefined) => {
      const key = rawKey.toLowerCase();
      const format = rawFormat?.trim();
      if (!format) return key === "date" ? variables.date : variables.time;

      const formatter =
        key === "date" ? variables.formatDate : variables.formatTime;
      return formatter ? formatter(format) : match;
    },
  );

  return withDateAndTime.replace(
    /{{\s*(title|folder)\s*}}/gi,
    (_, key: string) =>
      key.toLowerCase() === "title" ? variables.title : variables.folder,
  );
}
