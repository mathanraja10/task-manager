import { createContext } from 'react';

/** { user, token, isAuthenticated, loading, login, register, logout } - see AuthProvider. */
export const AuthContext = createContext(null);
