import { useCallback, useState } from 'react';
import { getErrorMessage, getFieldErrors } from '../utils/errors';

/**
 * Shared form state for every form in the app: values, per-field errors, a
 * form-level error, and the submitting flag.
 *
 *   const form = useForm({ email: '', password: '' });
 *   <form onSubmit={form.handleSubmit(validate, (values) => login(values), 'Login failed.')}>
 *     <input {...form.fieldProps('email')} type="email" />
 *
 * - validate(values) returns { field: message }; submission stops if it is non-empty.
 * - If onValid throws an API error, its field errors go next to the inputs and its
 *   message is shown as formError. On success, submitting stays true because the
 *   caller is expected to navigate away.
 */
export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setValues((v) => ({ ...v, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  const handleSubmit = (validate, onValid, fallbackMessage) => async (event) => {
    event.preventDefault();
    const clientErrors = validate(values);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      await onValid(values);
    } catch (error) {
      setErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error, fallbackMessage));
      setSubmitting(false);
    }
  };

  /** Props for an input/select/textarea bound to `name`, including a11y error wiring. */
  const fieldProps = (name) => ({
    id: name,
    name,
    value: values[name],
    onChange: handleChange,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });

  return { values, errors, formError, submitting, handleSubmit, fieldProps };
}
