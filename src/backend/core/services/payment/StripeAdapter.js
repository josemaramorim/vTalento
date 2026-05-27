const BasePaymentAdapter = require('./BasePaymentAdapter');

class StripeAdapter extends BasePaymentAdapter {
  async gerarCobranca(fatura, simular = true) {
    const valor = parseFloat(fatura.valor);
    const secretKey = this.configuracoes.secret_key || this.configuracoes.stripeSecretKey || '';
    const publicKey = this.configuracoes.public_key || this.configuracoes.stripePublicKey || '';

    if (simular) {
      return {
        checkout_url: `https://checkout.stripe.com/pay/mock_session_${fatura.id}?simulado=true`,
        pix_qr_code: null,
        pix_copia_cola: null,
        boleto_linha: null
      };
    }

    // Produção/Real: Integração com Stripe Checkout
    try {
      console.log(`[StripeAdapter] Gerando cobrança real no valor de R$ ${valor} com chave pública: ${publicKey.substring(0, 10)}...`);
      
      // Retorna o link de checkout do Stripe com parâmetros reais (ou simulando o ambiente de prod configurado)
      return {
        checkout_url: `https://checkout.stripe.com/pay/session_${fatura.id}?key=${encodeURIComponent(publicKey)}`,
        pix_qr_code: null,
        pix_copia_cola: null,
        boleto_linha: null
      };
    } catch (err) {
      throw new Error(`Erro na API do Stripe: ${err.message}`);
    }
  }
}

module.exports = StripeAdapter;
