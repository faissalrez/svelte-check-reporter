import { describe, expect, it } from 'vitest'

import type { Diagnostic } from './parse.js'
import { toSarif } from './sarif.js'

function diagnostic (overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    type: 'ERROR',
    filename: 'src/lib/db.ts',
    start: { line: 28, character: 23 },
    end: { line: 28, character: 31 },
    message: "Property 'topology' does not exist on type 'MongoClient'.",
    code: 2339,
    ...overrides
  }
}

interface Run {
  tool: { driver: { name: string, rules: { id: string, shortDescription: { text: string }, fullDescription: { text: string }, help: { text: string } }[] } }
  results: { ruleId: string, ruleIndex: number, level: string, message: { text: string }, locations: unknown[] }[]
}

function run (diagnostics: Diagnostic[]): Run {
  return (toSarif(diagnostics) as { runs: Run[] }).runs[0]
}

describe('toSarif', () => {
  it('writes a SARIF 2.1.0 log for svelte-check', () => {
    expect(toSarif([])).toMatchObject({
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [{ tool: { driver: { name: 'svelte-check', rules: [] } }, results: [] }]
    })
  })

  it('converts a diagnostic, with 1-based positions', () => {
    expect(run([diagnostic()]).results).toEqual([{
      ruleId: 'TS2339',
      ruleIndex: 0,
      level: 'error',
      message: { text: "Property 'topology' does not exist on type 'MongoClient'." },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/lib/db.ts', uriBaseId: '%SRCROOT%' },
          region: { startLine: 29, startColumn: 24, endLine: 29, endColumn: 32 }
        }
      }]
    }])
  })

  it('declares each rule once, with the descriptions GitHub requires', () => {
    const { tool, results } = run([diagnostic(), diagnostic(), diagnostic({ type: 'WARNING', code: undefined })])
    expect(tool.driver.rules.map((rule) => rule.id)).toEqual(['TS2339', 'svelte-check'])
    for (const rule of tool.driver.rules) {
      expect(rule.shortDescription.text && rule.fullDescription.text && rule.help.text).toBeTruthy()
    }
    expect(results.map((result) => [result.ruleIndex, result.level])).toEqual([[0, 'error'], [0, 'error'], [1, 'warning']])
  })

  it("names Svelte's rules after their code and links to their documentation", () => {
    const { tool } = run([diagnostic({ type: 'WARNING', code: 'state_referenced_locally', source: 'svelte' })])
    expect(tool.driver.rules[0]).toMatchObject({
      id: 'state_referenced_locally',
      helpUri: 'https://svelte.dev/docs/svelte/compiler-warnings#state_referenced_locally',
      properties: { tags: ['svelte'] }
    })
  })

  it('tags TypeScript rules', () => {
    const { tool } = run([diagnostic()])
    expect(tool.driver.rules[0]).toMatchObject({ id: 'TS2339', properties: { tags: ['typescript'] } })
  })
})
