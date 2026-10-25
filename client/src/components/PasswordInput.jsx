import { useState } from 'react';
import TextField from './TextField.jsx';

// A password box with a Show / Hide button.
export default function PasswordInput(props) {
  const [shown, setShown] = useState(false);

  return (
    <TextField
      {...props}
      type={shown ? 'text' : 'password'}
      adornment={
        <button
          type="button"
          aria-pressed={shown}
          aria-label={shown ? 'Hide password' : 'Show password'}
          onClick={() => setShown((isShown) => !isShown)}
          className="min-h-11 rounded-full px-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}
