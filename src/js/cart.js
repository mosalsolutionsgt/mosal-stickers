/* ==========================================================================
   MOSAL STICKERS - SLIDE-OVER CART DRAWER & CHECKOUT FLOW
   ========================================================================== */

import { store } from './state.js';
import { formatPrice } from './pricing.js';

export function initCart() {
  const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
  const cartToggleBtns = document.querySelectorAll('.js-cart-toggle');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartBadgeCounts = document.querySelectorAll('.js-cart-count');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const cartDiscountRow = document.getElementById('cartDiscountRow');
  const cartDiscountAmountEl = document.getElementById('cartDiscountAmount');
  const shippingProgressBar = document.getElementById('shippingProgressBar');
  const shippingNoticeText = document.getElementById('shippingNoticeText');
  const promoInput = document.getElementById('promoInput');
  const promoApplyBtn = document.getElementById('promoApplyBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const cartWhatsAppBtn = document.getElementById('cartWhatsAppBtn');

  // Checkout modal elements
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutModalClose = document.getElementById('checkoutModalClose');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutOrderSuccess = document.getElementById('checkoutOrderSuccess');

  // Direct WhatsApp Order from Drawer
  cartWhatsAppBtn?.addEventListener('click', () => {
    const state = store.getState();
    if (state.cart.length === 0) {
      showToast('Tu carrito está vacío. Agrega stickers primero.', 'warning');
      return;
    }
    const rawSubtotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;
    if (state.appliedPromo) {
      discount = rawSubtotal * state.appliedPromo.discount;
    }
    const finalSubtotal = Math.max(0, rawSubtotal - discount);
    const waUrl = getWhatsAppOrderUrl(state.cart, finalSubtotal, state.currency);

    window.open(waUrl, '_blank');
    showToast('¡Abriendo WhatsApp de Mosal Solutions con tu pedido!', 'success');
  });

  // Toggle cart drawer
  cartToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      store.toggleCart();
    });
  });

  cartCloseBtn?.addEventListener('click', () => store.toggleCart(false));
  cartDrawerOverlay?.addEventListener('click', (e) => {
    if (e.target === cartDrawerOverlay) store.toggleCart(false);
  });

  // Apply promo code
  promoApplyBtn?.addEventListener('click', () => {
    if (!promoInput) return;
    const res = store.applyPromoCode(promoInput.value);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) promoInput.value = '';
  });

  // Open checkout modal
  checkoutBtn?.addEventListener('click', () => {
    const state = store.getState();
    if (state.cart.length === 0) {
      showToast('Tu carrito está vacío', 'warning');
      return;
    }
    store.toggleCart(false);
    checkoutModal?.classList.add('open');
    if (checkoutForm) checkoutForm.style.display = 'flex';
    if (checkoutOrderSuccess) checkoutOrderSuccess.style.display = 'none';
  });

  checkoutModalClose?.addEventListener('click', () => {
    checkoutModal?.classList.remove('open');
  });

  // Submit checkout form: sends complete customer info + order details to WhatsApp
  checkoutForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const state = store.getState();
    const customerInfo = {
      name: document.getElementById('checkoutCustomerName')?.value || '',
      email: document.getElementById('checkoutCustomerEmail')?.value || '',
      phone: document.getElementById('checkoutCustomerPhone')?.value || '',
      address: document.getElementById('checkoutCustomerAddress')?.value || '',
      city: document.getElementById('checkoutCustomerCity')?.value || '',
      department: document.getElementById('checkoutCustomerDept')?.value || '',
      payMethod: document.querySelector('input[name="pay_method"]:checked')?.value || 'A coordinar por WhatsApp',
    };

    const rawSubtotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;
    if (state.appliedPromo) {
      discount = rawSubtotal * state.appliedPromo.discount;
    }
    const finalSubtotal = Math.max(0, rawSubtotal - discount);
    const waUrl = getWhatsAppOrderUrl(state.cart, finalSubtotal, state.currency, customerInfo);

    window.open(waUrl, '_blank');

    if (checkoutForm) checkoutForm.style.display = 'none';
    if (checkoutOrderSuccess) checkoutOrderSuccess.style.display = 'flex';
    store.clearCart();
    showToast('¡Pedido y datos enviados por WhatsApp a Mosal Solutions!', 'success');
  });

  // Subscribe to store updates to render the cart
  store.subscribe(state => {
    // Drawer open/close class
    cartDrawerOverlay?.classList.toggle('open', state.isCartOpen);

    // Update count badges
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadgeCounts.forEach(el => {
      el.textContent = totalCount.toString();
    });

    // Render cart items
    renderCartItems(state.cart, cartItemsList);

    // Calculate totals
    const rawSubtotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;
    if (state.appliedPromo) {
      discount = rawSubtotal * state.appliedPromo.discount;
      if (cartDiscountRow) cartDiscountRow.style.display = 'flex';
      if (cartDiscountAmountEl) cartDiscountAmountEl.textContent = `-${formatPrice(discount)}`;
    } else {
      if (cartDiscountRow) cartDiscountRow.style.display = 'none';
    }

    const finalSubtotal = Math.max(0, rawSubtotal - discount);
    if (cartSubtotalEl) {
      cartSubtotalEl.textContent = formatPrice(finalSubtotal);
    }

    // Free shipping threshold (250 GTQ / 35 USD / 30 EUR)
    const shippingThresholds = { GTQ: 250.0, USD: 35.0, EUR: 30.0 };
    const freeShippingGoal = shippingThresholds[state.currency] || 250.0;
    const progressPercent = Math.min(100, Math.round((finalSubtotal / freeShippingGoal) * 100));
    if (shippingProgressBar) {
      shippingProgressBar.style.width = `${progressPercent}%`;
    }

    if (shippingNoticeText) {
      if (finalSubtotal >= freeShippingGoal) {
        const savedAmount = formatPrice(state.currency === 'GTQ' ? 35.0 : (state.currency === 'USD' ? 5.0 : 4.95));
        shippingNoticeText.innerHTML = `<span style="color: #00b67a; display: inline-flex; align-items: center; gap: 0.35rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <strong>¡Envío GRATIS activado!</strong></span> (Ahorras ${savedAmount})`;
      } else {
        const diff = formatPrice(Math.max(0, freeShippingGoal - finalSubtotal));
        shippingNoticeText.innerHTML = `Añade <strong>${diff}</strong> más para conseguir <strong>Envío Gratis</strong>`;
      }
    }
  });
}

