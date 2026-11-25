import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Loads data for a component and re-fetches whenever `key` changes.
 *
 *   const { data, loading, error, reload, setData } =
 *     useApiQuery(`task:${id}`, (signal) => taskApi.getTask(id, { signal }));
 *
 * - The previous request is aborted when the key changes or the component
 *   unmounts, so a slow old response can never overwrite a newer one.
 * - While a new key loads, the previous data stays available (no flicker
 *   when paging), and `loading` is true.
 */
export function useApiQuery(key, fetcher) {
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${key}#${reloadCount}`;
  const [result, setResult] = useState({ requestKey: null, data: undefined, error: null });

  // Always call the latest fetcher without making it an effect dependency.
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    const controller = new AbortController();
    fetcherRef.current(controller.signal).then(
      (data) => setResult({ requestKey, data, error: null }),
      (error) => {
        if (!controller.signal.aborted) setResult({ requestKey, data: undefined, error });
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);
  const setData = useCallback(
    (updater) =>
      setResult((prev) => ({
        ...prev,
        data: typeof updater === 'function' ? updater(prev.data) : updater,
      })),
    [],
  );

  const settled = result.requestKey === requestKey;
  return {
    data: result.data,
    loading: !settled,
    error: settled ? result.error : null,
    reload,
    setData,
  };
}
