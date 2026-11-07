# svelte-check-reporter

Turns [svelte-check](https://www.npmjs.com/package/svelte-check) output into a
[GitLab Code Quality](https://docs.gitlab.com/ci/testing/code_quality/) report, so
type errors show up in merge requests.

## Usage

```sh
npm install --save-dev svelte-check-reporter
```

```sh
svelte-check --output machine-verbose | svelte-check-reporter --output-file gl-codequality.json
```

The command writes the report to `--output-file` and prints each problem to the log:

```
src/lib/db.ts:29:24  error  Property 'topology' does not exist on type 'MongoClient'.  (2339)

1 error, 0 warnings
```

## GitLab CI

```yaml
check:
  image: node:24-alpine
  script:
    - npm ci
    - npx svelte-kit sync
    - npx svelte-check --output machine-verbose | npx svelte-check-reporter --output-file gl-codequality.json
  artifacts:
    # The report matters most when the check fails
    when: always
    reports:
      codequality: gl-codequality.json
```

GitLab compares the report with the one of the target branch: the merge request
shows the problems it adds and the ones it fixes.

## Compatibility

| | Supported | Tested |
| --- | --- | --- |
| Node.js | 18.3 and later | 18.3, 18, 20, 22 and 24, in CI |
| svelte-check | versions with `--output machine-verbose` | 4.7 |
| Svelte | any version svelte-check checks | 5 |
| SvelteKit | optional | 2 and 3 |

The reporter only reads svelte-check's output: it doesn't depend on Svelte or
SvelteKit. In a SvelteKit project, run `svelte-kit sync` before svelte-check, as
in the example above.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--output-file <path>` | required | Where to write the report. |
| `--format <format>` | `gitlab` | Report format. Only `gitlab` for now. |
| `--prefix <text>` | none | Text added before each description, for example `'[svelte-check] '`. GitLab doesn't show which tool found a problem: this tells svelte-check's problems apart from those of other tools, such as ESLint. |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | No errors (warnings don't fail, as with svelte-check). |
| `1` | svelte-check found errors. |
| `2` | The input can't be used: nothing piped in, svelte-check didn't complete, or its output isn't `machine-verbose`. |

## How problems are matched across pipelines

Each problem gets a fingerprint from its file, error code and message, without its
line: a problem keeps its fingerprint when code above it moves. Identical problems
in one file are told apart by their order. The prefix isn't part of the
fingerprint, so adding or changing it doesn't mark problems as new.

## License

MIT
