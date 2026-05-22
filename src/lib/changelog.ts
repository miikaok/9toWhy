export interface ChangelogEntry {
  version: string
  changes: string[]
}

/**
 * Compare two semver strings (e.g. "1.10.0" vs "1.9.0").
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = Number.isFinite(pa[i]) ? (pa[i] as number) : 0
    const nb = Number.isFinite(pb[i]) ? (pb[i] as number) : 0
    const diff = na - nb
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Parse a CHANGELOG.md string into entries sorted newest-first.
 *
 * Expected format:
 *   # 1.3.0
 *   - Change one
 *   - Change two
 *
 *   # 1.2.0
 *   - ...
 */
export function parseChangelog(text: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  const sections = text.split(/^#\s+/m).filter(Boolean)

  for (const section of sections) {
    const lines = section
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) continue
    const version = lines[0]
    const changes = lines
      .slice(1)
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).trim())
    if (version && changes.length > 0) {
      entries.push({ version, changes })
    }
  }

  return entries.sort((a, b) => compareVersions(b.version, a.version))
}
