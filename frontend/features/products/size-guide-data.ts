export interface SizeGuideColumn {
  key: string;
  label: string;
}

export interface SizeGuideChart {
  id: string;
  title: string;
  note: string;
  columns: SizeGuideColumn[];
  rows: Record<string, string>[];
}

const topsRows: Record<string, string>[] = [
  { size: 'S', chest: '36–38', length: '27', shoulder: '17', sleeve: '8' },
  { size: 'M', chest: '38–40', length: '28', shoulder: '18', sleeve: '8.5' },
  { size: 'L', chest: '40–42', length: '29', shoulder: '19', sleeve: '9' },
  { size: 'XL', chest: '42–44', length: '30', shoulder: '20', sleeve: '9.5' },
  { size: 'XXL', chest: '44–46', length: '31', shoulder: '21', sleeve: '10' },
];

const hoodiesRows: Record<string, string>[] = [
  { size: 'S', chest: '38–40', length: '26', shoulder: '18', sleeve: '24' },
  { size: 'M', chest: '40–42', length: '27', shoulder: '19', sleeve: '25' },
  { size: 'L', chest: '42–44', length: '28', shoulder: '20', sleeve: '26' },
  { size: 'XL', chest: '44–46', length: '29', shoulder: '21', sleeve: '27' },
  { size: 'XXL', chest: '46–48', length: '30', shoulder: '22', sleeve: '28' },
];

const bottomsRows: Record<string, string>[] = [
  { size: 'S', waist: '28–30', hip: '36–38', length: '38', inseam: '29' },
  { size: 'M', waist: '30–32', hip: '38–40', length: '39', inseam: '30' },
  { size: 'L', waist: '32–34', hip: '40–42', length: '40', inseam: '31' },
  { size: 'XL', waist: '34–36', hip: '42–44', length: '41', inseam: '32' },
  { size: 'XXL', waist: '36–38', hip: '44–46', length: '42', inseam: '33' },
];

export const SIZE_GUIDE_CHARTS: Record<string, SizeGuideChart> = {
  tops: {
    id: 'tops',
    title: 'Tops & Tees',
    note: 'Measurements in inches. Size up for an oversized fit.',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'chest', label: 'Chest' },
      { key: 'length', label: 'Length' },
      { key: 'shoulder', label: 'Shoulder' },
      { key: 'sleeve', label: 'Sleeve' },
    ],
    rows: topsRows,
  },
  hoodies: {
    id: 'hoodies',
    title: 'Hoodies',
    note: 'Measurements in inches. Hoodie length includes hem band.',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'chest', label: 'Chest' },
      { key: 'length', label: 'Length' },
      { key: 'shoulder', label: 'Shoulder' },
      { key: 'sleeve', label: 'Sleeve' },
    ],
    rows: hoodiesRows,
  },
  bottoms: {
    id: 'bottoms',
    title: 'Bottoms',
    note: 'Measurements in inches. Jogger length is outseam to ankle.',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'waist', label: 'Waist' },
      { key: 'hip', label: 'Hip' },
      { key: 'length', label: 'Length' },
      { key: 'inseam', label: 'Inseam' },
    ],
    rows: bottomsRows,
  },
};

export function getSizeGuideForCategory(category: string): SizeGuideChart {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes('bottom') || normalized.includes('jogger') || normalized.includes('pant')) {
    return SIZE_GUIDE_CHARTS.bottoms;
  }

  if (normalized.includes('hoodie') || normalized.includes('sweat')) {
    return SIZE_GUIDE_CHARTS.hoodies;
  }

  return SIZE_GUIDE_CHARTS.tops;
}

export const ALL_SIZE_GUIDE_CHARTS = Object.values(SIZE_GUIDE_CHARTS);
