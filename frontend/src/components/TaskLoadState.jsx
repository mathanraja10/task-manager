import { Link } from 'react-router-dom';
import EmptyState from './EmptyState';
import ErrorAlert from './ErrorAlert';
import LoadingState from './LoadingState';

/**
 * What a single-task page shows before its task is available:
 * not found, a load error with Retry, or a spinner. Pair with useTask():
 *
 *   const { task, notFound, error, reload } = useTask(id);
 *   if (!task) return <TaskLoadState notFound={notFound} error={error} onRetry={reload} />;
 */
export default function TaskLoadState({ notFound, error, onRetry }) {
  if (notFound) {
    return (
      <EmptyState
        title="Task not found."
        message="It may have been deleted, or it belongs to another account."
        action={
          <Link to="/tasks" className="btn btn--ghost">
            Back to tasks
          </Link>
        }
      />
    );
  }
  if (error)
    return <ErrorAlert error={error} fallback="Could not load the task." onRetry={onRetry} />;
  return <LoadingState label="Loading task…" />;
}
