# Task Manager — Frontend

React 19 + Vite single-page app for the Task Manager API.
The project overview is in the [root README](../README.md).

## Quick start

```bash
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:5000/api
npm run dev              # http://localhost:5173 (the backend must be running)
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` / `npm run format` | ESLint / Prettier |

## Pages

| Route | Page | Access |
|-------|------|--------|
| `/login`, `/register` | `LoginPage`, `RegisterPage` | Signed-out users only (`PublicOnlyRoute`) |
| `/dashboard` | `DashboardPage`: counts by status, high priority, recent tasks | Signed in (`ProtectedRoute`) |
| `/tasks` | `TaskListPage`: search, filters, sort, pagination | Signed in |
| `/tasks/new` | `TaskCreatePage` | Signed in |
| `/tasks/:id` | `TaskDetailPage`: status change, edit, delete | Signed in |
| `/tasks/:id/edit` | `TaskEditPage` | Signed in |

## How the code is organised

| Folder | Contents |
|--------|----------|
| `services/` | `api.js` is the single Axios instance (base URL from `VITE_API_URL`, adds the token, signs out on 401). `authApi.js` and `taskApi.js` hold every API call; components never import Axios. |
| `context/` | `AuthProvider` exposes `user`, `token`, `isAuthenticated`, `loading`, `login`, `register`, `logout`. It restores the session with `/auth/me` on load. |
| `hooks/` | `useAuth()`. `useApiQuery(key, fetcher)` loads data, aborts stale requests and returns `loading`/`error`/`reload`/`setData`. `useTask(id)` loads one task, hides the previous task while another loads, and reports `notFound`. `useForm(initial)` holds values, field errors and submit state, and its `fieldProps(name)` wires up value, onChange and a11y attributes. `useNotice()` manages the in-page success/error banner. |
| `components/` | Task UI: `TaskCard`, `TaskForm`, `TaskFilters`, `Pagination`, `StatusSelect`, `DeleteTaskButton` + `ConfirmDialog`, `TaskLoadState` (not found / error / loading for single-task pages). Shared UI: `FormField`, `OptionList`, `Alert`, `ErrorAlert` (with Retry), `NoticeAlert`, `LoadingState`, `EmptyState`, `NoTasksEmptyState`, badges, route guards. |
| `layouts/` | `AppLayout` (top bar, success flash messages), `AuthLayout` |
| `utils/` | Task labels, sort options and date formatting (`tasks.js`), error parsing, client validation, token storage |

## Conventions

- **The backend does the filtering.** Search, filters, sort and page are kept in the URL
  query string and sent to `GET /api/tasks` as-is. The app never downloads every task.
- **Success messages** pass between pages as navigation state:
  `navigate(path, { state: { flash: 'Task created.' } })`. `AppLayout` shows them.
- **Validation** runs in the browser for instant feedback (`utils/validation.js` mirrors
  the backend rules), and server field errors are shown next to the matching inputs.
- **Due dates** are calendar dates and are formatted in UTC, so they never shift by a day.
