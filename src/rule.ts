import type { Diagnostic } from './parse.js'

/**
 * Names the rule a diagnostic breaks, after its origin. TypeScript's codes are
 * numbers, written TS2322 as in its own errors; Svelte's are names, such as
 * state_referenced_locally.
 */
export function ruleName (diagnostic: Diagnostic): string {
  if (diagnostic.code === undefined) return 'svelte-check'
  return typeof diagnostic.code === 'number' ? `TS${diagnostic.code}` : diagnostic.code
}
