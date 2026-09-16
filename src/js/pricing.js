/* ==========================================================================
   MOSAL STICKERS - DYNAMIC PRICING ENGINE & VOLUME MATRIX
   ========================================================================== */

import { store } from './state.js';

// Material Price Multipliers
const MATERIAL_MULTIPLIERS = {
  classic: 1.0,
  holographic: 1.22,
  transparent: 1.12,
  glitter: 1.28,
  metallic: 1.24,
};

// Finish Multipliers
const FINISH_MULTIPLIERS = {
  glossy: 1.0,
  matte: 1.05,
};

// Shape Multipliers
const SHAPE_MULTIPLIERS = {
  'die-cut': 1.05,
  'kiss-cut': 1.0,
  'circle': 0.95,
  'square': 0.95,
  'rounded': 0.98,
};

// Standard Bulk Quantity Tiers with Volume Discounts
export const QUANTITY_TIERS = [
  { qty: 25, discountPercent: 0 },
  { qty: 50, discountPercent: 18 },
  { qty: 100, discountPercent: 36 },
  { qty: 200, discountPercent: 52 },
  { qty: 300, discountPercent: 60 },
  { qty: 500, discountPercent: 68 },
  { qty: 1000, discountPercent: 76 },
  { qty: 2500, discountPercent: 82 },
];

/**
 * Calculates pricing details for a given sticker configuration
 */
export function calculateStickerPricing(sticker, customQuantity = null) {
  const qty = customQuantity || sticker.quantity || 100;
  const width = sticker.widthCm || 7.5;
  const height = sticker.heightCm || 7.5;
  
  // Area in square cm
  const areaCm2 = width * height;
  
  // Base raw cost per sticker before discounts (approx 0.015€ per cm2 for low volume)
  const baseCostPerCm2 = 0.0125;
  const baseUnitCost = Math.max(0.75, areaCm2 * baseCostPerCm2);

  // Multipliers
  const matMult = MATERIAL_MULTIPLIERS[sticker.material] || 1.0;
  const finishMult = FINISH_MULTIPLIERS[sticker.finish] || 1.0;
  const shapeMult = SHAPE_MULTIPLIERS[sticker.shape] || 1.0;

  // Single unit benchmark price
  const fullUnitPrice = baseUnitCost * matMult * finishMult * shapeMult * 1.35;

  // Find tier discount (interpolate if custom quantity)
  let discountPercent = 0;
  for (let i = 0; i < QUANTITY_TIERS.length; i++) {
    if (qty >= QUANTITY_TIERS[i].qty) {
      discountPercent = QUANTITY_TIERS[i].discountPercent;
    }
  }

  // Calculate unit price and total in EUR
  const discountedUnitPrice = fullUnitPrice * (1 - discountPercent / 100);
  let totalEur = discountedUnitPrice * qty;

  // Minimum order floor
  if (totalEur < 19.0) {
    totalEur = 19.0;
  }

  const state = store.getState();
  const rate = state.exchangeRates[state.currency] || 1.0;
  const vatRate = state.includeVat ? 1.0 : 0.8264; // Remove 21% VAT if toggle is off

  const finalTotal = totalEur * rate * vatRate;
  const finalUnitPrice = finalTotal / qty;

  return {
    quantity: qty,
    discountPercent,
    unitPrice: finalUnitPrice,
    totalPrice: finalTotal,
    currency: state.currency,
    symbol: state.currencySymbols[state.currency] || 'Q',
  };
}

/**
 * Formats monetary amounts
 */
export function formatPrice(amount, currency = null) {
  const state = store.getState();
  const curr = currency || state.currency;
  const symbol = state.currencySymbols[curr] || 'Q';
  
  const formatted = amount.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (curr === 'GTQ') {
    return `Q ${formatted}`;
  } else if (curr === 'USD') {
    return `$${formatted}`;
  } else {
    return `${formatted} €`;
  }
}
