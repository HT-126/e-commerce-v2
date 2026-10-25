import { useState } from 'react';

export default function ProductGallery({ images, title }) {
  const [index, setIndex] = useState(0);
  const main = images[index];

  if (!main) return <div className="aspect-[3/4] rounded-[28px] bg-panel" />;

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {images.map((image, i) => (
            <li key={image.url} className="shrink-0">
              <button
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={`block size-16 overflow-hidden rounded-xl border-2 bg-card md:size-20 ${
                  i === index ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex-1 rounded-[28px] bg-card p-3">
        {/* Width and height come from the data, so the page does not jump when the photo loads. */}
        <img
          src={main.url}
          alt={main.alt || title}
          width={main.width ?? undefined}
          height={main.height ?? undefined}
          className="h-auto w-full rounded-[20px]"
        />
      </div>
    </div>
  );
}
