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
 * Retorna el monto exacto de la orden sin recargos adicionales (solo precio de stickers + flete).
 */
export function calculateCardGrossAmount(netAmount, currency = 'GTQ') {
  const net = Number(netAmount) || 0;
  return Math.round(net * 100) / 100;
}
