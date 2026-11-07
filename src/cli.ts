#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { text } from 'node:stream/consumers'
import { parseArgs } from 'node:util'

import { toAnnotations } from './github.js'
import { toCodeQuality } from './gitlab.js'
import { parse, type Diagnostic } from './parse.js'
import { toSarif } from './sarif.js'

const usage = 'Usage: svelte-check --output machine-verbose | svelte-check-reporter --format gitlab --output-file gl-codequality.json\n' +
  '   or: svelte-check --output machine-verbose | svelte-check-reporter --format github\n' +
  '   or: svelte-check --output machine-verbose | svelte-check-reporter --format sarif --output-file svelte-check.sarif'

async function main (): Promise<number> {
  // No `default` in these options: parseArgs only supports it from Node 18.11
  const { values } = parseArgs({
    options: {
      format: { type: 'string' },
      'output-file': { type: 'string' },
      prefix: { type: 'string' }
    }
  })
  const reportFormat = values.format ?? 'gitlab'
  if (reportFormat !== 'gitlab' && reportFormat !== 'github' && reportFormat !== 'sarif') throw new Error(`Unknown format "${reportFormat}". ${usage}`)
  const outputFile = values['output-file']
  // GitHub reads its annotations from the log: the other formats go to a file
  if (reportFormat !== 'github' && !outputFile) throw new Error(`Missing --output-file. ${usage}`)
  if (reportFormat === 'github' && outputFile) throw new Error(`--output-file isn't used with --format github. ${usage}`)
  const prefix = values.prefix ?? ''

  // Otherwise it would wait for keyboard input, and look stuck
  if (process.stdin.isTTY) throw new Error(`Nothing piped in. ${usage}`)
  const output = await text(process.stdin)
  // Without it, svelte-check crashed or wasn't piped in: an empty report would look clean
  if (!/^\d+ COMPLETED /m.test(output)) throw new Error(`No complete svelte-check output on stdin. ${usage}`)

  const diagnostics = parse(output)
  if (outputFile) {
    await mkdir(dirname(outputFile), { recursive: true })
    // GitHub shows the tool's name next to each problem: no need for the prefix in SARIF
    const report = reportFormat === 'sarif' ? toSarif(diagnostics) : toCodeQuality(diagnostics, { prefix })
    await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`)
  } else {
    // GitHub hides these lines from the log: the readable output below stays
    for (const annotation of toAnnotations(diagnostics, { prefix })) console.log(annotation)
  }

  console.log(format(diagnostics))
  // Same as svelte-check: warnings alone don't fail
  return diagnostics.some((d) => d.type === 'ERROR') ? 1 : 0
}

function format (diagnostics: Diagnostic[]): string {
  const lines = diagnostics.map((d) => {
    const label = d.type === 'ERROR' ? 'error' : 'warn '
    const code = d.code === undefined ? '' : `  ${d.source ?? ''}(${d.code})`
    return `${d.filename}:${d.start.line + 1}:${d.start.character + 1}  ${label}  ${d.message}${code}`
  })
  const errors = diagnostics.filter((d) => d.type === 'ERROR').length
  const warnings = diagnostics.length - errors
  lines.push('', errors + warnings === 0
    ? 'No problems found'
    : `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`)
  return lines.join('\n')
}

main().then(
  (code) => { process.exitCode = code },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 2
  }
)
