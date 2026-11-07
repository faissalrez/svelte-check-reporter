import { createHash } from 'node:crypto'

import type { Diagnostic } from './parse.js'

/** An issue of a GitLab Code Quality report (a subset of the Code Climate format). */
export interface CodeQualityIssue {
  description: string
  check_name: string
  fingerprint: string
  severity: 'minor' | 'major'
  location: { path: string, lines: { begin: number } }
}

/**
 * Converts svelte-check diagnostics to a GitLab Code Quality report.
 * The fingerprint leaves the line out, so that a problem keeps it when code above
 * it moves. Identical problems in one file are told apart by their rank.
 */
export function toCodeQuality (diagnostics: Diagnostic[]): CodeQualityIssue[] {
  const ranks = new Map<string, number>()
  return diagnostics.map((diagnostic) => {
    const key = JSON.stringify([diagnostic.filename, diagnostic.code ?? '', diagnostic.message])
    const rank = (ranks.get(key) ?? 0) + 1
    ranks.set(key, rank)
    return {
      description: diagnostic.message,
      check_name: checkName(diagnostic),
      fingerprint: createHash('sha256').update(`${key}#${rank}`).digest('hex'),
      severity: diagnostic.type === 'ERROR' ? 'major' : 'minor',
      // GitLab lines are 1-based, svelte-check's are 0-based
      location: { path: diagnostic.filename, lines: { begin: diagnostic.start.line + 1 } }
    }
  })
}

function checkName (diagnostic: Diagnostic): string {
  const source = diagnostic.source ?? 'svelte-check'
  return diagnostic.code === undefined ? source : `${source}(${diagnostic.code})`
}
