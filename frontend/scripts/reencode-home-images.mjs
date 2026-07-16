/**
 * Clean re-encode of homepage images from restored sources.
 * No AI upscaling — avoids tile/glitch artifacts.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const HOME = path.resolve('public/images/home');
const SRC = path.join(HOME, '_src');

/** Large assets: keep native resolution. Tiny assets: gentle 2× Lanczos only. */
const JOBS = [
  { file: 'hero.jpg', stem: 'hero', scale: 1, quality: 88 },
  { file: 'about-models.jpg', stem: 'about-models', scale: 2, quality: 85 },
  { file: 'collection-men.jpg', stem: 'collection-men', scale: 2, quality: 85 },
  { file: 'collection-women.jpg', stem: 'collection-women', scale: 2, quality: 85 },
  { file: 'collection-new.jpg', stem: 'collection-new', scale: 2, quality: 85 },
  { file: 'collection-sale.jpg', stem: 'collection-sale', scale: 2, quality: 85 },
  { file: 'product-1.jpg', stem: 'product-1', scale: 1, quality: 88 },
  { file: 'product-2.jpg', stem: 'product-2', scale: 1, quality: 88 },
  { file: 'product-3.jpg', stem: 'product-3', scale: 1, quality: 88 },
  { file: 'product-4.jpeg', stem: 'product-4', scale: 1, quality: 88 },
  { file: 'product-5.jpeg', stem: 'product-5', scale: 1, quality: 88 },
  { file: 'product-6.jpeg', stem: 'product-6', scale: 1, quality: 88 },
  { file: 'instagram-1.jpg', stem: 'instagram-1', scale: 2, quality: 85 },
  { file: 'instagram-2.jpg', stem: 'instagram-2', scale: 2, quality: 85 },
  { file: 'instagram-3.jpg', stem: 'instagram-3', scale: 2, quality: 85 },
  { file: 'instagram-4.jpg', stem: 'instagram-4', scale: 2, quality: 85 },
  { file: 'instagram-5.jpg', stem: 'instagram-5', scale: 2, quality: 85 },
  { file: 'instagram-6.jpg', stem: 'instagram-6', scale: 2, quality: 85 },
  { file: 'instagram-7.jpg', stem: 'instagram-7', scale: 2, quality: 85 },
  { file: 'instagram-8.jpg', stem: 'instagram-8', scale: 2, quality: 85 },
];

async function encodeOne({ file, stem, scale, quality }) {
  const input = path.join(SRC, file);
  const meta = await sharp(input, { failOn: 'none' }).metadata();
  const width = Math.round(meta.width * scale);
  const height = Math.round(meta.height * scale);

  let pipeline = sharp(input, { failOn: 'none' }).rotate();

  if (scale !== 1) {
    pipeline = pipeline.resize(width, height, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill',
    });
  }

  // Mild clarity only — never aggressive enough to invent tile artifacts.
  const buffer = await pipeline
    .modulate({ brightness: 1.01, saturation: 1.02 })
    .sharpen({ sigma: 0.4, m1: 0.45, m2: 0.2 })
    .toBuffer({ resolveWithObject: true });

  const webpPath = path.join(HOME, `${stem}.webp`);
  const jpgPath = path.join(HOME, `${stem}.jpg`);

  await sharp(buffer.data)
    .webp({ quality, effort: 6, smartSubsample: true, nearLossless: false })
    .toFile(webpPath);

  // High-quality JPEG masters as a reliable fallback / cache-bust source.
  await sharp(buffer.data)
    .jpeg({ quality: Math.min(quality + 4, 92), mozjpeg: true })
    .toFile(jpgPath);

  // Validate decode integrity
  const check = await sharp(webpPath).stats();
  const channels = check.channels.map((c) => c.mean);
  const ok = channels.every((m) => Number.isFinite(m));

  const stat = await fs.stat(webpPath);
  return {
    stem,
    size: `${buffer.info.width}x${buffer.info.height}`,
    kb: Math.round(stat.size / 1024),
    ok,
  };
}

async function main() {
  for (const job of JOBS) {
    process.stdout.write(`${job.stem}… `);
    const result = await encodeOne(job);
    console.log(`${result.size} ${result.kb}KB ${result.ok ? 'ok' : 'BAD'}`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
