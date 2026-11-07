import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Runs the built command, as npm installs it (`npm test` builds first)
const cli = join(import.meta.dirname, '..', 'dist', 'cli.js')

function run (input: string, args: string[] = []) {
  const outputFile = join(mkdtempSync(join(tmpdir(), 'svelte-check-reporter-')), 'report.json')
  const result = spawnSync('node', [cli, '--output-file', outputFile, ...args], { input, encoding: 'utf8' })
  return { ...result, outputFile }
}

const error = '2 {"type":"ERROR","filename":"src/a.ts","start":{"line":0,"character":4},"end":{"line":0,"character":5},"message":"Boom.","code":2322}'
const warning = '3 {"type":"WARNING","filename":"src/b.svelte","start":{"line":1,"character":0},"end":{"line":1,"character":1},"message":"Careful.","code":"a11y"}'
const start = '1 START "/project"'
const completed = '4 COMPLETED 2 FILES 1 ERRORS 1 WARNINGS 2 FILES_WITH_PROBLEMS'

describe('svelte-check-reporter', () => {
  it('writes the report, prints the problems and exits with 1 on errors', () => {
    const { status, stdout, outputFile } = run([start, error, warning, completed].join('\n'), ['--prefix', '[svelte-check] '])
    expect(status).toBe(1)
    expect(stdout).toContain('src/a.ts:1:5  error  Boom.  (2322)')
    expect(stdout).toContain('1 error, 1 warning')
    const report = JSON.parse(readFileSync(outputFile, 'utf8'))
    expect(report.map((issue: { description: string }) => issue.description)).toEqual(['[svelte-check] Boom.', '[svelte-check] Careful.'])
  })

  it('exits with 0 on warnings only', () => {
    expect(run([start, warning, completed].join('\n')).status).toBe(0)
  })

  it('exits with 2 when svelte-check did not complete', () => {
    const { status, stderr } = run([start, error].join('\n'))
    expect(status).toBe(2)
    expect(stderr).toContain('No complete svelte-check output')
  })

  it('exits with 2 without an output file', () => {
    const result = spawnSync('node', [cli], { input: '', encoding: 'utf8' })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('Missing --output-file')
  })

  it('prints GitHub annotations with --format github', () => {
    const result = spawnSync('node', [cli, '--format', 'github'], { input: [start, error, warning, completed].join('\n'), encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('::error file=src/a.ts,line=1,col=5,endLine=1,endColumn=6,title=svelte-check(2322)::Boom.')
    expect(result.stdout).toContain('::warning file=src/b.svelte,line=2,col=1,')
    expect(result.stdout).toContain('1 error, 1 warning')
  })

  it('rejects --output-file with --format github', () => {
    const result = spawnSync('node', [cli, '--format', 'github', '--output-file', 'x.json'], { input: '', encoding: 'utf8' })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("--output-file isn't used with --format github")
  })

  it('writes a SARIF log with --format sarif', () => {
    const { status, outputFile } = run([start, error, completed].join('\n'), ['--format', 'sarif'])
    expect(status).toBe(1)
    const log = JSON.parse(readFileSync(outputFile, 'utf8'))
    expect(log.version).toBe('2.1.0')
    expect(log.runs[0].results[0]).toMatchObject({ ruleId: '2322', level: 'error', message: { text: 'Boom.' } })
  })
})
