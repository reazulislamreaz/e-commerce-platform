import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  detectImageSignature,
  PRODUCT_IMAGE_MAX_BYTES,
  ProductImageStorageService,
  type UploadedImageFile,
} from './product-image-storage.service';

const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const pngBytes = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('IHDR-payload'),
]);
const webpBytes = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 '),
]);

function makeFile(overrides: Partial<UploadedImageFile> = {}): UploadedImageFile {
  const buffer = overrides.buffer ?? pngBytes;
  return {
    originalname: 'photo.png',
    mimetype: 'image/png',
    size: buffer.length,
    buffer,
    ...overrides,
  };
}

describe('detectImageSignature', () => {
  it('detects JPEG magic bytes', () => {
    expect(detectImageSignature(jpegBytes)).toEqual({ mime: 'image/jpeg', extension: 'jpg' });
  });

  it('detects PNG magic bytes', () => {
    expect(detectImageSignature(pngBytes)).toEqual({ mime: 'image/png', extension: 'png' });
  });

  it('detects WebP RIFF container', () => {
    expect(detectImageSignature(webpBytes)).toEqual({ mime: 'image/webp', extension: 'webp' });
  });

  it('rejects non-image content', () => {
    expect(detectImageSignature(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectImageSignature(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectImageSignature(Buffer.alloc(0))).toBeNull();
  });

  it('rejects a RIFF container that is not WebP', () => {
    const avi = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from('AVI LIST'),
    ]);
    expect(detectImageSignature(avi)).toBeNull();
  });
});

describe('ProductImageStorageService', () => {
  let uploadDir: string;
  let service: ProductImageStorageService;

  beforeEach(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'product-images-'));
    const config = { get: jest.fn().mockReturnValue(uploadDir) } as unknown as ConfigService;
    service = new ProductImageStorageService(config);
  });

  afterEach(async () => {
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('stores a valid image under a server-generated name and returns its relative URL', async () => {
    const result = await service.store(makeFile());

    expect(result.url).toBe(`/uploads/products/${result.filename}`);
    expect(result.filename).toMatch(/^[a-z0-9]+-[0-9a-f-]{36}\.png$/);
    expect(result.filename).not.toContain('photo');

    const written = await readFile(join(uploadDir, result.filename));
    expect(written.equals(pngBytes)).toBe(true);
  });

  it('derives the stored extension from content, ignoring the original filename', async () => {
    const result = await service.store(
      makeFile({
        originalname: '../../../etc/passwd.png.exe',
        mimetype: 'image/jpeg',
        buffer: jpegBytes,
        size: jpegBytes.length,
      }),
    );

    expect(result.filename.endsWith('.jpg')).toBe(true);
    expect(await readdir(uploadDir)).toEqual([result.filename]);
  });

  it('generates distinct filenames for identical uploads', async () => {
    const first = await service.store(makeFile());
    const second = await service.store(makeFile());
    expect(first.filename).not.toBe(second.filename);
  });

  it('rejects a missing file', async () => {
    await expect(service.store(undefined)).rejects.toThrow(
      new BadRequestException('Image file is required'),
    );
  });

  it('rejects files above the size limit', async () => {
    const file = makeFile({ size: PRODUCT_IMAGE_MAX_BYTES + 1 });
    await expect(service.store(file)).rejects.toThrow(
      new BadRequestException('Image must be 8 MB or smaller'),
    );
  });

  it('rejects disallowed MIME types', async () => {
    const file = makeFile({ mimetype: 'image/gif' });
    await expect(service.store(file)).rejects.toThrow(
      new BadRequestException('Only JPEG, PNG, or WebP images are allowed'),
    );
  });

  it('rejects content that is not a real image despite an allowed MIME type', async () => {
    const buffer = Buffer.from('#!/bin/sh\nrm -rf /');
    const file = makeFile({ buffer, size: buffer.length });
    await expect(service.store(file)).rejects.toThrow(
      new BadRequestException('File content is not a valid JPEG, PNG, or WebP image'),
    );
  });

  it('rejects content whose signature does not match the declared MIME type', async () => {
    const file = makeFile({ mimetype: 'image/png', buffer: jpegBytes, size: jpegBytes.length });
    await expect(service.store(file)).rejects.toThrow(
      new BadRequestException('File content does not match its declared image type'),
    );
  });
});
