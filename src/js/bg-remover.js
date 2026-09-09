/* ==========================================================================
   MOSAL STICKERS - CLIENT-SIDE BACKGROUND REMOVAL & DIECUT CONTOUR GENERATOR
   Removes solid backgrounds (white, black, or flat colors) directly in browser
   using HTML5 Canvas flood-fill algorithm so user uploads become transparent stickers.
   ========================================================================== */

export async function processStickerImage(imageSource, options = {}) {
  const {
    tolerance = 38,
    addWhiteBorder = true,
    borderWidth = 8
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const resultDataUrl = removeBackgroundFromImg(img, tolerance, addWhiteBorder, borderWidth);
        resolve(resultDataUrl);
      } catch (err) {
        console.error('Error processing background removal:', err);
        resolve(img.src); // Fallback to original
      }
    };

    img.onerror = (e) => reject(e);

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else if (imageSource instanceof Blob || imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    }
  });
}

function removeBackgroundFromImg(img, tolerance, addWhiteBorder, borderWidth) {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Scale down slightly if massive for performance (max 1400px)
  let w = width;
  let h = height;
  const maxDim = 1200;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Check if image already has significant transparency
  let transparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) transparentCount++;
  }
  const isAlreadyTransparent = (transparentCount / (w * h)) > 0.05;

  if (isAlreadyTransparent && !addWhiteBorder) {
    // Already transparent PNG and no white contour requested
    return canvas.toDataURL('image/png');
  }

  if (!isAlreadyTransparent) {
    // Determine background color by sampling the 4 corners
    const corners = [
      getPixel(data, w, 0, 0),
      getPixel(data, w, w - 1, 0),
      getPixel(data, w, 0, h - 1),
      getPixel(data, w, w - 1, h - 1)
    ];

    // Average color of corners
    let avgR = 0, avgG = 0, avgB = 0;
    corners.forEach(c => {
      avgR += c.r;
      avgG += c.g;
      avgB += c.b;
    });
    avgR = Math.round(avgR / 4);
    avgG = Math.round(avgG / 4);
    avgB = Math.round(avgB / 4);

    // Connected component flood fill from all perimeter pixels
    const visited = new Uint8Array(w * h);
    const queue = [];

    // Push all border pixels
    for (let x = 0; x < w; x++) {
      queue.push(x, 0);
      queue.push(x, h - 1);
      visited[x] = 1;
      visited[(h - 1) * w + x] = 1;
    }
    for (let y = 0; y < h; y++) {
      queue.push(0, y);
      queue.push(w - 1, y);
      visited[y * w] = 1;
      visited[y * w + (w - 1)] = 1;
    }

    function colorDist(r, g, b, br, bg, bb) {
      return Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2);
    }

    let head = 0;
    while (head < queue.length) {
      const qx = queue[head++];
      const qy = queue[head++];
      const idx = (qy * w + qx) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (colorDist(r, g, b, avgR, avgG, avgB) <= tolerance) {
        // Set transparent
        data[idx + 3] = 0;

        // Check 4 neighbors
        const neighbors = [
          [qx + 1, qy],
          [qx - 1, qy],
          [qx, qy + 1],
          [qx, qy - 1]
        ];

        for (let i = 0; i < neighbors.length; i++) {
          const nx = neighbors[i][0];
          const ny = neighbors[i][1];
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nVisIdx = ny * w + nx;
            if (!visited[nVisIdx]) {
              visited[nVisIdx] = 1;
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    // Put transparent data back
    ctx.putImageData(imgData, 0, 0);
  }

  // If addWhiteBorder is requested, draw sticker white vinyl stroke around the alpha silhouette
  if (addWhiteBorder) {
    const contourCanvas = document.createElement('canvas');
    contourCanvas.width = w + borderWidth * 4;
    contourCanvas.height = h + borderWidth * 4;
    const cctx = contourCanvas.getContext('2d');

    const offset = borderWidth * 2;

    // Create solid white silhouette shadow/dilation
    cctx.shadowColor = '#ffffff';
    cctx.shadowBlur = borderWidth;
    for (let step = 0; step < 4; step++) {
      cctx.drawImage(canvas, offset, offset);
    }

    // Draw multiple offset copies to create a smooth solid white vinyl border
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dx = Math.cos(angle) * borderWidth;
      const dy = Math.sin(angle) * borderWidth;
      cctx.drawImage(canvas, offset + dx, offset + dy);
    }

    // Tint the dilated background pure white
    cctx.globalCompositeOperation = 'source-in';
    cctx.fillStyle = '#ffffff';
    cctx.fillRect(0, 0, contourCanvas.width, contourCanvas.height);

    // Draw original image on top of white contour
    cctx.globalCompositeOperation = 'source-over';
    cctx.drawImage(canvas, offset, offset);

    return contourCanvas.toDataURL('image/png');
  }

  return canvas.toDataURL('image/png');
}

function getPixel(data, width, x, y) {
  const idx = (y * width + x) * 4;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3]
  };
}
