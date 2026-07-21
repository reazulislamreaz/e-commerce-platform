'use client';

import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { ProductFilters, ProductCollection } from '@/features/products/types';
import { countActiveFilters } from '@/features/products/filter';
import { PRICE_PRESETS } from '@/features/products/constants';

type Facets = {
  categories: string[];
  subcategories: string[];
  brands: string[];
  sizes: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
};

const COLLECTIONS: { value: ProductCollection; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
];

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#E5E7EB] py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-[11px] font-bold uppercase tracking-[.12em] text-[#111111]"
        aria-expanded={open}
      >
        {title}
        <span className="text-[#C9A227]">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[12px] text-[#555555]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-3.5 accent-[#C9A227]"
      />
      {label}
    </label>
  );
}

export function FilterPanel({
  filters,
  facets,
  onChange,
  onClear,
  className = '',
}: {
  filters: ProductFilters;
  facets: Facets;
  onChange: (next: ProductFilters) => void;
  onClear: () => void;
  className?: string;
}) {
  const active = countActiveFilters(filters);
  const [minInput, setMinInput] = useState(filters.minPrice?.toString() ?? '');
  const [maxInput, setMaxInput] = useState(filters.maxPrice?.toString() ?? '');

  const applyPrice = () => {
    const min = minInput.trim() ? Number(minInput) : null;
    const max = maxInput.trim() ? Number(maxInput) : null;
    onChange({
      ...filters,
      minPrice: min != null && !Number.isNaN(min) ? min : null,
      maxPrice: max != null && !Number.isNaN(max) ? max : null,
    });
  };

  return (
    <aside className={className}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
          Filters{active > 0 ? ` (${active})` : ''}
        </h2>
        {active > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-semibold uppercase tracking-wide text-[#C9A227] hover:text-[#D4B03A]"
          >
            Clear All
          </button>
        )}
      </div>

      <FilterSection title="Collection">
        {COLLECTIONS.map((item) => (
          <CheckboxRow
            key={item.value}
            label={item.label}
            checked={filters.collections.includes(item.value)}
            onChange={() =>
              onChange({
                ...filters,
                collections: toggleValue(filters.collections, item.value),
              })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Category">
        {facets.categories.map((category) => (
          <CheckboxRow
            key={category}
            label={category}
            checked={filters.categories.includes(category)}
            onChange={() =>
              onChange({
                ...filters,
                categories: toggleValue(filters.categories, category),
              })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Subcategory" defaultOpen={false}>
        {facets.subcategories.map((subcategory) => (
          <CheckboxRow
            key={subcategory}
            label={subcategory}
            checked={filters.subcategories.includes(subcategory)}
            onChange={() =>
              onChange({
                ...filters,
                subcategories: toggleValue(filters.subcategories, subcategory),
              })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Brand" defaultOpen={false}>
        {facets.brands.map((brand) => (
          <CheckboxRow
            key={brand}
            label={brand}
            checked={filters.brands.includes(brand)}
            onChange={() =>
              onChange({
                ...filters,
                brands: toggleValue(filters.brands, brand),
              })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            className="w-full rounded-[4px] border border-[#E5E7EB] bg-white px-2.5 py-2 text-xs text-[#111111] outline-none focus:border-[#C9A227]"
          />
          <span className="text-[#555555]">–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            className="w-full rounded-[4px] border border-[#E5E7EB] bg-white px-2.5 py-2 text-xs text-[#111111] outline-none focus:border-[#C9A227]"
          />
          <button
            type="button"
            onClick={applyPrice}
            className="shrink-0 rounded-[4px] border border-[#111111] bg-[#111111] px-2.5 py-2 text-[10px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
          >
            Go
          </button>
        </div>
        <div className="mt-2 space-y-1.5">
          {PRICE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setMinInput(String(preset.min));
                setMaxInput(preset.max != null ? String(preset.max) : '');
                onChange({
                  ...filters,
                  minPrice: preset.min,
                  maxPrice: preset.max,
                });
              }}
              className="block text-left text-[12px] text-[#555555] transition-colors hover:text-[#C9A227]"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Size">
        <div className="flex flex-wrap gap-1.5">
          {facets.sizes.map((size) => {
            const activeSize = filters.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => onChange({ ...filters, sizes: toggleValue(filters.sizes, size) })}
                className={`min-w-9 rounded-[4px] border px-2 py-1.5 text-[11px] font-semibold ${
                  activeSize
                    ? 'border-[#C9A227] bg-[#C9A227] text-[#111111]'
                    : 'border-[#E5E7EB] text-[#555555] hover:border-[#C9A227]'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Color">
        {facets.colors.map((color) => (
          <CheckboxRow
            key={color}
            label={color}
            checked={filters.colors.includes(color)}
            onChange={() => onChange({ ...filters, colors: toggleValue(filters.colors, color) })}
          />
        ))}
      </FilterSection>

      <FilterSection title="Availability">
        {(
          [
            ['all', 'All'],
            ['in-stock', 'In Stock'],
            ['out-of-stock', 'Out of Stock'],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2.5 text-[12px] text-[#555555]"
          >
            <input
              type="radio"
              name="availability"
              checked={filters.availability === value}
              onChange={() => onChange({ ...filters, availability: value })}
              className="accent-[#C9A227]"
            />
            {label}
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Discount">
        <CheckboxRow
          label="On Sale"
          checked={filters.discount}
          onChange={() => onChange({ ...filters, discount: !filters.discount })}
        />
      </FilterSection>

      <FilterSection title="Rating" defaultOpen={false}>
        {[4, 3, 2].map((rating) => (
          <CheckboxRow
            key={rating}
            label={`${rating}+ stars`}
            checked={filters.minRating === rating}
            onChange={() =>
              onChange({
                ...filters,
                minRating: filters.minRating === rating ? null : rating,
              })
            }
          />
        ))}
      </FilterSection>
    </aside>
  );
}

export function MobileFilterDrawer({
  open,
  onClose,
  filters,
  facets,
  onChange,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  filters: ProductFilters;
  facets: Facets;
  onChange: (next: ProductFilters) => void;
  onClear: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 bg-[#111111]/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Product filters"
        className="absolute inset-y-0 left-0 flex w-[min(100%,340px)] flex-col bg-[#FAFAFA] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <p className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">Filters</p>
          <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-[#111111]">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <FilterPanel filters={filters} facets={facets} onChange={onChange} onClear={onClear} />
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[4px] border border-[#111111] bg-[#111111] py-3 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
}
