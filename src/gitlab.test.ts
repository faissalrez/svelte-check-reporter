import { describe, expect, it } from 'vitest'

import { toCodeQuality } from './gitlab.js'
import type { Diagnostic } from './parse.js'

function diagnostic (overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    type: 'ERROR',
    filename: 'src/lib/db.ts',
    start: { line: 28, character: 23 },
    end: { line: 28, character: 31 },
    message: "Property 'topology' does not exist on type 'MongoClient'.",
    code: 2339,
    source: 'ts',
    ...overrides
  }
}

describe('toCodeQuality', () => {
  it('converts a diagnostic, with a 1-based line', () => {
    const [issue] = toCodeQuality([diagnostic()])
    expect(issue).toEqual({
      description: "Property 'topology' does not exist on type 'MongoClient'.",
      check_name: 'ts(2339)',
      fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
      severity: 'major',
      location: { path: 'src/lib/db.ts', lines: { begin: 29 } }
    })
  })

  it('maps warnings to minor and names checks without a code or source', () => {
    const [issue] = toCodeQuality([diagnostic({ type: 'WARNING', code: undefined, source: undefined })])
    expect(issue.severity).toBe('minor')
    expect(issue.check_name).toBe('svelte-check')
  })

  it('keeps the fingerprint when the problem moves to another line', () => {
    const [before] = toCodeQuality([diagnostic()])
    const [after] = toCodeQuality([diagnostic({ start: { line: 40, character: 0 } })])
    expect(after.fingerprint).toBe(before.fingerprint)
  })

  it('tells identical problems of one file apart', () => {
    const issues = toCodeQuality([diagnostic(), diagnostic({ start: { line: 28, character: 43 } })])
    expect(issues[0].fingerprint).not.toBe(issues[1].fingerprint)
  })

  it('changes the fingerprint with the file, code or message', () => {
    const [base] = toCodeQuality([diagnostic()])
    for (const change of [{ filename: 'src/other.ts' }, { code: 2304 }, { message: 'Other.' }]) {
      expect(toCodeQuality([diagnostic(change)])[0].fingerprint).not.toBe(base.fingerprint)
    }
  })

  it('prefixes the description without changing the fingerprint', () => {
    const [plain] = toCodeQuality([diagnostic()])
    const [prefixed] = toCodeQuality([diagnostic()], { prefix: '[svelte-check] ' })
    expect(prefixed.description).toBe("[svelte-check] Property 'topology' does not exist on type 'MongoClient'.")
    expect(prefixed.fingerprint).toBe(plain.fingerprint)
  })
})
