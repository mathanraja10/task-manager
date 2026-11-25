import OptionList from './OptionList';
import { PRIORITY_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS } from '../utils/tasks';

/** Search / filter / sort controls. Values are plain strings; '' means "All". */
export default function TaskFilters({ values, onChange }) {
  const set = (name) => (event) => onChange(name, event.target.value);

  return (
    <div className="filters" role="search">
      <div className="filters__search">
        <label htmlFor="task-search" className="sr-only">
          Search tasks
        </label>
        <input
          id="task-search"
          type="search"
          placeholder="Search title or description…"
          value={values.search}
          onChange={set('search')}
          maxLength={100}
        />
      </div>

      <label className="filters__control">
        <span>Status</span>
        <select value={values.status} onChange={set('status')}>
          <option value="">All</option>
          <OptionList options={STATUS_OPTIONS} />
        </select>
      </label>

      <label className="filters__control">
        <span>Priority</span>
        <select value={values.priority} onChange={set('priority')}>
          <option value="">All</option>
          <OptionList options={PRIORITY_OPTIONS} />
        </select>
      </label>

      <label className="filters__control">
        <span>Sort</span>
        <select value={values.sort} onChange={set('sort')}>
          {Object.entries(SORT_OPTIONS).map(([value, o]) => (
            <option key={value} value={value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
