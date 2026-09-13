# Scripts

This directory is intentionally empty. The previous `deploy.cjs` script
(which force-pushed `dist/` to the `gh-pages` branch with hardcoded
credentials) was removed because CI now deploys via the official
`actions/deploy-pages` workflow in `.github/workflows/deploy.yml`.

If you need an out-of-band deploy helper, add it under
`scripts/local/` so it is excluded from CI artifacts.
