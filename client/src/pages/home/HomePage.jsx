import { useState } from 'react';
import { Link } from 'react-router';
import Button from '../../components/Button.jsx';
import ProductGrid from '../../components/ProductGrid.jsx';
import { ReturnIcon, RulerIcon, TruckIcon } from '../../components/icons.jsx';
import { useProducts } from '../../hooks/use-catalog.js';
import { FREE_SHIPPING_FROM_DOLLARS } from '../../lib/shipping.js';

// Tabs from api.md. Under $45 = up to 4499 cents.
const TABS = [
  { label: 'New arrivals', params: { sort: 'newest', limit: 8 } },
  { label: 'Top rated', params: { sort: 'rating', limit: 8 } },
  { label: 'Under $45', params: { maxPriceCents: 4499, limit: 8 } },
];

const PROMISES = [
  {
    Icon: TruckIcon,
    title: 'Free US shipping',
    text: `On every order of $${FREE_SHIPPING_FROM_DOLLARS} or more`,
  },
  { Icon: ReturnIcon, title: '7-day returns', text: 'Not the right fit? Send it back.' },
  { Icon: RulerIcon, title: 'Size charts', text: 'Measurements in inches, on the product page' },
];

function Hero() {
  // Same query as the first tab, so it is already cached.
  const { data, isPending } = useProducts(TABS[0].params);
  const photos = data?.items.filter((product) => product.imageUrl).slice(0, 3) ?? [];

  return (
    <section className="grid items-center gap-8 rounded-[36px] bg-panel p-8 md:grid-cols-2 md:p-12">
      <div>
        <h1 className="font-serif text-5xl leading-tight md:text-6xl">
          Easy pieces <span className="block italic text-highlight">for every day.</span>
        </h1>
        <p className="mt-4 max-w-md text-ink-soft">
          Soft knits, ribbed jerseys and flowing dresses, picked for easy everyday wear.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button to="/shop">Shop now</Button>
          <Link to="/shop?sort=newest" className="text-sm underline underline-offset-4">
            New arrivals
          </Link>
        </div>
      </div>

      {/* Space is reserved while loading, so the headline does not jump when the photos arrive. */}
      {isPending && (
        <div className="grid grid-cols-3 gap-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[3/5] animate-pulse rounded-t-full bg-card" />
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.slug}`}
              className="aspect-[3/5] overflow-hidden rounded-t-full bg-card"
            >
              <img
                src={product.imageUrl}
                alt={product.imageAlt || product.title}
                className="size-full object-cover"
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Promises() {
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-3">
      {PROMISES.map(({ Icon, title, text }) => (
        <li key={title} className="rounded-[24px] bg-white p-5 text-center">
          <Icon className="mx-auto size-5 text-ink-soft" />
          <p className="mt-2 font-serif text-lg">{title}</p>
          <p className="text-sm text-ink-soft">{text}</p>
        </li>
      ))}
    </ul>
  );
}

function ProductTabs() {
  const [active, setActive] = useState(0);
  const { data, isPending, isError, refetch } = useProducts(TABS[active].params);

  return (
    <section className="mt-16">
      <h2 className="text-center font-serif text-4xl">
        Dressed up, dressed down, <span className="italic text-highlight">dressed for you.</span>
      </h2>

      <div role="group" aria-label="Product lists" className="mt-6 flex flex-wrap justify-center gap-2">
        {TABS.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className={`min-h-11 rounded-full border px-5 text-sm ${
              index === active
                ? 'border-ink bg-ink text-on-primary'
                : 'border-border bg-white hover:border-ink/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <ProductGrid items={data?.items} isPending={isPending} isError={isError} onRetry={refetch} />
      </div>

      <div className="mt-8 text-center">
        <Button to="/shop" variant="outline">
          Shop all
        </Button>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Promises />
      <ProductTabs />
    </>
  );
}
