import { describe, expect, it } from 'vitest'

import { toAnnotations } from './github.js'
import type { Diagnostic } from './parse.js'

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

describe('toAnnotations', () => {
  it('converts an error, with 1-based positions', () => {
    expect(toAnnotations([diagnostic()])).toEqual([
      "::error file=src/lib/db.ts,line=29,col=24,endLine=29,endColumn=32,title=svelte-check TS2339::Property 'topology' does not exist on type 'MongoClient'."
    ])
  })

  it('converts a warning without a code', () => {
    const [annotation] = toAnnotations([diagnostic({ type: 'WARNING', code: undefined })])
    expect(annotation).toMatch(/^::warning .*,title=svelte-check::/)
  })

  it('prefixes the message', () => {
    const [annotation] = toAnnotations([diagnostic()], { prefix: '[svelte-check] ' })
    expect(annotation).toMatch(/::\[svelte-check\] Property/)
  })

  it('escapes what would break the command', () => {
    const [annotation] = toAnnotations([diagnostic({ filename: 'src/a,b:c.ts', message: '100% wrong\nsecond line' })])
    expect(annotation).toContain('file=src/a%2Cb%3Ac.ts,')
    expect(annotation).toMatch(/::100%25 wrong%0Asecond line$/)
  })
})
