export const NEW_NOTE_OPEN_WINDOW_MS = 10_000;

export interface OpenedFileCandidate {
  extension: string;
  stat: { ctime: number };
}

export function shouldApplyTemplateOnOpen(
  file: OpenedFileCandidate,
  now = Date.now(),
): boolean {
  const age = now - file.stat.ctime;
  return (
    file.extension === "md" && age >= 0 && age <= NEW_NOTE_OPEN_WINDOW_MS
  );
}
