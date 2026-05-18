const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const { generateToken } = require('../infra/auth/token');

// Mock Knex DB
jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.select = jest.fn();
  mockDb.join = jest.fn().mockReturnThis();
  mockDb.orderBy = jest.fn().mockReturnThis();
  mockDb.limit = jest.fn();
  
  mockDb.transaction = jest.fn(callback => callback(mockDb));
  mockDb.insert = jest.fn().mockResolvedValue([1]);
  mockDb.update = jest.fn().mockResolvedValue(1);
  mockDb.fn = { now: () => 'mock-timestamp' };
  
  return mockDb;
});

describe('LancamentoController (Integração)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getAdminToken = () => {
    return generateToken({
      id: 'admin-123',
      empresa_id: 'empresa-456',
      perfil: 'ADMIN_EMPRESA'
    });
  };

  const getCorretorToken = () => {
    return generateToken({
      id: 'corretor-123',
      empresa_id: 'empresa-456',
      perfil: 'CORRETOR'
    });
  };

  it('POST /api/admin/lancamento-manual - deve barrar acesso se o perfil for CORRETOR (403)', async () => {
    const token = getCorretorToken();

    const response = await request(app)
      .post('/api/admin/lancamento-manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuario_id: 'corretor-999',
        valor: 100,
        tipo: 'CREDITO',
        justificativa: 'Bônus'
      });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error', 'Acesso negado: privilégios insuficientes');
  });

  it('POST /api/admin/lancamento-manual - deve permitir acesso para perfil ADMIN_EMPRESA e processar com sucesso', async () => {
    const token = getAdminToken();
    const mockCorretor = {
      id: 'corretor-777',
      nome: 'Corretor Top',
      email: 'top@corretor.com',
      empresa_id: 'empresa-456',
      saldo_disponivel: 150.00
    };

    db.mockImplementation((table) => {
      if (table === 'GamUsuario') {
        return {
          where: () => ({
            first: () => Promise.resolve(mockCorretor),
            update: () => Promise.resolve(1)
          })
        };
      }
      return db;
    });

    const response = await request(app)
      .post('/api/admin/lancamento-manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuario_id: 'corretor-777',
        valor: 50.00,
        tipo: 'CREDITO',
        justificativa: 'Comissão adicional manual'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('transacao_id');
    expect(response.body.corretor).toHaveProperty('saldo_disponivel', 200.00);
  });

  it('POST /api/admin/lancamento-manual - deve retornar 400 se houver erro de negócio (ex: saldo insuficiente para débito)', async () => {
    const token = getAdminToken();
    const mockCorretor = {
      id: 'corretor-777',
      nome: 'Corretor Top',
      email: 'top@corretor.com',
      empresa_id: 'empresa-456',
      saldo_disponivel: 10.00
    };

    db.mockImplementation((table) => {
      if (table === 'GamUsuario') {
        return {
          where: () => ({
            first: () => Promise.resolve(mockCorretor)
          })
        };
      }
      return db;
    });

    const response = await request(app)
      .post('/api/admin/lancamento-manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        usuario_id: 'corretor-777',
        valor: 50.00,
        tipo: 'DEBITO',
        justificativa: 'Ajuste manual com saldo menor que débito'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Saldo insuficiente para realizar este débito');
  });
});
