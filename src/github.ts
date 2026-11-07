import type { Diagnostic } from './parse.js'
import { ruleName } from './rule.js'

/**
 * Converts svelte-check diagnostics to GitHub Actions workflow commands. Printed
 * in a workflow, each line becomes an annotation on the run and on the pull
 * request's diff.
 * https://docs.github.com/actions/reference/workflow-commands-for-github-actions
 */
export function toAnnotations (diagnostics: Diagnostic[], { prefix = '' }: { prefix?: string } = {}): string[] {
  return diagnostics.map((diagnostic) => {
    // GitHub lines and columns are 1-based, svelte-check's are 0-based
    const properties = [
      ['file', diagnostic.filename],
      ['line', diagnostic.start.line + 1],
      ['col', diagnostic.start.character + 1],
      ['endLine', diagnostic.end.line + 1],
      ['endColumn', diagnostic.end.character + 1],
      ['title', diagnostic.code === undefined ? 'svelte-check' : `svelte-check ${ruleName(diagnostic)}`]
    ].map(([key, value]) => `${key}=${escapeProperty(String(value))}`).join(',')
    const command = diagnostic.type === 'ERROR' ? 'error' : 'warning'
    return `::${command} ${properties}::${escapeData(`${prefix}${diagnostic.message}`)}`
  })
}

// GitHub's escaping rules for workflow commands
function escapeData (value: string): string {
  return value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')
}

function escapeProperty (value: string): string {
  return escapeData(value).replaceAll(':', '%3A').replaceAll(',', '%2C')
}
