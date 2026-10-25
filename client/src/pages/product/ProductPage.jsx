import { useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router';
import Button from '../../components/Button.jsx';
import ProductGrid from '../../components/ProductGrid.jsx';
import { useProduct, useRelatedProducts } from '../../hooks/use-catalog.js';
import NotFoundPage from '../NotFoundPage.jsx';
import ProductView, { Breadcrumb } from './ProductView.jsx';
import { AboutSection, DetailsSection, RatingSection, SizeChartSection } from './ProductSections.jsx';
import ReviewsSection from './ReviewsSection.jsx';

// Column names differ per product ("Bust" or "Sleeve Length (in)"), so judge by the text, not the count.
// A chart with long headers needs the full width; a short one sits beside the other two panels.
const WIDE_CHART_HEADER_CHARS = 30;
const isWideChart = (sizeChart) =>
  Boolean(sizeChart) && sizeChart.headers.join('').length > WIDE_CHART_HEADER_CHARS;

function ProductSkeleton() {
  return (
    <div role="status" aria-label="Loading product" className="grid animate-pulse gap-10 lg:grid-cols-2">
      <div className="aspect-[3/4] rounded-[28px] bg-card" />
      <div className="space-y-4">
        <div className="h-4 w-24 rounded bg-card" />
        <div className="h-10 w-3/4 rounded bg-card" />
        <div className="h-6 w-32 rounded bg-card" />
        <div className="h-40 rounded-[28px] bg-card" />
      </div>
    </div>
  );
}

function Related({ slug }) {
  const { data, isPending, isError, refetch } = useRelatedProducts(slug);
  if (data?.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-serif text-3xl">
        You may also <span className="italic text-highlight">like</span>
      </h2>
      <div className="mt-6">
        <ProductGrid
          items={data}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          skeletonCount={4}
        />
      </div>
    </section>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const { data: product, isPending, isError, error, refetch } = useProduct(slug);

  // The "Write a review" link from an order ends in `#reviews`, but that place only exists once the product
  // has loaded, so the browser cannot scroll to it by itself. Once per visit: a refetch (after a review is
  // saved) must not jump the page again.
  const { hash } = useLocation();
  const scrolledTo = useRef(null);
  useEffect(() => {
    if (!product || hash !== '#reviews' || scrolledTo.current === `${slug}${hash}`) return;
    scrolledTo.current = `${slug}${hash}`;
    document.getElementById('reviews')?.scrollIntoView();
  }, [product, hash, slug]);

  if (isPending) return <ProductSkeleton />;
  if (isError && error.status === 404) return <NotFoundPage />;
  if (isError) {
    return (
      <div role="alert" className="rounded-[28px] bg-card p-8 text-center">
        <p className="text-error">Could not load this product.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const wideChart = isWideChart(product.sizeChart);

  return (
    <>
      <Breadcrumb product={product} />
      {/* `key` gives each product fresh color, size and quantity choices. */}
      <ProductView key={product.slug} product={product} />

      <div className={`mt-12 grid gap-6 ${wideChart ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        <AboutSection product={product} />
        <DetailsSection product={product} />
        <SizeChartSection sizeChart={product.sizeChart} className={wideChart ? 'lg:col-span-2' : ''} />
      </div>

      {/* "Write a review" links from the order history land here. */}
      <div id="reviews" className="mt-6 scroll-mt-6">
        <RatingSection ratingAvg={product.ratingAvg} reviewCount={product.reviewCount} />
        <ReviewsSection slug={product.slug} />
      </div>

      <Related slug={product.slug} />
    </>
  );
}
