export const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value;
export const statusLabel = (value) => labelOf(STATUS_OPTIONS, value);
export const priorityLabel = (value) => labelOf(PRIORITY_OPTIONS, value);

/** UI sort choices mapped to the backend's sortBy/sortOrder parameters. */
export const SORT_OPTIONS = {
  newest: { label: 'Newest', sortBy: 'createdAt', sortOrder: 'desc' },
  oldest: { label: 'Oldest', sortBy: 'createdAt', sortOrder: 'asc' },
  priority: { label: 'Priority', sortBy: 'priority', sortOrder: 'desc' },
  dueDate: { label: 'Due date', sortBy: 'dueDate', sortOrder: 'asc' },
};
export const DEFAULT_SORT = 'newest';

/** Due dates are calendar dates (stored as UTC midnight) - format them in UTC. */
export function formatDueDate(value) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Timestamps (createdAt/updatedAt) are shown in the viewer's local time. */
export function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function isOverdue(task) {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  // Compare calendar dates in the viewer's local time zone.
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return task.dueDate.slice(0, 10) < today;
}

/** "2026-12-01T00:00:00.000Z" -> "2026-12-01" for <input type="date">. */
export const toDateInputValue = (value) => (value ? value.slice(0, 10) : '');
