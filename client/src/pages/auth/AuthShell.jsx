import { CheckIcon } from '../../components/icons.jsx';
import { useProducts } from '../../hooks/use-catalog.js';

// Three arches with product photos. The middle one is taller. Decorative, so the photos have no alt text.
function Arches() {
  // The same query as the Home hero, so it is usually already loaded.
  const { data, isPending } = useProducts({ sort: 'newest', limit: 8 });
  const photos = data?.items.filter((product) => product.imageUrl).slice(0, 3) ?? [];
  const heights = ['h-44 md:h-52', 'h-56 md:h-64', 'h-44 md:h-52'];

  if (!isPending && photos.length === 0) return null;

  return (
    <div className="flex items-end gap-3 md:gap-4" aria-hidden="true">
      {heights.map((height, i) => (
        <div key={i} className={`${height} w-1/3 overflow-hidden rounded-t-full bg-white/10 md:max-w-36`}>
          {photos[i] && <img src={photos[i].imageUrl} alt="" className="size-full object-cover" />}
        </div>
      ))}
    </div>
  );
}

// The dark green panel on the left (on top on a phone) and the form on the right.
// panel: { title, accent, text? , points? }   form: heading, accent word, intro line, and the form itself.
export default function AuthShell({ panel, heading, accent, intro, children }) {
  // On a desktop the panel fills the window under the top bar, with the photos at the bottom, like the design.
  return (
    <div className="grid gap-6 md:min-h-[calc(100dvh-7.5rem)] md:grid-cols-2 md:gap-8">
      <section className="flex flex-col justify-between gap-10 rounded-[36px] bg-primary p-8 text-on-primary md:p-14">
        <div>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">
            {panel.title} <span className="block italic text-accent-light">{panel.accent}</span>
          </h2>
          {panel.text && <p className="mt-5 max-w-sm text-on-primary/85">{panel.text}</p>}
          {panel.points && (
            <ul className="mt-6 space-y-3 text-on-primary/90">
              {panel.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 size-5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Arches />
      </section>

      <section className="flex items-center justify-center py-4 md:py-0">
        <div className="w-full max-w-[400px]">
          <h1 className="font-serif text-4xl">
            {heading} <span className="italic text-highlight">{accent}</span>
          </h1>
          <p className="mt-2 text-ink-soft">{intro}</p>
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </div>
  );
}
