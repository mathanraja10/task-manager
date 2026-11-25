import Alert from './Alert';

/** Renders the notice from useNotice(), or nothing. */
export default function NoticeAlert({ notice, onDismiss }) {
  if (!notice) return null;
  return (
    <Alert type={notice.type} onDismiss={onDismiss}>
      {notice.text}
    </Alert>
  );
}
