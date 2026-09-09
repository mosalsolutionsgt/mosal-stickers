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

  // Checkout modal elements
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutModalClose = document.getElementById('checkoutModalClose');
  const checkoutForm = document.getElementById('checkoutForm');
  const checkoutOrderSuccess = document.getElementById('checkoutOrderSuccess');

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

  // Submit checkout form
  checkoutForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (checkoutForm) checkoutForm.style.display = 'none';
    if (checkoutOrderSuccess) checkoutOrderSuccess.style.display = 'flex';
    store.clearCart();
    showToast('¡Pedido confirmado! Gracias por confiar en Mosal Stickers', 'success');
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
        shippingNoticeText.innerHTML = `🎉 <strong>¡Envío GRATIS activado!</strong> (Ahorras ${savedAmount})`;
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
