import { resolve } from 'node:path';
import type { ConfigService } from '@nestjs/config';

/** Public URL prefix under which stored product images are served. */
export const PRODUCT_UPLOADS_URL_PREFIX = '/uploads/products';

/**
 * Resolves the on-disk directory for product image uploads.
 * Configurable via PRODUCT_UPLOAD_DIR; defaults to `uploads/products`
 * relative to the backend working directory (backend/uploads/products).
 */
export function resolveProductUploadDir(config: ConfigService): string {
  const configured = config.get<string>('PRODUCT_UPLOAD_DIR')?.trim();
  return configured ? resolve(configured) : resolve(process.cwd(), 'uploads', 'products');
}
