# Daily Lexicon

Daily Lexicon is a production-oriented Wordle-style daily word game built with React, TypeScript, and Vite. It recreates the original five-letter / six-guess play loop closely, including deterministic daily puzzles, duplicate-letter evaluation, hard mode, an on-screen keyboard, physical keyboard play, shareable spoiler-free results, dark mode, and high-contrast mode.

## Stack

- React 18
- TypeScript (strict mode)
- Vite 5
- Vitest + Testing Library
- ESLint 9

## Local development

Use npm and Node 20+.

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Available scripts

- `npm run dev` - start the local dev server
- `npm run build` - typecheck and create the production static build
- `npm run preview` - serve the built app locally
- `npm run test` - run Vitest in watch mode
- `npm run test:run` - run the full test suite once
- `npm run test:e2e` - run the Playwright browser suite against a local preview server
- `npm run test:e2e:smoke` - run the Chromium smoke spec only
- `npm run test:e2e:headed` - run the Chromium smoke spec with a visible browser locally
- `npm run check:bundle` - enforce the production asset-size budget after a build
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript type checking

## Architecture summary

The codebase is split into small, explicit modules so gameplay rules stay pure and UI-only code does not reimplement them.

- `src/game/evaluateGuess.ts` - two-pass duplicate-safe guess evaluation
- `src/game/keyboard.ts` - keyboard status priority merging
- `src/game/hardMode.ts` - hard mode constraint derivation and validation
- `src/game/puzzle.ts` - local-date daily puzzle mapping from a fixed epoch
- `src/game/storage.ts` - versioned localStorage restore/persist with safe defaults
- `src/game/stats.ts` - streak and distribution updates
- `src/game/share.ts` - spoiler-free emoji share text
- `src/hooks/useWordGame.ts` - thin app state orchestration around the pure modules
- `src/config/*` - runtime config and typed feature flags
- `src/lib/*` - logger, analytics, clipboard fallback, global error handling, error reporting adapter

## Gameplay rules

- exactly 5 letters per answer
- exactly 6 submitted guesses
- invalid words do not consume turns
- duplicate letters are evaluated with a two-pass algorithm
- hard mode reuses discovered greens and minimum discovered letter counts
- keyboard state never downgrades from correct to present/absent or present to absent

## Duplicate-letter evaluation

Evaluation is intentionally not based on naive `includes()` logic.

1. Pass 1 marks exact-position matches as `correct` and consumes those answer positions.
2. Pass 2 checks the remaining guess letters against only the remaining unconsumed answer positions.
3. A repeated guess letter only becomes `present` while unmatched answer inventory still exists; extra duplicates become `absent`.

This is covered by unit tests for cases like `BANAL` vs `ANNAL`, `CLOSE` vs `LEECH`, and `ROBOT` vs `OOOOO`.

## Daily puzzle design

Daily mode uses the player’s local calendar day. The puzzle id is a local `YYYY-MM-DD` string, and the puzzle number is the number of local days since the configured epoch. The answer index is `puzzleNumber % answers.length`, so the same day always maps to the same answer under the configured epoch.

Default epoch: `2024-01-01`

If the date changes between sessions, the app starts a fresh daily round for the new puzzle id and preserves historical statistics.

## Persistence design

The app stores a versioned snapshot in localStorage:

- current puzzle id
- submitted guesses
- current partial guess
- game status
- settings
- statistics
- answer set version

Corrupt JSON safely resets the stored snapshot. Parseable but malformed state, stale schema versions, and answer-list version mismatches also fall back to a safe empty round, while valid settings/statistics are preserved only when their stored shapes still validate.

## Configuration and env vars

Runtime/build configuration is centralized in `src/config/appConfig.ts`. Feature flags live in `src/config/flags.ts`.

Environment variables:

- `VITE_APP_TITLE` - UI title text
- `VITE_BASE_PATH` - optional Vite base path for subpath deployments such as GitHub Pages
- `VITE_PUZZLE_EPOCH` - optional `YYYY-MM-DD` daily epoch override
- `VITE_ENABLE_ANALYTICS` - enables the analytics adapter interface; default `false`
- `VITE_ENABLE_ERROR_REPORTING` - enables the error-reporting adapter interface; default `false`
- `VITE_FEATURE_PRACTICE_MODE` - reserved feature flag, off by default
- `VITE_BUILD_ID` - optional build identifier shown in Settings

See `.env.example` for defaults.

Frontend env vars are not secrets. Do not place secrets in them.

## Testing strategy

The project includes:

- unit tests for guess evaluation, duplicate logic, keyboard merging, hard mode, puzzle mapping, storage, and share text
- integration tests for typing, deleting, valid/invalid submission, hard mode enforcement, win flow, lose flow, restore flow, settings persistence, share, clipboard failure handling, and dialog focus behavior
- Playwright browser smoke coverage for the built app, physical and on-screen keyboard play, dialog behavior, settings persistence, reveal gating, and reload restore
- linting, typechecking, and production build verification

CI runs install, lint, typecheck, tests, build, a bundle-budget check, and a Chromium Playwright smoke pass on every push and pull request.

A separate manual GitHub Actions workflow (`Post-deploy verify`) can run the same browser smoke suite plus header/cache checks against a live deployment URL.

GitHub Pages deployment is available through `.github/workflows/deploy-pages.yml`; it computes a repository-aware Vite base path automatically and deploys the `dist/` artifact to the Pages environment.

## Deployment guidance

The app is built as static assets and works with Vercel, Netlify, Cloudflare Pages, Nginx static hosting, or S3/CDN-style hosting.

```bash
npm run build
```

Deploy the generated `dist/` directory.

Included hosting artifacts:

- `.github/workflows/ci.yml`
- `netlify.toml`
- `vercel.json`
- `docs/nginx.conf.example`

## Security header guidance

Recommended static-host headers are included in the hosting examples:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options: DENY`

The host examples also separate cache policy between HTML entry points and hashed static assets so rollbacks stay safe without sacrificing asset caching.

The app avoids `dangerouslySetInnerHTML`, does not eval code, and does not store secrets client-side.

## Observability and resilience

- `logger.ts` reduces noise in production
- `ErrorBoundary.tsx` prevents blank-screen failures
- global error listeners capture uncaught errors and rejections
- analytics and error reporting are behind thin adapters and remain non-blocking noop implementations unless enabled/configured
- analytics and error reporting stay vendor-neutral and disabled by default; production verification focuses on their current contract rather than a specific SDK
- clipboard sharing falls back safely when the Clipboard API is unavailable
- localStorage write failures degrade safely without crashing the app

## Performance note

The dependency set is intentionally small. The only runtime dependencies are React and React DOM. All other tooling is build/test-only. The production bundle stays small because there is no UI kit, no state library, and no backend SDK.

## Privacy note

Gameplay state stays on-device in localStorage. There is no auth, no account system, and no cookie requirement. Optional analytics is off by default.

## Troubleshooting

- Puzzle changed unexpectedly: confirm the deployed build uses the intended `VITE_PUZZLE_EPOCH`
- Progress disappeared: inspect localStorage availability, schema version, and answer set version changes
- Share button failed: verify clipboard permissions or fallback support in the target browser
- Keyboard input broken: verify there is no modal open and inspect custom host scripts that may intercept keydown events
- Dark mode mismatch: confirm persisted settings and theme dataset values on `document.documentElement`

## Version metadata

The settings dialog shows `package.json` version plus `VITE_BUILD_ID` (or `local-dev` when not provided). This is intended for operational debugging and user issue reports.
