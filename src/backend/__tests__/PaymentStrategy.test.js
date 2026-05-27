const PaymentFactory = require('../core/services/payment/PaymentFactory');
const StripeAdapter = require('../core/services/payment/StripeAdapter');
const AsaasAdapter = require('../core/services/payment/AsaasAdapter');
const GenericPaymentAdapter = require('../core/services/payment/GenericPaymentAdapter');

describe('Payment Strategy & Adapters Unit/Integration Tests', () => {
  const mockFatura = {
    id: 'fat-123',
    valor: 199.00
  };

  describe('PaymentFactory Resolution', () => {
    it('Deve instanciar StripeAdapter para tipo STRIPE', () => {
      const adapter = PaymentFactory.getAdapter('STRIPE', { secret_key: 'sk_test_1' });
      expect(adapter).toBeInstanceOf(StripeAdapter);
    });

    it('Deve instanciar AsaasAdapter para tipo ASAAS', () => {
      const adapter = PaymentFactory.getAdapter('ASAAS', { api_key: 'asaas_1' });
      expect(adapter).toBeInstanceOf(AsaasAdapter);
    });

    it('Deve instanciar GenericPaymentAdapter para provedores desconhecidos ou customizados', () => {
      const adapter = PaymentFactory.getAdapter('MERCADOPAGO', { token: 'mp_1' });
      expect(adapter).toBeInstanceOf(GenericPaymentAdapter);
    });

    it('Deve tolerar case insensitivity no tipo de provedor', () => {
      const adapter = PaymentFactory.getAdapter('stripe', { secret_key: 'sk_test_1' });
      expect(adapter).toBeInstanceOf(StripeAdapter);
    });
  });

  describe('StripeAdapter Execution', () => {
    it('Deve gerar link simulado no modo sandbox/simulado', async () => {
      const adapter = PaymentFactory.getAdapter('STRIPE', { secret_key: 'sk_test_1' });
      const info = await adapter.gerarCobranca(mockFatura, true);
      expect(info.checkout_url).toContain('checkout.stripe.com/pay/mock_session_fat-123');
      expect(info.checkout_url).toContain('simulado=true');
      expect(info.pix_qr_code).toBeNull();
      expect(info.boleto_linha).toBeNull();
    });

    it('Deve gerar link com chave real quando simulado for falso', async () => {
      const adapter = PaymentFactory.getAdapter('STRIPE', { public_key: 'pk_real_123' });
      const info = await adapter.gerarCobranca(mockFatura, false);
      expect(info.checkout_url).toContain('checkout.stripe.com/pay/session_fat-123');
      expect(info.checkout_url).toContain('pk_real_123');
    });
  });

  describe('AsaasAdapter Execution', () => {
    it('Deve retornar dados Pix/Boleto unificados no modo simulado', async () => {
      const adapter = PaymentFactory.getAdapter('ASAAS', { api_key: 'asaas_api_123' });
      const info = await adapter.gerarCobranca(mockFatura, true);
      expect(info.checkout_url).toContain('sandbox.asaas.com/pay/mock_billing_fat-123');
      expect(info.pix_qr_code).not.toBeNull();
      expect(info.pix_copia_cola).not.toBeNull();
      expect(info.boleto_linha).not.toBeNull();
    });

    it('Deve retornar dados correspondentes quando simulado for falso', async () => {
      const adapter = PaymentFactory.getAdapter('ASAAS', { api_key: 'asaas_api_real' });
      const info = await adapter.gerarCobranca(mockFatura, false);
      expect(info.checkout_url).toContain('sandbox.asaas.com/pay/billing_fat-123');
      expect(info.checkout_url).toContain('asaas_api_real');
    });
  });

  describe('GenericPaymentAdapter Execution', () => {
    it('Deve gerar checkout unificado genérico', async () => {
      const adapter = PaymentFactory.getAdapter('MERCADOPAGO', { public_token: 'mp_pub_123' });
      const info = await adapter.gerarCobranca(mockFatura, true);
      expect(info.checkout_url).toContain('checkout.plataforma.com/pay/mock_billing_fat-123');
      expect(info.checkout_url).toContain('tipo=MERCADOPAGO');
      expect(info.pix_qr_code).not.toBeNull();
    });
  });
});
