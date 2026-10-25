// A list of tick boxes. `selected` holds the ticked values; `onChange` gets the new list.
export default function CheckboxList({ options, selected, onChange, className = '' }) {
  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <ul className={className}>
      {options.map((option) => (
        <li key={option.value}>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-panel">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        </li>
      ))}
    </ul>
  );
}
