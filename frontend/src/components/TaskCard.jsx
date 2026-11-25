import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from './Badges';
import StatusSelect from './StatusSelect';
import DeleteTaskButton from './DeleteTaskButton';
import { formatDateTime, formatDueDate, isOverdue } from '../utils/tasks';

export default function TaskCard({ task, onUpdated, onDeleted, onError }) {
  const overdue = isOverdue(task);

  return (
    <article className={`task-card task-card--${task.status.toLowerCase()}`}>
      <div className="task-card__main">
        <div className="task-card__badges">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <h3 className="task-card__title">
          <Link to={`/tasks/${task.id}`}>{task.title}</Link>
        </h3>
        {task.description && <p className="task-card__description">{task.description}</p>}
        <dl className="task-card__meta">
          <div className={overdue ? 'is-overdue' : undefined}>
            <dt>Due</dt>
            <dd>
              {formatDueDate(task.dueDate)}
              {overdue && ' · Overdue'}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(task.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="task-card__actions">
        <StatusSelect task={task} onUpdated={onUpdated} onError={onError} />
        <div className="task-card__buttons">
          <Link className="btn btn--ghost btn--sm" to={`/tasks/${task.id}`}>
            View
          </Link>
          <Link className="btn btn--ghost btn--sm" to={`/tasks/${task.id}/edit`}>
            Edit
          </Link>
          <DeleteTaskButton
            task={task}
            onDeleted={onDeleted}
            onError={onError}
            className="btn btn--danger-ghost btn--sm"
          />
        </div>
      </div>
    </article>
  );
}
