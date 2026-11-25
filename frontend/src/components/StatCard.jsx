import { Link } from 'react-router-dom';

/** Dashboard metric; links to the task list pre-filtered for that metric. */
export default function StatCard({ label, value, to, tone = 'neutral' }) {
  return (
    <Link to={to} className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </Link>
  );
}
