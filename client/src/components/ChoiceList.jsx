import { CheckIcon } from './icons.jsx';

// A list where exactly one choice is picked (real radio buttons, so the arrow keys work).
// Default: a round radio button before each choice (Price).
// `plain`: no control at all, the picked choice is bold with a tick (Sort).
export default function ChoiceList({ name, options, value, onChange, plain = false }) {
  return (
    <ul>
      {options.map((option) => {
        const picked = option.value === value;
        return (
          <li key={option.value}>
            <label
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-panel has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
                picked && plain ? 'font-medium' : ''
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={picked}
                onChange={() => onChange(option.value)}
                // Clicking the choice that is already picked fires no change event, but should still close the panel.
                onClick={() => picked && onChange(option.value)}
                className={plain ? 'sr-only' : 'size-4 accent-primary'}
              />
              {option.label}
              {plain && picked && <CheckIcon className="ml-auto size-4" />}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
