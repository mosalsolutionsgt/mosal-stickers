import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function removeDarkBackground(inputPath, outputPath) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Get raw RGBA buffer
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();
  const data = new Uint8Array(rawBuffer);

  // Queue-based flood fill from corners
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Add outer border pixels to queue
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
  }

  // Threshold: The background is dark (R,G,B < 80). The sticker border is white (R,G,B > 200).
  // Any dark pixel connected to outer edge should be transparent.
  while (queue.length > 0) {
    const y = queue.pop();
    const x = queue.pop();
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pixelIdx = idx * 4;
    const r = data[pixelIdx];
    const g = data[pixelIdx + 1];
    const b = data[pixelIdx + 2];

    // Compute luminance
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // If it's part of the dark background (brightness < 120 and not pure white border)
    if (brightness < 135) {
      data[pixelIdx + 3] = 0; // Transparent

      // Spread to 4-connected neighbors
      if (x > 0 && !visited[idx - 1]) queue.push(x - 1, y);
      if (x < width - 1 && !visited[idx + 1]) queue.push(x + 1, y);
      if (y > 0 && !visited[idx - width]) queue.push(x, y - 1);
      if (y < height - 1 && !visited[idx + width]) queue.push(x, y + 1);
    }
  }

  // Save as clean PNG
  await sharp(Buffer.from(data), {
    raw: {
      width,
      height,
      channels: 4,
    }
  })
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

  console.log(`Saved transparent PNG to ${outputPath}`);
}

async function main() {
  const dir = '/Users/herbertmoscoso/.gemini/antigravity-ide/scratch/mosal-stickers/public/samples';
  const files = [
    { in: 'cyberpunk-cat.jpg', out: 'cyberpunk-cat.png' },
    { in: 'vaporwave-skull.jpg', out: 'vaporwave-skull.png' },
    { in: 'kawaii-shiba.jpg', out: 'kawaii-shiba.png' },
  ];

  for (const f of files) {
    await removeDarkBackground(path.join(dir, f.in), path.join(dir, f.out));
  }
}

main().catch(console.error);
