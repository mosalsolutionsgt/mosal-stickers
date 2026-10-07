/* ==========================================================================
   MOSAL STICKERS - SERVICIO DE PASARELA RECURRENTE (GUATEMALA)
   ========================================================================== */

import { PAYMENT_CONFIG } from './payment-config.js';
import { store } from './state.js';
import { formatPrice } from './pricing.js';
import { showToast } from './cart.js';

/**
 * Procesa el pago con la pasarela Recurrente (Visa / Mastercard)
 * Si no hay secretKey configurada, abre el modal interactivo de demostración.
 */
export async function processRecurrentePayment(orderPayload, submitButton) {
  const { secretKey, apiEndpoint } = PAYMENT_CONFIG.recurrente;

  // Generar ID único de orden
  const orderId = 'MOS-' + Math.floor(100000 + Math.random() * 900000);
  orderPayload.orderId = orderId;
  orderPayload.date = new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' });

  // Guardar en localStorage para recuperarlo al retornar del checkout
  try {
    localStorage.setItem('mosal_pending_order', JSON.stringify(orderPayload));
  } catch (err) {
    console.warn('No se pudo guardar la orden en localStorage', err);
  }

  // 1. MODO DEMO / SIMULACIÓN (si no tiene la llave secreta configurada aún)
  if (!secretKey || PAYMENT_CONFIG.recurrente.demoMode) {
    openRecurrenteDemoModal(orderPayload);
    return;
  }

  // 2. MODO EN VIVO CON API DE RECURRENTE
  const originalBtnText = submitButton ? submitButton.innerHTML : '';
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <svg class="spin-animation" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
      Conectando con Recurrente...
    `;
  }

  try {
    const currentUrl = window.location.origin + window.location.pathname;
    const successUrl = `${currentUrl}?payment=success&order_id=${orderId}`;
    const cancelUrl = `${currentUrl}?payment=cancel`;

    // Estructura detallada de items para el recibo de Recurrente
    let items = orderPayload.cart && orderPayload.cart.length > 0
      ? orderPayload.cart.map(item => ({
          name: `${item.quantity}x ${item.name} (${item.sizeText})`,
          amount_in_cents: Math.round(item.totalPrice * 100),
          currency: orderPayload.currency || 'GTQ',
          quantity: 1
        }))
      : [];

    const itemsTotal = items.reduce((sum, it) => sum + it.amount_in_cents, 0);
    const expectedTotal = Math.round(orderPayload.finalTotal * 100);

    // Si hubo cupón de descuento o discrepancia de centavos, unificar en un item exacto
    if (items.length === 0 || itemsTotal !== expectedTotal) {
      items = [
        {
          name: `Pedido Mosal Stickers #${orderId} (${orderPayload.cart.length} item${orderPayload.cart.length > 1 ? 's' : ''})`,
          amount_in_cents: expectedTotal,
          currency: orderPayload.currency || 'GTQ',
          quantity: 1
        }
      ];
    }

    const bodyData = {
      items,
      user_email: orderPayload.customer.email,
      user_name: orderPayload.customer.name,
      phone_number: orderPayload.customer.phone,
      success_url: successUrl,
      cancel_url: cancelUrl
    };

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SECRET-KEY': secretKey
      },
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();

    if (response.ok && data.checkout_url) {
      showToast('Redirigiendo a la pasarela segura de Recurrente...', 'success');
      setTimeout(() => {
        window.location.href = data.checkout_url;
      }, 400);
    } else {
      console.error('Error de Recurrente API:', data);
      const errMsg = (data.errors && Object.values(data.errors).flat().join(', ')) || data.message || 'Error al conectar con la pasarela Recurrente.';
      showToast(`Error de Recurrente: ${errMsg}`, 'error');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalBtnText;
      }
    }
  } catch (error) {
    console.error('Fallo en la petición a Recurrente:', error);
    showToast('No se pudo conectar con Recurrente. Verifica tu conexión o llaves de API.', 'error');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalBtnText;
    }
  }
}

/**
 * Revisa si el usuario viene redirigido de Recurrente tras pagar o cancelar
 */
