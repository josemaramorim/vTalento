const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const { generateToken } = require('../infra/auth/token');

jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.fn = { now: () => 'mock-timestamp' };
  return mockDb;
});

describe('Tenant Billing and Branding APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getAdminToken = () => {
    return generateToken({
      id: 'admin-1',
      empresa_id: 'empresa-1',
      perfil: 'ADMIN_EMPRESA'
    });
  };

  const getCorretorToken = () => {
    return generateToken({
      id: 'corretor-1',
      empresa_id: 'empresa-1',
      perfil: 'CORRETOR'
    });
  };

  const createChainMock = (stubs = {}) => {
    const chain = {};
    chain.where = jest.fn().mockReturnThis();
    chain.first = jest.fn().mockResolvedValue(stubs.first || null);
    chain.select = jest.fn().mockReturnThis();
    chain.insert = jest.fn().mockResolvedValue(stubs.insert || [1]);
    chain.update = jest.fn().mockResolvedValue(stubs.update || 1);
    return chain;
  };

  describe('PUT /api/admin/empresa - Atualizar Branding da Empresa', () => {
    it('Deve permitir que o ADMIN_EMPRESA atualize o branding com sucesso', async () => {
      const mockEmpresa = {
        id: 'empresa-1',
        nome: 'Empresa Antiga',
        logo_url: '',
        cor_primaria: '#D4AF37'
      };

      const mockChain = createChainMock({
        first: mockEmpresa,
        update: 1
      });
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .put('/api/admin/empresa')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          nome: 'Empresa Nova',
          logo_url: 'https://exemplo.com/logo.png',
          cor_primaria: '#00FF00'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Dados da empresa atualizados com sucesso!');
      expect(response.body.data.nome).toBe('Empresa Nova');
      expect(response.body.data.logo_url).toBe('https://exemplo.com/logo.png');
      expect(response.body.data.cor_primaria).toBe('#00FF00');
    });

    it('Deve barrar requisição se não for ADMIN_EMPRESA ou SUPER_ADMIN', async () => {
      const response = await request(app)
        .put('/api/admin/empresa')
        .set('Authorization', `Bearer ${getCorretorToken()}`)
        .send({
          nome: 'Empresa Inválida'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/billing/faturas - Criar Fatura Adicional para Licenciamento Cumulativo', () => {
    it('Deve permitir que o ADMIN_EMPRESA crie uma nova fatura com sucesso', async () => {
      const mockEmpresa = {
        id: 'empresa-1',
        plano: 'PROFISSIONAL'
      };

      const mockChain = createChainMock({
        first: mockEmpresa,
        insert: [1]
      });
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .post('/api/admin/billing/faturas')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Nova fatura de renovação de licença gerada com sucesso!');
      expect(response.body).toHaveProperty('faturaId');
    });
  });
});
