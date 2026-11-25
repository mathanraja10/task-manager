// Client-side checks mirror the backend rules so users get instant feedback.
// The backend validates again; these are a convenience, not a security control.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Email must be a valid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}
