const PremioService = require('../core/services/PremioService');
const db = require('../infra/db');

jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.select = jest.fn();
  mockDb.insert = jest.fn();
  mockDb.update = jest.fn();
  mockDb.transaction = jest.fn(callback => callback(mockDb));
  mockDb.fn = { now: () => 'mock-ts' };
  return mockDb;
});

describe('PremioService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should fail when saldo insuficiente', async () => {
    // premio
    db.mockImplementation((table) => {
      if (table === 'Premio') {
        return { where: () => ({ first: () => Promise.resolve({ id: 1, empresa_id: 'e1', ativo: true, quantidade_disponivel: 10, custo_pontos: 100 }) }) };
      }
      if (table === 'GamUsuario') {
        return { where: () => ({ first: () => Promise.resolve({ id: 'u1', saldo_disponivel: 50.00, empresa_id: 'e1' }) }) };
      }
      return db;
    });

    const result = await PremioService.requestResgate({ usuario_id: 'u1', premio_id: 1, quantidade: 1 });
    expect(result.success).toBe(false);
    expect(result.code).toBe('SALDO_INSUFICIENTE');
  });

  it('should fail when premio belongs to a different tenant', async () => {
    db.mockImplementation((table) => {
      if (table === 'Premio') {
        return { where: () => ({ first: () => Promise.resolve({ id: 1, empresa_id: 'outra-empresa', ativo: true, quantidade_disponivel: 10, custo_pontos: 10 }) }) };
      }
      if (table === 'GamUsuario') {
        return { where: () => ({ first: () => Promise.resolve({ id: 'u1', saldo_disponivel: 1000.00, empresa_id: 'e1' }) }) };
      }
      return db;
    });

    const result = await PremioService.requestResgate({ usuario_id: 'u1', premio_id: 1, quantidade: 1 });
    expect(result.success).toBe(false);
    expect(result.code).toBe('ACESSO_NEGADO');
  });
});
