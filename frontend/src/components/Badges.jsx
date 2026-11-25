import { priorityLabel, statusLabel } from '../utils/tasks';

export function StatusBadge({ status }) {
  return (
    <span className={`badge badge--status-${status.toLowerCase()}`}>{statusLabel(status)}</span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge badge--priority-${priority.toLowerCase()}`}>
      {priorityLabel(priority)} priority
    </span>
  );
}
