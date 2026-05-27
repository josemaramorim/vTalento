const StripeAdapter = require('./StripeAdapter');
const AsaasAdapter = require('./AsaasAdapter');
const GenericPaymentAdapter = require('./GenericPaymentAdapter');

class PaymentFactory {
  /**
   * Resolve e instancia o Adapter correspondente ao tipo do provedor.
   * @param {string} tipo - Tipo do provedor (ex: STRIPE, ASAAS, MERCADOPAGO)
   * @param {Object} configuracoes - Objeto de chaves e parâmetros configurados
   * @returns {BasePaymentAdapter} Instância concreta de um Adapter de Pagamentos
   */
  static getAdapter(tipo, configuracoes = {}) {
    const tipoSanitizado = (tipo || '').toUpperCase().trim();

    switch (tipoSanitizado) {
      case 'STRIPE':
        return new StripeAdapter(configuracoes);
      case 'ASAAS':
        return new AsaasAdapter(configuracoes);
      default:
        // Fallback genérico crash-proof para suportar qualquer provedor do mundo
        return new GenericPaymentAdapter({ ...configuracoes, tipo: tipoSanitizado });
    }
  }
}

module.exports = PaymentFactory;
