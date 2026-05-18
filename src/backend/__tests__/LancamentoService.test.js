const LancamentoService = require('../core/services/LancamentoService');
const db = require('../infra/db');

// Mock Knex DB calls
jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.select = jest.fn();
  mockDb.join = jest.fn().mockReturnThis();
  mockDb.orderBy = jest.fn().mockReturnThis();
  mockDb.limit = jest.fn();
  
  // Transaction Mocking
  mockDb.transaction = jest.fn(callback => callback(mockDb));
  mockDb.insert = jest.fn().mockResolvedValue([1]);
  mockDb.update = jest.fn().mockResolvedValue(1);
  mockDb.fn = { now: () => 'mock-timestamp' };
  
  return mockDb;
});

describe('LancamentoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve realizar um lancamento manual de CREDITO com sucesso', async () => {
    const mockCorretor = {
      id: 'corretor-123',
      nome: 'Corretor Teste',
      email: 'corretor@teste.com',
      empresa_id: 'empresa-456',
      saldo_disponivel: 100.00
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

    const result = await LancamentoService.realizarLancamentoManual({
      empresa_id: 'empresa-456',
      admin_id: 'admin-789',
      usuario_id: 'corretor-123',
      valor: 50.00,
      tipo: 'CREDITO',
      justificativa: 'Premiação Extra'
    });

    expect(result).toHaveProperty('transacao_id');
    expect(result.corretor).toHaveProperty('saldo_disponivel', 150.00);
    expect(db.transaction).toHaveBeenCalled();
  });

  it('deve realizar um lancamento manual de DEBITO com sucesso se houver saldo', async () => {
    const mockCorretor = {
      id: 'corretor-123',
      nome: 'Corretor Teste',
      email: 'corretor@teste.com',
      empresa_id: 'empresa-456',
      saldo_disponivel: 100.00
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

    const result = await LancamentoService.realizarLancamentoManual({
      empresa_id: 'empresa-456',
      admin_id: 'admin-789',
      usuario_id: 'corretor-123',
      valor: 40.00,
      tipo: 'DEBITO',
      justificativa: 'Estorno de Lançamento Incorreto'
    });

    expect(result).toHaveProperty('transacao_id');
    expect(result.corretor).toHaveProperty('saldo_disponivel', 60.00);
  });

  it('deve estourar erro para DEBITO se o corretor nao tiver saldo suficiente', async () => {
    const mockCorretor = {
      id: 'corretor-123',
      nome: 'Corretor Teste',
      email: 'corretor@teste.com',
      empresa_id: 'empresa-456',
      saldo_disponivel: 20.00
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

    await expect(
      LancamentoService.realizarLancamentoManual({
        empresa_id: 'empresa-456',
        admin_id: 'admin-789',
        usuario_id: 'corretor-123',
        valor: 50.00,
        tipo: 'DEBITO',
        justificativa: 'Ajuste Manual'
      })
    ).rejects.toThrow('Saldo insuficiente para realizar este débito');
  });

  it('deve estourar erro se tentar lancar para corretor de outra empresa (Tenant Isolation)', async () => {
    const mockCorretor = {
      id: 'corretor-123',
      nome: 'Corretor Teste',
      email: 'corretor@teste.com',
      empresa_id: 'empresa-OUTRA',
      saldo_disponivel: 100.00
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

    await expect(
      LancamentoService.realizarLancamentoManual({
        empresa_id: 'empresa-456',
        admin_id: 'admin-789',
        usuario_id: 'corretor-123',
        valor: 50.00,
        tipo: 'CREDITO',
        justificativa: 'Bônus'
      })
    ).rejects.toThrow('Acesso não autorizado: Corretor pertence a outra empresa');
  });
});
