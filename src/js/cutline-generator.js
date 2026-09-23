/* ==========================================================================
   MOSAL STICKERS - PRECISION CUTLINE PREPRESS PROOF GENERATOR
   Universal 2D Moore-Neighbor Boundary Tracing & Cubic Bézier Engine
   Adapts flawlessly to ANY image (wide logos, tall art, irregular silhouettes,
   transparent PNGs, and white-background JPGs).
   ========================================================================== */

const contourCache = new Map();

/**
 * Updates the SVG cutline overlay path based on current sticker shape, image & cut margin thickness
 */
export function renderCutlinePaths(svgElement, shape = 'die-cut', imageSrc = null, cutMarginMm = 2.0) {
  if (!svgElement) return;

  const viewBoxSize = 290;
  svgElement.setAttribute('viewBox', `0 0 ${viewBoxSize} ${viewBoxSize}`);
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const cx = 145;
  const cy = 145;

  let cutPathD = '';

  switch (shape) {
    case 'circle': {
      const r = Math.min(143, Math.max(135, Math.round(136 + cutMarginMm * 1.8)));
      cutPathD = `M ${cx},${cy - r} A ${r},${r} 0 1,0 ${cx},${cy + r} A ${r},${r} 0 1,0 ${cx},${cy - r} Z`;
      break;
    }

    case 'square': {
      const pad = Math.max(2, Math.round(8 - cutMarginMm * 1.2));
      const r = 6;
      cutPathD = `M ${pad + r},${pad} H ${viewBoxSize - pad - r} A ${r},${r} 0 0 1 ${viewBoxSize - pad},${pad + r} V ${viewBoxSize - pad - r} A ${r},${r} 0 0 1 ${viewBoxSize - pad - r},${viewBoxSize - pad} H ${pad + r} A ${r},${r} 0 0 1 ${pad},${viewBoxSize - pad - r} V ${pad + r} A ${r},${r} 0 0 1 ${pad + r},${pad} Z`;
      break;
    }

    case 'rounded': {
      const pad = Math.max(2, Math.round(8 - cutMarginMm * 1.2));
      const rx = 34;
      cutPathD = `M ${pad + rx},${pad} H ${viewBoxSize - pad - rx} A ${rx},${rx} 0 0 1 ${viewBoxSize - pad},${pad + rx} V ${viewBoxSize - pad - rx} A ${rx},${rx} 0 0 1 ${viewBoxSize - pad - rx},${viewBoxSize - pad} H ${pad + rx} A ${rx},${rx} 0 0 1 ${pad},${viewBoxSize - pad - rx} V ${pad + rx} A ${rx},${rx} 0 0 1 ${pad + rx},${pad} Z`;
      break;
    }

    case 'die-cut':
    default: {
      const cacheKey = `${imageSrc}__m${cutMarginMm}`;
      if (imageSrc && contourCache.has(cacheKey)) {
        cutPathD = contourCache.get(cacheKey);
      } else if (imageSrc) {
        // Immediate smooth organic fallback while image contour processes
        cutPathD = getFallbackDiecutContour(cx, cy, cutMarginMm);

        computeUniversalContour(imageSrc, cutMarginMm).then(resD => {
          if (resD) {
            contourCache.set(cacheKey, resD);
            if (svgElement.dataset.currentShape === 'die-cut' &&
                svgElement.dataset.currentSrc === imageSrc &&
                parseFloat(svgElement.dataset.currentMargin) === cutMarginMm) {
              applySvgPath(svgElement, resD);
            }
          }
        }).catch(err => {
          console.warn('Contour generation fallback used:', err);
        });
      } else {
        cutPathD = getFallbackDiecutContour(cx, cy, cutMarginMm);
      }
      break;
    }
  }

  svgElement.dataset.currentShape = shape;
  svgElement.dataset.currentMargin = cutMarginMm;
  if (imageSrc) svgElement.dataset.currentSrc = imageSrc;

  applySvgPath(svgElement, cutPathD);
}

function applySvgPath(svgElement, cutPathD) {
  svgElement.innerHTML = `<path class="cutline-diecut-path" d="${cutPathD}" />`;
}

