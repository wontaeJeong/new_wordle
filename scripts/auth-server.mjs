#!/usr/bin/env node
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePasswordHash, verifyPassword } from './auth-crypto.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, '..');
const distDir = path.join(rootDir, 'dist');
const MAX_BODY_BYTES = 4096;
const SESSION_TTL_SECONDS = Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 60 * 60 * 8);
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'X-Frame-Options': 'DENY',
};

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isPathInsideDist(candidate) {
  const relative = path.relative(distDir, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function readConfig() {
  const username = process.env.AUTH_USERNAME?.trim();
  const passwordHash = process.env.AUTH_PASSWORD_HASH?.trim();
  const sessionSecret = process.env.SESSION_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookies = parseBoolean(process.env.AUTH_SECURE_COOKIES, isProduction);
  const trustProxy = parseBoolean(process.env.AUTH_TRUST_PROXY, false);

  if (!username) {
    throw new Error('AUTH_USERNAME is required.');
  }

  if (!passwordHash) {
    throw new Error('AUTH_PASSWORD_HASH is required. Generate one with npm run auth:hash.');
  }

  parsePasswordHash(passwordHash);

  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  }

  if (!Number.isFinite(SESSION_TTL_SECONDS) || SESSION_TTL_SECONDS < 300) {
    throw new Error('AUTH_SESSION_TTL_SECONDS must be at least 300 seconds.');
  }

  return {
    username,
    passwordHash,
    sessionSecret,
    secureCookies,
    trustProxy,
    cookieName: secureCookies ? '__Host-daily_lexicon_session' : 'daily_lexicon_session',
  };
}

const config = readConfig();
const sessions = new Map();
const failedAttempts = new Map();

function sign(value) {
  return createHmac('sha256', config.sessionSecret).update(value).digest('base64url');
}

function safeStringEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.byteLength !== rightBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createSession() {
  const id = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  sessions.set(id, { username: config.username, expiresAt });

  const payload = `${id}.${expiresAt}`;
  return {
    cookieValue: `${payload}.${sign(payload)}`,
    expiresAt,
  };
}

function getSessionFromCookie(cookieValue) {
  if (!cookieValue) {
    return null;
  }

  const [id, rawExpiresAt, signature] = cookieValue.split('.');
  const expiresAt = Number(rawExpiresAt);

  if (!id || !Number.isFinite(expiresAt) || !signature) {
    return null;
  }

  const payload = `${id}.${rawExpiresAt}`;
  if (!safeStringEqual(sign(payload), signature)) {
    return null;
  }

  const session = sessions.get(id);
  if (!session || session.expiresAt !== expiresAt) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }

  return { id, ...session };
}

function parseCookies(header) {
  const cookies = new Map();
  if (!header) {
    return cookies;
  }

  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const decodedValue = safeDecodeURIComponent(pair.slice(separator + 1).trim());
    if (decodedValue !== null) {
      cookies.set(pair.slice(0, separator).trim(), decodedValue);
    }
  }

  return cookies;
}

