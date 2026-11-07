# svelte-check-reporter

Turns [svelte-check](https://www.npmjs.com/package/svelte-check) output into CI
reports, so type errors show up in merge requests and pull requests:

- a [GitLab Code Quality](https://docs.gitlab.com/ci/testing/code_quality/) report;
- [GitHub Actions annotations](https://docs.github.com/actions/reference/workflow-commands-for-github-actions);
- a [SARIF](https://docs.github.com/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning) log, for GitHub code scanning.

## Usage

```sh
npm install --save-dev svelte-check-reporter
```

```sh
# GitLab: writes the report to a file
svelte-check --output machine-verbose | svelte-check-reporter --output-file gl-codequality.json

# GitHub annotations: prints them to the log
svelte-check --output machine-verbose | svelte-check-reporter --format github

# GitHub code scanning: writes a SARIF log to a file
svelte-check --output machine-verbose | svelte-check-reporter --format sarif --output-file svelte-check.sarif
```

All formats also print each problem to the log:

```
src/lib/db.ts:29:24  error  Property 'topology' does not exist on type 'MongoClient'.  TS2339

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

GitHub shows at most 10 error annotations per step, in svelte-check's order: the
log of the step still lists every problem.

## GitHub code scanning

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      # Only needed in private repositories
      actions: read
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npx svelte-kit sync
      - run: npx svelte-check --output machine-verbose | npx svelte-check-reporter --format sarif --output-file svelte-check.sarif
      - uses: github/codeql-action/upload-sarif@v4
        # Upload the report even when svelte-check finds errors
        if: ${{ !cancelled() }}
        with:
          sarif_file: svelte-check.sarif
          category: svelte-check
```

Code scanning compares the results with the base branch: pull requests show the
problems they add, without GitHub's limit on annotations. It's available on public
repositories, and on private ones with GitHub Code Security.

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
| `--format <format>` | `gitlab` | `gitlab`, `github` or `sarif`. |
| `--output-file <path>` | required with `gitlab` and `sarif` | Where to write the report. Not used with `github`, whose annotations go to the log. |
| `--prefix <text>` | none | Text added before each message, with `gitlab` and `github`, for example `'[svelte-check] '`. GitLab doesn't show which tool found a problem: this tells svelte-check's problems apart from those of other tools, such as ESLint. Code scanning shows the tool's name, so SARIF doesn't use it. |

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

## Roadmap

- GitHub annotations: annotate the files changed by the pull request first, so
  that the 10 annotations GitHub shows go to the problems the pull request adds.

## License

MIT
