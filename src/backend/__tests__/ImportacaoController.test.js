const request = require('supertest');
const app = require('../app');
const db = require('../infra/db');
const { generateToken } = require('../infra/auth/token');
const ImportacaoService = require('../core/services/ImportacaoService');

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

// Mock do ImportacaoService
jest.mock('../core/services/ImportacaoService', () => {
  return {
    listarPerfis: jest.fn(),
    criarPerfil: jest.fn(),
    deletarPerfil: jest.fn(),
    previewImportacao: jest.fn(),
    confirmarImportacao: jest.fn()
  };
});

describe('ImportacaoController (Integração)', () => {
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

  it('GET /api/admin/importacao/perfis - deve barrar acesso de corretores (403)', async () => {
    const token = getCorretorToken();

    const response = await request(app)
      .get('/api/admin/importacao/perfis')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('GET /api/admin/importacao/perfis - deve permitir acesso para admin', async () => {
    const token = getAdminToken();
    const mockPerfis = [
      { id: 'p1', nome_perfil: 'Padrão' }
    ];

    ImportacaoService.listarPerfis.mockResolvedValue(mockPerfis);

    const response = await request(app)
      .get('/api/admin/importacao/perfis')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockPerfis);
    expect(ImportacaoService.listarPerfis).toHaveBeenCalledWith('empresa-456');
  });

  it('POST /api/admin/importacao/perfis - deve criar perfil com sucesso', async () => {
    const token = getAdminToken();
    const mockCreated = { id: 'p-new', nome_perfil: 'Novo Perfil' };

    ImportacaoService.criarPerfil.mockResolvedValue(mockCreated);

    const response = await request(app)
      .post('/api/admin/importacao/perfis')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome_perfil: 'Novo Perfil',
        mapeamento_json: { corretor_identificador: 'Corretor' }
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockCreated);
  });

  it('POST /api/admin/importacao/preview - deve processar preview com sucesso', async () => {
    const token = getAdminToken();
    const mockPreviewResult = {
      total_linhas: 10,
      linhas: [],
      inconsistencias: 0
    };

    ImportacaoService.previewImportacao.mockResolvedValue(mockPreviewResult);

    const response = await request(app)
      .post('/api/admin/importacao/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileBase64: 'fake-base64-data',
        perfil_id: 'perfil-123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockPreviewResult);
    expect(ImportacaoService.previewImportacao).toHaveBeenCalledWith('empresa-456', 'fake-base64-data', 'perfil-123');
  });

  it('POST /api/admin/importacao/confirm - deve processar importacao definitiva com sucesso', async () => {
    const token = getAdminToken();
    const mockConfirmResult = {
      sucesso: true,
      total_vendas_processadas: 5
    };

    ImportacaoService.confirmarImportacao.mockResolvedValue(mockConfirmResult);

    const response = await request(app)
      .post('/api/admin/importacao/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileBase64: 'fake-base64-data',
        perfil_id: 'perfil-123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockConfirmResult);
    expect(ImportacaoService.confirmarImportacao).toHaveBeenCalledWith('empresa-456', 'admin-123', 'fake-base64-data', 'perfil-123');
  });
});
