# svelte-check-reporter

Turns `svelte-check --output machine-verbose` into CI reports.

```sh
svelte-check --output machine-verbose | svelte-check-reporter --format gitlab > gl-codequality.json
```

Formats:
- `gitlab`: GitLab Code Quality (planned for v1)
- `sarif`: SARIF, for GitHub code scanning (planned)
