import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from './icons.jsx';

// A button that opens a white panel of choices. Closes on Escape (focus goes back to the button), a click
// outside, or when Tab moves focus out of it.
//
// `label`: the text on the button. `name`: what the control is for ("Sort by"), when the button shows the
// current choice instead ("Newest"); screen readers hear "Sort by: Newest".
// `children` can be a function that gets `{ close }`, for panels where one pick finishes the job.
// The panel is as wide as the filter row on a phone (so it never runs off the screen), and from `md` up it
// sits under its own button: `width` is its width there, `align` the edge of the button it lines up with.
export default function FilterDropdown({
  label,
  name = label,
  count = 0,
  children,
  width = 'md:w-64',
  align = 'left',
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);

  // After a pick the panel closes and the focus goes back to the button. The focus move is done in an
  // effect, because refs are only for effects and event handlers, not for render.
  const [closedByPick, setClosedByPick] = useState(0);
  const close = () => {
    setOpen(false);
    setClosedByPick((count) => count + 1);
  };
  useEffect(() => {
    if (closedByPick > 0) buttonRef.current?.focus();
  }, [closedByPick]);

  useEffect(() => {
    if (!open) return undefined;

    const closeIfOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('focusin', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('focusin', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="md:relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={name === label ? undefined : `${name}: ${label}`}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={`flex min-h-11 items-center gap-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          count > 0 ? 'font-medium' : ''
        }`}
      >
        {count > 0 ? `${label} (${count})` : label}
        <ChevronDownIcon className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="group"
          aria-label={name}
          className={`absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-[20px] border border-border bg-white p-3 shadow-lg md:inset-x-auto ${
            align === 'right' ? 'md:right-0' : 'md:left-0'
          } ${width}`}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}
