# Contributing

Thanks for helping! Bug reports, fixes and documentation are all welcome.

## Reporting a bug

Open an [issue](https://github.com/faissalrez/svelte-check-reporter/issues) with:

- the versions of svelte-check-reporter, svelte-check and Node.js;
- your CI (GitLab CI, GitHub Actions…) and the format you use (`gitlab`, `github` or `sarif`);
- the command, and the lines of svelte-check's `machine-verbose` output that cause the problem, with private paths or messages removed;
- what you expected, and what you got.

## Developing

You need Node.js 22.12 or later for the tools, though the package itself supports Node.js 18.3.

```sh
npm ci
npm run typecheck
npm test
```

`npm test` builds the package, then runs the tests, including the command end to end on the built `dist/cli.js`. `test/smoke.sh` runs the built command without the test tools: the CI uses it on the oldest supported Node.js versions.

The code is small:

| File | Role |
| --- | --- |
| `src/parse.ts` | Reads svelte-check's `machine-verbose` output |
| `src/gitlab.ts`, `src/github.ts`, `src/sarif.ts` | Convert diagnostics to each format |
| `src/rule.ts` | Names rules after their TypeScript or Svelte code |
| `src/cli.ts` | Reads options and input, writes the report, sets the exit code |

## Pull requests

- One change per pull request, with a test when it changes behavior.
- No runtime dependencies, and nothing newer than Node.js 18.3: the CI checks it.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `fix:`, `feat:`, `docs:`, `test:`, `chore:`…
- The CI must pass.

Releases are made by the maintainer.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
