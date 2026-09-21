/* ==========================================================================
   MOSAL STICKERS - PRECISION CUTLINE PREPRESS PROOF GENERATOR
   Universal 2D Marching Squares & Dilation Engine
   Adapts flawlessly to ANY uploaded image (wide logos, tall art, irregular shapes,
   transparent PNGs and white-background JPGs).
   ========================================================================== */

const contourCache = new Map();

/**
 * Updates the SVG cutline overlay path based on current sticker shape & image
 */
export function renderCutlinePaths(svgElement, shape = 'die-cut', imageSrc = null) {
  if (!svgElement) return;

  svgElement.setAttribute('viewBox', '0 0 300 300');
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const cx = 150;
  const cy = 150;

  let cutPathD = '';

  switch (shape) {
    case 'circle': {
      const r = 138;
      cutPathD = `M ${cx},${cy - r} A ${r},${r} 0 1,0 ${cx},${cy + r} A ${r},${r} 0 1,0 ${cx},${cy - r} Z`;
      break;
    }

    case 'square': {
      cutPathD = `M 14,14 H 286 V 286 H 14 Z`;
      break;
    }

    case 'rounded': {
      const rx = 32;
      cutPathD = `M ${14 + rx},14 H ${286 - rx} A ${rx},${rx} 0 0 1 286,${14 + rx} V ${286 - rx} A ${rx},${rx} 0 0 1 ${286 - rx},286 H ${14 + rx} A ${rx},${rx} 0 0 1 14,${286 - rx} V ${14 + rx} A ${rx},${rx} 0 0 1 ${14 + rx},14 Z`;
      break;
    }

    case 'die-cut':
    default: {
      if (imageSrc && contourCache.has(imageSrc)) {
        cutPathD = contourCache.get(imageSrc);
      } else if (imageSrc) {
        // Immediate smooth organic fallback while image contour processes
        cutPathD = getFallbackDiecutContour(cx, cy);

        computeUniversalContour(imageSrc).then(resD => {
          if (resD) {
            contourCache.set(imageSrc, resD);
            if (svgElement.dataset.currentShape === 'die-cut' && svgElement.dataset.currentSrc === imageSrc) {
              applySvgPath(svgElement, resD);
            }
          }
        }).catch(err => {
          console.warn('Contour generation fallback used:', err);
        });
      } else {
        cutPathD = getFallbackDiecutContour(cx, cy);
      }
      break;
    }
  }

  svgElement.dataset.currentShape = shape;
  if (imageSrc) svgElement.dataset.currentSrc = imageSrc;

  applySvgPath(svgElement, cutPathD);
}

function applySvgPath(svgElement, cutPathD) {
  svgElement.innerHTML = `<path class="cutline-diecut-path" d="${cutPathD}" />`;
}

/**
 * Universal 2D Image Contour Algorithm
 * Uses offscreen canvas, aspect-ratio preservation, alpha/white-background detection,
 * circular morphological dilation, and Marching Squares isoline tracing.
 */
