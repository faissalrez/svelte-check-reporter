import { describe, expect, it } from 'vitest'

import { parse } from './parse.js'

describe('parse', () => {
  it('reads the diagnostics and skips the status lines', () => {
    const output = [
      '1794058705694 START "/project"',
      '1794058705695 {"type":"ERROR","filename":"src/lib/db.ts","start":{"line":28,"character":23},"end":{"line":28,"character":31},"message":"Property \'topology\' does not exist on type \'MongoClient\'.","code":2339}',
      '1794058705696 {"type":"WARNING","filename":"src/routes/+page.svelte","start":{"line":3,"character":0},"end":{"line":3,"character":5},"message":"Unused CSS selector","code":"css-unused-selector","source":"svelte"}',
      '1794058705716 COMPLETED 8922 FILES 1 ERRORS 1 WARNINGS 2 FILES_WITH_PROBLEMS',
      ''
    ].join('\n')

    expect(parse(output)).toEqual([
      {
        type: 'ERROR',
        filename: 'src/lib/db.ts',
        start: { line: 28, character: 23 },
        end: { line: 28, character: 31 },
        message: "Property 'topology' does not exist on type 'MongoClient'.",
        code: 2339
      },
      {
        type: 'WARNING',
        filename: 'src/routes/+page.svelte',
        start: { line: 3, character: 0 },
        end: { line: 3, character: 5 },
        message: 'Unused CSS selector',
        code: 'css-unused-selector',
        source: 'svelte'
      }
    ])
  })

  it('reads Windows line endings', () => {
    const output = '0 START "/project"\r\n1 {"type":"ERROR","filename":"a.ts","start":{"line":0,"character":0},"end":{"line":0,"character":1},"message":"m"}\r\n2 COMPLETED 1 FILES 1 ERRORS 0 WARNINGS 1 FILES_WITH_PROBLEMS\r\n'
    expect(parse(output)).toHaveLength(1)
  })

  it.each([
    ['a missing field', '1 {"type":"ERROR","start":{"line":0,"character":0},"message":"m"}'],
    ['an unknown type', '1 {"type":"HINT","filename":"a.ts","start":{"line":0,"character":0},"message":"m"}'],
    ['invalid JSON', '1 {"type":']
  ])('throws on %s, with its line number', (_, line) => {
    expect(() => parse(`0 START "/project"\n${line}`)).toThrow('line 2')
  })
})
