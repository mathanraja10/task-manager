import { useApiQuery } from './useApiQuery';
import { taskApi } from '../services/taskApi';

/**
 * Loads one task for the detail and edit pages.
 *
 * `task` is undefined while loading. In particular, when the route moves from
 * /tasks/a to /tasks/b, task A is hidden at once, so buttons such as Delete can
 * never act on the previous task.
 */
export function useTask(id) {
  const query = useApiQuery(`task:${id}`, (signal) => taskApi.getTask(id, { signal }));
  const status = query.error?.response?.status;

  return {
    task: query.loading ? undefined : query.data,
    // The API answers 404 for missing tasks and other users' tasks; 400 for a malformed id.
    notFound: status === 404 || status === 400,
    error: query.error,
    reload: query.reload,
    setTask: query.setData,
  };
}
