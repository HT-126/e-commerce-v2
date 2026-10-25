import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section>
      <h1 className="font-serif text-4xl">Page not found</h1>
      <p className="mt-4">
        <Link to="/" className="underline">
          Back to the home page
        </Link>
      </p>
    </section>
  );
}