function buildCookie(value, maxAge) {
  const attributes = [
    `${config.cookieName}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
  ];

  if (config.secureCookies) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

function clearCookie() {
  return buildCookie('', 0);
}

function writeJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    ...securityHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function writeError(response, statusCode, message) {
  writeJson(response, statusCode, { message });
}

async function readJsonBody(request) {
  let rawBody = '';

  for await (const chunk of request) {
    rawBody += chunk;
    if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
      throw new Error('Request body is too large.');
    }
  }

  return JSON.parse(rawBody || '{}');
}

function getClientAddress(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (config.trustProxy && typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.socket.remoteAddress ?? 'unknown';
}

function getAttemptKey(request, username) {
  return `${getClientAddress(request)}:${username.toLowerCase()}`;
}

function isRateLimited(key) {
  const current = failedAttempts.get(key);
  if (!current) {
    return false;
  }

  if (Date.now() - current.firstAttemptAt > LOGIN_WINDOW_MS) {
    failedAttempts.delete(key);
    return false;
  }

  return current.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(key) {
  const current = failedAttempts.get(key);
  if (!current || Date.now() - current.firstAttemptAt > LOGIN_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstAttemptAt: Date.now() });
    return;
  }

  failedAttempts.set(key, { ...current, count: current.count + 1 });
}

function sessionResponse(session) {
  return {
    user: { username: session.username },
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

async function handleSession(request, response) {
  if (request.method !== 'GET') {
    writeError(response, 405, 'Method not allowed.');
    return;
  }

  const cookieValue = parseCookies(request.headers.cookie).get(config.cookieName);
  const session = getSessionFromCookie(cookieValue);
  if (!session) {
    writeError(response, 401, 'Authentication required.');
    return;
  }

  writeJson(response, 200, sessionResponse(session));
}

async function handleLogin(request, response) {
  if (request.method !== 'POST') {
    writeError(response, 405, 'Method not allowed.');
    return;
  }

  try {
    const body = await readJsonBody(request);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const attemptKey = getAttemptKey(request, username || 'anonymous');

    if (isRateLimited(attemptKey)) {
      writeError(response, 429, 'Too many failed login attempts. Try again later.');
      return;
    }

    const usernameMatches = safeStringEqual(username.toLowerCase(), config.username.toLowerCase());
    const passwordMatches = password ? verifyPassword(password, config.passwordHash) : false;

    if (!usernameMatches || !passwordMatches) {
      recordFailedAttempt(attemptKey);
      writeError(response, 401, 'Invalid username or password.');
      return;
    }

    failedAttempts.delete(attemptKey);
    const session = createSession();
    writeJson(response, 200, sessionResponse({ username: config.username, expiresAt: session.expiresAt }), {
      'Set-Cookie': buildCookie(session.cookieValue, SESSION_TTL_SECONDS),
    });
  } catch {
    writeError(response, 400, 'Invalid login request.');
  }
}

async function handleLogout(request, response) {
  if (request.method !== 'POST') {
    writeError(response, 405, 'Method not allowed.');
    return;
  }

  const cookieValue = parseCookies(request.headers.cookie).get(config.cookieName);
  const session = getSessionFromCookie(cookieValue);
  if (session) {
    sessions.delete(session.id);
  }

  writeJson(response, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
}

async function handleApi(request, response, pathname) {
  if (pathname === '/api/auth/session') {
    await handleSession(request, response);
    return true;
  }

  if (pathname === '/api/auth/login') {
    await handleLogin(request, response);
    return true;
  }

  if (pathname === '/api/auth/logout') {
    await handleLogout(request, response);
    return true;
  }

  return false;
}

async function resolveStaticFile(pathname) {
  const decodedPath = safeDecodeURIComponent(pathname);
  if (decodedPath === null) {
    throw new HttpError(400, 'Malformed request path.');
  }

  const normalizedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const candidate = path.resolve(distDir, `.${normalizedPath}`);

  if (!isPathInsideDist(candidate)) {
    return null;
  }

  try {
    const metadata = await stat(candidate);
    if (metadata.isFile()) {
      return candidate;
    }
  } catch {
    return path.join(distDir, 'index.html');
  }

  return path.join(distDir, 'index.html');
}

async function serveStatic(request, response, pathname) {
  const filePath = await resolveStaticFile(pathname);
  if (!filePath) {
    writeError(response, 403, 'Forbidden.');
    return;
  }

  try {
    await readFile(filePath);
  } catch {
    writeError(response, 503, 'Build output not found. Run npm run build first.');
    return;
  }

  const extension = path.extname(filePath);
  const isImmutableAsset = pathname.startsWith('/assets/');
  response.writeHead(200, {
    ...securityHeaders,
    'Content-Type': contentTypes.get(extension) ?? 'application/octet-stream',
    'Cache-Control': isImmutableAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(request, response, url.pathname);
      if (!handled) {
        writeError(response, 404, 'Not found.');
      }
      return;
    }

    await serveStatic(request, response, url.pathname);
  } catch (error) {
    if (response.headersSent) {
      response.destroy();
      return;
    }

    if (error instanceof HttpError) {
      writeError(response, error.statusCode, error.message);
      return;
    }

    writeError(response, 500, 'Internal server error.');
  }
});

const port = Number(process.env.PORT ?? 4173);
server.listen(port, '0.0.0.0', () => {
  console.log(`Daily Lexicon auth server listening on http://127.0.0.1:${port}`);
});
