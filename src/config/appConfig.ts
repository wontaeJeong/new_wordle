type AnalyticsProvider = 'none';

interface RawEnv {
  readonly MODE: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_PUZZLE_EPOCH?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_ERROR_REPORTING?: string;
  readonly VITE_FEATURE_PRACTICE_MODE?: string;
  readonly VITE_BUILD_ID?: string;
}

export interface AppConfig {
  mode: string;
  isProduction: boolean;
  appTitle: string;
  puzzleEpoch: string;
  buildId: string;
  version: string;
  telemetry: {
    analyticsEnabled: boolean;
    errorReportingEnabled: boolean;
    analyticsProvider: AnalyticsProvider;
  };
}

declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`Invalid boolean env value: ${value}`);
}

function parsePuzzleEpoch(value: string | undefined): string {
  const resolved = value ?? '2024-01-01';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
    throw new Error('VITE_PUZZLE_EPOCH must use YYYY-MM-DD format.');
  }

  return resolved;
}

const env = import.meta.env as unknown as RawEnv;

export const appConfig: AppConfig = {
  mode: env.MODE,
  isProduction: env.PROD,
  appTitle: env.VITE_APP_TITLE?.trim() || 'Daily Lexicon',
  puzzleEpoch: parsePuzzleEpoch(env.VITE_PUZZLE_EPOCH),
  buildId: env.VITE_BUILD_ID?.trim() || __BUILD_ID__,
  version: __APP_VERSION__,
  telemetry: {
    analyticsEnabled: parseBoolean(env.VITE_ENABLE_ANALYTICS, false),
    errorReportingEnabled: parseBoolean(env.VITE_ENABLE_ERROR_REPORTING, false),
    analyticsProvider: 'none',
  },
};
