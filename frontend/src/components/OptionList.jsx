/** <option> elements for a [{ value, label }] list (status/priority selects). */
export default function OptionList({ options }) {
  return options.map((o) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  ));
}
