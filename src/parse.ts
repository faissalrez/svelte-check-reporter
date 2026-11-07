/** A diagnostic from `svelte-check --output machine-verbose`. Lines and characters are 0-based. */
export interface Diagnostic {
  type: 'ERROR' | 'WARNING'
  filename: string
  start: { line: number, character: number }
  end: { line: number, character: number }
  message: string
  code?: number | string
  source?: string
}

/**
 * Reads the diagnostics of `svelte-check --output machine-verbose`.
 * Each line is a timestamp, then a JSON diagnostic or a START/COMPLETED status line.
 * Throws on a diagnostic it can't read: a silently empty report would look clean.
 */
export function parse (output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  output.split('\n').forEach((line, index) => {
    const json = line.match(/^\d+ (\{.*)$/)?.[1]
    if (!json) return
    let diagnostic: Partial<Diagnostic>
    try {
      diagnostic = JSON.parse(json)
    } catch {
      throw unexpected(index)
    }
    if (
      (diagnostic.type !== 'ERROR' && diagnostic.type !== 'WARNING') ||
      typeof diagnostic.filename !== 'string' ||
      typeof diagnostic.start?.line !== 'number' ||
      typeof diagnostic.message !== 'string'
    ) throw unexpected(index)
    diagnostics.push(diagnostic as Diagnostic)
  })
  return diagnostics
}

function unexpected (index: number): Error {
  return new Error(`Unexpected svelte-check output, line ${index + 1}: run svelte-check with --output machine-verbose`)
}
