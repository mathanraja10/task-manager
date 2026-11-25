/**
 * Label + control + error message. Pass the control as children and give it
 * the same `id`; aria attributes link the error to the control.
 */
export default function FormField({ id, label, error, hint, children }) {
  return (
    <div className={error ? 'field field--invalid' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  );
}
