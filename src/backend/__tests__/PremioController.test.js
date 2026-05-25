const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const { generateToken } = require('../infra/auth/token');

jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.select = jest.fn();
  mockDb.insert = jest.fn().mockResolvedValue([1]);
  mockDb.update = jest.fn().mockResolvedValue(1);
  mockDb.transaction = jest.fn(callback => callback(mockDb));
  mockDb.fn = { now: () => 'mock-timestamp' };
  return mockDb;
});

describe('PremioController (integração mínima)', () => {
  beforeEach(() => jest.clearAllMocks());

  const getUserToken = () => generateToken({ id: 'u1', empresa_id: 'e1', perfil: 'CORRETOR' });

  it('POST /api/premios/:id/resgates - saldo insuficiente retorna 400', async () => {
    db.mockImplementation((table) => {
      if (table === 'Premio') {
        return { where: () => ({ first: () => Promise.resolve({ id: 1, ativo: true, quantidade_disponivel: 10, custo_pontos: 100 }) }) };
      }
      if (table === 'GamUsuario') {
        return { where: () => ({ first: () => Promise.resolve({ id: 'u1', saldo_disponivel: 50.00, empresa_id: 'e1' }) }) };
      }
      return db;
    });

    const token = getUserToken();

    const response = await request(app)
      .post('/api/premios/1/resgates')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantidade: 1 });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
