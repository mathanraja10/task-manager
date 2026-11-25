import { useState } from 'react';
import { taskApi } from '../services/taskApi';
import OptionList from './OptionList';
import { STATUS_OPTIONS } from '../utils/tasks';
import { getErrorMessage } from '../utils/errors';

/** Inline status changer: PATCHes the task and reports the updated task (or an error). */
export default function StatusSelect({ task, onUpdated, onError }) {
  const [saving, setSaving] = useState(false);

  async function handleChange(event) {
    const status = event.target.value;
    setSaving(true);
    try {
      onUpdated(await taskApi.updateTask(task.id, { status }));
    } catch (error) {
      onError?.(getErrorMessage(error, 'Could not change the status.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      className="status-select"
      value={task.status}
      onChange={handleChange}
      disabled={saving}
      aria-label={`Status of ${task.title}`}
    >
      <OptionList options={STATUS_OPTIONS} />
    </select>
  );
}
