const IaFactory = require('../core/services/ia/IaFactory');
const GeminiIaAdapter = require('../core/services/ia/GeminiIaAdapter');
const OpenAiIaAdapter = require('../core/services/ia/OpenAiIaAdapter');

// Mock do banco de dados para evitar inicialização do Knex em testes de unidade do adapter/factory
jest.mock('../infra/db', () => {
  const mockDb = jest.fn().mockImplementation(() => mockDb);
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  return mockDb;
});

const db = require('../infra/db');

describe('IaStrategy & Adapters Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.IA_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('IaFactory Resolution', () => {
    it('Deve instanciar GeminiIaAdapter com chave mock se a empresa não tiver configuração e nenhuma env key estiver definida', async () => {
      db.first.mockResolvedValue(null); // Nenhuma empresa encontrada ou sem configuração
      const adapter = await IaFactory.obterAdapter('empresa-123');
      expect(adapter).toBeInstanceOf(GeminiIaAdapter);
      expect(adapter.apiKey).toBe('mock');
    });

    it('Deve instanciar GeminiIaAdapter quando GEMINI estiver configurado nas env vars', async () => {
      process.env.IA_PROVIDER = 'GEMINI';
      process.env.GEMINI_API_KEY = 'env-gemini-key';
      db.first.mockResolvedValue(null);

      const adapter = await IaFactory.obterAdapter('empresa-123');
      expect(adapter).toBeInstanceOf(GeminiIaAdapter);
      expect(adapter.apiKey).toBe('env-gemini-key');
    });

    it('Deve instanciar OpenAiIaAdapter quando OPENAI estiver configurado nas env vars', async () => {
      process.env.IA_PROVIDER = 'OPENAI';
      process.env.OPENAI_API_KEY = 'env-openai-key';
      db.first.mockResolvedValue(null);

      const adapter = await IaFactory.obterAdapter('empresa-123');
      expect(adapter).toBeInstanceOf(OpenAiIaAdapter);
      expect(adapter.apiKey).toBe('env-openai-key');
    });

    it('Deve recuperar configuração encriptada do BD da empresa e decriptar corretamente', async () => {
      const encryptedKey = IaFactory.encriptarChave('minha-chave-secreta-empresa');
      db.first.mockResolvedValue({
        provedor_ia: 'OPENAI',
        chave_ia_encriptada: encryptedKey
      });

      const adapter = await IaFactory.obterAdapter('empresa-123');
      expect(adapter).toBeInstanceOf(OpenAiIaAdapter);
      expect(adapter.apiKey).toBe('minha-chave-secreta-empresa');
      expect(db).toHaveBeenCalledWith('GamEmpresa');
      expect(db.where).toHaveBeenCalledWith({ id: 'empresa-123' });
    });

    it('Deve carregar o manualContent e repassar para o adapter', async () => {
      db.first.mockResolvedValue(null);
      const adapter = await IaFactory.obterAdapter('empresa-123');
      expect(adapter.manualContent).toBeDefined();
      expect(typeof adapter.manualContent).toBe('string');
    });
  });

  describe('GeminiIaAdapter Fallback Logic', () => {
    let adapter;

    beforeEach(() => {
      adapter = new GeminiIaAdapter('mock');
    });

    it('Deve instanciar com manualContent vazio por padrão', () => {
      const tempAdapter = new GeminiIaAdapter('mock');
      expect(tempAdapter.manualContent).toBe('');
    });

    it('Deve instanciar com manualContent fornecido', () => {
      const tempAdapter = new GeminiIaAdapter('mock', 'conteúdo do manual');
      expect(tempAdapter.manualContent).toBe('conteúdo do manual');
    });

    it('gerarFluxoJSON deve gerar fluxo com sanitizer se o prompt contiver "maiúscula" ou "uppercase"', async () => {
      const result = await adapter.gerarFluxoJSON('converter Nome para maiúscula', ['Nome', 'Valor']);
      expect(result.versao_motor).toBe('2.0');
      expect(result.nodes.find(n => n.type === 'text_sanitizer')).toBeDefined();
      expect(result.connections.length).toBe(2); // input -> sanitizer -> save
    });

    it('gerarFluxoJSON deve gerar fluxo com parcelas se o prompt contiver "sinal" ou "entrada"', async () => {
      const result = await adapter.gerarFluxoJSON('sinal de entrada com comissão', ['Nome', 'Comissão']);
      expect(result.nodes.find(n => n.type === 'sinal_node')).toBeDefined();
    });

    it('sugerirSanitizacao deve sugerir UPPERCASE se o objetivo contiver "maiúscula"', async () => {
      const result = await adapter.sugerirSanitizacao(['joão'], 'colocar em maiúscula');
      expect(result.regra).toBe('UPPERCASE');
      expect(result.script).toContain('toUpperCase');
    });

    it('diagnosticarErro deve sugerir tratamento de nulos se a mensagem de erro contiver "trim"', async () => {
      const result = await adapter.diagnosticarErro("TypeError: Cannot read properties of undefined (reading 'trim')", {});
      expect(result.tipo_correcao).toBe('script');
      expect(result.script_corrigido).toContain('value ?');
    });
  });

  describe('OpenAiIaAdapter Fallback Logic', () => {
    let adapter;

    beforeEach(() => {
      adapter = new OpenAiIaAdapter('mock');
    });

    it('Deve chamar métodos simulados do gemini no fallback offline', async () => {
      const result = await adapter.gerarFluxoJSON('converter Nome para maiúscula', ['Nome']);
      expect(result.nodes.find(n => n.type === 'text_sanitizer')).toBeDefined();
    });
  });
});
