const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const { generateToken } = require('../infra/auth/token');

jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.fn = { now: () => 'mock-timestamp' };
  return mockDb;
});

describe('SuperAdmin Module & Tenant Licensing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getSuperAdminToken = () => {
    return generateToken({
      id: 'super-1',
      empresa_id: null,
      perfil: 'SUPER_ADMIN'
    });
  };

  const getAdminToken = () => {
    return generateToken({
      id: 'admin-1',
      empresa_id: 'empresa-1',
      perfil: 'ADMIN_EMPRESA'
    });
  };

  const createChainMock = (stubs = {}) => {
    const chain = {};
    let isFirstQuery = false;

    chain.where = jest.fn().mockReturnThis();
    chain.first = jest.fn().mockImplementation(() => {
      isFirstQuery = true;
      return Promise.resolve(stubs.first || null);
    });
    chain.select = jest.fn().mockImplementation(() => {
      isFirstQuery = false;
      return chain;
    });
    chain.orderBy = jest.fn().mockReturnThis();
    chain.limit = jest.fn().mockReturnThis();
    chain.offset = jest.fn().mockResolvedValue(stubs.offset || []);
    chain.count = jest.fn().mockResolvedValue(stubs.count || [{ total: 0 }]);
    chain.insert = jest.fn().mockResolvedValue(stubs.insert || [1]);
    chain.update = jest.fn().mockResolvedValue(stubs.update || 1);
    chain.del = jest.fn().mockResolvedValue(1);
    chain.clone = jest.fn().mockReturnValue(chain);

    // Torna a cadeia de chamadas "thenable" (compatível com await)
    chain.then = jest.fn((onFulfilled) => {
      const val = isFirstQuery ? (stubs.first || null) : (stubs.offset || stubs.select || []);
      return Promise.resolve(val).then(onFulfilled);
    });

    return chain;
  };

  describe('Autenticação e Proteção Super-Admin', () => {
    it('Deve barrar requisição se não for SUPER_ADMIN (403 Forbidden)', async () => {
      const response = await request(app)
        .get('/api/super/configs')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado: privilégios de Super-Admin necessários');
    });

    it('Deve permitir requisição para SUPER_ADMIN', async () => {
      const mockConfigs = [
        { chave: 'dias_padrao_cortesia', valor: '7' }
      ];
      const mockChain = createChainMock({ offset: mockConfigs });
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .get('/api/super/configs')
        .set('Authorization', `Bearer ${getSuperAdminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.configs).toHaveProperty('dias_padrao_cortesia', '7');
    });
  });

  describe('Configurações Globais da Plataforma', () => {
    it('Deve atualizar as configurações da plataforma com sucesso', async () => {
      const mockChain = createChainMock({
        first: { chave: 'dias_padrao_cortesia', valor: '7' },
        update: 1
      });
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .post('/api/super/configs')
        .set('Authorization', `Bearer ${getSuperAdminToken()}`)
        .send({ dias_padrao_cortesia: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Gerenciamento de Empresas (Tenants)', () => {
    it('Deve criar empresa com faturamento automático associado', async () => {
      db.mockImplementation((table) => {
        if (table === 'GamEmpresa') {
          return createChainMock({
            first: null // slug único
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .post('/api/super/empresas')
        .set('Authorization', `Bearer ${getSuperAdminToken()}`)
        .send({
          nome: 'Nova Empresa Construtora',
          slug: 'construtora-nova',
          plano: 'PROFISSIONAL'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('Deve conceder Acesso de Emergência com dias parametrizados', async () => {
      db.mockImplementation((table) => {
        if (table === 'GamEmpresa') {
          return createChainMock({
            first: { id: 'empresa-1', status: 'SUSPENSO', liberacao_emergencia: false }
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .post('/api/super/empresas/empresa-1/emergencia')
        .set('Authorization', `Bearer ${getSuperAdminToken()}`)
        .send({ dias: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Saúde Financeira e Baixa de Faturas', () => {
    it('Deve obter KPIs de Saúde Financeira da Empresa', async () => {
      const mockFaturas = [
        { id: 'f1', valor: 399.00, status: 'PENDENTE', data_vencimento: '2026-06-26' }
      ];

      db.mockImplementation((table) => {
        if (table === 'GamEmpresa') {
          return createChainMock({
            first: { id: 'empresa-1', nome: 'Empresa 1', status: 'ATIVO' }
          });
        }
        if (table === 'GamFatura') {
          return createChainMock({
            offset: mockFaturas
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .get('/api/super/empresas/empresa-1/financeiro')
        .set('Authorization', `Bearer ${getSuperAdminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_pendente).toBe(399.00);
    });

    it('Deve baixar fatura e atualizar licenciamento da empresa', async () => {
      db.mockImplementation((table) => {
        if (table === 'GamFatura') {
          return createChainMock({
            first: { id: 'fatura-1', empresa_id: 'empresa-1', status: 'PENDENTE', valor: 399.00 }
          });
        }
        if (table === 'GamEmpresa') {
          return createChainMock({
            first: { id: 'empresa-1', status: 'SUSPENSO' }
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .post('/api/super/faturas/fatura-1/baixa')
        .set('Authorization', `Bearer ${getSuperAdminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Fatura baixada com sucesso');
    });
  });

  describe('Gestão Lógica Isolada de Usuários do Tenant', () => {
    it('Deve listar usuários de um tenant específico de forma isolada', async () => {
      const mockUsuarios = [
        { id: 'u2', nome: 'Usuario Empresa 1', email: 'u1@e.com', perfil: 'CORRETOR' }
      ];

      const mockChain = createChainMock({
        count: [{ total: 1 }],
        offset: mockUsuarios
      });
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .get('/api/super/empresas/empresa-1/usuarios')
        .set('Authorization', `Bearer ${getSuperAdminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('Deve criar usuário atrelado à empresa', async () => {
      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          return createChainMock({ first: null, count: [{ total: 2 }] });
        }
        if (table === 'GamEmpresa') {
          return createChainMock({ first: { id: 'empresa-1', limite_corretores: 10 } });
        }
        return createChainMock();
      });

      const response = await request(app)
        .post('/api/super/empresas/empresa-1/usuarios')
        .set('Authorization', `Bearer ${getSuperAdminToken()}`)
        .send({
          nome: 'Novo Usuário',
          email: 'novo.usuario@empresa.com',
          senha: 'password123',
          perfil: 'CORRETOR'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Faturamento SaaS do Inquilino (Billing)', () => {
    it('Deve carregar status de faturamento da empresa', async () => {
      db.mockImplementation((table) => {
        if (table === 'GamEmpresa') {
          return createChainMock({
            first: {
              id: 'empresa-1',
              nome: 'Minha Empresa',
              status: 'ATIVO',
              data_expiracao: '2026-06-26',
              provedor_pagamento: 'STRIPE'
            }
          });
        }
        if (table === 'GamUsuario') {
          return createChainMock({ count: [{ total: 5 }] });
        }
        if (table === 'GamSaaSConfig') {
          return createChainMock({ first: { valor: 'true' } });
        }
        return createChainMock();
      });

      const response = await request(app)
        .get('/api/admin/billing/status')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.corretores_ativos).toBe(5);
      expect(response.body.empresa.provedor_pagamento).toBe('STRIPE');
    });

    it('Deve carregar faturas da empresa', async () => {
      const mockFaturas = [
        { id: 'fatura-1', valor: 199.00, status: 'PENDENTE' }
      ];
      db.mockImplementation((table) => {
        if (table === 'GamFatura') {
          return createChainMock({ offset: mockFaturas });
        }
        return createChainMock();
      });

      const response = await request(app)
        .get('/api/admin/billing/faturas')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('Deve pagar fatura simulada (Sandbox) e estender a licença', async () => {
      db.mockImplementation((table) => {
        if (table === 'GamFatura') {
          return createChainMock({
            first: { id: 'fatura-1', empresa_id: 'empresa-1', status: 'PENDENTE', valor: 199.00 }
          });
        }
        if (table === 'GamEmpresa') {
          return createChainMock({
            first: { id: 'empresa-1', status: 'ATIVO', data_expiracao: '2026-06-26' }
          });
        }
        if (table === 'GamSaaSConfig') {
          return createChainMock({ first: { valor: 'true' } }); // simular_pagamentos = true
        }
        return createChainMock();
      });

      const response = await request(app)
        .post('/api/admin/billing/pagar')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ faturaId: 'fatura-1', metodo_pagamento: 'PIX' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.simulado).toBe(true);
    });

    it('Deve alterar método/provedor de pagamento preferencial', async () => {
      db.mockImplementation(() => createChainMock({ update: 1 }));

      const response = await request(app)
        .put('/api/admin/billing/provedor')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ provedor: 'ASAAS' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Provedor de pagamento preferencial atualizado');
    });
  });
});

