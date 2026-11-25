import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useForm } from '../hooks/useForm';
import FormField from '../components/FormField';
import Alert from '../components/Alert';
import { validateEmail, validatePassword } from '../utils/validation';

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  else if (values.name.trim().length > 100) errors.name = 'Name must be at most 100 characters';
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(values.password);
  if (passwordError) errors.password = passwordError;
  if (!values.confirmPassword) errors.confirmPassword = 'Please confirm your password';
  else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

const FIELDS = [
  { name: 'name', label: 'Name', autoComplete: 'name', autoFocus: true, maxLength: 100 },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
  {
    name: 'confirmPassword',
    label: 'Confirm password',
    type: 'password',
    autoComplete: 'new-password',
  },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const { errors, formError, submitting, handleSubmit, fieldProps } = useForm({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // On success PublicOnlyRoute redirects to the dashboard.
  const onSubmit = handleSubmit(
    validate,
    ({ name, email, password }) => register({ name: name.trim(), email: email.trim(), password }),
    'Registration failed.',
  );

  return (
    <>
      <h1 className="auth__title">Create your account</h1>
      <p className="muted auth__subtitle">Start organising your work in seconds.</p>

      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Alert type="error">{formError}</Alert>}
        {FIELDS.map(({ name, label, ...inputProps }) => (
          <FormField key={name} id={name} label={label} error={errors[name]}>
            <input {...fieldProps(name)} {...inputProps} />
          </FormField>
        ))}
        <p className="field__hint">At least 8 characters, with a letter and a number.</p>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth__switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </>
  );
}
