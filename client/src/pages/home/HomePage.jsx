import { useHealth } from '../../hooks/use-health.js';

// Foundation page: proves the client reaches the API and the database through the proxy.
export default function HomePage() {
  const { data, isPending, isError, error } = useHealth();

  return (
    <section>
      <h1 className="font-serif text-4xl">
        Welcome to <span className="italic text-highlight">Lumière</span>
      </h1>
      <p className="mt-4 text-ink-soft">
        {isPending && 'Checking the server...'}
        {isError && <span className="text-error">Server error: {error.message}</span>}
        {data && `Server status: ${data.status}, database: ${data.db}`}
      </p>
    </section>
  );
}
