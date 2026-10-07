/* ==========================================================================
   MOSAL STICKERS - CONFIGURACIÓN DE PASARELA DE PAGOS Y CUENTAS
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

  // Cuentas Bancarias Oficiales de Mosal Solutions para Transferencias
  bankAccounts: [
    {
      id: 'bi',
      bankName: 'Banco Industrial (BI)',
      accountType: 'Monetaria en Quetzales',
      accountNumber: '085-0123456-7',
      accountHolder: 'Mosal Solutions',
      badgeColor: '#003882'
    },
    {
      id: 'bac',
      bankName: 'BAC Credomatic',
      accountType: 'Monetaria en Quetzales',
      accountNumber: '9012345678',
      accountHolder: 'Mosal Solutions',
      badgeColor: '#D81920'
    }
  ],

  // Contacto oficial de Mosal Solutions
  contact: {
    whatsappNumber: '50230292980',
    displayPhone: '+502 3029-2980',
    email: 'mosalsolutionsgt@gmail.com'
  }
};
