#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { text } from 'node:stream/consumers'
import { parseArgs } from 'node:util'

import { toCodeQuality } from './gitlab.js'
import { parse, type Diagnostic } from './parse.js'

const usage = 'Usage: svelte-check --output machine-verbose | svelte-check-reporter --format gitlab --output-file gl-codequality.json'

async function main (): Promise<number> {
  const { values } = parseArgs({
    options: {
      format: { type: 'string', default: 'gitlab' },
      'output-file': { type: 'string' },
      prefix: { type: 'string', default: '' }
    }
  })
  if (values.format !== 'gitlab') throw new Error(`Unknown format "${values.format}". ${usage}`)
  const outputFile = values['output-file']
  if (!outputFile) throw new Error(`Missing --output-file. ${usage}`)

  // Otherwise it would wait for keyboard input, and look stuck
  if (process.stdin.isTTY) throw new Error(`Nothing piped in. ${usage}`)
  const output = await text(process.stdin)
  // Without it, svelte-check crashed or wasn't piped in: an empty report would look clean
  if (!/^\d+ COMPLETED /m.test(output)) throw new Error(`No complete svelte-check output on stdin. ${usage}`)

  const diagnostics = parse(output)
  await mkdir(dirname(outputFile), { recursive: true })
  await writeFile(outputFile, `${JSON.stringify(toCodeQuality(diagnostics, { prefix: values.prefix }), null, 2)}\n`)

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