/**
 * Universal 2D Image Contour Algorithm
 * Uses offscreen canvas, aspect-ratio preservation, alpha/white-background detection,
 * circular morphological dilation, and Moore-Neighbor 8-connected boundary tracing.
 */
function computeUniversalContour(imageSrc, cutMarginMm = 2.0) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width || 300;
        const naturalH = img.naturalHeight || img.height || 300;
        const aspect = naturalW / naturalH;

        const viewBoxSize = 290;
        const maxBox = 270;

        let drawW, drawH;
        if (aspect >= 1) {
          drawW = maxBox;
          drawH = Math.max(20, Math.round(maxBox / aspect));
        } else {
          drawH = maxBox;
          drawW = Math.max(20, Math.round(maxBox * aspect));
        }
        const drawX = 10 + Math.round((maxBox - drawW) / 2);
        const drawY = 10 + Math.round((maxBox - drawH) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = viewBoxSize;
        canvas.height = viewBoxSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, viewBoxSize, viewBoxSize);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        const imgData = ctx.getImageData(0, 0, viewBoxSize, viewBoxSize).data;
        const grid = new Uint8Array(viewBoxSize * viewBoxSize);

        // Check if image has transparency or is solid (like a JPG)
        let transparentCount = 0;
        const totalDrawn = drawW * drawH;
        for (let i = 3; i < imgData.length; i += 4) {
          if (imgData[i] < 35) transparentCount++;
        }
        const hasTransp = transparentCount > (totalDrawn * 0.03);

        // Check corner background color if opaque
        let isLightBg = false;
        if (!hasTransp) {
          const getP = (cx, cy) => {
            const idx = (cy * viewBoxSize + cx) * 4;
            return (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
          };
          const avgCorners = (
            getP(drawX, drawY) +
            getP(drawX + drawW - 1, drawY) +
            getP(drawX, drawY + drawH - 1) +
            getP(drawX + drawW - 1, drawY + drawH - 1)
          ) / 4;
          isLightBg = avgCorners > 215;
        }

        // Fill binary foreground grid
        for (let dy = 0; dy < drawH; dy++) {
          for (let dx = 0; dx < drawW; dx++) {
            const srcIdx = ((drawY + dy) * viewBoxSize + (drawX + dx)) * 4;
            const targetIdx = (drawY + dy) * viewBoxSize + (drawX + dx);
            if (hasTransp) {
              if (imgData[srcIdx + 3] > 35) grid[targetIdx] = 1;
            } else if (isLightBg) {
              const r = imgData[srcIdx];
              const g = imgData[srcIdx + 1];
              const b = imgData[srcIdx + 2];
              const isWhite = (r > 220 && g > 220 && b > 220);
              if (!isWhite) grid[targetIdx] = 1;
            } else {
              grid[targetIdx] = 1;
            }
          }
        }

        // Morphological Dilation based on cut margin (radius 2px to 16px)
        const radius = Math.min(18, Math.max(2, Math.round(cutMarginMm * 2.8)));
        const dilated = new Uint8Array(viewBoxSize * viewBoxSize);
        const r2 = radius * radius;

        for (let y = 0; y < viewBoxSize; y++) {
          for (let x = 0; x < viewBoxSize; x++) {
            if (grid[y * viewBoxSize + x] === 1) {
              for (let dy = -radius; dy <= radius; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= viewBoxSize) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                  const nx = x + dx;
                  if (nx < 0 || nx >= viewBoxSize) continue;
                  if (dx * dx + dy * dy <= r2) {
                    dilated[ny * viewBoxSize + nx] = 1;
                  }
                }
              }
            }
          }
        }

        // Find start point: topmost, then leftmost foreground pixel
        let startX = -1, startY = -1;
        for (let y = 0; y < viewBoxSize; y++) {
          for (let x = 0; x < viewBoxSize; x++) {
            if (dilated[y * viewBoxSize + x] === 1) {
              startX = x;
              startY = y;
              break;
            }
          }
          if (startX !== -1) break;
        }

        if (startX === -1) {
          resolve(getAspectBoundedCutContour(drawX, drawY, drawW, drawH, cutMarginMm));
          return;
        }

        // 8-neighborhood ordered clockwise starting from West (-1, 0)
        const nbrs = [
          { dx: -1, dy: 0 },
          { dx: -1, dy: -1 },
          { dx: 0, dy: -1 },
          { dx: 1, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 1, dy: 1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 1 }
        ];

        const isFg = (x, y) => {
          if (x < 0 || x >= viewBoxSize || y < 0 || y >= viewBoxSize) return false;
          return dilated[y * viewBoxSize + x] === 1;
        };

        // Canonical Moore-Neighbor Boundary Tracing
        const contour = [];
        let currX = startX;
        let currY = startY;
        let bIdx = 0; // Came from West
        let steps = 0;
        const maxSteps = 30000;

        while (steps++ < maxSteps) {
          contour.push({ x: currX, y: currY });

          let nextX = currX;
          let nextY = currY;
          let newBacktrack = 0;
          let found = false;

          for (let i = 0; i < 8; i++) {
            const idx = (bIdx + i) % 8;
            const testX = currX + nbrs[idx].dx;
            const testY = currY + nbrs[idx].dy;

            if (isFg(testX, testY)) {
              nextX = testX;
              nextY = testY;
              // The previous tested background pixel
              const bgX = currX + nbrs[(idx + 7) % 8].dx;
              const bgY = currY + nbrs[(idx + 7) % 8].dy;
              for (let k = 0; k < 8; k++) {
                if (nextX + nbrs[k].dx === bgX && nextY + nbrs[k].dy === bgY) {
                  newBacktrack = k;
                  break;
                }
              }
              bIdx = newBacktrack;
              found = true;
              break;
            }
          }

          if (!found) break;

          currX = nextX;
          currY = nextY;

          if (currX === startX && currY === startY && contour.length > 5) {
            break;
          }
        }

        if (contour.length < 8) {
          resolve(getAspectBoundedCutContour(drawX, drawY, drawW, drawH));
          return;
        }

        // Simplify polygon using Ramer-Douglas-Peucker
        const simplified = ramerDouglasPeucker(contour, 1.8);

        // Convert points to smooth cubic Bézier SVG path
        const svgPathD = pointsToSmoothSvg(simplified);
        resolve(svgPathD);
      } catch (err) {
        console.error('Error in computeUniversalContour:', err);
        resolve(getFallbackDiecutContour(145, 145));
      }
    };

    img.onerror = (e) => {
      console.warn('Image load error for contour trace:', e);
      resolve(getFallbackDiecutContour(145, 145));
    };

    img.src = imageSrc;
  });
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
function pointsToSmoothSvg(pts) {
  if (pts.length < 3) return '';
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

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

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d + ' Z';
}

