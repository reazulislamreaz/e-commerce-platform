export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  imageHue: number;
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
