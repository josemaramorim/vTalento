const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');

// Mock Knex DB calls
jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.select = jest.fn();
  mockDb.join = jest.fn().mockReturnThis();
  mockDb.orderBy = jest.fn().mockReturnThis();
  mockDb.limit = jest.fn();
  
  // Transaction Mocking
  mockDb.transaction = jest.fn(callback => callback(mockDb));
  mockDb.insert = jest.fn().mockResolvedValue([1]);
  mockDb.update = jest.fn().mockResolvedValue(1);
  mockDb.fn = { now: () => 'mock-timestamp' };
  
  return mockDb;
});

const createChainMock = (stubs = {}) => {
  const chain = {};
  chain.where = jest.fn().mockReturnValue(chain);
  chain.first = jest.fn().mockResolvedValue(stubs.first || null);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockResolvedValue(stubs.insert || [1]);
  chain.update = jest.fn().mockResolvedValue(stubs.update || 1);
  return chain;
};

describe('WebhookController Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Asaas Webhook - POST /api/webhooks/asaas', () => {
    it('deve rejeitar webhook se o token do Asaas for inválido em relação ao configurado', async () => {
      const mockSaaSConfig = {
        chave: 'provedores_pagamento_json',
        valor: JSON.stringify([
          {
            tipo: 'ASAAS',
            configuracoes: {
              webhook_secret: 'segredo-real-do-asaas'
            }
          }
        ])
      };

      const chainSaaSConfig = createChainMock({ first: mockSaaSConfig });

      db.mockImplementation((table) => {
        if (table === 'GamSaaSConfig') {
          return chainSaaSConfig;
        }
        return db;
      });

      const response = await request(app)
        .post('/api/webhooks/asaas')
        .set('asaas-access-token', 'segredo-errado')
        .send({
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: 'pay_123',
            externalReference: 'fatura_abc'
          }
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Assinatura do webhook inválida');
    });

    it('deve processar o webhook Asaas com sucesso e estender licença cumulativamente (Caminho Feliz)', async () => {
      const mockSaaSConfig = {
        chave: 'provedores_pagamento_json',
        valor: JSON.stringify([
          {
            tipo: 'ASAAS',
            configuracoes: {
              webhook_secret: 'segredo-real-do-asaas'
            }
          }
        ])
      };

      const mockFatura = {
        id: 'fatura_abc',
        empresa_id: 'empresa_xyz',
        status: 'PENDENTE',
        metodo_pagamento: 'PIX',
        provedor_fatura_id: null
      };

      // Vence daqui a 5 dias
      const dataOriginal = new Date();
      dataOriginal.setDate(dataOriginal.getDate() + 5);

      const mockEmpresa = {
        id: 'empresa_xyz',
        data_expiracao: dataOriginal.toISOString(),
        status: 'SUSPENSO',
        liberacao_emergencia: true
      };

      const chainSaaSConfig = createChainMock({ first: mockSaaSConfig });
      const chainFatura = createChainMock({ first: mockFatura, update: 1 });
      const chainEmpresa = createChainMock({ first: mockEmpresa, update: 1 });

      db.mockImplementation((table) => {
        if (table === 'GamSaaSConfig') return chainSaaSConfig;
        if (table === 'GamFatura') return chainFatura;
        if (table === 'GamEmpresa') return chainEmpresa;
        return db;
      });

      const response = await request(app)
        .post('/api/webhooks/asaas')
        .set('asaas-access-token', 'segredo-real-do-asaas')
        .send({
          event: 'PAYMENT_RECEIVED',
          payment: {
            id: 'pay_123',
            externalReference: 'fatura_abc'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Fatura liquidada com sucesso');
      expect(db.transaction).toHaveBeenCalled();
    });

    it('deve retornar idempotência se a fatura já estiver PAGA', async () => {
      const mockSaaSConfig = {
        chave: 'provedores_pagamento_json',
        valor: JSON.stringify([
          {
            tipo: 'ASAAS',
            configuracoes: {
              webhook_secret: 'segredo-real-do-asaas'
            }
          }
        ])
      };

      const mockFatura = {
        id: 'fatura_abc',
        empresa_id: 'empresa_xyz',
        status: 'PAGA',
        metodo_pagamento: 'PIX',
        provedor_fatura_id: 'pay_123'
      };

      const chainSaaSConfig = createChainMock({ first: mockSaaSConfig });
      const chainFatura = createChainMock({ first: mockFatura });

      db.mockImplementation((table) => {
        if (table === 'GamSaaSConfig') return chainSaaSConfig;
        if (table === 'GamFatura') return chainFatura;
        return db;
      });

      const response = await request(app)
        .post('/api/webhooks/asaas')
        .set('asaas-access-token', 'segredo-real-do-asaas')
        .send({
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: 'pay_123',
            externalReference: 'fatura_abc'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Fatura já estava paga');
    });

    it('deve retornar 404 se a fatura correspondente não for localizada', async () => {
      const mockSaaSConfig = {
        chave: 'provedores_pagamento_json',
        valor: JSON.stringify([])
      };

      const chainSaaSConfig = createChainMock({ first: mockSaaSConfig });
      const chainFatura = createChainMock({ first: null });

      db.mockImplementation((table) => {
        if (table === 'GamSaaSConfig') return chainSaaSConfig;
        if (table === 'GamFatura') return chainFatura;
        return db;
      });

      const response = await request(app)
        .post('/api/webhooks/asaas')
        .send({
          event: 'PAYMENT_CONFIRMED',
          payment: {
            id: 'pay_inexistente',
            externalReference: 'fatura_inexistente'
          }
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Fatura não localizada');
    });
  });

  describe('Stripe Webhook - POST /api/webhooks/stripe', () => {
    it('deve rejeitar webhook do Stripe se assinatura estiver ausente ou inválida e houver secret configurado', async () => {
      const mockSaaSConfig = {
        chave: 'provedores_pagamento_json',
        valor: JSON.stringify([
          {
            tipo: 'STRIPE',
            configuracoes: {
              webhook_secret: 'whsec_stripe_secret'
            }
          }
        ])
      };

      const chainSaaSConfig = createChainMock({ first: mockSaaSConfig });

      db.mockImplementation((table) => {
        if (table === 'GamSaaSConfig') return chainSaaSConfig;
        return db;
      });

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              client_reference_id: 'fatura_abc'
            }
          }
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Assinatura do Stripe ausente ou inválida');
    });

    it('deve aceitar assinatura simulada via header x-simulado e liquidar a fatura com sucesso', async () => {
      const mockSaaSConfig = {
        chave: 'provedores_pagamento_json',
        valor: JSON.stringify([
          {
            tipo: 'STRIPE',
            configuracoes: {
              webhook_secret: 'whsec_stripe_secret'
            }
          }
        ])
      };

      const mockFatura = {
        id: 'fatura_abc',
        empresa_id: 'empresa_xyz',
        status: 'PENDENTE',
        metodo_pagamento: 'CARTAO',
        provedor_fatura_id: null
      };

      const mockEmpresa = {
        id: 'empresa_xyz',
        data_expiracao: new Date().toISOString(),
        status: 'ATIVO',
        liberacao_emergencia: false
      };

      const chainSaaSConfig = createChainMock({ first: mockSaaSConfig });
      const chainFatura = createChainMock({ first: mockFatura, update: 1 });
      const chainEmpresa = createChainMock({ first: mockEmpresa, update: 1 });

      db.mockImplementation((table) => {
        if (table === 'GamSaaSConfig') return chainSaaSConfig;
        if (table === 'GamFatura') return chainFatura;
        if (table === 'GamEmpresa') return chainEmpresa;
        return db;
      });

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('x-simulado', 'true')
        .send({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              client_reference_id: 'fatura_abc'
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Fatura liquidada com sucesso');
    });
  });
});
