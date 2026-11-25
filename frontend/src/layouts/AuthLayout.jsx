import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <main className="auth">
      <div className="auth__panel">
        <p className="brand brand--center">
          <span className="brand__mark" aria-hidden="true">
            ✓
          </span>
          Task Manager
        </p>
        <Outlet />
      </div>
    </main>
  );
}
