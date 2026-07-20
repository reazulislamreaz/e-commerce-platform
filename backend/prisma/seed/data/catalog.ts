/**
 * Seed catalog fixture adapter.
 * Re-exports the storefront fixture so Docker/image layout stays explicit:
 * only `data.ts` + `types.ts` (+ `constants.ts` if present) are required in the image.
 */
export { catalogProducts } from '../../../../frontend/features/products/data';
