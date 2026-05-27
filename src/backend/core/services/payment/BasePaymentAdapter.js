class BasePaymentAdapter {
  constructor(configuracoes = {}) {
    this.configuracoes = configuracoes;
  }

  /**
   * Gera a cobrança/checkout unificado para a fatura informada.
   * @param {Object} fatura - Dados da fatura (id, valor, etc.)
   * @param {boolean} simular - Indica se está em modo de simulação (sandbox)
   * @returns {Promise<Object>} Estrutura unificada { checkout_url, pix_qr_code, pix_copia_cola, boleto_linha }
   */
  async gerarCobranca(fatura, simular = true) {
    throw new Error('Método gerarCobranca deve ser implementado pelas classes herdadas.');
  }
}

module.exports = BasePaymentAdapter;
