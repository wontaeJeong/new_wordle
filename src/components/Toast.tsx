interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {message ? (
        <output className="toast">
          {message}
        </output>
      ) : null}
    </div>
  );
}
