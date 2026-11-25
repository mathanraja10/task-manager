import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTask } from '../hooks/useTask';
import { useNotice } from '../hooks/useNotice';
import TaskLoadState from '../components/TaskLoadState';
import NoticeAlert from '../components/NoticeAlert';
import StatusSelect from '../components/StatusSelect';
import DeleteTaskButton from '../components/DeleteTaskButton';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { formatDateTime, formatDueDate, isOverdue } from '../utils/tasks';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notice, showSuccess, showError, dismiss } = useNotice();
  const { task, notFound, error, reload, setTask } = useTask(id);

  if (!task) return <TaskLoadState notFound={notFound} error={error} onRetry={reload} />;

  const overdue = isOverdue(task);

  return (
    <>
      <p className="breadcrumb">
        <Link to="/tasks">← All tasks</Link>
      </p>

      <NoticeAlert notice={notice} onDismiss={dismiss} />

      <article className="card task-detail">
        <div className="task-detail__header">
          <div className="task-card__badges">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <h1>{task.title}</h1>
        </div>

        {task.description ? (
          <p className="task-detail__description">{task.description}</p>
        ) : (
          <p className="muted">No description.</p>
        )}

        <dl className="details">
          <div className={overdue ? 'is-overdue' : undefined}>
            <dt>Due date</dt>
            <dd>
              {formatDueDate(task.dueDate)}
              {overdue && ' · Overdue'}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(task.createdAt)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDateTime(task.updatedAt)}</dd>
          </div>
        </dl>

        <div className="task-detail__actions">
          <label className="inline-field">
            <span>Status</span>
            <StatusSelect
              task={task}
              onUpdated={(updated) => {
                setTask(updated);
                showSuccess('Status updated.');
              }}
              onError={showError}
            />
          </label>
          <div className="task-card__buttons">
            <Link to={`/tasks/${task.id}/edit`} className="btn btn--ghost">
              Edit
            </Link>
            <DeleteTaskButton
              task={task}
              onDeleted={() =>
                navigate('/tasks', { state: { flash: `"${task.title}" was deleted.` } })
              }
              onError={showError}
            />
          </div>
        </div>
      </article>
    </>
  );
}
