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
  }
};
