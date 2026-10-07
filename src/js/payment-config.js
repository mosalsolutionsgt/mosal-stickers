/* ==========================================================================
   MOSAL STICKERS - CONFIGURACIÓN DE PASARELA DE PAGOS Y GOOGLE DRIVE
   ========================================================================== */

export const PAYMENT_CONFIG = {
  // Pasarela de Pagos Recurrente (Guatemala)
  recurrente: {
    // Clave Secreta oficial (X-SECRET-KEY) de Recurrente
    get secretKey() {
      if (typeof window !== 'undefined' && localStorage.getItem('mosal_recurrente_sk')) {
        return localStorage.getItem('mosal_recurrente_sk');
      }
      try {
        return atob('c2tfbGl2ZV9NbHlqZ1YwYkp1eHVWTDdEc09IaG9Pdk9saXFzY01ia2F4ZmhJUnFhZnAwZ21oRUlOcTNwOHJXUQ==');
      } catch (e) {
        return '';
      }
    },

    // Clave Pública (opcional)
    publicKey: '',

    // Modo de pruebas / demo (en false para procesar pagos reales en vivo)
    demoMode: false,

    // Endpoint oficial de Recurrente para crear sesiones de checkout
    apiEndpoint: 'https://app.recurrente.com/api/checkouts',
  },

  // Integración con Google Drive y Google Sheets (Opción A)
  googleDrive: {
    webhookUrl: 'https://script.google.com/macros/s/AKfycbyvuQoJDcoHxtMQiwmziCNC76OTe_R7ja_xUijz5SotwolAU2iTCFuJQhigiZIy9SvLrA/exec',
  },

  // Contacto oficial de Mosal Solutions
  contact: {
    whatsappNumber: '50230292980',
    displayPhone: '+502 3029-2980',
    email: 'mosalsolutionsgt@gmail.com'
  },

  // Estructura de costos de tarjeta para absorber y cubrir comisión e IVA retenido
  cardFees: {
    recurrenteRate: 0.045,      // 4.5% comisión pasarela Recurrente
    fixedFeeGtq: 2.00,          // Q 2.00 fijo por transacción
    satIvaRetencionRate: 0.016, // 1.6% retención tributaria de IVA SAT (Guatemala)
    totalPercentRate: 0.061     // 6.1% total combinado (4.5% + 1.6%)
  }
};

/**
 * Calcula el monto a cobrar en tarjeta para cubrir la comisión de Recurrente y el IVA retenido por SAT,
 * garantizando que Mosal reciba el monto neto exacto de la orden sin pérdidas.
 *
 * Deducción Recurrente = Cobro * 6.1% + Q 2.00
 * Cobro = (NetoDeseado + Q 2.00) / (1 - 0.061)
 */
export function calculateCardGrossAmount(netAmount, currency = 'GTQ') {
  const net = Number(netAmount) || 0;
  if (net <= 0) return 0;

  if (currency === 'GTQ') {
    const gross = (net + PAYMENT_CONFIG.cardFees.fixedFeeGtq) / (1 - PAYMENT_CONFIG.cardFees.totalPercentRate);
    return Math.ceil(gross * 100) / 100;
  }

  // Monedas internacionales (USD / EUR)
  const gross = (net + 0.30) / (1 - 0.045);
  return Math.ceil(gross * 100) / 100;
}
