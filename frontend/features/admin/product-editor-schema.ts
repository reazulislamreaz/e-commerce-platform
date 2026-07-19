import { z } from 'zod';
import type { AdminProductDetail, UpdateAdminProductInput } from './types';

const idField = z.object({ id: z.string().uuid('Select an item') });
const mediaUrl = z.string().trim().max(2048).refine((value) => {
  if (value.startsWith('/')) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Enter a valid image URL or upload a file');

export const productEditorSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens'),
    brandId: z.string().uuid('Select a brand'),
    description: z.string().trim().min(10).max(5000),
    primaryColor: z.string().trim().min(1).max(80),
    featuredPosition: z.number().int().min(0),
    isNew: z.boolean(),
    categories: z.array(idField).min(1, 'Add at least one category'),
    collections: z.array(idField),
    colors: z
      .array(
        z.object({
          existingId: z.string().uuid().optional(),
          name: z.string().trim().min(1).max(80),
          hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color'),
        }),
      )
      .min(1, 'Add at least one color'),
    variants: z
      .array(
        z.object({
          existingId: z.string().uuid().optional(),
          sku: z.string().trim().min(1).max(64),
          size: z.string().trim().min(1).max(32),
          color: z.string().trim().min(1).max(80),
        }),
      )
      .min(1, 'Add at least one variant'),
    media: z
      .array(
        z.object({
          existingId: z.string().uuid().optional(),
          url: mediaUrl,
          alt: z.string().trim().min(1).max(240),
          isPrimary: z.boolean(),
        }),
      )
      .min(1, 'Add at least one image'),
  })
  .superRefine((values, context) => {
    const primaryCount = values.media.filter((item) => item.isPrimary).length;
    if (primaryCount !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['media'],
        message: 'Choose exactly one primary image',
      });
    }

    addDuplicateIssues(values.categories.map((item) => item.id), 'categories', 'category', context);
    addDuplicateIssues(
      values.collections.map((item) => item.id),
      'collections',
      'collection',
      context,
    );
    addDuplicateIssues(
      values.colors.map((item) => item.name.toLowerCase()),
      'colors',
      'color name',
      context,
    );
    addDuplicateIssues(
      values.variants.map((item) => item.sku.toLowerCase()),
      'variants',
      'SKU',
      context,
    );
    addDuplicateIssues(
      values.variants.map((item) => `${item.size.toLowerCase()}:${item.color.toLowerCase()}`),
      'variants',
      'size and color combination',
      context,
    );
  });

export type ProductEditorValues = z.infer<typeof productEditorSchema>;

function addDuplicateIssues(
  values: string[],
  path: 'categories' | 'collections' | 'colors' | 'variants',
  label: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: 'custom',
        path: [path, index],
        message: `Duplicate ${label}`,
      });
    }
    seen.add(value);
  });
}

export function productToEditorValues(product: AdminProductDetail): ProductEditorValues {
  return {
    name: product.name,
    slug: product.slug,
    brandId: product.brandId,
    description: product.description,
    primaryColor: product.primaryColor,
    featuredPosition: product.featuredPosition,
    isNew: product.isNew,
    categories: product.categoryIds.map((id) => ({ id })),
    collections: product.collectionIds.map((id) => ({ id })),
    colors: product.colors.map((color) => ({
      existingId: color.id,
      name: color.name,
      hex: color.hex,
    })),
    variants: product.variants.map((variant) => ({
      existingId: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
    })),
    media: product.media.map((item) => ({
      existingId: item.id,
      url: item.url,
      alt: item.alt,
      isPrimary: item.isPrimary,
    })),
  };
}

export function editorValuesToInput(values: ProductEditorValues): UpdateAdminProductInput {
  return {
    name: values.name,
    slug: values.slug,
    brandId: values.brandId,
    description: values.description,
    primaryColor: values.primaryColor,
    featuredPosition: values.featuredPosition,
    isNew: values.isNew,
    categoryIds: values.categories.map((item) => item.id),
    collectionIds: values.collections.map((item) => item.id),
    colors: values.colors.map(({ name, hex }) => ({ name, hex })),
    variants: values.variants.map(({ sku, size, color }) => ({ sku, size, color })),
    media: values.media.map(({ url, alt, isPrimary }, position) => ({
      url,
      alt,
      isPrimary,
      position,
    })),
  };
}
