import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useForm } from '../hooks/useForm';
import FormField from '../components/FormField';
import Alert from '../components/Alert';
import { validateEmail } from '../utils/validation';

function validate(values) {
  const errors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = 'Password is required';
  return errors;
}

export default function LoginPage() {
  const { login } = useAuth();
  const { errors, formError, submitting, handleSubmit, fieldProps } = useForm({
    email: '',
    password: '',
  });

  // On success PublicOnlyRoute redirects back to the page that required login.
  const onSubmit = handleSubmit(validate, (values) => login(values), 'Login failed.');

  return (
    <>
      <h1 className="auth__title">Welcome back</h1>
      <p className="muted auth__subtitle">Log in to manage your tasks.</p>

      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Alert type="error">{formError}</Alert>}

        <FormField id="email" label="Email" error={errors.email}>
          <input {...fieldProps('email')} type="email" autoComplete="email" autoFocus />
        </FormField>

        <FormField id="password" label="Password" error={errors.password}>
          <input {...fieldProps('password')} type="password" autoComplete="current-password" />
        </FormField>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="auth__switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </>
  );
}
