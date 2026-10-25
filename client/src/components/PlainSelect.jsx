import { ChevronDownIcon } from './icons.jsx';

// A drop-down list shown as plain text with a small arrow: no box around it.
// The label is for screen readers. The tap area is at least 44px high.
export default function PlainSelect({ label, value, onChange, className = '', children }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        className="min-h-11 cursor-pointer appearance-none bg-transparent pr-6 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-0 size-4" />
    </div>
  );
}
