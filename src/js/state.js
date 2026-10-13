/* ==========================================================================
   MOSAL STICKERS - GLOBAL REACTIVE STATE STORE
   ========================================================================== */

const BASE_URL = import.meta.env.BASE_URL || './';
const defaultSampleImg = `${BASE_URL}samples/cyberpunk-cat.png`.replace(/\/\//g, '/');

class StateStore {
  constructor() {
    this.state = {
      // Current Editor Sticker Configuration
      sticker: {
        id: 'stk_' + Date.now(),
        name: 'Cyberpunk Cat Troquelado',
        imageSrc: defaultSampleImg,
        shape: 'die-cut', // 'die-cut', 'circle', 'square', 'rounded'
        material: 'classic', // 'classic', 'dtf_textil', 'holographic', 'transparent', 'metallic', 'dtf_uv'
        widthCm: 5,
        heightCm: 5,
        isCustomSize: false,
        quantity: 100,
        surface: 'studio', // 'studio', 'laptop', 'yeti', 'iphone'
        showCutline: true,
        cutMarginMm: 2.0,
      },

      // Currency & Locale
      currency: 'GTQ', // 'GTQ' | 'USD' | 'EUR'
      currencySymbols: { GTQ: 'Q', USD: '$', EUR: '€' },
      exchangeRates: { GTQ: 1.0, USD: 0.128, EUR: 0.118 },
      includeVat: true,

      // Shopping Cart (inicia vacío sin productos fantasma)
      cart: [],
      isCartOpen: false,
      appliedPromo: null,
      promoCodes: {
        'MOSAL10': 0.10, // 10% off
        'STICKERVIP': 0.15, // 15% off
      }
    };

    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  updateSticker(partial) {
    this.state.sticker = { ...this.state.sticker, ...partial };
    this.notify();
  }

  setCurrency(curr) {
    if (this.state.exchangeRates[curr]) {
      this.state.currency = curr;
      this.notify();
    }
  }

  toggleVat(include) {
    this.state.includeVat = include;
    this.notify();
  }

  // Cart operations
  toggleCart(open) {
    this.state.isCartOpen = open !== undefined ? open : !this.state.isCartOpen;
    this.notify();
  }

  addToCart(item) {
    this.state.cart.push({
      ...item,
      id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
    });
    this.state.isCartOpen = true;
    this.notify();
  }

  removeFromCart(itemId) {
    this.state.cart = this.state.cart.filter(item => item.id !== itemId);
    this.notify();
  }

  applyPromoCode(code) {
    const clean = code.trim().toUpperCase();
    if (this.state.promoCodes[clean]) {
      this.state.appliedPromo = {
        code: clean,
        discount: this.state.promoCodes[clean]
      };
      this.notify();
      return { success: true, message: `¡Cupón ${clean} aplicado con éxito!` };
    }
    return { success: false, message: 'Cupón no válido' };
  }

  clearCart() {
    this.state.cart = [];
    this.notify();
  }
}

export const store = new StateStore();

/* Diccionarios oficiales de especificaciones técnicas para producción e imprenta */
export const MATERIAL_LABELS = {
  classic: 'Vinil Blanco',
  dtf_textil: 'DTF Textil',
  holographic: 'Holográfico',
  transparent: 'Transparente',
  metallic: 'Dorado',
  dtf_uv: 'DTF UV',
};

export const SHAPE_LABELS = {
  'die-cut': 'Troquelado a la Forma (Die-Cut)',
  circle: 'Circular',
  square: 'Cuadrado / Rectangular',
  rounded: 'Bordes Redondeados (Kiss-Cut)',
};

export function getFullSpecsText(item) {
  const mat = item.materialLabel || MATERIAL_LABELS[item.material] || item.material || 'Vinil';
  const shp = item.shapeLabel || SHAPE_LABELS[item.shape] || item.shape || 'Troquelado';
  const margin = item.cutMarginText || (item.cutMarginMm !== undefined ? `${item.cutMarginMm} mm` : '2.0 mm');
  return `• Material: ${mat}\n• Tipo de Corte: ${shp}\n• Margen de Corte / Borde: ${margin}`;
}

