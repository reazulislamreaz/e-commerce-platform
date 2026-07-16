/** Catalog UI constants — shared by filters, search, and pagination. */

export const PAGE_SIZE = 8;

export const SEARCH_DIALOG_LIMIT = 6;

export const SEARCH_PAGE_LIMIT = 100;

export const searchSuggestions = ['T-Shirt', 'Hoodie', 'Jogger', 'Oversized', 'Women', 'Sale'];

export const PRICE_PRESETS = [
  { label: 'Under ৳1000', min: 0, max: 999 },
  { label: '৳1000 – ৳1500', min: 1000, max: 1500 },
  { label: '৳1500 – ৳2000', min: 1500, max: 2000 },
  { label: 'Above ৳2000', min: 2001, max: null },
] as const;
