/* ==========================================================================
   MOSAL STICKERS - OFFICIAL PRICING ENGINE & VOLUME MATRIX
   Precios oficiales Mosal Solutions Guatemala
   ========================================================================== */

import { store } from './state.js';

// Precios oficiales base en Quetzales para 100 unidades
// GRUPO 1: Vinil Blanco y DTF Textil
export const PRICES_STANDARD_GTQ = {
  3: 45,
  4: 65,
  5: 115,
  6: 210,
  7: 250,
  8: 285,
  9: 310,
  10: 360,
};

// GRUPO 2: Holográfico, Transparente, Dorado y DTF UV
export const PRICES_PREMIUM_GTQ = {
  3: 75,
  4: 95,
  5: 145,
  6: 280,
  7: 330,
  8: 370,
  9: 390,
  10: 440,
};

// Alias compatible
export const OFFICIAL_PRICES_GTQ = PRICES_STANDARD_GTQ;

/**
 * Identifica a qué grupo de precios pertenece el material seleccionado:
 * - 'standard': Vinil blanco (classic) y DTF Textil (dtf_textil)
 * - 'premium': Holográfico (holographic), Transparente (transparent), Dorado (metallic) y DTF UV (dtf_uv)
 */
export function getMaterialGroup(material) {
  if (material === 'classic' || material === 'dtf_textil') {
    return 'standard';
  }
  return 'premium';
}

/**
 * Retorna la tabla de precios exacta correspondiente al material
 */
export function getMaterialPriceTable(material) {
  return getMaterialGroup(material) === 'standard' ? PRICES_STANDARD_GTQ : PRICES_PREMIUM_GTQ;
}

// Escala de cantidades oficiales (Desde 100 unidades en adelante, escala proporcional)
export const QUANTITY_TIERS = [
  { qty: 100, multiplier: 1.0 },
  { qty: 200, multiplier: 2.0 },
  { qty: 300, multiplier: 3.0 },
  { qty: 500, multiplier: 5.0 },
  { qty: 1000, multiplier: 10.0 },
  { qty: 2000, multiplier: 20.0 },
  { qty: 5000, multiplier: 50.0 },
];

/**
 * Retorna el precio base oficial en GTQ para 100 unidades según las dimensiones y el material
 */
export function getBasePriceForSize(widthCm, heightCm, material = 'classic') {
  const w = parseFloat(widthCm) || 5;
  const h = parseFloat(heightCm) || 5;
  const priceTable = getMaterialPriceTable(material);

  // Si coincide con una medida oficial cuadrada (3, 4, 5, 6, 7, 8, 9, 10):
  if (Math.abs(w - h) < 0.05) {
    const roundDim = Math.round(w);
    if (priceTable[roundDim]) {
      return priceTable[roundDim];
    }
  }

  // Para medidas personalizadas, interpolar por área en cm² según la escala del material
  const area = w * h;
  const isStd = getMaterialGroup(material) === 'standard';
  const benchmarks = isStd ? [
    { area: 9, price: 45 },
    { area: 16, price: 65 },
    { area: 25, price: 115 },
    { area: 36, price: 210 },
    { area: 49, price: 250 },
    { area: 64, price: 285 },
    { area: 81, price: 310 },
    { area: 100, price: 360 },
  ] : [
    { area: 9, price: 75 },
    { area: 16, price: 95 },
    { area: 25, price: 145 },
    { area: 36, price: 280 },
    { area: 49, price: 330 },
    { area: 64, price: 370 },
    { area: 81, price: 390 },
    { area: 100, price: 440 },
  ];

  if (area <= 9) {
    return Math.max(isStd ? 35 : 55, Math.round((area / 9) * benchmarks[0].price));
  }
  if (area >= 100) {
    const maxP = benchmarks[benchmarks.length - 1].price;
    return Math.round(maxP + (area - 100) * (isStd ? 3.6 : 4.4));
  }

  for (let i = 0; i < benchmarks.length - 1; i++) {
    const b1 = benchmarks[i];
    const b2 = benchmarks[i + 1];
    if (area >= b1.area && area <= b2.area) {
      const t = (area - b1.area) / (b2.area - b1.area);
      return Math.round(b1.price + t * (b2.price - b1.price));
    }
  }

  return priceTable[5] || (isStd ? 115 : 145);
}

/**
 * Calcula precios para cualquier configuración bajo el Régimen General del IVA (12% de Guatemala)
 * Precios directos sin cargos adicionales, con cantidades de 100 en adelante.
 */
export function calculateStickerPricing(sticker, customQuantity = null) {
  const rawQty = customQuantity || sticker.quantity || 100;
  const qty = Math.max(100, parseInt(rawQty, 10) || 100);
  const width = sticker.widthCm || 5;
  const height = sticker.heightCm || 5;
  const material = sticker.material || 'classic';

  const base100PriceGtq = getBasePriceForSize(width, height, material);

  // Precio unitario base para 100 uds (escala directa por cantidad)
  const unitPriceGtq = base100PriceGtq / 100;
  const finalTotalGtq = Math.round(unitPriceGtq * qty);

  const state = store.getState();
  const currency = state.currency || 'GTQ';
  let currencyRate = 1.0;
  if (currency === 'USD') currencyRate = 1 / 7.8;
  if (currency === 'EUR') currencyRate = 1 / 8.5;

  const finalTotal = currency === 'GTQ' ? finalTotalGtq : parseFloat((finalTotalGtq * currencyRate).toFixed(2));
  const unitPrice = currency === 'GTQ' ? parseFloat(unitPriceGtq.toFixed(2)) : parseFloat((unitPriceGtq * currencyRate).toFixed(3));

  // Régimen General del IVA de Guatemala (12% Crédito Fiscal por SAT)
  const vatRate = 0.12;
  const subtotalNeto = parseFloat((finalTotal / (1 + vatRate)).toFixed(2));
  const ivaMonto = parseFloat((finalTotal - subtotalNeto).toFixed(2));

  return {
    quantity: qty,
    base100PriceGtq,
    unitPrice,
    totalPrice: finalTotal,
    vatRate,
    subtotalNeto, // Base imponible
    ivaMonto, // Monto del IVA 12%
    isVatIncluded: true,
    currency,
    symbol: state.currencySymbols[currency] || 'Q',
  };
}

export function formatPrice(amount, currency = null) {
  const state = store.getState();
  const curr = currency || state.currency || 'GTQ';
  const symbol = state.currencySymbols[curr] || 'Q';
  const num = Number(amount) || 0;

  if (curr === 'GTQ') {
    if (num % 1 === 0) {
      return `${symbol} ${Math.round(num).toLocaleString('es-GT')}`;
    }
    return `${symbol} ${num.toFixed(2)}`;
  }
  return `${symbol} ${num.toFixed(2)}`;
}
