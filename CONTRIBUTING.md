# Contributing to ContraRun

Thanks for helping improve ContraRun. Small, focused changes are easiest to review and safest for game feel.

## Setup

```bash
git clone https://github.com/pstarwars2026/contra-run.git
cd contra-run
npm install
npx playwright install chromium
npm test
```

No API keys or environment variables are required.

## Before opening a pull request

1. Keep gameplay changes focused and describe the player-visible behavior they affect.
2. Preserve keyboard and touch parity when changing controls.
3. Add or update a regression test when fixing an input, collision, progression, or state-machine bug.
4. Run `npm test` and `git diff --check`.
5. If `entry.js` or the Three.js imports changed, run `npm run build:three` and include the updated `lib/bundle-three.js`.
6. Do not commit generated Playwright reports, `node_modules`, secrets, or local environment files.

## Gameplay changes

ContraRun uses a fixed-step simulation and input buffering. Very small timing changes can alter jump, dash, firing, or collision feel. Prefer observable behavior and regression tests over frame-rate-specific assumptions.

The existing browser suites cover the main campaign path. Extend them when a bug can be reproduced deterministically.

## Code organization

The current release still contains most gameplay in `index.html`. Refactors are welcome, but keep structural moves separate from gameplay changes when practical so behavior regressions are easy to identify.

## Third-party code and assets

Do not add third-party code, art, music, or models unless their license permits redistribution in this public repository. Preserve required copyright and attribution notices and update `NOTICE` when needed.

By contributing, you agree that your contribution is submitted under the repository's Apache License 2.0.
