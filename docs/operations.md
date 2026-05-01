# Operations runbook

## Build and deploy

1. Install dependencies with `npm ci`
2. Run validation:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
   - `npm run build`
   - `npm run check:bundle`
   - `npm run test:e2e:smoke`
3. Deploy the generated `dist/` directory to the static host of choice

GitHub Pages can be deployed directly through the `Deploy GitHub Pages` workflow, which computes the correct Vite base path automatically for project pages.

## Verify deployment

After deployment, verify:

1. the homepage loads without console errors
2. keyboard input works with both physical and on-screen keys
3. a valid guess evaluates correctly
4. reload restores the in-progress board
5. dark mode and high-contrast mode persist after refresh
6. share copies a spoiler-free grid after a completed game

You can automate the live-site browser and header checks with the GitHub Actions workflow `Post-deploy verify` by passing the deployed HTTPS URL.

## Rollback

Rollback is static-host specific, but the safe default is:

1. redeploy the previous known-good artifact
2. confirm the build id shown in Settings matches the rollback target
3. verify daily puzzle mapping still matches the intended epoch

## Common failure checks

### Puzzle changed unexpectedly

- confirm `VITE_PUZZLE_EPOCH` did not change unexpectedly
- confirm the deployed build id/version matches the expected release
- confirm the answer list version was not changed without coordination

### Progress disappeared

- inspect localStorage for `daily-lexicon-state`
- verify stored `version` matches the current schema
- verify stored `answerSetVersion` still matches the shipped word list
- check whether the local calendar day rolled over between sessions

### Share button failed

- check browser clipboard permission support
- test fallback copy path in a browser without `navigator.clipboard`
- inspect console warnings from `logger.warn('Clipboard share failed', ...)`

### Keyboard input broken

- verify a modal is not open
- check if a host script or extension is intercepting `keydown`
- verify no CSP change blocks the app bundle from loading

### Dark mode issue

- inspect `document.documentElement.dataset.theme`
- verify persisted settings in localStorage
- verify the current build includes the latest CSS bundle

### localStorage corruption issue

- malformed JSON should reset safely on next load
- parseable but invalid stored state should also reset to a safe empty round
- if repeated reports appear, inspect browser privacy settings or extensions clearing storage

## Operational notes

- analytics is off by default and non-blocking; when enabled it sends to the configured HTTP endpoint
- error reporting is off by default and non-blocking; when enabled it sends to the configured HTTP endpoint
- the core game is intentionally backend-free; daily puzzle correctness depends on local calendar day and build-time configuration only
