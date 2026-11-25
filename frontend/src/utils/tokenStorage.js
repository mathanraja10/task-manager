const KEY = 'task-manager.token';

// localStorage can throw (private mode, blocked storage); fail soft.
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      /* token then lives only in memory for this session */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
  },
};