function getAspectBoundedCutContour(x, y, w, h, cutMarginMm = 2.0) {
  const pad = Math.round(3 + cutMarginMm * 1.5);
  const rx = Math.max(4, x - pad);
  const ry = Math.max(4, y - pad);
  const rw = Math.min(282, w + pad * 2);
  const rh = Math.min(282, h + pad * 2);
  const radius = Math.min(24, Math.round(18 + cutMarginMm * 2));

  return `M ${rx + radius},${ry} H ${rx + rw - radius} A ${radius},${radius} 0 0 1 ${rx + rw},${ry + radius} V ${ry + rh - radius} A ${radius},${radius} 0 0 1 ${rx + rw - radius},${ry + rh} H ${rx + radius} A ${radius},${radius} 0 0 1 ${rx},${ry + rh - radius} V ${ry + radius} A ${radius},${radius} 0 0 1 ${rx + radius},${ry} Z`;
}

function getFallbackDiecutContour(cx, cy, cutMarginMm = 2.0) {
  const steps = 48;
  const points = [];
  const offset = (cutMarginMm - 2.0) * 2.5;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const wave = Math.sin(angle * 3) * 6 + Math.cos(angle * 5) * 4;
    const r = Math.min(142, Math.max(115, 126 + wave + offset));
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  return pointsToSmoothSvg(points);
}
