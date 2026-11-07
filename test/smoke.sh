#!/bin/sh
# Runs the built command on a sample svelte-check output and checks the report.
# The CI runs it on the oldest Node versions allowed by engines, which vitest
# doesn't support.
set -eu
report=$(mktemp)
status=0
printf '%s\n' \
  '1 START "/project"' \
  '2 {"type":"ERROR","filename":"src/a.ts","start":{"line":0,"character":4},"end":{"line":0,"character":5},"message":"Boom.","code":2322}' \
  '3 COMPLETED 1 FILES 1 ERRORS 0 WARNINGS 1 FILES_WITH_PROBLEMS' \
  | node dist/cli.js --output-file "$report" --prefix '[svelte-check] ' || status=$?
[ "$status" -eq 1 ] || { echo "Expected exit code 1, got $status"; exit 1; }
grep -q '"description": "\[svelte-check\] Boom."' "$report" || { echo 'Unexpected report:'; cat "$report"; exit 1; }

# GitHub annotations
annotations=$(printf '%s\n' \
  '1 START "/project"' \
  '2 {"type":"ERROR","filename":"src/a.ts","start":{"line":0,"character":4},"end":{"line":0,"character":5},"message":"Boom.","code":2322}' \
  '3 COMPLETED 1 FILES 1 ERRORS 0 WARNINGS 1 FILES_WITH_PROBLEMS' \
  | node dist/cli.js --format github) && status=0 || status=$?
[ "$status" -eq 1 ] || { echo "Expected exit code 1 with --format github, got $status"; exit 1; }
echo "$annotations" | grep -qF '::error file=src/a.ts,line=1,col=5,endLine=1,endColumn=6,title=svelte-check(2322)::Boom.' || { echo 'Unexpected annotations:'; echo "$annotations"; exit 1; }

echo "Smoke test passed on Node $(node -v)"
