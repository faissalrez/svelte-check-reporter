import type { Diagnostic } from './parse.js'
import { ruleName } from './rule.js'

/**
 * Converts svelte-check diagnostics to a SARIF 2.1.0 log, for GitHub code scanning.
 * Fingerprints are left out: GitHub only uses its own, which upload-sarif computes
 * from the source files.
 * https://docs.github.com/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning
 */
export function toSarif (diagnostics: Diagnostic[]): object {
  // One rule per name, described from its first diagnostic
  const rules = new Map<string, Diagnostic>()
  for (const diagnostic of diagnostics) {
    if (!rules.has(ruleName(diagnostic))) rules.set(ruleName(diagnostic), diagnostic)
  }
  const ruleIds = [...rules.keys()]
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'svelte-check',
          informationUri: 'https://www.npmjs.com/package/svelte-check',
          rules: [...rules].map(([id, diagnostic]) => describeRule(id, diagnostic))
        }
      },
      results: diagnostics.map((diagnostic) => ({
        ruleId: ruleName(diagnostic),
        ruleIndex: ruleIds.indexOf(ruleName(diagnostic)),
        level: diagnostic.type === 'ERROR' ? 'error' : 'warning',
        message: { text: diagnostic.message },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: diagnostic.filename, uriBaseId: '%SRCROOT%' },
            // SARIF lines and columns are 1-based, svelte-check's are 0-based.
            // endColumn is the column after the region, as svelte-check's end character
            region: {
              startLine: diagnostic.start.line + 1,
              startColumn: diagnostic.start.character + 1,
              endLine: diagnostic.end.line + 1,
              endColumn: diagnostic.end.character + 1
            }
          }
        }]
      }))
    }]
  }
}

/**
 * GitHub requires descriptions for each rule, which svelte-check doesn't give: each
 * result's message says what is wrong, and the rule points to its documentation.
 */
function describeRule (id: string, diagnostic: Diagnostic): object {
  if (typeof diagnostic.code === 'string') {
    // Svelte documents each compiler warning and error on its own anchor
    const page = diagnostic.type === 'WARNING' ? 'compiler-warnings' : 'compiler-errors'
    const helpUri = `https://svelte.dev/docs/svelte/${page}#${diagnostic.code}`
    return {
      id,
      shortDescription: { text: id },
      fullDescription: { text: `Svelte compiler ${diagnostic.type === 'WARNING' ? 'warning' : 'error'} ${id}.` },
      helpUri,
      help: { text: `See ${helpUri}`, markdown: `Svelte compiler ${diagnostic.type === 'WARNING' ? 'warning' : 'error'} \`${id}\`: see [its documentation](${helpUri}).` },
      properties: { tags: ['svelte'] }
    }
  }
  if (typeof diagnostic.code === 'number') {
    // TypeScript has no page per error code: the result's message is the documentation
    return {
      id,
      shortDescription: { text: id },
      fullDescription: { text: `TypeScript error ${id}.` },
      help: { text: `TypeScript error ${id}. The message of each result explains it.`, markdown: `TypeScript error \`${id}\`. The message of each result explains it.` },
      properties: { tags: ['typescript'] }
    }
  }
  return {
    id,
    shortDescription: { text: id },
    fullDescription: { text: 'Problem reported by svelte-check.' },
    help: { text: 'The message of each result explains it.' }
  }
}
