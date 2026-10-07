/* ==========================================================================
   MOSAL STICKERS - SLIDE-OVER CART DRAWER & CHECKOUT FLOW
   ========================================================================== */

import { store } from './state.js';
import { formatPrice } from './pricing.js';
import { processRecurrentePayment } from './recurrente.js';
import { sendOrderToGoogleDrive } from './google-drive.js';

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
  const checkoutSubmitBtn = document.getElementById('checkoutSubmitBtn');
  const checkoutSubmitBtnText = document.getElementById('checkoutSubmitBtnText');

  // Artwork upload elements
  let currentArtworkFile = null;
  const checkoutArtworkDropzone = document.getElementById('checkoutArtworkDropzone');
  const checkoutArtworkInput = document.getElementById('checkoutArtworkInput');
  const checkoutArtworkPrompt = document.getElementById('checkoutArtworkPrompt');
  const checkoutArtworkSelected = document.getElementById('checkoutArtworkSelected');
  const checkoutArtworkName = document.getElementById('checkoutArtworkName');
  const checkoutArtworkSize = document.getElementById('checkoutArtworkSize');
  const checkoutArtworkRemove = document.getElementById('checkoutArtworkRemove');

  // Handle artwork file selection
  checkoutArtworkDropzone?.addEventListener('click', (e) => {
    if (e.target !== checkoutArtworkRemove && !checkoutArtworkRemove?.contains(e.target)) {
      checkoutArtworkInput?.click();
    }
  });

  checkoutArtworkDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    checkoutArtworkDropzone.classList.add('dragover');
  });

  ['dragleave', 'dragend'].forEach(evt => {
    checkoutArtworkDropzone?.addEventListener(evt, () => checkoutArtworkDropzone.classList.remove('dragover'));
  });

  checkoutArtworkDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    checkoutArtworkDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleArtworkFile(e.dataTransfer.files[0]);
    }
  });

  checkoutArtworkInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleArtworkFile(e.target.files[0]);
    }
  });

  function handleArtworkFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64Content = dataUrl.split(',')[1];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

      currentArtworkFile = {
        name: file.name,
        sizeText: `${sizeMb} MB`,
        mimeType: file.type || 'application/octet-stream',
        base64: base64Content
      };

      if (checkoutArtworkPrompt) checkoutArtworkPrompt.style.display = 'none';
      if (checkoutArtworkSelected) checkoutArtworkSelected.style.display = 'flex';
      if (checkoutArtworkName) checkoutArtworkName.textContent = file.name;
      if (checkoutArtworkSize) checkoutArtworkSize.textContent = `(${sizeMb} MB)`;
      showToast(`✓ Archivo ${file.name} listo para Google Drive`, 'success');
    };
    reader.readAsDataURL(file);
  }

  checkoutArtworkRemove?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentArtworkFile = null;
    if (checkoutArtworkInput) checkoutArtworkInput.value = '';
    if (checkoutArtworkPrompt) checkoutArtworkPrompt.style.display = 'flex';
    if (checkoutArtworkSelected) checkoutArtworkSelected.style.display = 'none';
  });

  // Update payment UI based on selected method
  const updatePaymentMethodUI = () => {
    const selectedMethod = document.querySelector('input[name="pay_method"]:checked')?.value || 'recurrente';
    const state = store.getState();
    const finalSubtotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const formattedTotal = formatPrice(finalSubtotal);

    // Update active class on cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
      const radio = card.querySelector('input[name="pay_method"]');
      card.classList.toggle('active', radio && radio.checked);
    });

    // Dynamic submit button
    if (checkoutSubmitBtn && checkoutSubmitBtnText) {
      if (selectedMethod === 'recurrente') {
        checkoutSubmitBtn.className = 'btn-recurrente-pay';
        checkoutSubmitBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span id="checkoutSubmitBtnText">Pagar ${formattedTotal} con Tarjeta (Recurrente) →</span>
        `;
      } else {
        checkoutSubmitBtn.className = 'btn btn-whatsapp btn-lg btn-block';
        checkoutSubmitBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
          <span id="checkoutSubmitBtnText">Enviar Pedido por WhatsApp (3029-2980) →</span>
        `;
      }
    }
  };

  // Listen for payment method radio change
  document.querySelectorAll('input[name="pay_method"]').forEach(radio => {
    radio.addEventListener('change', updatePaymentMethodUI);
  });

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
    updatePaymentMethodUI();
    checkoutModal?.classList.add('open');
    if (checkoutForm) checkoutForm.style.display = 'flex';
    if (checkoutOrderSuccess) checkoutOrderSuccess.style.display = 'none';
  });

  checkoutModalClose?.addEventListener('click', () => {
    checkoutModal?.classList.remove('open');
  });

  // Espacio de Prueba en Vivo (Q 10.00)
  const quickTestBtns = document.querySelectorAll('.js-quick-test-q10');
  quickTestBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      // 1. Asegurar moneda GTQ
      store.setCurrency('GTQ');

      // 2. Limpiar carrito y agregar item de prueba de Q 10.00 exactos
      store.clearCart();
      store.addToCart({
        name: 'Sticker de Prueba en Vivo (Test Recurrente)',
        imageSrc: './samples/cyberpunk-cat.png',
        shape: 'die-cut',
        material: 'holographic',
        finish: 'glossy',
        sizeText: '5 x 5 cm',
        quantity: 1,
        unitPrice: 10.00,
        totalPrice: 10.00,
      });

      // 3. Prellenar datos para agilizar la prueba del usuario
      const nameInput = document.getElementById('checkoutCustomerName');
      const emailInput = document.getElementById('checkoutCustomerEmail');
      const phoneInput = document.getElementById('checkoutCustomerPhone');
      const addressInput = document.getElementById('checkoutCustomerAddress');
      const cityInput = document.getElementById('checkoutCustomerCity');
      const deptInput = document.getElementById('checkoutCustomerDept');
      const nitInput = document.getElementById('checkoutCustomerNit');
      const billingInput = document.getElementById('checkoutCustomerBillingName');

      if (nameInput) nameInput.value = 'Herbert Moscoso (Prueba en Vivo)';
      if (emailInput) emailInput.value = 'mosalsolutionsgt@gmail.com';
      if (phoneInput) phoneInput.value = '30292980';
      if (addressInput) addressInput.value = 'Oficinas Mosal Solutions (Prueba de Pago Q10)';
      if (cityInput) cityInput.value = 'Ciudad de Guatemala';
      if (deptInput) deptInput.value = 'Guatemala';
      if (nitInput) nitInput.value = 'C/F';
      if (billingInput) billingInput.value = 'Mosal Stickers';

      // 4. Si el usuario no ha subido archivo, generar archivo de prueba para validar Google Drive
      if (!currentArtworkFile) {
        currentArtworkFile = {
          name: 'arte-prueba-q10.png',
          sizeText: '1.2 KB',
          mimeType: 'image/png',
          base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        };
        if (checkoutArtworkPrompt) checkoutArtworkPrompt.style.display = 'none';
        if (checkoutArtworkSelected) checkoutArtworkSelected.style.display = 'flex';
        if (checkoutArtworkName) checkoutArtworkName.textContent = 'arte-prueba-q10.png';
        if (checkoutArtworkSize) checkoutArtworkSize.textContent = '(Archivo de prueba para Drive)';
      }

      // 5. Asegurar selección de tarjeta (Recurrente)
      const payRadioRecurrente = document.getElementById('payRadioRecurrente');
      if (payRadioRecurrente) payRadioRecurrente.checked = true;

      // 6. Cerrar carrito y abrir Checkout listo para pagar
      store.toggleCart(false);
      updatePaymentMethodUI();
      checkoutModal?.classList.add('open');
      if (checkoutForm) checkoutForm.style.display = 'flex';
      if (checkoutOrderSuccess) checkoutOrderSuccess.style.display = 'none';

      showToast('🧪 Modo de Prueba Activado: Total Q 10.00 listo para pagar en Recurrente.', 'info');
    });
  });

  // Submit checkout form
  checkoutForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const state = store.getState();
    const payMethodValue = document.querySelector('input[name="pay_method"]:checked')?.value || 'recurrente';

    const customerInfo = {
      name: document.getElementById('checkoutCustomerName')?.value || '',
      email: document.getElementById('checkoutCustomerEmail')?.value || '',
      phone: document.getElementById('checkoutCustomerPhone')?.value || '',
      nit: document.getElementById('checkoutCustomerNit')?.value || '',
      billingName: document.getElementById('checkoutCustomerBillingName')?.value || '',
      address: document.getElementById('checkoutCustomerAddress')?.value || '',
      city: document.getElementById('checkoutCustomerCity')?.value || '',
      department: document.getElementById('checkoutCustomerDept')?.value || '',
      payMethod: payMethodValue === 'recurrente'
        ? 'Tarjeta en Línea (Recurrente)'
        : 'Contra Entrega / WhatsApp',
    };

    const finalSubtotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);

    // Preparar archivo de diseño (si no subió uno en checkout, usar el arte del editor si es data URL)
    let finalArtwork = currentArtworkFile;
    if (!finalArtwork && state.cart[0] && state.cart[0].imageSrc && state.cart[0].imageSrc.startsWith('data:')) {
      finalArtwork = {
        name: `${state.cart[0].name}.png`,
        sizeText: 'Alta resolución (Editor)',
        mimeType: 'image/png',
        base64: state.cart[0].imageSrc.split(',')[1]
      };
    }

    const orderPayload = {
      cart: state.cart,
      customer: customerInfo,
      finalTotal: finalSubtotal,
      currency: state.currency,
      artworkFile: finalArtwork
    };

    // Enviar datos del pedido y archivo a Google Drive (en segundo plano)
    sendOrderToGoogleDrive(orderPayload);

    // 1. PAGO CON PASARELA RECURRENTE
    if (payMethodValue === 'recurrente') {
      processRecurrentePayment(orderPayload, checkoutSubmitBtn);
      return;
    }

    // 2. PEDIDO POR WHATSAPP / CONTRA ENTREGA
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
    const finalSubtotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);

    if (cartSubtotalEl) {
      cartSubtotalEl.textContent = formatPrice(finalSubtotal);
    }

    if (cartDiscountRow) {
      cartDiscountRow.style.display = 'none';
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
      metallic: 'Metálico Oro / Plata',
      dtf_uv: 'DTF UV (Barniz y Relieve 3D para Rígidos)',
      dtf_textil: 'DTF Textil (Transfer Digital para Prendas y Telas)',
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
  lines.push(`💰 *TOTAL:* ${formatPrice(finalTotal)}`);
  lines.push('────────────────────────');

  if (customerInfo && (customerInfo.name || customerInfo.address || customerInfo.nit)) {
    lines.push('');
    lines.push('📍 *DATOS DE ENTREGA:*');
    if (customerInfo.name) lines.push(`• Cliente: ${customerInfo.name}`);
    if (customerInfo.nit) lines.push(`• NIT: ${customerInfo.nit}`);
    if (customerInfo.billingName) lines.push(`• Facturación: ${customerInfo.billingName}`);
    if (customerInfo.phone) lines.push(`• Teléfono: ${customerInfo.phone}`);
    if (customerInfo.email) lines.push(`• Correo (prueba digital): ${customerInfo.email}`);
    if (customerInfo.address) lines.push(`• Dirección: ${customerInfo.address}`);
    if (customerInfo.city || customerInfo.department) {
      lines.push(`• Destino: ${customerInfo.city || ''} (${customerInfo.department || 'Guatemala'})`);
    }
    if (customerInfo.payMethod) lines.push(`• Método de pago: ${customerInfo.payMethod}`);
  }

  lines.push('');
  lines.push('¿Me confirman para enviarles mi arte en alta resolución y coordinar la entrega? ¡Muchas gracias!');

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

