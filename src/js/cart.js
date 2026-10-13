/* ==========================================================================
   MOSAL STICKERS - SLIDE-OVER CART DRAWER & CHECKOUT FLOW
   ========================================================================== */

import { store, MATERIAL_LABELS, SHAPE_LABELS } from './state.js';
import { formatPrice } from './pricing.js';
import { processRecurrentePayment } from './recurrente.js';
import { sendOrderToGoogleDrive } from './google-drive.js';
import { calculateCardGrossAmount } from './payment-config.js';

/**
 * Tarifa oficial de envío en Guatemala:
 * - Capital (Ciudad de Guatemala y Departamento de Guatemala): Q 25.00
 * - Departamentos del interior: Q 35.00
 */
export function getShippingZoneInfo(department) {
  if (!department) return { zone: 'capital', fee: 25.0, label: 'Capital' };
  const d = (department || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (d === 'guatemala' || d === 'capital' || d === 'ciudad de guatemala') {
    return { zone: 'capital', fee: 25.0, label: 'Capital' };
  }

  // Departamentos Cercanos (Región Central, Alrededores, Costa Sur y Altiplano Central)
  const cercanos = [
    'sacatepequez', 'antigua',
    'chimaltenango', 'chimal',
    'escuintla',
    'el progreso', 'progreso', 'guastatoya',
    'santa rosa', 'cuilapa', 'barberena',
    'solola', 'panajachel', 'atitlan',
    'suchitepequez', 'mazate', 'mazatenango',
    'quetzaltenango', 'xela',
    'retalhuleu', 'reu',
    'totonicapan',
    'baja verapaz', 'salama',
    'jalapa'
  ];

  for (const c of cercanos) {
    if (d.includes(c)) {
      return { zone: 'cercanos', fee: 35.0, label: 'Deptos. Cercanos' };
    }
  }

  // Departamentos Lejanos (Huehuetenango, San Marcos, Quiché, Alta Verapaz, Petén, Izabal, Zacapa, Chiquimula, Jutiapa)
  return { zone: 'lejanos', fee: 55.0, label: 'Deptos. Lejanos' };
}

export function isCapitalZone(department) {
  return getShippingZoneInfo(department).zone === 'capital';
}

/**
 * Detecta automáticamente el departamento si el cliente escribe un municipio o departamento
 * en el campo de dirección de entrega o municipio (ej. "huehue", "xela", "antigua", etc.)
 */
export function detectDepartmentFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Huehuetenango / Huehue y sus municipios principales
  if (
    t.includes('huehue') ||
    t.includes('huehuetenango') ||
    t.includes('chiantla') ||
    t.includes('barillas') ||
    t.includes('aguacatan') ||
    t.includes('san pedro necta') ||
    t.includes('jacaltenango') ||
    t.includes('soloma')
  ) {
    return 'Huehuetenango';
  }

  // 2. Quetzaltenango / Xela
  if (
    t.includes('xela') ||
    t.includes('quetzaltenango') ||
    t.includes('salcaja') ||
    t.includes('coatepeque') ||
    t.includes('olintepeque') ||
    t.includes('cantel') ||
    t.includes('almolonga') ||
    t.includes('zunil')
  ) {
    return 'Quetzaltenango';
  }

  // 3. Sacatepéquez / Antigua
  if (
    t.includes('antigua') ||
    t.includes('sacatepequez') ||
    t.includes('jocotenango') ||
    t.includes('ciudad vieja') ||
    t.includes('san lucas sacatepequez') ||
    t.includes('santa maria de jesus')
  ) {
    return 'Sacatepéquez';
  }

  // 4. San Marcos
  if (
    t.includes('san marcos') ||
    t.includes('malacatan') ||
    t.includes('ayutla') ||
    t.includes('tecun uman') ||
    t.includes('pajapita') ||
    t.includes('tacana')
  ) {
    return 'San Marcos';
  }

  // 5. Escuintla
  if (
    t.includes('escuintla') ||
    t.includes('palin') ||
    t.includes('puerto san jose') ||
    t.includes('santa lucia cotz') ||
    t.includes('tiquisate') ||
    t.includes('sipacate') ||
    t.includes('masagua')
  ) {
    return 'Escuintla';
  }

  // 6. Chimaltenango
  if (
    t.includes('chimaltenango') ||
    t.includes('chimal') ||
    t.includes('tecpan') ||
    t.includes('patzun') ||
    t.includes('patzicia') ||
    t.includes('zaragoza') ||
    t.includes('el tejar')
  ) {
    return 'Chimaltenango';
  }

  // 7. Alta Verapaz
  if (
    t.includes('coban') ||
    t.includes('alta verapaz') ||
    t.includes('carcha') ||
    t.includes('chamelco') ||
    t.includes('tactic') ||
    t.includes('lanquin') ||
    t.includes('semuc')
  ) {
    return 'Alta Verapaz';
  }

  // 8. Baja Verapaz
  if (
    t.includes('salama') ||
    t.includes('baja verapaz') ||
    t.includes('rabinal') ||
    t.includes('san jeronimo') ||
    t.includes('purulha') ||
    t.includes('cubulco')
  ) {
    return 'Baja Verapaz';
  }

  // 9. Quiché
  if (
    t.includes('quiche') ||
    t.includes('santa cruz del quiche') ||
    t.includes('chichicastenango') ||
    t.includes('chichi') ||
    t.includes('nebaj') ||
    t.includes('joyabaj')
  ) {
    return 'Quiché';
  }

  // 10. Petén
  if (
    t.includes('peten') ||
    t.includes('flores') ||
    t.includes('santa elena') ||
    t.includes('san benito') ||
    t.includes('sayaxche') ||
    t.includes('poptun') ||
    t.includes('tikal')
  ) {
    return 'Petén';
  }

  // 11. Izabal
  if (
    t.includes('izabal') ||
    t.includes('puerto barrios') ||
    t.includes('morales') ||
    t.includes('livingston') ||
    t.includes('rio dulce')
  ) {
    return 'Izabal';
  }

  // 12. Suchitepéquez
  if (
    t.includes('suchitepequez') ||
    t.includes('mazate') ||
    t.includes('mazatenango') ||
    t.includes('cuyotenango') ||
    t.includes('chicacao')
  ) {
    return 'Suchitepéquez';
  }

  // 13. Retalhuleu
  if (
    t.includes('retalhuleu') ||
    t.includes('reu') ||
    t.includes('champerico') ||
    t.includes('el asintal')
  ) {
    return 'Retalhuleu';
  }

  // 14. Sololá
  if (
    t.includes('solola') ||
    t.includes('panajachel') ||
    t.includes('pana') ||
    t.includes('atitlan') ||
    t.includes('santiago atitlan') ||
    t.includes('san pedro la laguna')
  ) {
    return 'Sololá';
  }

  // 15. Totonicapán
  if (
    t.includes('totonicapan') ||
    t.includes('toto') ||
    t.includes('momostenango') ||
    t.includes('san francisco el alto')
  ) {
    return 'Totonicapán';
  }

  // 16. Zacapa
  if (
    t.includes('zacapa') ||
    t.includes('estanzuela') ||
    t.includes('gualan') ||
    t.includes('teculutan') ||
    t.includes('rio hondo')
  ) {
    return 'Zacapa';
  }

  // 17. Chiquimula
  if (
    t.includes('chiquimula') ||
    t.includes('esquipulas') ||
    t.includes('ipala') ||
    t.includes('jocotan')
  ) {
    return 'Chiquimula';
  }

  // 18. Jalapa
  if (
    t.includes('jalapa') ||
    t.includes('san pedro pinula') ||
    t.includes('mataquescuintla') ||
    t.includes('monjas')
  ) {
    return 'Jalapa';
  }

  // 19. Jutiapa
  if (
    t.includes('jutiapa') ||
    t.includes('asuncion mita') ||
    t.includes('moyuta') ||
    t.includes('quesada')
  ) {
    return 'Jutiapa';
  }

  // 20. Santa Rosa
  if (
    t.includes('santa rosa') ||
    t.includes('cuilapa') ||
    t.includes('barberena') ||
    t.includes('chiquimulilla') ||
    t.includes('taxisco') ||
    t.includes('monterrico')
  ) {
    return 'Santa Rosa';
  }

  // 21. El Progreso
  if (
    t.includes('el progreso') ||
    t.includes('guastatoya') ||
    t.includes('sanarate') ||
    t.includes('morazan')
  ) {
    return 'El Progreso';
  }

  // 22. Capital / Depto. de Guatemala
  if (
    t.includes('guatemala') ||
    t.includes('capital') ||
    t.includes('mixco') ||
    t.includes('villa nueva') ||
    t.includes('petapa') ||
    t.includes('fraijanes') ||
    t.includes('san jose pinula') ||
    t.includes('santa catarina pinula') ||
    t.includes('amatitlan') ||
    t.includes('carretera a el salvador') ||
    t.includes('chinautla') ||
    t.includes('villa canales') ||
    t.match(/\bzona\s*(?:[1-9]|1[0-9]|2[0-5])\b/)
  ) {
    return 'Guatemala';
  }

  return null;
}

