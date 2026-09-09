/* ==========================================================================
   MOSAL STICKERS - CUTLINE & PREPRESS PROOF GENERATOR
   Generates precision magenta die-cut contours and safety margins
   ========================================================================== */

/**
 * Updates the SVG cutline overlay paths based on current sticker shape
 */
export function renderCutlinePaths(svgElement, shape) {
  if (!svgElement) return;

  const width = svgElement.clientWidth || 320;
  const height = svgElement.clientHeight || 320;
  const padding = 16;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const cx = width / 2;
  const cy = height / 2;

  let cutPathD = '';
  let safetyPathD = '';

  switch (shape) {
    case 'circle': {
      const r = Math.min(w, h) / 2;
      cutPathD = `M ${cx}, ${cy - r} a ${r},${r} 0 1,0 0.1,0 Z`;
      const sr = r - 12;
      safetyPathD = `M ${cx}, ${cy - sr} a ${sr},${sr} 0 1,0 0.1,0 Z`;
      break;
    }
    case 'square': {
      cutPathD = `M ${padding},${padding} H ${width - padding} V ${height - padding} H ${padding} Z`;
      safetyPathD = `M ${padding + 12},${padding + 12} H ${width - padding - 12} V ${height - padding - 12} H ${padding + 12} Z`;
      break;
    }
    case 'rounded': {
      const rx = 36;
      cutPathD = `M ${padding + rx},${padding} 
                  H ${width - padding - rx} 
                  A ${rx},${rx} 0 0 1 ${width - padding},${padding + rx} 
                  V ${height - padding - rx} 
                  A ${rx},${rx} 0 0 1 ${width - padding - rx},${height - padding} 
                  H ${padding + rx} 
                  A ${rx},${rx} 0 0 1 ${padding},${height - padding - rx} 
                  V ${padding + rx} 
                  A ${rx},${rx} 0 0 1 ${padding + rx},${padding} Z`;
      const srx = 24;
      safetyPathD = `M ${padding + 12 + srx},${padding + 12} 
                     H ${width - padding - 12 - srx} 
                     A ${srx},${srx} 0 0 1 ${width - padding - 12},${padding + 12 + srx} 
                     V ${height - padding - 12 - srx} 
                     A ${srx},${srx} 0 0 1 ${width - padding - 12 - srx},${height - padding - 12} 
                     H ${padding + 12 + srx} 
                     A ${srx},${srx} 0 0 1 ${padding + 12},${height - padding - 12 - srx} 
                     V ${padding + 12 + srx} 
                     A ${srx},${srx} 0 0 1 ${padding + 12 + srx},${padding + 12} Z`;
      break;
    }
    case 'die-cut':
    default: {
      // Natural contour organic die-cut shape following the sticker silhouette
      cutPathD = `M ${cx},${padding + 6}
                  C ${cx + w * 0.35},${padding} ${width - padding},${cy - h * 0.25} ${width - padding},${cy}
                  C ${width - padding},${cy + h * 0.32} ${cx + w * 0.38},${height - padding} ${cx},${height - padding - 6}
                  C ${cx - w * 0.38},${height - padding} ${padding},${cy + h * 0.3} ${padding},${cy}
                  C ${padding},${cy - h * 0.3} ${cx - w * 0.32},${padding} ${cx},${padding + 6} Z`;

      safetyPathD = `M ${cx},${padding + 18}
                     C ${cx + w * 0.3},${padding + 12} ${width - padding - 12},${cy - h * 0.2} ${width - padding - 12},${cy}
                     C ${width - padding - 12},${cy + h * 0.26} ${cx + w * 0.32},${height - padding - 14} ${cx},${height - padding - 18}
                     C ${cx - w * 0.32},${height - padding - 14} ${padding + 12},${cy + h * 0.24} ${padding + 12},${cy}
                     C ${padding + 12},${cy - h * 0.24} ${cx - w * 0.28},${padding + 12} ${cx},${padding + 18} Z`;
      break;
    }
  }

  svgElement.innerHTML = `
    <path class="cutline-diecut-path" d="${cutPathD}" />
    <path class="cutline-safety-path" d="${safetyPathD}" />
  `;
}
