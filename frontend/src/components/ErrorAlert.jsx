import Alert from './Alert';
import { getErrorMessage } from '../utils/errors';

/** Error message for a failed request, with an optional Retry button. */
export default function ErrorAlert({ error, fallback, onRetry }) {
  return (
    <Alert
      type="error"
      action={
        onRetry && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            Retry
          </button>
        )
      }
    >
      {getErrorMessage(error, fallback)}
    </Alert>
  );
}
