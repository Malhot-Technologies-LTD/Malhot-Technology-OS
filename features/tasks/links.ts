/**
 * A task's address: `/os/tasks/MAL-42`, the reference people already say out
 * loud, rather than a UUID. Project keys are 2 to 6 letters and sequence
 * numbers are per project, so the pair is unique inside an organisation.
 */
export function taskRef(projectKey: string, seq: number): string {
  return `${projectKey}-${seq}`;
}

export function taskHref(projectKey: string, seq: number): string {
  return `/os/tasks/${taskRef(projectKey, seq)}`;
}

/** "mal-42" → { key: "MAL", seq: 42 }; null when it is not a task reference. */
export function parseTaskRef(ref: string): { key: string; seq: number } | null {
  const match = /^([A-Za-z]{2,6})-(\d{1,9})$/.exec(ref.trim());
  if (!match) return null;
  return { key: match[1].toUpperCase(), seq: Number(match[2]) };
}
