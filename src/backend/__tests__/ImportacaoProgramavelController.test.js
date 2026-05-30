const request = require('supertest');
const { generateToken } = require('../infra/auth/token');

// Mock do banco de dados para evitar inicialização do Knex em testes de integração isolados
jest.mock('../infra/db', () => {
  const mockDb = jest.fn();
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.select = jest.fn();
  mockDb.orderBy = jest.fn().mockReturnThis();
  mockDb.del = jest.fn();
  
  mockDb.transaction = jest.fn(callback => callback(mockDb));
  mockDb.insert = jest.fn().mockResolvedValue([1]);
  mockDb.update = jest.fn().mockResolvedValue(1);
  mockDb.fn = { now: () => 'mock-timestamp' };
  
  return mockDb;
});

const app = require('../app');
const ImportacaoService = require('../core/services/ImportacaoService');

// Mock do ImportacaoService
jest.mock('../core/services/ImportacaoService', () => {
  return {
    previewImportacaoProgramavel: jest.fn(),
    confirmarImportacaoProgramavel: jest.fn()
  };
});

describe('ImportacaoProgramavelController (Integração)', () => {
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

  it('POST /api/admin/importacao/programavel/preview - deve barrar corretores (403)', async () => {
    const token = getCorretorToken();

    const response = await request(app)
      .post('/api/admin/importacao/programavel/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileBase64: 'fake-base64',
        perfil_id: 'perfil-123'
      });

    expect(response.status).toBe(403);
  });

  it('POST /api/admin/importacao/programavel/preview - deve processar preview programável com sucesso', async () => {
    const token = getAdminToken();
    const mockPreview = {
      total_linhas: 2,
      colunas_detectadas: ['A', 'B'],
      linhas: [
        {
          linha: 2,
          dados: { Nome: 'Parceiro A', Valor: 1000 },
          corretor_encontrado: true,
          corretor_id: 'corr-a'
        }
      ],
      logs: ['[Global] Teste'],
      inconsistencias: 0
    };

    ImportacaoService.previewImportacaoProgramavel.mockResolvedValue(mockPreview);

    const response = await request(app)
      .post('/api/admin/importacao/programavel/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileBase64: 'fake-base64-data',
        perfil_id: 'perfil-123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockPreview);
    expect(ImportacaoService.previewImportacaoProgramavel).toHaveBeenCalledWith('empresa-456', 'fake-base64-data', 'perfil-123');
  });

  it('POST /api/admin/importacao/programavel/confirm - deve processar confirmacao programável com sucesso', async () => {
    const token = getAdminToken();
    const mockConfirmResult = {
      sucesso: true,
      total_vendas_processadas: 2,
      transacoes_criadas: 2,
      corretores_atualizados: 1
    };

    ImportacaoService.confirmarImportacaoProgramavel.mockResolvedValue(mockConfirmResult);

    const response = await request(app)
      .post('/api/admin/importacao/programavel/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileBase64: 'fake-base64-data',
        perfil_id: 'perfil-123',
        resolucoes: { '3': 'corr-manual-id' }
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockConfirmResult);
    expect(ImportacaoService.confirmarImportacaoProgramavel).toHaveBeenCalledWith('empresa-456', 'admin-123', 'fake-base64-data', 'perfil-123', { '3': 'corr-manual-id' });
  });
});
