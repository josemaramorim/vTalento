const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const { generateToken } = require('../infra/auth/token');
const bcrypt = require('bcryptjs');

jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.fn = { now: () => 'mock-timestamp' };
  return mockDb;
});

describe('UsuarioController (FASE 5 Integration Tests)', () => {
  beforeEach(() => jest.clearAllMocks());

  const getAdminToken = (empresa_id = 'empresa-a') =>
    generateToken({ id: 'admin-1', empresa_id, perfil: 'ADMIN_EMPRESA' });

  const getCorretorToken = (empresa_id = 'empresa-a') =>
    generateToken({ id: 'corretor-1', empresa_id, perfil: 'CORRETOR' });

  const createChainMock = (stubs = {}) => {
    const chain = {};
    chain.where = jest.fn().mockImplementation((fnOrObj) => {
      // Se for uma subquery/função orWhere
      if (typeof fnOrObj === 'function') {
        const subChain = { where: jest.fn().mockReturnThis(), orWhere: jest.fn().mockReturnThis() };
        fnOrObj.call(subChain);
      }
      return chain;
    });
    chain.first = jest.fn().mockResolvedValue(stubs.first || null);
    chain.select = jest.fn().mockReturnThis();
    chain.count = jest.fn().mockResolvedValue(stubs.count || [{ total: 0 }]);
    chain.insert = jest.fn().mockResolvedValue(stubs.insert || [1]);
    chain.update = jest.fn().mockResolvedValue(stubs.update || 1);
    chain.orderBy = jest.fn().mockReturnThis();
    chain.limit = jest.fn().mockReturnThis();
    chain.offset = jest.fn().mockResolvedValue(stubs.offset || []);
    chain.clone = jest.fn().mockReturnValue(chain);
    return chain;
  };

  describe('GET /api/admin/usuarios — Listar Usuários do Tenant', () => {
    it('Retorna a lista paginada de corretores do tenant', async () => {
      const mockUsuarios = [
        { id: 'c1', nome: 'Corretor A', email: 'a@c.com', cpf: '111', perfil: 'CORRETOR' }
      ];

      const mockChain = createChainMock({
        count: [{ total: 1 }],
        offset: mockUsuarios
      });
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${getAdminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.total).toBe(1);
      expect(response.body.meta.page).toBe(1);
    });

    it('Bloqueia acesso a corretores (403 Forbidden)', async () => {
      const response = await request(app)
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${getCorretorToken()}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/usuarios — Criar Corretor', () => {
    it('Cria um novo corretor com sucesso no tenant e gera hash de senha', async () => {
      // Mock dinâmico com base na tabela acessada na query
      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          // Chamado 1: verificar email único (first)
          // Chamado 2: verificar contagem limite corretores (count)
          // Chamado 3: inserir usuário (insert)
          const mockChain = createChainMock({
            first: null, // e-mail único
            count: [{ total: 5 }], // limite não atingido
            insert: [1]
          });
          return mockChain;
        }
        if (table === 'GamEmpresa') {
          return createChainMock({
            first: { id: 'empresa-a', limite_corretores: 10 }
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          nome: 'Novo Corretor',
          email: 'novo@corretor.com',
          senha: 'senha123',
          cpf: '222'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.nome).toBe('Novo Corretor');
      expect(response.body.data.perfil).toBe('CORRETOR');
    });

    it('Rejeita e-mail duplicado', async () => {
      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          return createChainMock({
            first: { id: 'c1', email: 'novo@corretor.com' }
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          nome: 'Novo Corretor',
          email: 'novo@corretor.com',
          senha: 'senha123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('E-mail já cadastrado');
    });
  });

  describe('PUT /api/admin/usuarios/:id — Editar Usuário pelo Admin', () => {
    it('Atualiza dados do usuário pertencente ao mesmo tenant', async () => {
      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          return createChainMock({
            first: { id: 'c1', email: 'atual@corretor.com', empresa_id: 'empresa-a' }
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .put('/api/admin/usuarios/c1')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          nome: 'Nome Atualizado',
          cpf: '333'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/users/me — Editar Próprio Perfil', () => {
    it('Atualiza perfil e valida senha atual se for fornecida nova_senha', async () => {
      const senhaHash = await bcrypt.hash('senha-antiga', 10);
      
      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          return createChainMock({
            first: { id: 'corretor-1', email: 'me@me.com', senha_hash: senhaHash }
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${getCorretorToken()}`)
        .send({
          nome: 'Meu Nome Editado',
          senha_atual: 'senha-antiga',
          nova_senha: 'senha-nova'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nome).toBe('Meu Nome Editado');
    });

    it('Falha ao atualizar senha se a senha atual for inválida', async () => {
      const senhaHash = await bcrypt.hash('senha-antiga', 10);
      
      db.mockImplementation((table) => {
        if (table === 'GamUsuario') {
          return createChainMock({
            first: { id: 'corretor-1', email: 'me@me.com', senha_hash: senhaHash }
          });
        }
        return createChainMock();
      });

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${getCorretorToken()}`)
        .send({
          nome: 'Meu Nome Editado',
          senha_atual: 'senha-errada',
          nova_senha: 'senha-nova'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('atual inserida está incorreta');
    });
  });
});