function computeUniversalContour(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width || 300;
        const naturalH = img.naturalHeight || img.height || 300;
        const aspect = naturalW / naturalH;

        // Grid resolution for analysis (180x180 is high precision & executes in ~3ms)
        const W = 180;
        const H = 180;
        const maxBox = 152; // Leaves room for die-cut border margin

        let drawW, drawH;
        if (aspect >= 1) {
          drawW = maxBox;
          drawH = Math.max(20, Math.round(maxBox / aspect));
        } else {
          drawH = maxBox;
          drawW = Math.max(20, Math.round(maxBox * aspect));
        }
        const drawX = Math.round((W - drawW) / 2);
        const drawY = Math.round((H - drawH) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        const imgData = ctx.getImageData(0, 0, W, H).data;

        // Check if image has transparency or is solid (like a JPG)
        let transparentPixels = 0;
        for (let i = 3; i < imgData.length; i += 4) {
          if (imgData[i] < 40) transparentPixels++;
        }
        const hasTransparency = transparentPixels > (drawW * drawH * 0.04);

        // Check corner background color if opaque
        let isLightBg = false;
        if (!hasTransparency) {
          const cTL = getPixelAt(imgData, W, drawX, drawY);
          const cTR = getPixelAt(imgData, W, drawX + drawW - 1, drawY);
          const cBL = getPixelAt(imgData, W, drawX, drawY + drawH - 1);
          const cBR = getPixelAt(imgData, W, drawX + drawW - 1, drawY + drawH - 1);
          const avgLight = (cTL.r + cTL.g + cTL.b + cTR.r + cTR.g + cTR.b + cBL.r + cBL.g + cBL.b + cBR.r + cBR.g + cBR.b) / 12;
          isLightBg = avgLight > 220;
        }

        // Build scalar foreground alpha field
        const alphaField = new Float32Array(W * H);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const idx = (y * W + x) * 4;
            const a = imgData[idx + 3];
            if (hasTransparency) {
              alphaField[y * W + x] = a > 35 ? a : 0;
            } else if (isLightBg) {
              const r = imgData[idx];
              const g = imgData[idx + 1];
              const b = imgData[idx + 2];
              const isWhitePixel = (r > 230 && g > 230 && b > 230);
              alphaField[y * W + x] = isWhitePixel ? 0 : 255;
            } else {
              // Full bleed opaque artwork
              if (x >= drawX && x < drawX + drawW && y >= drawY && y < drawY + drawH) {
                alphaField[y * W + x] = 255;
              }
            }
          }
        }

        // Dilate the field by cutline margin (radius = 6px in 180 grid -> ~10px in 300 viewBox = ~3.5mm margin)
        const radius = 6;
        const dilated = new Float32Array(W * H);
        const rSquared = radius * radius;

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            let maxVal = 0;
            for (let dy = -radius; dy <= radius; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= H) continue;
              const dy2 = dy * dy;
              for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy2 <= rSquared) {
                  const nx = x + dx;
                  if (nx >= 0 && nx < W) {
                    const val = alphaField[ny * W + nx];
                    if (val > maxVal) maxVal = val;
                  }
                }
              }
            }
            dilated[y * W + x] = maxVal;
          }
        }

        // Marching Squares Isoline Tracing
        const segments = [];
        const T = 50;

        for (let y = 0; y < H - 1; y++) {
          for (let x = 0; x < W - 1; x++) {
            const v0 = dilated[y * W + x];
            const v1 = dilated[y * W + (x + 1)];
            const v2 = dilated[(y + 1) * W + (x + 1)];
            const v3 = dilated[(y + 1) * W + x];

            const code = (v0 >= T ? 8 : 0) | (v1 >= T ? 4 : 0) | (v2 >= T ? 2 : 0) | (v3 >= T ? 1 : 0);
            if (code === 0 || code === 15) continue;

            const topPt = { x: x + (T - v0) / (v1 - v0 || 1), y: y };
            const rightPt = { x: x + 1, y: y + (T - v1) / (v2 - v1 || 1) };
            const botPt = { x: x + (T - v3) / (v2 - v3 || 1), y: y + 1 };
            const leftPt = { x: x, y: y + (T - v0) / (v3 - v0 || 1) };

            switch (code) {
              case 1: segments.push([leftPt, botPt]); break;
              case 2: segments.push([botPt, rightPt]); break;
              case 3: segments.push([leftPt, rightPt]); break;
              case 4: segments.push([topPt, rightPt]); break;
              case 5: segments.push([leftPt, topPt], [botPt, rightPt]); break;
              case 6: segments.push([topPt, botPt]); break;
              case 7: segments.push([leftPt, topPt]); break;
              case 8: segments.push([topPt, leftPt]); break;
              case 9: segments.push([botPt, topPt]); break;
              case 10: segments.push([topPt, rightPt], [leftPt, botPt]); break;
              case 11: segments.push([rightPt, topPt]); break;
              case 12: segments.push([rightPt, leftPt]); break;
              case 13: segments.push([rightPt, botPt]); break;
              case 14: segments.push([botPt, leftPt]); break;
            }
          }
        }

        const loop = chainContourSegments(segments);
        if (loop.length < 4) {
          resolve(getAspectBoundedCutContour(drawX, drawY, drawW, drawH, 300 / W));
          return;
        }

        // Simplify polygon with RDP
        const simplified = ramerDouglasPeucker(loop, 1.25);

        // Convert points to smooth cubic Bézier SVG path scaled to 300x300 viewBox
        const scale = 300 / W;
        const svgPathD = pointsToSmoothSvg(simplified, scale);
        resolve(svgPathD);
      } catch (err) {
        console.error('Error in computeUniversalContour:', err);
        resolve(getFallbackDiecutContour(150, 150));
      }
    };

    img.onerror = (e) => {
      console.warn('Image load error for contour trace:', e);
      resolve(getFallbackDiecutContour(150, 150));
    };

    img.src = imageSrc;
  });
}

