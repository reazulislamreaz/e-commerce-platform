import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { PRODUCT_UPLOADS_URL_PREFIX, resolveProductUploadDir } from '@/config/uploads';

/** Uploaded file shape provided by multer memory storage. */
export interface UploadedImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface DetectedImage {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Detects the real image type from the file's magic bytes (not the declared MIME). */
export function detectImageSignature(buffer: Buffer): DetectedImage | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.length >= 8 && PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }
  return null;
}

/** Early multipart guardrails; content-level validation happens in the storage service. */
export const productImageMulterOptions: MulterOptions = {
  limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestException('Only JPEG, PNG, or WebP images are allowed'), false);
      return;
    }
    callback(null, true);
  },
};

@Injectable()
export class ProductImageStorageService {
  private readonly uploadDir: string;

  constructor(config: ConfigService) {
    this.uploadDir = resolveProductUploadDir(config);
  }

  async store(file: UploadedImageFile | undefined): Promise<{ url: string; filename: string }> {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES || file.buffer.length > PRODUCT_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Image must be 8 MB or smaller');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, or WebP images are allowed');
    }

    const detected = detectImageSignature(file.buffer);
    if (!detected) {
      throw new BadRequestException('File content is not a valid JPEG, PNG, or WebP image');
    }
    if (detected.mime !== file.mimetype) {
      throw new BadRequestException('File content does not match its declared image type');
    }

    // Server-generated name only — caller-supplied names/paths are never used on disk.
    const filename = `${Date.now().toString(36)}-${randomUUID()}.${detected.extension}`;
    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(join(this.uploadDir, filename), file.buffer, { flag: 'wx', mode: 0o644 });

    return { url: `${PRODUCT_UPLOADS_URL_PREFIX}/${filename}`, filename };
  }
}
