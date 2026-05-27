const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const { generateToken } = require('../infra/auth/token');
const AutenticacaoService = require('../core/services/AutenticacaoService');
const bcrypt = require('bcryptjs');

jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.fn = { now: () => 'mock-timestamp' };
  mockDb.raw = jest.fn().mockImplementation(str => str);
  return mockDb;
});

describe('Corretor Management & Team Movements (FASE 10 Integration Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getAdminToken = (empresa_id = 'empresa-a') =>
    generateToken({ id: 'admin-1', empresa_id, perfil: 'ADMIN_EMPRESA' });

  const getCorretorToken = (empresa_id = 'empresa-a') =>
    generateToken({ id: 'corretor-1', empresa_id, perfil: 'CORRETOR' });

  const createChainMock = (stubs = {}) => {
    const chain = {};
    chain.where = jest.fn().mockReturnThis();
    chain.andWhere = jest.fn().mockReturnThis();
    chain.whereIn = jest.fn().mockReturnThis();
    chain.join = jest.fn().mockReturnThis();
    chain.leftJoin = jest.fn().mockReturnThis();
    chain.first = jest.fn().mockResolvedValue(stubs.first || null);
    chain.select = jest.fn().mockReturnThis();
    chain.count = jest.fn().mockResolvedValue(stubs.count || [{ total: 0 }]);
    chain.insert = jest.fn().mockResolvedValue(stubs.insert || [1]);
    chain.update = jest.fn().mockResolvedValue(stubs.update || 1);
    chain.delete = jest.fn().mockResolvedValue(stubs.delete || 1);
    chain.orderBy = jest.fn().mockReturnThis();
    chain.limit = jest.fn().mockReturnThis();
    chain.offset = jest.fn().mockResolvedValue(stubs.offset || []);
    chain.clone = jest.fn().mockReturnValue(chain);
    chain.sum = jest.fn().mockResolvedValue(stubs.sum || [{ disp_total: 100, rec_total: 50, total_cred: 80, total_deb: -30 }]);
    return chain;
  };

  describe('DELETE /api/admin/usuarios/:id - Excluir Corretor', () => {
    it('Permite que ADMIN_EMPRESA exclua um corretor da mesma empresa', async () => {
      const mockCorretor = { id: 'c1', empresa_id: 'empresa-a', nome: 'Corretor Teste' };
      const mockChain = createChainMock({
        first: mockCorretor,
        delete: 1
      });
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .delete('/api/admin/usuarios/c1')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Corretor excluído com sucesso.');
    });

    it('Recusa exclusão de corretor de outra empresa (multi-tenant)', async () => {
      // Retorna null pois no where() o corretor da outra empresa não será encontrado pelo ID e empresa_id do admin
      const mockChain = createChainMock({
        first: null
      });
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .delete('/api/admin/usuarios/c1')
        .set('Authorization', `Bearer ${getAdminToken('empresa-a')}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Usuário não encontrado.');
    });

    it('Impede que corretores realizem exclusão (403)', async () => {
      const response = await request(app)
        .delete('/api/admin/usuarios/c1')
        .set('Authorization', `Bearer ${getCorretorToken()}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/admin/usuarios/:id - Alterar Status (Ativar/Inativar)', () => {
    it('Permite que ADMIN_EMPRESA altere o status (ativo = false) de um corretor da mesma empresa', async () => {
      const mockCorretor = { id: 'c1', empresa_id: 'empresa-a', nome: 'Corretor Teste', email: 'c1@teste.com', ativo: true };
      
      const mockChainUsuario = createChainMock();
      mockChainUsuario.first = jest.fn()
        .mockResolvedValueOnce(mockCorretor) // Primeira chamada (busca existente no service)
        .mockResolvedValueOnce({ ...mockCorretor, ativo: false }); // Segunda chamada (re-busca atualizado no service)

      const mockChainEmpresa = createChainMock({
        first: { id: 'empresa-a', status: 'ATIVO' }
      });

      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          return mockChainUsuario;
        }
        if (table === 'GamEmpresa') {
          return mockChainEmpresa;
        }
        return createChainMock();
      });

      const response = await request(app)
        .put('/api/admin/usuarios/c1')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ ativo: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ativo).toBe(false);
    });

    it('Recusa alteração de status se corretor for de outra empresa (multi-tenant)', async () => {
      const mockChainUsuario = createChainMock({
        first: null
      });
      const mockChainEmpresa = createChainMock({
        first: { id: 'empresa-b', status: 'ATIVO' }
      });

      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          return mockChainUsuario;
        }
        if (table === 'GamEmpresa') {
          return mockChainEmpresa;
        }
        return createChainMock();
      });

      const response = await request(app)
        .put('/api/admin/usuarios/c1')
        .set('Authorization', `Bearer ${getAdminToken('empresa-b')}`)
        .send({ ativo: false });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('não encontrado');
    });
  });

  describe('GET /api/admin/movimentacoes - Extrato de Movimentações da Equipe', () => {
    it('Retorna histórico de transações da equipe com paginação, filtros e consolidações', async () => {
      const mockTransacoes = [
        { id: 't1', valor: 100, tipo: 'CREDITO', origem: 'MANUAL', corretor_nome: 'Corretor A' }
      ];

      db.mockImplementation((table) => {
        if (table === 'GamTransacao') {
          return createChainMock({
            count: [{ total: 1 }],
            offset: mockTransacoes,
            sum: [{ total_cred: 150 }, { total_deb: -50 }]
          });
        }
        if (table === 'GamUsuario') {
          return createChainMock({
            sum: [{ disp_total: 1000, rec_total: 500 }]
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .get('/api/admin/movimentacoes')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .query({ page: 1, limit: 10, tipo: 'CREDITO' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.resumo.saldo_disponivel_total).toBe(1000);
      expect(response.body.resumo.saldo_a_receber_total).toBe(500);
    });

    it('Recusa acesso para corretores à lista de equipe (403)', async () => {
      const response = await request(app)
        .get('/api/admin/movimentacoes')
        .set('Authorization', `Bearer ${getCorretorToken()}`);

      expect(response.status).toBe(403);
    });
  });

  describe('AutenticacaoService.login - Bloqueio de Usuários Inativos', () => {
    it('Recusa login de usuários com status inativo (ativo = false)', async () => {
      const mockUsuarioInativo = {
        id: 'u-inativo',
        email: 'inativo@empresa.com',
        senha_hash: await bcrypt.hash('123456', 10),
        ativo: false,
        empresa_id: 'empresa-1'
      };

      const mockEmpresa = {
        id: 'empresa-1',
        nome: 'Empresa Teste',
        status: 'ATIVO'
      };

      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          return createChainMock({ first: mockUsuarioInativo });
        }
        if (table === 'GamEmpresa') {
          return createChainMock({ first: mockEmpresa });
        }
        return createChainMock();
      });

      await expect(
        AutenticacaoService.login('inativo@empresa.com', '123456')
      ).rejects.toThrow('Usuário inativo. Contate o administrador.');
    });
  });
});
