const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const { generateToken } = require('../infra/auth/token');

// Mock Knex DB calls
jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.andWhere = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.select = jest.fn().mockReturnThis();
  mockDb.join = jest.fn().mockReturnThis();
  mockDb.orderBy = jest.fn().mockReturnThis();
  mockDb.limit = jest.fn().mockReturnThis();
  mockDb.groupBy = jest.fn().mockReturnThis();
  mockDb.count = jest.fn().mockReturnThis();
  
  mockDb.transaction = jest.fn(callback => callback(mockDb));
  mockDb.insert = jest.fn().mockResolvedValue([1]);
  mockDb.update = jest.fn().mockResolvedValue(1);
  mockDb.fn = { now: () => 'mock-timestamp' };
  
  return mockDb;
});

const createChainMock = (stubs = {}) => {
  const chain = {};
  chain.where = jest.fn().mockReturnValue(chain);
  chain.andWhere = jest.fn().mockReturnValue(chain);
  chain.first = jest.fn().mockResolvedValue(stubs.first || null);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.join = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.groupBy = jest.fn().mockReturnValue(chain);
  chain.count = jest.fn().mockReturnValue(chain);
  
  // Make the chain thenable or resolve directly when awaited
  chain.then = (onFulfilled) => {
    return Promise.resolve(stubs.resolveValue || []).then(onFulfilled);
  };
  
  return chain;
};

describe('DashboardGraficos API (Integração)', () => {
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

  it('GET /api/admin/dashboard-graficos - deve barrar acesso se o perfil for CORRETOR (403)', async () => {
    const token = getCorretorToken();

    const response = await request(app)
      .get('/api/admin/dashboard-graficos')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('GET /api/admin/dashboard-graficos - deve retornar dados agrupados e analíticos para ADMIN_EMPRESA', async () => {
    const token = getAdminToken();

    // Mock das transações do último mês
    const dataAtual = new Date();
    const mockTransacoes = [
      { valor: 5000, tipo: 'CREDITO', created_at: dataAtual.toISOString() },
      { valor: -2000, tipo: 'DEBITO', created_at: dataAtual.toISOString() }
    ];

    // Mock dos corretores líderes
    const mockCorretores = [
      { nome: 'Ana Silva', saldo: 15000 },
      { nome: 'Bruno Souza', saldo: 12000 }
    ];

    // Mock dos prêmios resgatados
    const mockPremios = [
      { titulo: 'Voucher iFood R$ 100', total_resgatado: 10 },
      { titulo: 'Garrafa Térmica Premium', total_resgatado: 4 }
    ];

    db.mockImplementation((table) => {
      if (table === 'GamTransacao') {
        return createChainMock({ resolveValue: mockTransacoes });
      }
      if (table === 'GamUsuario') {
        return createChainMock({ resolveValue: mockCorretores });
      }
      if (table === 'Resgate') {
        return createChainMock({ resolveValue: mockPremios });
      }
      return db;
    });

    const response = await request(app)
      .get('/api/admin/dashboard-graficos')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('evolucaoMensal');
    expect(response.body).toHaveProperty('topCorretores');
    expect(response.body).toHaveProperty('distribuicaoPremios');

    // Verifica se a evolução mensal tem 6 meses
    expect(response.body.evolucaoMensal).toHaveLength(6);
    
    // Verifica se os valores foram agrupados corretamente
    const ultimoMesBucket = response.body.evolucaoMensal[5];
    expect(ultimoMesBucket.creditos).toBe(5000);
    expect(ultimoMesBucket.debitos).toBe(2000);

    // Verifica corretores
    expect(response.body.topCorretores).toHaveLength(2);
    expect(response.body.topCorretores[0]).toEqual({ nome: 'Ana Silva', saldo: 15000 });

    // Verifica prêmios
    expect(response.body.distribuicaoPremios).toHaveLength(2);
    expect(response.body.distribuicaoPremios[0]).toEqual({ titulo: 'Voucher iFood R$ 100', total_resgatado: 10 });
  });
});
