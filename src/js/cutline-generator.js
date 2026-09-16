/* ==========================================================================
   MOSAL STICKERS - CUTLINE & PREPRESS PROOF GENERATOR
   Generates precision magenta die-cut contours, safety margins and bleed lines
   Centered accurately to each sticker design with SVG viewBox 0 0 300 300
   ========================================================================== */

const contourCache = new Map();

/**
 * Updates the SVG cutline overlay paths based on current sticker shape & image
 */
export function renderCutlinePaths(svgElement, shape = 'die-cut', imageSrc = null) {
  if (!svgElement) return;

  // Set standardized viewBox for precision 1:1 concentric centering
  svgElement.setAttribute('viewBox', '0 0 300 300');
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const cx = 150;
  const cy = 150;

  let cutPathD = '';
  let safetyPathD = '';
  let bleedPathD = '';

  switch (shape) {
    case 'circle': {
      const r = 138;
      const sr = 124;
      const br = 146;
      cutPathD = `M ${cx},${cy - r} A ${r},${r} 0 1,0 ${cx},${cy + r} A ${r},${r} 0 1,0 ${cx},${cy - r} Z`;
      safetyPathD = `M ${cx},${cy - sr} A ${sr},${sr} 0 1,0 ${cx},${cy + sr} A ${sr},${sr} 0 1,0 ${cx},${cy - sr} Z`;
      bleedPathD = `M ${cx},${cy - br} A ${br},${br} 0 1,0 ${cx},${cy + br} A ${br},${br} 0 1,0 ${cx},${cy - br} Z`;
      break;
    }

    case 'square': {
      cutPathD = `M 12,12 H 288 V 288 H 12 Z`;
      safetyPathD = `M 26,26 H 274 V 274 H 26 Z`;
      bleedPathD = `M 4,4 H 296 V 296 H 4 Z`;
      break;
    }

    case 'rounded': {
      const rx = 34;
      const srx = 22;
      const brx = 42;
      cutPathD = `M ${12 + rx},12 H ${288 - rx} A ${rx},${rx} 0 0 1 288,${12 + rx} V ${288 - rx} A ${rx},${rx} 0 0 1 ${288 - rx},288 H ${12 + rx} A ${rx},${rx} 0 0 1 12,${288 - rx} V ${12 + rx} A ${rx},${rx} 0 0 1 ${12 + rx},12 Z`;
      safetyPathD = `M ${26 + srx},26 H ${274 - srx} A ${srx},${srx} 0 0 1 274,${26 + srx} V ${274 - srx} A ${srx},${srx} 0 0 1 ${274 - srx},274 H ${26 + srx} A ${srx},${srx} 0 0 1 26,${274 - srx} V ${26 + srx} A ${srx},${srx} 0 0 1 ${26 + srx},26 Z`;
      bleedPathD = `M ${4 + brx},4 H ${296 - brx} A ${brx},${brx} 0 0 1 296,${4 + brx} V ${296 - brx} A ${brx},${brx} 0 0 1 ${296 - brx},296 H ${4 + brx} A ${brx},${brx} 0 0 1 4,${296 - brx} V ${4 + brx} A ${brx},${brx} 0 0 1 ${4 + brx},4 Z`;
      break;
    }

    case 'die-cut':
    default: {
      // Check cache first for this image
      if (imageSrc && contourCache.has(imageSrc)) {
        const cached = contourCache.get(imageSrc);
        cutPathD = cached.cutPathD;
        safetyPathD = cached.safetyPathD;
        bleedPathD = cached.bleedPathD;
      } else if (imageSrc) {
        // Initial fallback while dynamic contour renders
        const defaultPaths = getDefaultDiecutContour(cx, cy);
        cutPathD = defaultPaths.cutPathD;
        safetyPathD = defaultPaths.safetyPathD;
        bleedPathD = defaultPaths.bleedPathD;

        // Trace asynchronously
        computeImageAlphaContour(imageSrc).then(res => {
          contourCache.set(imageSrc, res);
          // If svgElement is still displaying die-cut, refresh
          if (svgElement.dataset.currentShape === 'die-cut' && svgElement.dataset.currentSrc === imageSrc) {
            applySvgPaths(svgElement, res.cutPathD, res.safetyPathD, res.bleedPathD);
          }
        }).catch(err => {
          console.warn('Contour trace fallback used:', err);
        });
      } else {
        const defaultPaths = getDefaultDiecutContour(cx, cy);
        cutPathD = defaultPaths.cutPathD;
        safetyPathD = defaultPaths.safetyPathD;
        bleedPathD = defaultPaths.bleedPathD;
      }
      break;
    }
  }

  svgElement.dataset.currentShape = shape;
  if (imageSrc) svgElement.dataset.currentSrc = imageSrc;

  applySvgPaths(svgElement, cutPathD, safetyPathD, bleedPathD);
}

