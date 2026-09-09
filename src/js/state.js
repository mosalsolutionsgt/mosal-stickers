/* ==========================================================================
   MOSAL STICKERS - GLOBAL REACTIVE STATE STORE
   ========================================================================== */

class StateStore {
  constructor() {
    this.state = {
      // Current Editor Sticker Configuration
      sticker: {
        id: 'stk_' + Date.now(),
        name: 'Cyberpunk Cat Troquelado',
        imageSrc: '/samples/cyberpunk-cat.png',
        shape: 'die-cut', // 'die-cut', 'circle', 'square', 'rounded'
        material: 'holographic', // 'classic', 'holographic', 'transparent', 'glitter', 'metallic', 'kraft'
        finish: 'glossy', // 'glossy', 'matte'
        widthCm: 7.5,
        heightCm: 7.5,
        isCustomSize: false,
        quantity: 100,
        surface: 'studio', // 'studio', 'laptop', 'yeti', 'iphone'
        showCutline: false,
      },

      // Currency & Locale
      currency: 'GTQ', // 'GTQ' | 'USD' | 'EUR'
      currencySymbols: { GTQ: 'Q', USD: '$', EUR: '€' },
      exchangeRates: { GTQ: 8.5, USD: 1.08, EUR: 1.0 },
      includeVat: true,

      // Shopping Cart
      cart: [
        {
          id: 'cart_1',
          name: 'Cyberpunk Cat Troquelado',
          imageSrc: '/samples/cyberpunk-cat.png',
          shape: 'die-cut',
          material: 'holographic',
          finish: 'glossy',
          sizeText: '7.5 x 7.5 cm',
          quantity: 100,
          unitPrice: 3.83,
          totalPrice: 382.50,
        }
      ],
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
