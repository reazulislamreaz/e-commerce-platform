/**
 * Finalize homepage images from AI-upscaled (or original) sources → WebP/AVIF + responsive ladder.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const HOME = path.resolve('public/images/home');
const AI = path.join(HOME, '_ai');
const BACKUP = path.join(HOME, '_backup');
const RESP = path.join(HOME, 'responsive');

const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536, 1920, 2560];

/** Prefer AI PNG when present; otherwise backup original. Cap long edge for web. */
const ASSETS = [
  { stem: 'hero', sources: ['hero.png', 'hero.jpg'], maxLong: 2560 },
  { stem: 'about-models', sources: ['about-models.png', 'about-models.jpg'], maxLong: 1600 },
  { stem: 'collection-men', sources: ['collection-men.png', 'collection-men.jpg'], maxLong: 1200 },
  { stem: 'collection-women', sources: ['collection-women.png', 'collection-women.jpg'], maxLong: 1200 },
  { stem: 'collection-new', sources: ['collection-new.png', 'collection-new.jpg'], maxLong: 1200 },
  { stem: 'collection-sale', sources: ['collection-sale.png', 'collection-sale.jpg'], maxLong: 1200 },
  { stem: 'product-1', sources: ['product-1.png', 'product-1.jpg'], maxLong: 1400 },
  { stem: 'product-2', sources: ['product-2.png', 'product-2.jpg'], maxLong: 1400 },
  { stem: 'product-3', sources: ['product-3.png', 'product-3.jpg'], maxLong: 1400 },
  { stem: 'product-4', sources: ['product-4.png', 'product-4.jpeg'], maxLong: 1600 },
  { stem: 'product-5', sources: ['product-5.png', 'product-5.jpeg'], maxLong: 1600 },
  { stem: 'product-6', sources: ['product-6.png', 'product-6.jpeg'], maxLong: 1600 },
  { stem: 'instagram-1', sources: ['instagram-1.png', 'instagram-1.jpg'], maxLong: 800 },
  { stem: 'instagram-2', sources: ['instagram-2.png', 'instagram-2.jpg'], maxLong: 800 },
  { stem: 'instagram-3', sources: ['instagram-3.png', 'instagram-3.jpg'], maxLong: 800 },
  { stem: 'instagram-4', sources: ['instagram-4.png', 'instagram-4.jpg'], maxLong: 800 },
  { stem: 'instagram-5', sources: ['instagram-5.png', 'instagram-5.jpg'], maxLong: 800 },
  { stem: 'instagram-6', sources: ['instagram-6.png', 'instagram-6.jpg'], maxLong: 800 },
  { stem: 'instagram-7', sources: ['instagram-7.png', 'instagram-7.jpg'], maxLong: 800 },
  { stem: 'instagram-8', sources: ['instagram-8.png', 'instagram-8.jpg'], maxLong: 800 },
];

async function resolveSource(sources) {
  for (const name of sources) {
    for (const dir of [AI, BACKUP]) {
      const p = path.join(dir, name);
      try {
        await fs.access(p);
        return p;
      } catch {
        /* continue */
      }
    }
  }
  throw new Error(`No source for ${sources.join(', ')}`);
}

async function processAsset({ stem, sources, maxLong }) {
  const src = await resolveSource(sources);
  const meta = await sharp(src, { failOn: 'none' }).metadata();
  const long = Math.max(meta.width, meta.height);
  const scale = long > maxLong ? maxLong / long : 1;
  const width = Math.round(meta.width * scale);
  const height = Math.round(meta.height * scale);

  // Light polish only — Real-ESRGAN already restored detail.
  const buffer = await sharp(src, { failOn: 'none' })
    .rotate()
    .resize(width, height, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill',
      withoutEnlargement: false,
    })
    .modulate({ brightness: 1.01, saturation: 1.03 })
    .linear(1.04, -(128 * 0.04))
    .sharpen({ sigma: 0.45, m1: 0.5, m2: 0.25 })
    .toBuffer({ resolveWithObject: true });

  const webpPath = path.join(HOME, `${stem}.webp`);
  const avifPath = path.join(HOME, `${stem}.avif`);

  await sharp(buffer.data)
    .webp({ quality: 86, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(webpPath);

  await sharp(buffer.data)
    .avif({ quality: 68, effort: 6, chromaSubsampling: '4:2:0' })
    .toFile(avifPath);

  const respDir = path.join(RESP, stem);
  await fs.mkdir(respDir, { recursive: true });
  const widths = RESPONSIVE_WIDTHS.filter((w) => w <= buffer.info.width);
  if (!widths.includes(buffer.info.width)) widths.push(buffer.info.width);
  widths.sort((a, b) => a - b);

  for (const w of widths) {
    await sharp(buffer.data)
      .resize(w, null, { kernel: sharp.kernel.lanczos3, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toFile(path.join(respDir, `${stem}-${w}.webp`));
  }

  const webpStat = await fs.stat(webpPath);
  const avifStat = await fs.stat(avifPath);
  return {
    stem,
    from: path.basename(src),
    size: `${buffer.info.width}x${buffer.info.height}`,
    webpKB: Math.round(webpStat.size / 1024),
    avifKB: Math.round(avifStat.size / 1024),
    widths,
  };
}

async function main() {
  await fs.rm(RESP, { recursive: true, force: true });
  await fs.mkdir(RESP, { recursive: true });

  const results = [];
  for (const asset of ASSETS) {
    process.stdout.write(`${asset.stem}… `);
    const result = await processAsset(asset);
    results.push(result);
    console.log(
      `${result.from} → ${result.size} | webp ${result.webpKB}KB | avif ${result.avifKB}KB`,
    );
  }

  await fs.writeFile(path.join(HOME, 'manifest.json'), JSON.stringify(results, null, 2));
  console.log(`\nWrote ${results.length} WebP/AVIF masters + responsive variants.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
