import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slugify';
import type { AdminBrand, AdminCategory, AdminCollection } from './types';

export type TaxonomyType = 'BRAND' | 'CATEGORY' | 'COLLECTION';
export type TaxonomyStatus = 'ACTIVE' | 'INACTIVE';

export const TAXONOMY_TYPES: TaxonomyType[] = ['BRAND', 'CATEGORY', 'COLLECTION'];

export const TAXONOMY_TYPE_LABELS: Record<TaxonomyType, string> = {
  BRAND: 'Brand',
  CATEGORY: 'Category',
  COLLECTION: 'Collection',
};

export const TAXONOMY_TYPE_HINTS: Record<TaxonomyType, string> = {
  BRAND: 'Product manufacturers and labels.',
  CATEGORY: 'Hierarchical product taxonomy — categories can nest under a parent.',
  COLLECTION: 'Curated groupings for merchandising, ordered by position.',
};

/**
 * One row of the unified taxonomy table — brands, categories, and collections
 * normalized to a single shape for shared filtering, sorting, and actions.
 */
export type TaxonomyRow = {
  id: string;
  type: TaxonomyType;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  /** Merchandising sort order — null for brands, which have no position. */
  position: number | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

/** Composite key — row ids are UUIDs, but actions need the type to pick the API. */
export function taxonomyRowKey(row: Pick<TaxonomyRow, 'type' | 'id'>): string {
  return `${row.type}:${row.id}`;
}

export function buildTaxonomyRows(
  brands: AdminBrand[],
  categories: AdminCategory[],
  collections: AdminCollection[],
): TaxonomyRow[] {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return [
    ...brands.map(
      (brand): TaxonomyRow => ({
        id: brand.id,
        type: 'BRAND',
        name: brand.name,
        slug: brand.slug,
        parentId: null,
        parentName: null,
        position: null,
        isActive: brand.isActive,
        productCount: brand.productCount,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
      }),
    ),
    ...categories.map(
      (category): TaxonomyRow => ({
        id: category.id,
        type: 'CATEGORY',
        name: category.name,
        slug: category.slug,
        parentId: category.parentId ?? null,
        parentName: category.parentId ? (categoryNames.get(category.parentId) ?? null) : null,
        position: category.position,
        isActive: category.isActive,
        productCount: category.productCount,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      }),
    ),
    ...collections.map(
      (collection): TaxonomyRow => ({
        id: collection.id,
        type: 'COLLECTION',
        name: collection.name,
        slug: collection.slug,
        parentId: null,
        parentName: null,
        position: collection.position,
        isActive: collection.isActive,
        productCount: collection.productCount,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      }),
    ),
  ];
}

export const taxonomyFormSchema = z
  .object({
    type: z.enum(['BRAND', 'CATEGORY', 'COLLECTION']),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    slug: z
      .string()
      .trim()
      .max(120)
      .refine(
        (value) => value === '' || SLUG_PATTERN.test(value),
        'Use lowercase letters, numbers, and hyphens',
      ),
    parentId: z.union([z.literal(''), z.string().uuid()]),
    position: z.union([z.literal(''), z.number().int().min(0, 'Position must be 0 or greater')]),
  })
  .superRefine((values, context) => {
    if (values.type !== 'CATEGORY' && values.parentId !== '') {
      context.addIssue({
        code: 'custom',
        path: ['parentId'],
        message: 'Only categories can have a parent',
      });
    }
  });

export type TaxonomyFormValues = z.infer<typeof taxonomyFormSchema>;

export const emptyTaxonomyValues: TaxonomyFormValues = {
  type: 'CATEGORY',
  status: 'ACTIVE',
  name: '',
  slug: '',
  parentId: '',
  position: '',
};

export function taxonomyRowToFormValues(row: TaxonomyRow): TaxonomyFormValues {
  return {
    type: row.type,
    status: row.isActive ? 'ACTIVE' : 'INACTIVE',
    name: row.name,
    slug: row.slug,
    parentId: row.parentId ?? '',
    position: row.position ?? '',
  };
}
