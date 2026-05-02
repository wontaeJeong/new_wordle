# Daily Lexicon

Daily Lexicon is a production-oriented Wordle-style daily word game built with React, TypeScript, and Vite. It recreates the original five-letter / six-guess play loop closely, including deterministic daily puzzles, duplicate-letter evaluation, hard mode, an on-screen keyboard, physical keyboard play, shareable spoiler-free results, dark mode, and high-contrast mode.

## Stack

- React 18
- TypeScript (strict mode)
- Vite 5
- Vitest + Testing Library
- ESLint 9

## Local development

Use npm and Node 22+.

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Available scripts

- `npm run dev` - start the local dev server
- `npm run build` - typecheck and create the production static build
- `npm run preview` - serve the built app locally
- `npm run serve:auth` - serve `dist/` with the same-origin login API
- `npm run auth:hash` - generate a scrypt password hash for `AUTH_PASSWORD_HASH`
- `npm run test` - run Vitest in watch mode
- `npm run test:run` - run the full test suite once
- `npm run test:e2e` - run the Playwright browser suite against a local preview server
- `npm run test:e2e:smoke` - run the Chromium smoke spec only
- `npm run test:e2e:headed` - run the Chromium smoke spec with a visible browser locally
- `npm run check:bundle` - enforce the production asset-size budget after a build
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript type checking
- `npm run verify` - run lint, typecheck, tests, production build, bundle budget, and Chromium smoke checks
- `npm run native:sync` - build the web app and sync assets into all Capacitor native projects
- `npm run native:build:android` - build the Android debug APK
- `npm run native:build:ios` - build the iOS simulator debug app with Xcode
- `npm run native:build:android:release` - build the signed Android release AAB for Google Play
- `npm run native:build:android:release:apk` - build the signed Android release APK for local distribution checks
- `npm run native:build:ios:release` - archive and export the signed iOS release IPA

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
- `src/config/appConfig.ts` - runtime config
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

Runtime/build configuration is centralized in `src/config/appConfig.ts`.

Environment variables:

- `VITE_APP_TITLE` - UI title text
- `VITE_BASE_PATH` - optional Vite base path for subpath deployments such as GitHub Pages
- `VITE_PUZZLE_EPOCH` - optional `YYYY-MM-DD` daily epoch override
- `VITE_ENABLE_ANALYTICS` - enables HTTP analytics delivery; default `false`
- `VITE_ANALYTICS_ENDPOINT` - same-origin path or HTTPS URL required when analytics is enabled
- `VITE_ENABLE_ERROR_REPORTING` - enables HTTP error report delivery; default `false`
- `VITE_ERROR_REPORTING_ENDPOINT` - same-origin path or HTTPS URL required when error reporting is enabled
- `VITE_BUILD_ID` - optional build identifier shown in Settings

Server-only login variables for `npm run serve:auth`:

- `AUTH_USERNAME` - username accepted by the login API
- `AUTH_PASSWORD_HASH` - scrypt hash generated with `npm run auth:hash`
- `SESSION_SECRET` - at least 32 characters, used to sign HttpOnly session cookies
- `AUTH_SESSION_TTL_SECONDS` - optional session lifetime; default `28800`
- `AUTH_SECURE_COOKIES` - set `true` behind HTTPS; defaults to `true` when `NODE_ENV=production`
- `AUTH_TRUST_PROXY` - optional; set `true` only when a trusted reverse proxy controls `X-Forwarded-For`

See `.env.example` for defaults.

Frontend env vars are not secrets. Do not place secrets in `VITE_*` values.

## Login design

The app is protected by a same-origin login API. The browser never receives an auth token: successful login sets an HttpOnly, SameSite session cookie, `/api/auth/session` verifies it before the puzzle renders, and `/api/auth/logout` clears it. Failed login attempts are throttled per client and username.

The bundled server supports one environment-configured account and serves the production `dist/` output:

```bash
AUTH_PASSWORD='choose-a-strong-password' npm run auth:hash
npm run build
AUTH_USERNAME=player@example.com \
AUTH_PASSWORD_HASH='scrypt$...' \
SESSION_SECRET='replace-with-a-long-random-secret' \
NODE_ENV=production \
AUTH_SECURE_COOKIES=true \
npm run serve:auth
```

Run it behind HTTPS in production. For horizontally scaled deployments, move the in-memory session/rate-limit stores behind a shared store or equivalent platform middleware.

## Testing strategy

The project includes:

- unit tests for guess evaluation, duplicate logic, keyboard merging, hard mode, puzzle mapping, storage, and share text
- integration tests for typing, deleting, valid/invalid submission, hard mode enforcement, win flow, lose flow, restore flow, settings persistence, share, clipboard failure handling, and dialog focus behavior
- Playwright browser smoke coverage for the built app, physical and on-screen keyboard play, dialog behavior, settings persistence, reveal gating, and reload restore
- linting, typechecking, and production build verification

