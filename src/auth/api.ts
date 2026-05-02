export interface AuthUser {
  username: string;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export class AuthRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

const AUTH_ENDPOINTS = {
  session: '/api/auth/session',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }

  return typeof value.user.username === 'string' && typeof value.expiresAt === 'string';
}

async function readResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getResponseMessage(body: unknown, fallback: string): string {
  if (isRecord(body) && typeof body.message === 'string') {
    return body.message;
  }

  return fallback;
}

async function parseAuthSession(response: Response): Promise<AuthSession> {
  const body = await readResponseJson(response);
  if (!response.ok) {
    throw new AuthRequestError(getResponseMessage(body, 'Authentication request failed.'), response.status);
  }

  if (!isAuthSession(body)) {
    throw new AuthRequestError('Authentication service returned an invalid response.', response.status);
  }

  return body;
}

export async function getSession(): Promise<AuthSession | null> {
  const response = await fetch(AUTH_ENDPOINTS.session, {
    method: 'GET',
    headers: { accept: 'application/json' },
    credentials: 'include',
    cache: 'no-store',
  });

  if (response.status === 401) {
    return null;
  }

  return parseAuthSession(response);
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const response = await fetch(AUTH_ENDPOINTS.login, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  return parseAuthSession(response);
}

export async function logout(): Promise<void> {
  const response = await fetch(AUTH_ENDPOINTS.logout, {
    method: 'POST',
    headers: { accept: 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await readResponseJson(response);
    throw new AuthRequestError(getResponseMessage(body, 'Sign out failed.'), response.status);
  }
}
