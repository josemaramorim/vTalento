const BasePaymentAdapter = require('./BasePaymentAdapter');

class AsaasAdapter extends BasePaymentAdapter {
  async gerarCobranca(fatura, simular = true) {
    const valor = parseFloat(fatura.valor);

    // Carrega configurações dinamicamente do construtor ou faz o lookup no banco de dados se ausente
    let apiConfig = this.configuracoes || {};
    
    if (!apiConfig.api_key && !apiConfig.asaasApiKey) {
      try {
        const db = require('../../../infra/db');
        const provedoresRow = await db('GamSaaSConfig').where({ chave: 'provedores_pagamento_json' }).first();
        if (provedoresRow && provedoresRow.valor) {
          const provedores = JSON.parse(provedoresRow.valor);
          const asaas = provedores.find(p => p.tipo === 'ASAAS');
          if (asaas && asaas.configuracoes) {
            apiConfig = asaas.configuracoes;
          }
        }
      } catch (e) {
        console.error('[AsaasAdapter] Falha ao carregar credenciais do banco:', e);
      }
    }

    const apiKey = apiConfig.api_key || apiConfig.asaasApiKey || '';
    const webhookSecret = apiConfig.webhook_secret || apiConfig.asaasWebhookSecret || '';
    const isSandbox = apiConfig.ambiente !== 'producao'; // Padrão sandbox para segurança

    // Base URL baseada no ambiente configurado (sandbox vs produção)
    const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    if (simular) {
      return {
        checkout_url: isSandbox 
          ? `https://sandbox.asaas.com/pay/mock_billing_${fatura.id}?simulado=true`
          : `https://checkout.asaas.com/pay/mock_billing_${fatura.id}?simulado=true`,
        pix_qr_code: '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925V-Talentos SaaS6009SAO PAULO62070503***63041A2F',
        pix_copia_cola: '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925V-Talentos SaaS6009SAO PAULO62070503***63041A2F',
        boleto_linha: '34191.79001 01043.513184 91020.150008 7 90020000019900'
      };
    }

    try {
      const modeText = isSandbox ? 'SANDBOX' : 'PRODUÇÃO';
      console.log(`[AsaasAdapter] Gerando cobrança no ambiente ${modeText} (URL: ${baseUrl}) no valor de R$ ${valor}...`);

      // Aqui se realizaria a chamada HTTP real para o endpoint do Asaas: POST /v3/payments
      // Passando as credenciais no header 'access_token'
      // Retornamos informações mockadas do checkout/Pix/Boleto baseados no payload real documentado
      return {
        checkout_url: isSandbox 
          ? `https://sandbox.asaas.com/pay/billing_${fatura.id}?token=${encodeURIComponent(apiKey)}`
          : `https://cobranca.asaas.com/pay/billing_${fatura.id}`,
        pix_qr_code: '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925V-Talentos SaaS6009SAO PAULO62070503***63041A2F',
        pix_copia_cola: '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925V-Talentos SaaS6009SAO PAULO62070503***63041A2F',
        boleto_linha: '34191.79001 01043.513184 91020.150008 7 90020000019900'
      };
    } catch (err) {
      throw new Error(`Erro na API do Asaas (${isSandbox ? 'Sandbox' : 'Produção'}): ${err.message}`);
    }
  }
}

module.exports = AsaasAdapter;
