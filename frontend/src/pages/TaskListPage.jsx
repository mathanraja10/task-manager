import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApiQuery } from '../hooks/useApiQuery';
import { useNotice } from '../hooks/useNotice';
import { taskApi } from '../services/taskApi';
import TaskFilters from '../components/TaskFilters';
import TaskCard from '../components/TaskCard';
import Pagination from '../components/Pagination';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import NoTasksEmptyState from '../components/NoTasksEmptyState';
import ErrorAlert from '../components/ErrorAlert';
import NoticeAlert from '../components/NoticeAlert';
import { DEFAULT_SORT, SORT_OPTIONS } from '../utils/tasks';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

/** Filters live in the URL (?status=TODO&page=2...) so they survive reloads and can be shared. */
function readFilters(searchParams) {
  const sort = searchParams.get('sort');
  return {
    page: Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1),
    status: searchParams.get('status') ?? '',
    priority: searchParams.get('priority') ?? '',
    search: searchParams.get('search') ?? '',
    sort: SORT_OPTIONS[sort] ? sort : DEFAULT_SORT,
  };
}

const isDefault = (key, value) =>
  value === '' ||
  value == null ||
  (key === 'page' && value === 1) ||
  (key === 'sort' && value === DEFAULT_SORT);

export default function TaskListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const [searchInput, setSearchInput] = useState(filters.search);
  const { notice, showSuccess, showError, dismiss } = useNotice();
  const searchTimer = useRef(null);

  // Keep the search box in step with the URL when it changes from outside the
  // input (browser back/forward, a link). Adjusting state during render avoids
  // a flash of the old value.
  const [urlSearch, setUrlSearch] = useState(filters.search);
  if (filters.search !== urlSearch) {
    setUrlSearch(filters.search);
    if (filters.search !== searchInput.trim()) setSearchInput(filters.search);
  }

  const updateFilters = useCallback(
    (changes, { replace = false } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (isDefault(key, value)) next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function handleFilterChange(name, value) {
    if (name === 'search') {
      // Update the input immediately, but only query the API once typing pauses.
      setSearchInput(value);
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(
        () => updateFilters({ search: value.trim(), page: 1 }, { replace: true }),
        SEARCH_DEBOUNCE_MS,
      );
      return;
    }
    updateFilters({ [name]: value, page: 1 });
  }

  function clearFilters() {
    clearTimeout(searchTimer.current);
    setSearchInput('');
    setSearchParams({});
  }

  const { sortBy, sortOrder } = SORT_OPTIONS[filters.sort];
  const params = {
    page: filters.page,
    limit: PAGE_SIZE,
    status: filters.status,
    priority: filters.priority,
    search: filters.search,
    sortBy,
    sortOrder,
  };
  const { data, loading, error, reload, setData } = useApiQuery(JSON.stringify(params), (signal) =>
    taskApi.getTasks(params, { signal }),
  );

  // If the current page no longer exists (e.g. last task on the last page was deleted), step back.
  const totalPages = data?.pagination.totalPages ?? 0;
  useEffect(() => {
    if (!loading && totalPages > 0 && filters.page > totalPages) {
      updateFilters({ page: totalPages }, { replace: true });
    }
  }, [loading, totalPages, filters.page, updateFilters]);

  const handleUpdated = (updated) => {
    setData((prev) => ({
      ...prev,
      data: prev.data.map((t) => (t.id === updated.id ? updated : t)),
    }));
    showSuccess(`Status of "${updated.title}" updated.`);
    reload(); // the task may no longer match the active filter/sort
  };
  const handleDeleted = (task) => {
    showSuccess(`"${task.title}" was deleted.`);
    reload();
  };

  const hasFilters = Boolean(filters.status || filters.priority || filters.search);
  const tasks = data?.data ?? [];
  const firstItem = (filters.page - 1) * PAGE_SIZE + 1;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          {data && (
            <p className="muted">
              {data.pagination.total} task{data.pagination.total === 1 ? '' : 's'}
              {hasFilters && ' matching your filters'}
            </p>
          )}
        </div>
        <Link to="/tasks/new" className="btn btn--primary">
          New task
        </Link>
      </div>

      <TaskFilters values={{ ...filters, search: searchInput }} onChange={handleFilterChange} />

      <NoticeAlert notice={notice} onDismiss={dismiss} />

      {error ? (
        <ErrorAlert error={error} fallback="Could not load tasks." onRetry={reload} />
      ) : !data ? (
        <LoadingState label="Loading tasks…" />
      ) : tasks.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No tasks match your filters."
            message="Try a different search or clear the filters."
            action={
              <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <NoTasksEmptyState />
        )
      ) : (
        <div className={loading ? 'task-list is-refreshing' : 'task-list'} aria-busy={loading}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onError={showError}
            />
          ))}
          <div className="list-footer">
            <span className="muted">
              Showing {firstItem}–{firstItem + tasks.length - 1} of {data.pagination.total}
            </span>
            <Pagination
              page={filters.page}
              totalPages={totalPages}
              onPageChange={(page) => updateFilters({ page })}
              disabled={loading}
            />
          </div>
        </div>
      )}
    </>
  );
}
