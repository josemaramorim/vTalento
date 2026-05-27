const BasePaymentAdapter = require('./BasePaymentAdapter');

class GenericPaymentAdapter extends BasePaymentAdapter {
  async gerarCobranca(fatura, simular = true) {
    const valor = parseFloat(fatura.valor);
    const tipo = this.configuracoes.tipo || 'GENERICO';

    console.log(`[GenericPaymentAdapter] Gerando cobrança genérica (${tipo}) no valor de R$ ${valor}...`);

    return {
      checkout_url: `https://checkout.plataforma.com/pay/mock_billing_${fatura.id}?tipo=${encodeURIComponent(tipo)}&simulado=${simular}`,
      pix_qr_code: simular ? '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925V-Talentos SaaS6009SAO PAULO62070503***63041A2F' : null,
      pix_copia_cola: simular ? '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925V-Talentos SaaS6009SAO PAULO62070503***63041A2F' : null,
      boleto_linha: simular ? '34191.79001 01043.513184 91020.150008 7 90020000019900' : null
    };
  }
}

module.exports = GenericPaymentAdapter;