export function initPaymentReturnHandler() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  const orderIdParam = urlParams.get('order_id');

  if (paymentStatus === 'success') {
    // Recuperar la orden guardada en localStorage
    let savedOrder = null;
    try {
      const raw = localStorage.getItem('mosal_pending_order');
      if (raw) savedOrder = JSON.parse(raw);
    } catch (e) {
      console.warn('Error leyendo orden previa', e);
    }

    const orderId = orderIdParam || (savedOrder ? savedOrder.orderId : 'MOS-' + Math.floor(100000 + Math.random() * 900000));
    openSuccessModal(orderId, savedOrder);

    // Limpiar carrito tras pago exitoso
    store.clearCart();

    // Limpiar parámetros en la barra de direcciones sin recargar la página
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (paymentStatus === 'cancel') {
    showToast('⚠️ El pago en Recurrente fue cancelado. Tus productos siguen en el carrito.', 'warning');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/**
 * Abre el modal de celebración de pago exitoso
 */
export function openSuccessModal(orderId, orderData = null) {
  const modal = document.getElementById('paymentSuccessModal');
  if (!modal) return;

  const idEl = document.getElementById('successOrderId');
  const clientEl = document.getElementById('successCustomerName');
  const totalEl = document.getElementById('successOrderTotal');
  const detailsEl = document.getElementById('successOrderItems');
  const waBtn = document.getElementById('successWhatsAppBtn');

  if (idEl) idEl.textContent = `#${orderId}`;

  const clientName = (orderData && orderData.customer && orderData.customer.name) || 'Estimado Cliente';
  if (clientEl) clientEl.textContent = clientName;

  const totalAmount = orderData ? formatPrice(orderData.finalTotal) : 'Pagado';
  if (totalEl) totalEl.textContent = totalAmount;

  if (detailsEl && orderData && orderData.cart) {
    detailsEl.innerHTML = orderData.cart.map(item => `
      <div style="display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.82rem; color: var(--text-gray-200); padding: 0.25rem 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
        <span>• ${item.quantity}x ${item.name} (${item.sizeText})</span>
        <span style="font-weight: 700; color: white;">${formatPrice(item.totalPrice)}</span>
      </div>
    `).join('');
  }

  // Configurar botón para notificar a Mosal por WhatsApp
  if (waBtn) {
    const waText = [
      `¡Hola Mosal Solutions! 👋 Acabo de completar el pago de mi pedido con tarjeta por Recurrente en su sitio web.`,
      `📦 *No. de Orden:* #${orderId}`,
      `👤 *Cliente:* ${clientName}`,
      orderData && orderData.customer && orderData.customer.phone ? `📞 *Teléfono:* ${orderData.customer.phone}` : '',
      `💰 *Total Pagado:* ${totalAmount}`,
      '',
      'Les escribo para consultar el estado de producción de mis stickers y coordinar la entrega. ¡Muchas gracias!'
    ].filter(Boolean).join('\n');

    waBtn.href = `https://wa.me/50230292980?text=${encodeURIComponent(waText)}`;
  }

  modal.classList.add('open');
}

/**
 * Modal interactivo cuando aún no se ha ingresado la Secret Key en config
 */
function openRecurrenteDemoModal(orderPayload) {
  const demoModal = document.getElementById('recurrenteDemoModal');
  if (!demoModal) return;

  const totalEl = document.getElementById('demoOrderTotal');
  if (totalEl) totalEl.textContent = formatPrice(orderPayload.finalTotal);

  // Botón para simular éxito
  const simulateSuccessBtn = document.getElementById('demoSimulateSuccessBtn');
  if (simulateSuccessBtn) {
    simulateSuccessBtn.onclick = () => {
      demoModal.classList.remove('open');
      const checkoutModal = document.getElementById('checkoutModal');
      if (checkoutModal) checkoutModal.classList.remove('open');

      showToast('Simulando retorno exitoso de Recurrente...', 'success');
      setTimeout(() => {
        window.location.search = `?payment=success&order_id=${orderPayload.orderId}`;
      }, 400);
    };
  }

  // Botón para simular cancelación
  const simulateCancelBtn = document.getElementById('demoSimulateCancelBtn');
  if (simulateCancelBtn) {
    simulateCancelBtn.onclick = () => {
      demoModal.classList.remove('open');
      showToast('Simulando cancelación de Recurrente...', 'warning');
      setTimeout(() => {
        window.location.search = '?payment=cancel';
      }, 400);
    };
  }

  demoModal.classList.add('open');
}
