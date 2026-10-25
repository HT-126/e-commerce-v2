import RatingStars from '../../components/RatingStars.jsx';

const Heading = ({ children, accent }) => (
  <h2 className="font-serif text-3xl">
    {children} <span className="italic text-highlight">{accent}</span>
  </h2>
);

export function AboutSection({ product }) {
  const { description, highlights, stylingNote } = product;
  if (!description && highlights.length === 0 && !stylingNote) return null;

  return (
    <section className="rounded-[28px] bg-primary p-8 text-on-primary">
      <h2 className="font-serif text-3xl">
        About this <span className="italic text-accent-light">piece</span>
      </h2>
      {description && <p className="mt-4 text-sm leading-relaxed">{description}</p>}
      {highlights.length > 0 && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {highlights.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {stylingNote && (
        <p className="mt-4 text-sm leading-relaxed">
          <span className="font-medium">Wear it with: </span>
          {stylingNote}
        </p>
      )}
    </section>
  );
}

const DETAILS = [
  ['Material', 'material'],
  ['Care', 'care'],
  ['Length', 'length'],
  ['Fit', 'fit'],
  ['Closure', 'closure'],
  ['Season', 'season'],
  ['Pattern', 'pattern'],
];

export function DetailsSection({ product }) {
  const rows = DETAILS.filter(([, key]) => product[key]);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-[28px] bg-card p-8">
      <Heading accent="and care">Fabric</Heading>
      <dl className="mt-4 text-sm">
        {rows.map(([label, key]) => (
          <div
            key={key}
            className="grid grid-cols-[6rem_1fr] gap-3 border-b border-border py-2.5 last:border-b-0"
          >
            <dt className="text-ink-soft">{label}</dt>
            <dd>{product[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Columns differ per product, so the headers come from the data. The table scrolls sideways on phones.
export function SizeChartSection({ sizeChart, className = '' }) {
  if (!sizeChart) return null;

  return (
    <section id="size-chart" className={`rounded-[28px] bg-white p-8 ${className}`}>
      <h2 className="font-serif text-3xl">
        Size <span className="italic text-highlight">chart</span>{' '}
        <span className="font-sans text-sm text-ink-soft">(inches)</span>
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              {sizeChart.headers.map((header) => (
                <th key={header} scope="col" className="py-2 pr-6 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizeChart.rows.map((row) => (
              <tr key={row.join('|')} className="border-b border-border">
                {row.map((cell, i) => (
                  <td key={i} className={`py-2.5 pr-6 ${i === 0 ? 'font-medium' : ''}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Only the rating summary for now. The review list comes with the Reviews feature.
export function RatingSection({ ratingAvg, reviewCount }) {
  return (
    <section className="flex flex-col gap-4 rounded-[28px] bg-panel p-8 md:flex-row md:items-center md:gap-10">
      <Heading accent="reviews">Customer</Heading>
      {reviewCount > 0 && ratingAvg !== null ? (
        <div className="flex items-center gap-4">
          <span className="font-serif text-5xl">{ratingAvg.toFixed(1)}</span>
          <div>
            <RatingStars rating={ratingAvg} />
            <p className="text-sm text-ink-soft">
              Average from {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-ink-soft">No reviews yet.</p>
      )}
    </section>
  );
}
