import { useNavigate, useParams } from 'react-router-dom';
import { useTask } from '../hooks/useTask';
import { taskApi } from '../services/taskApi';
import TaskForm from '../components/TaskForm';
import TaskLoadState from '../components/TaskLoadState';

export default function TaskEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { task, notFound, error, reload } = useTask(id);

  async function handleSubmit(payload) {
    await taskApi.updateTask(id, payload);
    navigate(`/tasks/${id}`, { state: { flash: 'Task updated.' } });
  }

  if (!task) return <TaskLoadState notFound={notFound} error={error} onRetry={reload} />;

  return (
    <>
      <div className="page-header">
        <h1>Edit task</h1>
      </div>
      <TaskForm
        key={task.id}
        mode="edit"
        initialTask={task}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/tasks/${id}`)}
      />
    </>
  );
}
