import { useNavigate } from 'react-router-dom';
import TaskForm from '../components/TaskForm';
import { taskApi } from '../services/taskApi';

export default function TaskCreatePage() {
  const navigate = useNavigate();

  async function handleSubmit(payload) {
    const task = await taskApi.createTask(payload);
    navigate(`/tasks/${task.id}`, { state: { flash: 'Task created.' } });
  }

  return (
    <>
      <div className="page-header">
        <h1>New task</h1>
      </div>
      <TaskForm mode="create" onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
    </>
  );
}
