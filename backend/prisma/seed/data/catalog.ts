/**
 * Seed catalog fixture adapter.
 * Re-exports storefront product rows. The production backend image must COPY:
 *   frontend/features/products/data.ts
 *   frontend/features/products/types.ts
 * Keep `data.ts` free of value-imports to other frontend modules (Dockerfile
 * smoke-checks this path at image build time).
 */
export { catalogProducts } from '../../../../frontend/features/products/data';
