import { Link } from 'react-router-dom';
import EmptyState from './EmptyState';

/** Shown when the user has no tasks at all. */
export default function NoTasksEmptyState() {
  return (
    <EmptyState
      title="No tasks found."
      message="Create your first task."
      action={
        <Link to="/tasks/new" className="btn btn--primary">
          Create task
        </Link>
      }
    />
  );
}
