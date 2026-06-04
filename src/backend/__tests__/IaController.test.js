const request = require('supertest');
const { generateToken } = require('../infra/auth/token');

// Mock do banco de dados para evitar inicialização do Knex em testes de integração do controller
jest.mock('../infra/db', () => {
  const mockDb = jest.fn().mockImplementation(() => mockDb);
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.insert = jest.fn().mockResolvedValue([1]);
  mockDb.update = jest.fn().mockResolvedValue(1);
  mockDb.fn = { now: () => 'mock-timestamp' };
  return mockDb;
});

const db = require('../infra/db');
const app = require('../app');

describe('IaController (Integração)', () => {
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

  describe('Autenticação e Permissão', () => {
    it('Deve barrar requisições sem token (401)', async () => {
      const response = await request(app)
        .post('/api/admin/ia/gerar-fluxo')
        .send({ promptUsuario: 'criar fluxo' });
      expect(response.status).toBe(401);
    });

    it('Deve barrar corretores em endpoints administrativos de IA (403)', async () => {
      const token = getCorretorToken();
      const response = await request(app)
        .post('/api/admin/ia/gerar-fluxo')
        .set('Authorization', `Bearer ${token}`)
        .send({ promptUsuario: 'criar fluxo' });
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/ia/gerar-fluxo', () => {
    it('Deve retornar 400 se promptUsuario não for fornecido', async () => {
      const token = getAdminToken();
      const response = await request(app)
        .post('/api/admin/ia/gerar-fluxo')
        .set('Authorization', `Bearer ${token}`)
        .send({ colunasExcel: ['Nome'] });
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('Deve retornar fluxo JSON gerado no fallback offline com sucesso', async () => {
      const token = getAdminToken();
      db.first.mockResolvedValue(null); // Sem config no BD

      const response = await request(app)
        .post('/api/admin/ia/gerar-fluxo')
        .set('Authorization', `Bearer ${token}`)
        .send({
          promptUsuario: 'Converter Nome para maiúscula',
          colunasExcel: ['Nome', 'Valor']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.json).toBeDefined();
      expect(response.body.json.versao_motor).toBe('2.0');
    });
  });

  describe('POST /api/admin/ia/sugerir-sanitizacao', () => {
    it('Deve retornar 400 se objetivo não for fornecido', async () => {
      const token = getAdminToken();
      const response = await request(app)
        .post('/api/admin/ia/sugerir-sanitizacao')
        .set('Authorization', `Bearer ${token}`)
        .send({ exemploDados: ['abc'] });
      expect(response.status).toBe(400);
    });

    it('Deve retornar sugestões de sanitização com sucesso', async () => {
      const token = getAdminToken();
      db.first.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/admin/ia/sugerir-sanitizacao')
        .set('Authorization', `Bearer ${token}`)
        .send({
          exemploDados: ['joão'],
          objetivo: 'colocar em maiúscula'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.regra).toBe('UPPERCASE');
    });
  });

  describe('POST /api/admin/ia/diagnosticar', () => {
    it('Deve retornar 400 se mensagemErro não for fornecido', async () => {
      const token = getAdminToken();
      const response = await request(app)
        .post('/api/admin/ia/diagnosticar')
        .set('Authorization', `Bearer ${token}`)
        .send({ contexto: {} });
      expect(response.status).toBe(400);
    });

    it('Deve diagnosticar erro com sucesso', async () => {
      const token = getAdminToken();
      db.first.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/admin/ia/diagnosticar')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mensagemErro: "TypeError: Cannot read properties of undefined (reading 'trim')",
          contexto: {}
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.explicacao).toBeDefined();
      expect(response.body.script_corrigido).toBeDefined();
    });
  });

  describe('PUT /api/admin/ia/config', () => {
    it('Deve retornar 400 se provedor for inválido', async () => {
      const token = getAdminToken();
      const response = await request(app)
        .put('/api/admin/ia/config')
        .set('Authorization', `Bearer ${token}`)
        .send({ provedor_ia: 'AWS_BEDROCK' });
      expect(response.status).toBe(400);
    });

    it('Deve atualizar configurações de IA com sucesso', async () => {
      const token = getAdminToken();
      db.first.mockResolvedValue({ id: 'empresa-456', nome: 'Empresa Teste' });
      db.update.mockResolvedValue(1);

      const response = await request(app)
        .put('/api/admin/ia/config')
        .set('Authorization', `Bearer ${token}`)
        .send({
          provedor_ia: 'GEMINI',
          chave_ia: 'nova-api-key'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(db).toHaveBeenCalledWith('GamEmpresa');
      expect(db.where).toHaveBeenCalledWith({ id: 'empresa-456' });
      expect(db.update).toHaveBeenCalled();
    });
  });
});
