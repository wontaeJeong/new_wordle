type AnalyticsProvider = 'none' | 'http';

interface RawEnv {
  readonly MODE: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_PUZZLE_EPOCH?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_ERROR_REPORTING?: string;
  readonly VITE_ANALYTICS_ENDPOINT?: string;
  readonly VITE_ERROR_REPORTING_ENDPOINT?: string;
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
    analyticsEndpoint: string | null;
    errorReportingEndpoint: string | null;
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

function parseOptionalEndpoint(value: string | undefined, label: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const url = new URL(trimmed, window.location.origin);
  if (url.protocol !== 'https:' && url.origin !== window.location.origin) {
    throw new Error(`${label} must be an HTTPS URL or same-origin path.`);
  }

  return url.href;
}

const env = import.meta.env as unknown as RawEnv;
const analyticsEndpoint = parseOptionalEndpoint(env.VITE_ANALYTICS_ENDPOINT, 'VITE_ANALYTICS_ENDPOINT');
const errorReportingEndpoint = parseOptionalEndpoint(env.VITE_ERROR_REPORTING_ENDPOINT, 'VITE_ERROR_REPORTING_ENDPOINT');
const analyticsEnabled = parseBoolean(env.VITE_ENABLE_ANALYTICS, false);
const errorReportingEnabled = parseBoolean(env.VITE_ENABLE_ERROR_REPORTING, false);

if (analyticsEnabled && analyticsEndpoint === null) {
  throw new Error('VITE_ANALYTICS_ENDPOINT is required when VITE_ENABLE_ANALYTICS is true.');
}

if (errorReportingEnabled && errorReportingEndpoint === null) {
  throw new Error('VITE_ERROR_REPORTING_ENDPOINT is required when VITE_ENABLE_ERROR_REPORTING is true.');
}

export const appConfig: AppConfig = {
  mode: env.MODE,
  isProduction: env.PROD,
  appTitle: env.VITE_APP_TITLE?.trim() || 'Daily Lexicon',
  puzzleEpoch: parsePuzzleEpoch(env.VITE_PUZZLE_EPOCH),
  buildId: env.VITE_BUILD_ID?.trim() || __BUILD_ID__,
  version: __APP_VERSION__,
  telemetry: {
    analyticsEnabled,
    errorReportingEnabled,
    analyticsProvider: analyticsEnabled ? 'http' : 'none',
    analyticsEndpoint,
    errorReportingEndpoint,
  },
};
