# svelte-check-reporter

Turns [svelte-check](https://www.npmjs.com/package/svelte-check) output into CI
reports, so type errors show up in merge requests and pull requests:

- a [GitLab Code Quality](https://docs.gitlab.com/ci/testing/code_quality/) report;
- [GitHub Actions annotations](https://docs.github.com/actions/reference/workflow-commands-for-github-actions).

## Usage

```sh
npm install --save-dev svelte-check-reporter
```

```sh
# GitLab: writes the report to a file
svelte-check --output machine-verbose | svelte-check-reporter --output-file gl-codequality.json

# GitHub: prints the annotations to the log
svelte-check --output machine-verbose | svelte-check-reporter --format github
```

Both also print each problem to the log:

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

## GitHub Actions

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npx svelte-kit sync
      - run: npx svelte-check --output machine-verbose | npx svelte-check-reporter --format github
```

Annotations show on the workflow run and on the lines of the pull request's diff.
Unlike GitLab, GitHub doesn't compare them with the base branch: every problem is
annotated, not only new ones. Run the command from the repository root, so that
file paths match the repository.

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
| `--format <format>` | `gitlab` | `gitlab` or `github`. |
| `--output-file <path>` | required with `gitlab` | Where to write the GitLab report. Not used with `github`, whose annotations go to the log. |
| `--prefix <text>` | none | Text added before each message, for example `'[svelte-check] '`. GitLab doesn't show which tool found a problem: this tells svelte-check's problems apart from those of other tools, such as ESLint. |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | No errors (warnings don't fail, as with svelte-check). |
| `1` | svelte-check found errors. |
| `2` | The input can't be used: nothing piped in, svelte-check didn't complete, or its output isn't `machine-verbose`. |

## How GitLab matches problems across pipelines

Each problem gets a fingerprint from its file, error code and message, without its
line: a problem keeps its fingerprint when code above it moves. Identical problems
in one file are told apart by their order. The prefix isn't part of the
fingerprint, so adding or changing it doesn't mark problems as new.

## License

MIT
