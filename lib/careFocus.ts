// Shared helper for parsing the `care_focus` / `careFocus` column, which is stored
// as a comma-joined string (e.g. "stomach,anxiety") to support multi-select care focuses.
export function parseCareFocus(raw: string | null | undefined): string[] {
  return (raw ?? 'normal').split(',').map(s => s.trim()).filter(Boolean)
}
