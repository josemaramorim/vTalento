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
        return { where: () => ({ first: () => Promise.resolve({ id: 1, empresa_id: 'e1', ativo: true, quantidade_disponivel: 10, custo_pontos: 100 }) }) };
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

// Tarefa 11.5 — FASE 4.9 — Testes para GET /api/admin/resgates
// Origem: specs/09-VITRINE-DE-PREMIOS.md (Seção 6) | specs/08-IMPLEMENTATION-TASKS.md Tarefa 11.5
describe('GET /api/admin/resgates — Painel Admin de Resgates', () => {
  beforeEach(() => jest.clearAllMocks());

  const getAdminToken = (empresa_id = 'empresa-a') =>
    generateToken({ id: 'admin-1', empresa_id, perfil: 'ADMIN_EMPRESA' });

  // Mock de resgates de exemplo
  const resgatesMock = [
    {
      id: 1,
      usuario_id: 'corretor-1',
      premio_id: 1,
      quantidade: 2,
      custo_total: 300,
      status: 'confirmado',
      created_at: '2026-05-26 01:00:00',
      corretor_nome: 'João Silva',
      premio_titulo: 'Voucher iFood R$ 50'
    }
  ];

  const setupMockResgates = (resgates = resgatesMock) => {
    const chainMock = {
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue([{ total: resgates.length }]),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockResolvedValue(resgates),
    };
    db.mockReturnValue(chainMock);
    return chainMock;
  };

  it('Caminho feliz — retorna resgates com paginação correta (default limit=10)', async () => {
    setupMockResgates();
    const token = getAdminToken();

    const response = await request(app)
      .get('/api/admin/resgates')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toHaveProperty('total');
    expect(response.body.meta).toHaveProperty('page');
    expect(response.body.meta).toHaveProperty('totalPages');
    expect(response.body.meta).toHaveProperty('limit');
    expect(response.body.meta.limit).toBe(10); // default
  });

  it('Aceita limit=50 e retorna meta com limit correto', async () => {
    setupMockResgates();
    const token = getAdminToken();

    const response = await request(app)
      .get('/api/admin/resgates?limit=50')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.limit).toBe(50);
  });

  it('Limit inválido (ex: 999) faz fallback para 10', async () => {
    setupMockResgates();
    const token = getAdminToken();

    const response = await request(app)
      .get('/api/admin/resgates?limit=999')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.limit).toBe(10);
  });

  it('Filtro por status=confirmado é aceito e retorna 200', async () => {
    setupMockResgates();
    const token = getAdminToken();

    const response = await request(app)
      .get('/api/admin/resgates?status=confirmado')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('Filtro por data_inicio e data_fim é aceito e retorna 200', async () => {
    setupMockResgates();
    const token = getAdminToken();

    const response = await request(app)
      .get('/api/admin/resgates?data_inicio=2026-05-01&data_fim=2026-05-31')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('Isolamento multi-tenant — sem token retorna 401', async () => {
    const response = await request(app)
      .get('/api/admin/resgates');

    expect(response.status).toBe(401);
  });

  it('Corretor NÃO pode acessar rota admin — retorna 403', async () => {
    const corretorToken = generateToken({ id: 'corretor-1', empresa_id: 'empresa-a', perfil: 'CORRETOR' });

    const response = await request(app)
      .get('/api/admin/resgates')
      .set('Authorization', `Bearer ${corretorToken}`);

    expect(response.status).toBe(403);
  });
});
