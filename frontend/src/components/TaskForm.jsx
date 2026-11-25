import FormField from './FormField';
import Alert from './Alert';
import OptionList from './OptionList';
import { useForm } from '../hooks/useForm';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, toDateInputValue } from '../utils/tasks';

const EMPTY_TASK = { title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '' };

function validate(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = 'Title is required';
  else if (values.title.trim().length > 200) errors.title = 'Title must be at most 200 characters';
  if (values.description.length > 5000) {
    errors.description = 'Description must be at most 5000 characters';
  }
  return errors;
}

const toFormValues = (task) => ({
  title: task.title,
  description: task.description ?? '',
  status: task.status,
  priority: task.priority,
  dueDate: toDateInputValue(task.dueDate),
});

/**
 * Create/edit form. In "edit" mode the status field is shown and cleared
 * optional fields are sent as null so the backend clears them.
 */
export default function TaskForm({ mode = 'create', initialTask, onSubmit, onCancel }) {
  const isEdit = mode === 'edit';
  const { errors, formError, submitting, handleSubmit, fieldProps } = useForm(
    initialTask ? toFormValues(initialTask) : EMPTY_TASK,
  );

  const submitTask = (values) => {
    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      priority: values.priority,
    };
    if (isEdit) {
      payload.status = values.status;
      payload.dueDate = values.dueDate || null;
    } else if (values.dueDate) {
      payload.dueDate = values.dueDate;
    }
    return onSubmit(payload);
  };

  return (
    <form
      className="form card"
      onSubmit={handleSubmit(validate, submitTask, 'Could not save the task.')}
      noValidate
    >
      {formError && <Alert type="error">{formError}</Alert>}

      <FormField id="title" label="Title" error={errors.title}>
        <input {...fieldProps('title')} maxLength={200} autoFocus required />
      </FormField>

      <FormField id="description" label="Description" error={errors.description} hint="Optional">
        <textarea {...fieldProps('description')} rows={5} maxLength={5000} />
      </FormField>

      <div className="form__row">
        {isEdit && (
          <FormField id="status" label="Status" error={errors.status}>
            <select {...fieldProps('status')}>
              <OptionList options={STATUS_OPTIONS} />
            </select>
          </FormField>
        )}

        <FormField id="priority" label="Priority" error={errors.priority}>
          <select {...fieldProps('priority')}>
            <OptionList options={PRIORITY_OPTIONS} />
          </select>
        </FormField>

        <FormField id="dueDate" label="Due date" error={errors.dueDate} hint="Optional">
          <input {...fieldProps('dueDate')} type="date" />
        </FormField>
      </div>

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
