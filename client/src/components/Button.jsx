import { Link } from 'react-router';

const base =
  'inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50';

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90',
  outline: 'border border-ink/30 text-ink hover:bg-panel',
};

// With `to` it is a link that looks like a button.
export default function Button({ variant = 'primary', to, className = '', ...props }) {
  const classes = `${base} ${variants[variant]} ${className}`;
  if (to) return <Link to={to} className={classes} {...props} />;
  return <button type="button" className={classes} {...props} />;
}