export function calculateShippingFee(subtotal, department = 'Guatemala', currency = 'GTQ') {
  if (currency !== 'GTQ') {
    return currency === 'USD' ? 5.0 : 4.95;
  }

  return getShippingZoneInfo(department).fee;
}

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

  // Elementos del desglose de costos en checkout
  const checkoutAddressInput = document.getElementById('checkoutCustomerAddress');
  const checkoutCityInput = document.getElementById('checkoutCustomerCity');
  const checkoutDeptSelect = document.getElementById('checkoutCustomerDept');
  const breakdownSubtotalEl = document.getElementById('checkoutBreakdownSubtotal');
  const breakdownShippingLabelEl = document.getElementById('checkoutBreakdownShippingLabel');
  const breakdownShippingValueEl = document.getElementById('checkoutBreakdownShippingValue');
  const breakdownTotalEl = document.getElementById('checkoutBreakdownTotal');

  // Actualiza el desglose de flete y total en el modal de checkout
  const updateCheckoutBreakdownUI = () => {
    const state = store.getState();
    const rawSubtotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;
    if (state.appliedPromo) {
      discount = rawSubtotal * state.appliedPromo.discount;
    }
    const finalSubtotal = Math.max(0, rawSubtotal - discount);

    // Auto-detección inteligente: si en dirección o ciudad el cliente escribió "huehue" u otro departamento
    const addressVal = checkoutAddressInput?.value || '';
    const cityVal = checkoutCityInput?.value || '';
    const detected = detectDepartmentFromText(`${addressVal} ${cityVal}`);

    let selectedDept = checkoutDeptSelect ? checkoutDeptSelect.value : 'Guatemala';
    // Si el dropdown seguía en el predeterminado "Guatemala", pero en el texto escribió Huehue u otro:
    if (selectedDept === 'Guatemala' && detected && detected !== 'Guatemala') {
      selectedDept = detected;
      if (checkoutDeptSelect) checkoutDeptSelect.value = detected;
    }

    const shippingFee = calculateShippingFee(finalSubtotal, selectedDept, state.currency);
    const zoneInfo = getShippingZoneInfo(selectedDept);
    const orderTotal = finalSubtotal + shippingFee;

    if (breakdownSubtotalEl) breakdownSubtotalEl.textContent = formatPrice(finalSubtotal);
    if (breakdownShippingLabelEl) {
      breakdownShippingLabelEl.textContent = `Envío (${selectedDept} • ${zoneInfo.label}):`;
    }
    if (breakdownShippingValueEl) {
      breakdownShippingValueEl.textContent = formatPrice(shippingFee);
    }
    if (breakdownTotalEl) breakdownTotalEl.textContent = formatPrice(orderTotal);

    updatePaymentMethodUI(finalSubtotal, shippingFee, orderTotal);
  };

  // Reacciona en vivo mientras el cliente escribe su dirección o municipio (ej. al teclear "huehue")
  const handleAddressOrCityInput = () => {
    const addressVal = checkoutAddressInput?.value || '';
    const cityVal = checkoutCityInput?.value || '';
    const detected = detectDepartmentFromText(`${addressVal} ${cityVal}`);

    if (detected && checkoutDeptSelect && checkoutDeptSelect.value !== detected) {
      checkoutDeptSelect.value = detected;
    }
    updateCheckoutBreakdownUI();
  };

  checkoutAddressInput?.addEventListener('input', handleAddressOrCityInput);
  checkoutCityInput?.addEventListener('input', handleAddressOrCityInput);
  checkoutDeptSelect?.addEventListener('change', updateCheckoutBreakdownUI);

  // Update payment UI based on selected method
  const updatePaymentMethodUI = (subtotal = null, fee = null, total = null) => {
    const selectedMethod = document.querySelector('input[name="pay_method"]:checked')?.value || 'recurrente';
    const state = store.getState();
    const rawSubtotal = subtotal !== null ? subtotal : state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const selectedDept = checkoutDeptSelect ? checkoutDeptSelect.value : 'Guatemala';
    const shippingFee = fee !== null ? fee : calculateShippingFee(rawSubtotal, selectedDept, state.currency);
    const orderTotal = total !== null ? total : (rawSubtotal + shippingFee);

    // Update active class on cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
      const radio = card.querySelector('input[name="pay_method"]');
      card.classList.toggle('active', radio && radio.checked);
    });

    // Dynamic submit button
    if (checkoutSubmitBtn && checkoutSubmitBtnText) {
      if (selectedMethod === 'recurrente') {
        const cardGrossTotal = calculateCardGrossAmount(orderTotal, state.currency);
        const formattedTotal = formatPrice(cardGrossTotal);
        checkoutSubmitBtn.className = 'btn-recurrente-pay';
        checkoutSubmitBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span id="checkoutSubmitBtnText">Pagar ${formattedTotal} con Tarjeta (Recurrente) →</span>
        `;
      } else {
        const formattedTotal = formatPrice(orderTotal);
        checkoutSubmitBtn.className = 'btn btn-whatsapp btn-lg btn-block';
        checkoutSubmitBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
          <span id="checkoutSubmitBtnText">Enviar Pedido por WhatsApp (${formattedTotal}) →</span>
        `;
      }
    }
  };

  // Listen for payment method radio change
  document.querySelectorAll('input[name="pay_method"]').forEach(radio => {
    radio.addEventListener('change', () => updateCheckoutBreakdownUI());
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
    const shippingFee = calculateShippingFee(finalSubtotal, 'Guatemala', state.currency);
    const orderTotal = finalSubtotal + shippingFee;
    const waUrl = getWhatsAppOrderUrl(state.cart, orderTotal, state.currency, null, {
      subtotal: finalSubtotal,
      shippingFee: shippingFee,
      shippingZone: 'Ciudad de Guatemala (Predeterminado)'
    });

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
    updateCheckoutBreakdownUI();
    checkoutModal?.classList.add('open');
    if (checkoutForm) checkoutForm.style.display = 'flex';
    if (checkoutOrderSuccess) checkoutOrderSuccess.style.display = 'none';
  });

  checkoutModalClose?.addEventListener('click', () => {
    checkoutModal?.classList.remove('open');
  });

  // Submit checkout form
  checkoutForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const state = store.getState();
    const payMethodValue = document.querySelector('input[name="pay_method"]:checked')?.value || 'recurrente';
    const addressVal = document.getElementById('checkoutCustomerAddress')?.value || '';
    const cityVal = document.getElementById('checkoutCustomerCity')?.value || '';
    const detected = detectDepartmentFromText(`${addressVal} ${cityVal}`);
    let selectedDept = document.getElementById('checkoutCustomerDept')?.value || 'Guatemala';
    if (selectedDept === 'Guatemala' && detected && detected !== 'Guatemala') {
      selectedDept = detected;
      if (checkoutDeptSelect) checkoutDeptSelect.value = detected;
    }

    const customerInfo = {
      name: document.getElementById('checkoutCustomerName')?.value || '',
      email: document.getElementById('checkoutCustomerEmail')?.value || '',
      phone: document.getElementById('checkoutCustomerPhone')?.value || '',
      nit: document.getElementById('checkoutCustomerNit')?.value || '',
      billingName: document.getElementById('checkoutCustomerBillingName')?.value || '',
      address: addressVal,
      city: cityVal,
      department: selectedDept,
      payMethod: payMethodValue === 'recurrente'
        ? 'Tarjeta en Línea (Recurrente)'
        : 'Contra Entrega / WhatsApp',
    };

    const rawSubtotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;
    if (state.appliedPromo) {
      discount = rawSubtotal * state.appliedPromo.discount;
    }
    const finalSubtotal = Math.max(0, rawSubtotal - discount);
    const shippingFee = calculateShippingFee(finalSubtotal, selectedDept, state.currency);
    const isCapital = selectedDept.trim().toLowerCase() === 'guatemala';
    const isFreeShipping = shippingFee === 0 && finalSubtotal >= (state.currency === 'GTQ' ? 250 : 35);
    const orderTotal = finalSubtotal + shippingFee;
    const isCardPayment = payMethodValue === 'recurrente';
    const cardGrossTotal = calculateCardGrossAmount(orderTotal, state.currency);

    const shippingZoneText = `${isCapital ? 'Capital (Ciudad de Guatemala)' : selectedDept} (${formatPrice(shippingFee)})`;

    // Resumen técnico detallado con material, corte y margen de troquelado (sin laminado)
    const detailedItemsText = state.cart.map((item, index) => {
      const mat = item.materialLabel || MATERIAL_LABELS[item.material] || item.material || 'Vinil';
      const shp = item.shapeLabel || SHAPE_LABELS[item.shape] || item.shape || 'Troquelado';
      const margin = item.cutMarginText || (item.cutMarginMm !== undefined ? `${item.cutMarginMm} mm` : '2.0 mm');
      return `${index + 1}. ${item.quantity}x ${item.name} (${item.sizeText})\n   • Material: ${mat}\n   • Tipo de Corte: ${shp}\n   • Margen de Corte / Borde: ${margin}\n   • Subtotal: ${formatPrice(item.totalPrice)}`;
    }).join('\n\n');

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
      subtotal: finalSubtotal,
      shippingFee: shippingFee,
      shippingZone: shippingZoneText,
      netTotal: orderTotal,
      finalTotal: isCardPayment ? cardGrossTotal : orderTotal,
      currency: state.currency,
      artworkFile: finalArtwork,
      detailedItemsText: detailedItemsText
    };

    // Enviar datos del pedido y archivo a Google Drive (en segundo plano)
    sendOrderToGoogleDrive(orderPayload);

    // 1. PAGO CON PASARELA RECURRENTE
    if (isCardPayment) {
      processRecurrentePayment(orderPayload, checkoutSubmitBtn);
      return;
    }

    // 2. PEDIDO POR WHATSAPP / CONTRA ENTREGA
    const waUrl = getWhatsAppOrderUrl(state.cart, orderTotal, state.currency, customerInfo, {
      subtotal: finalSubtotal,
      shippingFee: shippingFee,
      shippingZone: shippingZoneText
    });
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
      shippingProgressBar.style.width = '100%';
    }

    if (shippingNoticeText) {
      shippingNoticeText.innerHTML = `🚚 <strong>Tarifas de Envío:</strong> Q 25 Capital • Q 35 Deptos. Cercanos • Q 55 Deptos. Lejanos`;
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

  container.innerHTML = items.map(item => {
    const matLabel = item.materialLabel || MATERIAL_LABELS[item.material] || item.material;
    const shpLabel = item.shapeLabel || SHAPE_LABELS[item.shape] || item.shape || 'Troquelado';
    const marginLabel = item.cutMarginText || (item.cutMarginMm !== undefined ? `${item.cutMarginMm} mm` : '2.0 mm');

    return `
      <div class="cart-item-card" data-id="${item.id}">
        <div class="cart-item-thumb">
          <img src="${item.imageSrc}" alt="${item.name}" />
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-meta" style="font-weight: 600; color: #ffffff;">
            ${item.quantity} unidades • ${item.sizeText}
          </div>
          <div class="cart-item-meta" style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.25rem;">
            <span class="badge badge-yellow" style="font-size: 0.68rem;">${matLabel}</span>
            <span class="badge" style="background: rgba(255,255,255,0.08); color: #c9d1d9; font-size: 0.68rem;">Corte: ${shpLabel} (${marginLabel})</span>
          </div>
        </div>
        <div>
          <div class="cart-item-price">${formatPrice(item.totalPrice)}</div>
          <div class="cart-item-remove-btn js-remove-item" data-id="${item.id}">Eliminar</div>
        </div>
      </div>
    `;
  }).join('');

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
export function getWhatsAppOrderUrl(cart, finalTotal, currency = 'GTQ', customerInfo = null, pricingMeta = null) {
  const phone = '50230292980';
  const lines = [
    '¡Hola *Mosal Solutions*! 👋',
    'Quiero realizar el siguiente pedido de stickers personalizados desde su sitio web:',
    '',
    '📦 *DETALLE TÉCNICO DE PRODUCTOS:*'
  ];

  cart.forEach((item, index) => {
    const mat = item.materialLabel || MATERIAL_LABELS[item.material] || item.material;
    const shp = item.shapeLabel || SHAPE_LABELS[item.shape] || item.shape || 'Troquelado';
    const margin = item.cutMarginText || (item.cutMarginMm !== undefined ? `${item.cutMarginMm} mm` : '2.0 mm');

    lines.push(`${index + 1}. *${item.name}*`);
    lines.push(`   • Cantidad: ${item.quantity} unidades`);
    lines.push(`   • Dimensiones: ${item.sizeText}`);
    lines.push(`   • Material: ${mat}`);
    lines.push(`   • Tipo de Troquelado: ${shp}`);
    lines.push(`   • Margen de Corte / Borde: ${margin}`);
    lines.push(`   • Subtotal: ${formatPrice(item.totalPrice)}`);
    lines.push('');
  });

  lines.push('────────────────────────');
  if (pricingMeta) {
    lines.push(`• Subtotal Stickers: ${formatPrice(pricingMeta.subtotal)}`);
    lines.push(`• Costo de Envío (${pricingMeta.shippingZone || 'Nacional'}): ${pricingMeta.shippingFee > 0 ? formatPrice(pricingMeta.shippingFee) : '¡GRATIS!'}`);
    lines.push('────────────────────────');
  }
  lines.push(`💰 *TOTAL A PAGAR:* ${formatPrice(finalTotal)}`);
  lines.push('────────────────────────');

  if (customerInfo && (customerInfo.name || customerInfo.address || customerInfo.nit)) {
    lines.push('');
    lines.push('📍 *DATOS DE ENTREGA Y FACTURACIÓN:*');
    if (customerInfo.name) lines.push(`• Cliente: ${customerInfo.name}`);
    if (customerInfo.nit) lines.push(`• NIT: ${customerInfo.nit}`);
    if (customerInfo.billingName) lines.push(`• Nombre Facturación: ${customerInfo.billingName}`);
    if (customerInfo.phone) lines.push(`• Teléfono: ${customerInfo.phone}`);
    if (customerInfo.email) lines.push(`• Correo (para prueba digital): ${customerInfo.email}`);
    if (customerInfo.address) lines.push(`• Dirección de Entrega: ${customerInfo.address}`);
    if (customerInfo.city || customerInfo.department) {
      lines.push(`• Destino: ${customerInfo.city || ''} (${customerInfo.department || 'Guatemala'})`);
    }
    if (customerInfo.payMethod) lines.push(`• Método de Pago: ${customerInfo.payMethod}`);
  }

  lines.push('');
  lines.push('¿Me confirman para revisar mi prueba digital y coordinar la entrega? ¡Muchas gracias!');

  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}


