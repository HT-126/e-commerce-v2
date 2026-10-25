// Small inline icons, so no icon library is needed on customer pages. Decorative: hidden from screen readers.
function Icon({ children, className = 'size-5', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const MenuIcon = (props) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const CloseIcon = (props) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const MinusIcon = (props) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
);

export const PlusIcon = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const TruckIcon = (props) => (
  <Icon {...props}>
    <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
    <circle cx="7" cy="17" r="1.6" />
    <circle cx="17" cy="17" r="1.6" />
  </Icon>
);

export const ReturnIcon = (props) => (
  <Icon {...props}>
    <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />
  </Icon>
);

export const RulerIcon = (props) => (
  <Icon {...props}>
    <path d="m3 15 12-12 6 6-12 12zM8 8l2 2M11 5l2 2M5 11l2 2" />
  </Icon>
);

export const StarIcon = ({ filled = true, className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17l-5.4 2.8 1.1-6.1L3.2 9.4l6.1-.8z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronDownIcon = (props) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
