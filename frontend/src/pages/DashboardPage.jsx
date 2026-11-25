import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApiQuery } from '../hooks/useApiQuery';
import { taskApi } from '../services/taskApi';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import NoTasksEmptyState from '../components/NoTasksEmptyState';
import ErrorAlert from '../components/ErrorAlert';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { formatDueDate } from '../utils/tasks';

const RECENT_PARAMS = { page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' };

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = useApiQuery('stats', (signal) => taskApi.getStats({ signal }));
  const recent = useApiQuery('recent', (signal) => taskApi.getTasks(RECENT_PARAMS, { signal }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Hi {user.name}, here is where things stand.</p>
        </div>
        <Link to="/tasks/new" className="btn btn--primary">
          New task
        </Link>
      </div>

      {stats.error ? (
        <ErrorAlert
          error={stats.error}
          fallback="Could not load statistics."
          onRetry={stats.reload}
        />
      ) : !stats.data ? (
        <LoadingState label="Loading statistics…" />
      ) : (
        <section className="stats" aria-label="Task statistics">
          <StatCard label="Total tasks" value={stats.data.total} to="/tasks" />
          <StatCard label="Todo" value={stats.data.todo} to="/tasks?status=TODO" tone="todo" />
          <StatCard
            label="In progress"
            value={stats.data.inProgress}
            to="/tasks?status=IN_PROGRESS"
            tone="progress"
          />
          <StatCard
            label="Completed"
            value={stats.data.completed}
            to="/tasks?status=COMPLETED"
            tone="done"
          />
          <StatCard
            label="High priority"
            value={stats.data.highPriority}
            to="/tasks?priority=HIGH"
            tone="high"
          />
        </section>
      )}

      <section className="card">
        <div className="card__header">
          <h2>Recent tasks</h2>
          <Link to="/tasks">View all</Link>
        </div>

        {recent.error ? (
          <ErrorAlert
            error={recent.error}
            fallback="Could not load recent tasks."
            onRetry={recent.reload}
          />
        ) : !recent.data ? (
          <LoadingState label="Loading recent tasks…" />
        ) : recent.data.data.length === 0 ? (
          <NoTasksEmptyState />
        ) : (
          <ul className="recent-list">
            {recent.data.data.map((task) => (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`} className="recent-list__title">
                  {task.title}
                </Link>
                <span className="recent-list__meta">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  <span className="muted">{formatDueDate(task.dueDate)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
