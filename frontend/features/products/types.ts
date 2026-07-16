export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  /** Gender / collection bucket for filtering */
  collection: 'men' | 'women' | 'unisex';
  color: string;
  image: string;
  isNew?: boolean;
  onSale?: boolean;
  /** Legacy gradient hue for placeholder cards */
  imageHue?: number;
}

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  imageHue: number;
}

export interface HomeSection {
  id: string;
  title: string;
  viewMoreHref: string;
  products: CatalogProduct[];
}
