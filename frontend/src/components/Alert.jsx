/** Inline message. type: 'error' | 'success' | 'info'. */
export default function Alert({ type = 'error', children, onDismiss, action }) {
  return (
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span className="alert__text">{children}</span>
      {action}
      {onDismiss && (
        <button type="button" className="alert__close" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
