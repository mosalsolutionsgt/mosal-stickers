/* ==========================================================================
   MOSAL STICKERS - SERVICIO DE GOOGLE DRIVE Y GOOGLE SHEETS
   ========================================================================== */

import { PAYMENT_CONFIG } from './payment-config.js';

/**
 * Envía el pedido y el archivo en alta resolución al webhook de Google Apps Script
 * Guarda el archivo en Google Drive y agrega una fila al Google Sheet de Mosal
 */
export async function sendOrderToGoogleDrive(orderPayload) {
  const webhookUrl = PAYMENT_CONFIG.googleDrive.webhookUrl;
  if (!webhookUrl) {
    console.info('Google Drive webhook aún no configurado en payment-config.js. Omitiendo subida a Drive.');
    return { success: false, reason: 'unconfigured' };
  }

  try {
    // Resumen de productos en texto
    const itemsSummary = (orderPayload.cart || []).map(item =>
      `${item.quantity}x ${item.name} (${item.sizeText || ''})`
    ).join(' | ');

    const payload = {
      orderId: orderPayload.orderId || ('MOS-' + Math.floor(100000 + Math.random() * 900000)),
      date: orderPayload.date || new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' }),
      customerName: orderPayload.customer?.name || '',
      email: orderPayload.customer?.email || '',
      phone: orderPayload.customer?.phone || '',
      nit: orderPayload.customer?.nit || 'C/F',
      billingName: orderPayload.customer?.billingName || '',
      address: orderPayload.customer?.address || '',
      city: orderPayload.customer?.city || '',
      department: orderPayload.customer?.department || '',
      payMethod: orderPayload.customer?.payMethod || '',
      total: `Q ${orderPayload.finalTotal?.toFixed(2) || '0.00'}`,
      itemsSummary: itemsSummary,
      file: orderPayload.artworkFile || null
    };

    // Usar mode: 'no-cors' para Google Apps Script web apps (evita bloqueos de redirección 302 del navegador)
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });

    console.log('✓ Pedido y archivo enviados con éxito a Google Drive y Sheets');
    return { success: true };
  } catch (error) {
    console.error('Error enviando a Google Drive webhook:', error);
    return { success: false, error };
  }
}
