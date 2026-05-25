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

describe('PremioService - caminho feliz e concorrência leve', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resgate com saldo suficiente confirma e atualiza saldo/premio', async () => {
    db.mockImplementation((table) => {
      if (table === 'Premio') {
        return { where: () => ({ first: () => Promise.resolve({ id: 2, ativo: true, quantidade_disponivel: 5, custo_pontos: 10 }), update: () => Promise.resolve(1) }) };
      }
      if (table === 'GamUsuario') {
        return { where: () => ({ first: () => Promise.resolve({ id: 'u2', saldo_disponivel: 100.00, empresa_id: 'e1' }), update: () => Promise.resolve(1) }) };
      }
      if (table === 'Resgate') {
        return { insert: () => Promise.resolve([11]), where: () => ({ update: () => Promise.resolve(1) }) };
      }
      if (table === 'GamTransacao') {
        return { insert: () => Promise.resolve([1]) };
      }
      return db;
    });

    const result = await PremioService.requestResgate({ usuario_id: 'u2', premio_id: 2, quantidade: 3 });
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('resgateId');
    expect(result.data).toHaveProperty('novoSaldo');
    expect(result.data.novoSaldo).toBeCloseTo(70.0, 2); // 100 - (3*10)
  });

  it('duas requisições sequenciais respeitam quantidade_disponivel', async () => {
    // primeiro chama consome quantidade, segunda falha por quantidade insuficiente
    let premioQtd = 1;

    db.mockImplementation((table) => {
      if (table === 'Premio') {
        return {
          where: () => ({ first: () => Promise.resolve({ id: 3, ativo: true, quantidade_disponivel: premioQtd, custo_pontos: 5 }), update: () => { premioQtd = Math.max(0, premioQtd - 1); return Promise.resolve(1); } })
        };
      }
      if (table === 'GamUsuario') {
        return { where: () => ({ first: () => Promise.resolve({ id: 'u3', saldo_disponivel: 100.00, empresa_id: 'e1' }), update: () => Promise.resolve(1) }) };
      }
      if (table === 'Resgate') {
        return { insert: () => Promise.resolve([21]), where: () => ({ update: () => Promise.resolve(1) }) };
      }
      if (table === 'GamTransacao') {
        return { insert: () => Promise.resolve([1]) };
      }
      return db;
    });

    const first = await PremioService.requestResgate({ usuario_id: 'u3', premio_id: 3, quantidade: 1 });
    expect(first.success).toBe(true);

    const second = await PremioService.requestResgate({ usuario_id: 'u3', premio_id: 3, quantidade: 1 });
    expect(second.success).toBe(false);
    expect(second.code).toMatch(/PREMIO_INDISPONIVEL/);
  });
});
