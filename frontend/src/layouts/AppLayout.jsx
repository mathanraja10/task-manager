import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Alert from '../components/Alert';

/**
 * Shell for signed-in pages. Pages pass one-off success messages through
 * navigation state: navigate(path, { state: { flash: 'Task created' } }).
 */
export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissedKey, setDismissedKey] = useState(null);

  const flash = location.state?.flash;
  const showFlash = flash && dismissedKey !== location.key;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/dashboard" className="brand">
            <span className="brand__mark" aria-hidden="true">
              ✓
            </span>
            Task Manager
          </Link>
          <nav className="topbar__nav" aria-label="Main">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/tasks" end>
              Tasks
            </NavLink>
            <NavLink to="/tasks/new">New task</NavLink>
          </nav>
          <div className="topbar__user">
            <span className="muted" title={user.email}>
              {user.name}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        {showFlash && (
          <Alert type="success" onDismiss={() => setDismissedKey(location.key)}>
            {flash}
          </Alert>
        )}
        <Outlet />
      </main>
    </div>
  );
}