CI runs install, lint, typecheck, tests, build, a bundle-budget check, and a Chromium Playwright smoke pass on every push and pull request.

A separate manual GitHub Actions workflow (`Post-deploy verify`) can run the same browser smoke suite plus header/cache checks against a live deployment URL on hosts that support custom response headers.

GitHub Pages deployment is available through `.github/workflows/deploy-pages.yml`; it computes a repository-aware Vite base path automatically, deploys the `dist/` artifact to the Pages environment, and runs a browser smoke check. Use Netlify, Vercel, Nginx, or a CDN/proxy that supports custom headers for the full production security-header policy.

## Deployment guidance

The UI is still built as static assets, but login requires a same-origin server or equivalent serverless endpoints for `/api/auth/*`.

```bash
npm run build
```

Deploy the generated `dist/` directory.

## Native app builds

Native Android and iOS projects are provided through Capacitor. The shared web bundle is still produced by Vite in `dist/` with a root base path for native packaging, then copied into `android/` and `ios/` during Capacitor sync.

Debug builds:

```bash
npm run native:sync
npm run native:build:android
npm run native:build:ios
```

Android builds require a JDK and Android SDK with API 36 installed. The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

Android production builds require an upload keystore. Keep the keystore and passwords out of Git. Either export the values in the shell/CI environment or copy `android/keystore.properties.example` to ignored `android/keystore.properties` and fill it locally.

Required Android signing values:

```bash
export ANDROID_KEYSTORE_PATH=/absolute/path/to/upload-keystore.jks
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=upload
export ANDROID_KEY_PASSWORD=...
```

Optional Android version overrides are `ANDROID_VERSION_CODE` and `ANDROID_VERSION_NAME`. Build the Play Store bundle with:

```bash
npm run native:build:android:release
```

The release AAB is generated at `android/app/build/outputs/bundle/release/app-release.aab`. For local release APK checks, run `npm run native:build:android:release:apk`; the APK is generated at `android/app/build/outputs/apk/release/app-release.apk`.

iOS builds require full Xcode selected with `xcode-select`, not only the Command Line Tools. iOS production archives also require Apple Developer signing configured in Xcode or available to `xcodebuild`.

Required iOS signing value:

```bash
export IOS_DEVELOPMENT_TEAM=YOUR_TEAM_ID
```

Optional iOS overrides are `IOS_MARKETING_VERSION`, `IOS_BUILD_NUMBER`, and `IOS_EXPORT_OPTIONS_PLIST`. The committed `ios/ExportOptions.plist` defaults to App Store Connect export with automatic signing. Build and export the release IPA with:

```bash
npm run native:build:ios:release
```

The iOS archive is generated at `ios/App/build/App.xcarchive`, and the exported IPA appears under `ios/App/output/`.

Do not commit Android keystores, `android/keystore.properties`, iOS provisioning profiles, certificates, `.p12`, `.p8`, or other signing credentials.

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

The app avoids `dangerouslySetInnerHTML`, does not eval code, and does not store secrets or auth tokens client-side.

## Observability and resilience

- `logger.ts` reduces noise in production
- `ErrorBoundary.tsx` prevents blank-screen failures
- global error listeners capture uncaught errors and rejections
- analytics and error reporting are vendor-neutral HTTP adapters, disabled by default, and non-blocking when configured
- telemetry endpoints may be same-origin paths or HTTPS URLs; update `connect-src` if using an external telemetry host
- clipboard sharing falls back safely when the Clipboard API is unavailable
- localStorage write failures degrade safely without crashing the app

## Performance note

The dependency set is intentionally small. The web runtime dependencies are React and React DOM, with Capacitor dependencies providing the native Android/iOS shell. All other tooling is build/test-only. The production bundle stays small because there is no UI kit, no state library, and no backend SDK.

## Privacy note

Gameplay state stays on-device in localStorage. Login state is stored only in an HttpOnly server-issued cookie. Optional analytics and error reporting are off by default and send only app event/error metadata when explicitly configured.

## Troubleshooting

- Puzzle changed unexpectedly: confirm the deployed build uses the intended `VITE_PUZZLE_EPOCH`
- Progress disappeared: inspect localStorage availability, schema version, and answer set version changes
- Share button failed: verify clipboard permissions or fallback support in the target browser
- Keyboard input broken: verify there is no modal open and inspect custom host scripts that may intercept keydown events
- Dark mode mismatch: confirm persisted settings and theme dataset values on `document.documentElement`

## Version metadata

The settings dialog shows `package.json` version plus `VITE_BUILD_ID` (or CI/deployment commit metadata when available). This is intended for operational debugging and user issue reports.
