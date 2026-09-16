/* ==========================================================================
   MOSAL STICKERS - OFFICIAL PRICING ENGINE & VOLUME MATRIX
   Precios oficiales Mosal Solutions Guatemala
   ========================================================================== */

import { store } from './state.js';

// Precios oficiales base en Quetzales para paquete estándar de 100 unidades
export const OFFICIAL_PRICES_GTQ = {
  3: 40,
  4: 60,
  5: 110,
  6: 200,
  7: 240,
  8: 275,
  9: 300,
  10: 350,
};

// Material Multipliers (Vinilo blanco base 1.0, acabados especiales)
const MATERIAL_MULTIPLIERS = {
  classic: 1.0,
  holographic: 1.0, // Los precios base aplican directamente a acabados
  transparent: 1.0,
  glitter: 1.0,
  metallic: 1.0,
};

// Finish Multipliers
const FINISH_MULTIPLIERS = {
  glossy: 1.0,
  matte: 1.0,
};

// Standard Bulk Quantity Tiers with Volume Discounts (100 uds = precio oficial)
export const QUANTITY_TIERS = [
  { qty: 25, multiplier: 0.38, discountPercent: 0 },
  { qty: 50, multiplier: 0.60, discountPercent: 0 },
  { qty: 100, multiplier: 1.00, discountPercent: 0 },
  { qty: 200, multiplier: 1.80, discountPercent: 10 },
  { qty: 300, multiplier: 2.50, discountPercent: 16 },
  { qty: 500, multiplier: 3.80, discountPercent: 24 },
  { qty: 1000, multiplier: 6.80, discountPercent: 32 },
];

/**
 * Retorna el precio base oficial en GTQ para 100 unidades según las dimensiones
 */
export function getBasePriceForSize(widthCm, heightCm) {
  const w = parseFloat(widthCm) || 5;
  const h = parseFloat(heightCm) || 5;

  // Si coincide con una medida oficial cuadrada:
  if (Math.abs(w - h) < 0.05) {
    const roundDim = Math.round(w);
    if (OFFICIAL_PRICES_GTQ[roundDim]) {
      return OFFICIAL_PRICES_GTQ[roundDim];
    }
  }

  // Para medidas personalizadas, interpolar por área en cm²:
  const area = w * h;
  const benchmarks = [
    { area: 9, price: 40 },
    { area: 16, price: 60 },
    { area: 25, price: 110 },
    { area: 36, price: 200 },
    { area: 49, price: 240 },
    { area: 64, price: 275 },
    { area: 81, price: 300 },
    { area: 100, price: 350 },
  ];

  if (area <= 9) {
    return Math.max(25, Math.round((area / 9) * 40));
  }
  if (area >= 100) {
    return Math.round(350 + (area - 100) * 3.5);
  }

  for (let i = 0; i < benchmarks.length - 1; i++) {
    const b1 = benchmarks[i];
    const b2 = benchmarks[i + 1];
    if (area >= b1.area && area <= b2.area) {
      const t = (area - b1.area) / (b2.area - b1.area);
      return Math.round(b1.price + t * (b2.price - b1.price));
    }
  }

  return 110;
}

/**
 * Calcula precios para cualquier configuración
 */
export function calculateStickerPricing(sticker, customQuantity = null) {
  const qty = customQuantity || sticker.quantity || 100;
  const width = sticker.widthCm || 5;
  const height = sticker.heightCm || 5;

  const base100PriceGtq = getBasePriceForSize(width, height);
  const matMult = MATERIAL_MULTIPLIERS[sticker.material] || 1.0;
  const finishMult = FINISH_MULTIPLIERS[sticker.finish] || 1.0;

  // Factor de escala por cantidad (100 uds = 1.0)
  let qtyFactor = 1.0;
  let discountPercent = 0;
  const exactTier = QUANTITY_TIERS.find(t => t.qty === qty);
  if (exactTier) {
    qtyFactor = exactTier.multiplier;
    discountPercent = exactTier.discountPercent;
  } else {
    qtyFactor = (qty / 100) * (qty > 100 ? 0.88 : 1.15);
  }

  const finalTotalGtq = Math.round(base100PriceGtq * qtyFactor * matMult * finishMult);
  const unitPriceGtq = finalTotalGtq / qty;

  const state = store.getState();
  const currency = state.currency || 'GTQ';
  let currencyRate = 1.0;
  if (currency === 'USD') currencyRate = 1 / 7.8;
  if (currency === 'EUR') currencyRate = 1 / 8.5;

  const finalTotal = currency === 'GTQ' ? finalTotalGtq : parseFloat((finalTotalGtq * currencyRate).toFixed(2));
  const unitPrice = currency === 'GTQ' ? parseFloat(unitPriceGtq.toFixed(2)) : parseFloat((unitPriceGtq * currencyRate).toFixed(3));

  return {
    quantity: qty,
    base100PriceGtq,
    discountPercent,
    unitPrice,
    totalPrice: finalTotal,
    currency,
    symbol: state.currencySymbols[currency] || 'Q',
  };
}

export function formatPrice(amount, currency = null) {
  const state = store.getState();
  const curr = currency || state.currency || 'GTQ';
  const symbol = state.currencySymbols[curr] || 'Q';

  if (curr === 'GTQ') {
    return `${symbol} ${Math.round(amount).toLocaleString('es-GT')}`;
  }
  return `${symbol} ${Number(amount).toFixed(2)}`;
}
