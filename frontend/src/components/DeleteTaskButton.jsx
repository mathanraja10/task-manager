import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { taskApi } from '../services/taskApi';
import { getErrorMessage } from '../utils/errors';

/** Delete button that asks for confirmation before deleting the task. */
export default function DeleteTaskButton({
  task,
  onDeleted,
  onError,
  className = 'btn btn--danger-ghost',
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await taskApi.deleteTask(task.id);
      setConfirming(false);
      onDeleted(task);
    } catch (error) {
      setConfirming(false);
      onError?.(getErrorMessage(error, 'Could not delete the task.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setConfirming(true)}>
        Delete
      </button>
      <ConfirmDialog
        open={confirming}
        title="Delete task"
        message={`Are you sure you want to delete this task? "${task.title}" will be permanently removed.`}
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