function renderCartItems(items, container) {
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-notice">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p>Tu carrito está vacío.</p>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('cartCloseBtn').click(); window.location.hash = '#editor';">
          Crear stickers ahora
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="cart-item-card" data-id="${item.id}">
      <div class="cart-item-thumb">
        <img src="${item.imageSrc}" alt="${item.name}" />
      </div>
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-meta">
          ${item.quantity} uds • ${item.sizeText}
        </div>
        <div class="cart-item-meta">
          <span class="badge badge-yellow">${item.material}</span>
          <span class="badge badge-green">${item.finish}</span>
        </div>
      </div>
      <div>
        <div class="cart-item-price">${formatPrice(item.totalPrice)}</div>
        <div class="cart-item-remove-btn js-remove-item" data-id="${item.id}">Eliminar</div>
      </div>
    </div>
  `).join('');

  // Attach delete handlers
  container.querySelectorAll('.js-remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      store.removeFromCart(id);
      showToast('Producto eliminado del carrito', 'info');
    });
  });
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Generates formatted WhatsApp order URL for Mosal Solutions (50230292980)
 */
export function getWhatsAppOrderUrl(cart, finalTotal, currency = 'GTQ', customerInfo = null) {
  const phone = '50230292980';
  const lines = [
    '¡Hola *Mosal Solutions*! 👋',
    'Quiero realizar el siguiente pedido de stickers personalizados desde su sitio web:',
    '',
    '📦 *DETALLE DEL PEDIDO:*'
  ];

  cart.forEach((item, index) => {
    const matNames = {
      holographic: 'Holográfico Prismático',
      classic: 'Vinilo Blanco Clásico',
      transparent: 'Transparente Cristalino',
      glitter: 'Purpurina Glitter',
      metallic: 'Metálico Oro / Plata'
    };
    const finishLabel = item.finish === 'glossy' ? 'Brillante' : 'Mate';
    const matLabel = matNames[item.material] || item.material;

    lines.push(`${index + 1}. *${item.name}*`);
    lines.push(`   • Cantidad: ${item.quantity} unidades`);
    lines.push(`   • Medida: ${item.sizeText}`);
    lines.push(`   • Material: ${matLabel}`);
    lines.push(`   • Acabado: ${finishLabel}`);
    if (item.shape) lines.push(`   • Corte: ${item.shape}`);
    lines.push(`   • Subtotal: ${formatPrice(item.totalPrice)}`);
    lines.push('');
  });

  lines.push('────────────────────────');
  lines.push(`💰 *TOTAL ESTIMADO:* ${formatPrice(finalTotal)}`);
  lines.push('────────────────────────');

  if (customerInfo && (customerInfo.name || customerInfo.address)) {
    lines.push('');
    lines.push('📍 *DATOS DE ENTREGA EN GUATEMALA:*');
    if (customerInfo.name) lines.push(`• Cliente: ${customerInfo.name}`);
    if (customerInfo.phone) lines.push(`• Teléfono: ${customerInfo.phone}`);
    if (customerInfo.email) lines.push(`• Correo (prueba digital): ${customerInfo.email}`);
    if (customerInfo.address) lines.push(`• Dirección: ${customerInfo.address}`);
    if (customerInfo.city || customerInfo.department) {
      lines.push(`• Destino: ${customerInfo.city || ''} (${customerInfo.department || 'Guatemala'})`);
    }
    if (customerInfo.payMethod) lines.push(`• Método de pago preferido: ${customerInfo.payMethod}`);
  }

  lines.push('');
  lines.push('¿Me confirman para enviarles mi arte en alta resolución y coordinar la entrega? ¡Muchas gracias!');

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