function getPixelAt(data, width, x, y) {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

/**
 * Chains independent line segments into a closed polygon perimeter
 */
function chainContourSegments(segments) {
  if (!segments.length) return [];

  const remaining = segments.map((s, idx) => ({ id: idx, p0: s[0], p1: s[1], used: false }));
  const loops = [];

  for (const s of remaining) {
    if (s.used) continue;
    s.used = true;
    const loop = [s.p0, s.p1];
    let curr = s.p1;

    while (true) {
      let bestIdx = -1;
      let bestDist = 2.0;

      for (let j = 0; j < remaining.length; j++) {
        if (remaining[j].used) continue;
        const d0 = Math.hypot(remaining[j].p0.x - curr.x, remaining[j].p0.y - curr.y);
        if (d0 < bestDist) {
          bestDist = d0;
          bestIdx = j;
          break;
        }
      }

      if (bestIdx !== -1) {
        const nextSeg = remaining[bestIdx];
        nextSeg.used = true;
        loop.push(nextSeg.p1);
        curr = nextSeg.p1;
        if (Math.hypot(curr.x - loop[0].x, curr.y - loop[0].y) < 2.5) {
          break;
        }
      } else {
        break;
      }
    }

    if (loop.length > 8) {
      loops.push(loop);
    }
  }

  loops.sort((a, b) => b.length - a.length);
  return loops[0] || [];
}

/**
 * Ramer-Douglas-Peucker polygon simplification
 */
function ramerDouglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDist(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const r1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const r2 = ramerDouglasPeucker(points.slice(index), epsilon);
    return r1.slice(0, r1.length - 1).concat(r2);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDist(pt, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
  const u = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (mag * mag);
  const x = lineStart.x + u * dx;
  const y = lineStart.y + u * dy;
  return Math.hypot(pt.x - x, pt.y - y);
}

/**
 * Converts closed polygon points into silky-smooth cubic Bézier SVG path
 */
function pointsToSmoothSvg(pts, scale = 1) {
  if (pts.length < 3) return '';
  const n = pts.length;
  let d = `M ${(pts[0].x * scale).toFixed(1)},${(pts[0].y * scale).toFixed(1)}`;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    // Smooth Catmull-Rom to Cubic Bézier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${(cp1x * scale).toFixed(1)},${(cp1y * scale).toFixed(1)} ${(cp2x * scale).toFixed(1)},${(cp2y * scale).toFixed(1)} ${(p2.x * scale).toFixed(1)},${(p2.y * scale).toFixed(1)}`;
  }

  return d + ' Z';
}

function getAspectBoundedCutContour(x, y, w, h, scale) {
  const pad = 8;
  const rx = Math.max(10, (x - pad) * scale);
  const ry = Math.max(10, (y - pad) * scale);
  const rw = Math.min(280, (w + pad * 2) * scale);
  const rh = Math.min(280, (h + pad * 2) * scale);
  const radius = 24;

  return `M ${rx + radius},${ry} H ${rx + rw - radius} A ${radius},${radius} 0 0 1 ${rx + rw},${ry + radius} V ${ry + rh - radius} A ${radius},${radius} 0 0 1 ${rx + rw - radius},${ry + rh} H ${rx + radius} A ${radius},${radius} 0 0 1 ${rx},${ry + rh - radius} V ${ry + radius} A ${radius},${radius} 0 0 1 ${rx + radius},${ry} Z`;
}

function getFallbackDiecutContour(cx, cy) {
  const steps = 48;
  const points = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const wave = Math.sin(angle * 3) * 6 + Math.cos(angle * 5) * 4;
    const r = 130 + wave;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  return pointsToSmoothSvg(points, 1);
}
