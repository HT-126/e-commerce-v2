import Button from '../../components/Button.jsx';
import CheckboxList from '../../components/CheckboxList.jsx';
import ChoiceList from '../../components/ChoiceList.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import { PRICE_RANGES, SORTS } from './shop-params.js';

// Keeps ticked values in the order of the options, so the same choice always gives the same URL.
const inOptionOrder = (options, values) => {
  const ordered = options.map((o) => o.value).filter((value) => values.includes(value));
  return [...ordered, ...values.filter((value) => !ordered.includes(value))];
};

function OptionPanel({ filters, options, selected, onChange, className }) {
  if (filters.isPending) return <p className="p-2 text-sm text-ink-soft">Loading...</p>;
  if (filters.isError) return <p className="p-2 text-sm text-error">Could not load the options.</p>;
  if (options.length === 0) return <p className="p-2 text-sm text-ink-soft">Nothing to choose from.</p>;

  return (
    <CheckboxList
      options={options}
      selected={selected}
      onChange={(next) => onChange(inOptionOrder(options, next))}
      className={className}
    />
  );
}

// Color, Size, Price, Clear filters and Sort. `onChange` gets the URL values to change.
export default function ShopFilters({ filters, params, hasFilters, onChange, onClear }) {
  const colorOptions = (filters.data?.colors ?? []).map((c) => ({ value: c.key, label: c.label }));
  const sizeOptions = (filters.data?.sizes ?? []).map((size) => ({ value: size, label: size }));

  return (
    <div className="relative mt-6 flex flex-wrap items-center gap-x-6 gap-y-1">
      <FilterDropdown label="Color" count={params.color.length}>
        <OptionPanel
          filters={filters}
          options={colorOptions}
          selected={params.color}
          onChange={(next) => onChange({ color: next.join(',') })}
        />
      </FilterDropdown>

      <FilterDropdown label="Size" count={params.size.length} width="md:w-72">
        <OptionPanel
          filters={filters}
          options={sizeOptions}
          selected={params.size}
          onChange={(next) => onChange({ size: next.join(',') })}
          className="grid grid-cols-2 gap-x-2"
        />
      </FilterDropdown>

      {/* Price and Sort open the same kind of white panel as Color. One pick finishes the job, so they close. */}
      <FilterDropdown label={params.price.label} name="Price" width="md:w-56">
        {({ close }) => (
          <ChoiceList
            name="price"
            options={PRICE_RANGES.map((range) => ({ value: range.key, label: range.label }))}
            value={params.price.key}
            onChange={(key) => {
              const range = PRICE_RANGES.find((r) => r.key === key);
              onChange({
                minPriceCents: range.minPriceCents ?? '',
                maxPriceCents: range.maxPriceCents ?? '',
              });
              close();
            }}
          />
        )}
      </FilterDropdown>

      {hasFilters && (
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      )}

      <div className="md:ml-auto">
        <FilterDropdown
          label={SORTS.find((s) => s.value === params.sort).label}
          name="Sort by"
          width="md:w-56"
          align="right"
        >
          {({ close }) => (
            <ChoiceList
              plain
              name="sort"
              options={SORTS}
              value={params.sort}
              onChange={(sort) => {
                onChange({ sort });
                close();
              }}
            />
          )}
        </FilterDropdown>
      </div>
    </div>
  );
}
