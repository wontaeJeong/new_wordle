import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import type { LoginCredentials } from '../auth/api';

interface LoginPanelProps {
  sessionError: string | null;
  loginError: string | null;
  isPending: boolean;
  onLogin: (credentials: LoginCredentials) => Promise<boolean>;
  onRetrySession: () => Promise<void>;
}

export function LoginPanel({ sessionError, loginError, isPending, onLogin, onRetrySession }: LoginPanelProps) {
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setLocalError('Enter your username and password.');
      return;
    }

    setLocalError(null);
    const signedIn = await onLogin({ username: trimmedUsername, password });
    if (signedIn) {
      setPassword('');
    }
  };

  const visibleError = localError ?? loginError;

  return (
    <main className="app-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-copy">
          <p className="auth-eyebrow">Secure access</p>
          <h1 id="login-title">Sign in to Daily Lexicon</h1>
          <p>Use your account credentials to unlock the daily puzzle.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field" htmlFor={usernameId}>
            <span>Username</span>
            <input
              id={usernameId}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isPending}
              required
            />
          </label>

          <label className="auth-field" htmlFor={passwordId}>
            <span>Password</span>
            <input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              required
            />
          </label>

          {visibleError ? <p className="auth-error" role="alert">{visibleError}</p> : null}

          <button type="submit" className="primary-button" disabled={isPending}>
            {isPending ? 'Signing in' : 'Sign in'}
          </button>
        </form>

        {sessionError ? (
          <p className="auth-helper">
            {sessionError}{' '}
            <button type="button" className="link-button" onClick={() => void onRetrySession()}>
              Retry
            </button>
          </p>
        ) : null}
      </section>
    </main>
  );
}
