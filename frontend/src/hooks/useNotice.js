import { useCallback, useState } from 'react';

/**
 * A dismissable in-page message (e.g. "Status updated." or an error from an
 * inline action). Render it with <NoticeAlert notice={notice} onDismiss={dismiss} />.
 */
export function useNotice() {
  const [notice, setNotice] = useState(null);

  const showSuccess = useCallback((text) => setNotice({ type: 'success', text }), []);
  const showError = useCallback((text) => setNotice({ type: 'error', text }), []);
  const dismiss = useCallback(() => setNotice(null), []);

  return { notice, showSuccess, showError, dismiss };
}