function applySvgPaths(svgElement, cutPathD, safetyPathD, bleedPathD) {
  svgElement.innerHTML = `
    ${bleedPathD ? `<path class="cutline-bleed-path" d="${bleedPathD}" />` : ''}
    <path class="cutline-diecut-path" d="${cutPathD}" />
    <path class="cutline-safety-path" d="${safetyPathD}" />
  `;
}

/**
 * Mathematically centered organic die-cut contour fallback
 */
function getDefaultDiecutContour(cx, cy) {
  const steps = 48;
  const pointsCut = [];
  const pointsSafety = [];
  const pointsBleed = [];

  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Harmonic organic wave centered around radius 132
    const wave = Math.sin(angle * 3) * 6 + Math.cos(angle * 5) * 4;
    const rCut = 130 + wave;
    const rSafety = 114 + wave;
    const rBleed = 140 + wave;

    pointsCut.push({
      x: cx + rCut * Math.cos(angle),
      y: cy + rCut * Math.sin(angle)
    });
    pointsSafety.push({
      x: cx + rSafety * Math.cos(angle),
      y: cy + rSafety * Math.sin(angle)
    });
    pointsBleed.push({
      x: cx + rBleed * Math.cos(angle),
      y: cy + rBleed * Math.sin(angle)
    });
  }

  return {
    cutPathD: pointsToSvgSmoothPath(pointsCut),
    safetyPathD: pointsToSvgSmoothPath(pointsSafety),
    bleedPathD: pointsToSvgSmoothPath(pointsBleed),
  };
}

/**
 * Traces non-transparent silhouette from image to create custom contour
 */
function computeImageAlphaContour(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 120;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        const cx = size / 2;
        const cy = size / 2;
        const steps = 60;
        const rawRadii = [];

        // Raymarch from center at each angle
        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          let foundR = 25;

          // March outward from center to max radius
          for (let r = 56; r >= 15; r--) {
            const px = Math.round(cx + cos * r);
            const py = Math.round(cy + sin * r);
            if (px >= 0 && px < size && py >= 0 && py < size) {
              const alpha = imgData[(py * size + px) * 4 + 3];
              if (alpha > 40) {
                foundR = r;
                break;
              }
            }
          }
          rawRadii.push(foundR);
        }

        // Smooth radii with circular moving average filter
        const smoothedRadii = [];
        for (let i = 0; i < steps; i++) {
          const p = (i - 1 + steps) % steps;
          const n = (i + 1) % steps;
          const pp = (i - 2 + steps) % steps;
          const nn = (i + 2) % steps;
          const smoothed = (rawRadii[pp] + rawRadii[p] * 2 + rawRadii[i] * 3 + rawRadii[n] * 2 + rawRadii[nn]) / 9;
          smoothedRadii.push(smoothed);
        }

        // Scale factors to fit in 300x300 viewBox (scale = 300 / 120 = 2.5)
        const scale = 2.5;
        const viewCx = 150;
        const viewCy = 150;

        const pointsCut = [];
        const pointsSafety = [];
        const pointsBleed = [];

        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          // Clamped radii
          const rBase = Math.max(30, smoothedRadii[i]) * scale;
          const rCut = Math.min(142, rBase + 10);
          const rSafety = Math.max(20, rCut - 16);
          const rBleed = Math.min(148, rCut + 8);

          pointsCut.push({ x: viewCx + cos * rCut, y: viewCy + sin * rCut });
          pointsSafety.push({ x: viewCx + cos * rSafety, y: viewCy + sin * rSafety });
          pointsBleed.push({ x: viewCx + cos * rBleed, y: viewCy + sin * rBleed });
        }

        resolve({
          cutPathD: pointsToSvgSmoothPath(pointsCut),
          safetyPathD: pointsToSvgSmoothPath(pointsSafety),
          bleedPathD: pointsToSvgSmoothPath(pointsBleed)
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Converts array of 2D points into continuous smooth Catmull-Rom cubic bezier SVG path
 */
function pointsToSvgSmoothPath(points) {
  if (!points || points.length === 0) return '';
  const n = points.length;
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  d += ' Z';
  return d;
}
