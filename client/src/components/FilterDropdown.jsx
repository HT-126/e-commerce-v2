import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from './icons.jsx';

// A button that opens a panel of choices. Closes on Escape (focus goes back to the button) or a click outside.
export default function FilterDropdown({ label, count = 0, children, panelClassName = 'w-64' }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={`flex min-h-11 items-center gap-2 rounded-full border bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          count > 0 ? 'border-primary' : 'border-border'
        }`}
      >
        {count > 0 ? `${label} (${count})` : label}
        <ChevronDownIcon className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="group"
          aria-label={label}
          className={`absolute left-0 top-full z-30 mt-2 max-h-72 overflow-auto rounded-[20px] border border-border bg-white p-3 shadow-lg ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
