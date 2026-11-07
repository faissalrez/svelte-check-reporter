import type { Diagnostic } from './parse.js'

/**
 * Converts svelte-check diagnostics to a SARIF 2.1.0 log, for GitHub code scanning.
 * Fingerprints are left out: GitHub only uses its own, which upload-sarif computes
 * from the source files.
 * https://docs.github.com/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning
 */
export function toSarif (diagnostics: Diagnostic[]): object {
  const ruleIds = [...new Set(diagnostics.map(ruleId))]
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'svelte-check',
          informationUri: 'https://www.npmjs.com/package/svelte-check',
          // GitHub requires a description for each rule, which svelte-check doesn't give:
          // each result's message says what is wrong
          rules: ruleIds.map((id) => ({
            id,
            shortDescription: { text: `svelte-check ${id}` },
            fullDescription: { text: `Problem ${id} reported by svelte-check. See the message of each result.` },
            help: { text: 'See the message of the result, and the TypeScript or Svelte documentation for its code.' }
          }))
        }
      },
      results: diagnostics.map((diagnostic) => ({
        ruleId: ruleId(diagnostic),
        ruleIndex: ruleIds.indexOf(ruleId(diagnostic)),
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

function ruleId (diagnostic: Diagnostic): string {
  return diagnostic.code === undefined ? 'svelte-check' : String(diagnostic.code)
}
