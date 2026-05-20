const ImportacaoService = require('../core/services/ImportacaoService');
const db = require('../infra/db');
const xlsx = require('xlsx');

jest.mock('../infra/db', () => {
  const mockDb = jest.fn().mockImplementation(() => mockDb);
  mockDb.where = jest.fn().mockReturnThis();
  mockDb.first = jest.fn();
  mockDb.select = jest.fn();
  mockDb.orderBy = jest.fn().mockReturnThis();
  mockDb.del = jest.fn();
  
  // Transaction Mocking
  mockDb.transaction = jest.fn(callback => callback(mockDb));
  mockDb.insert = jest.fn().mockResolvedValue([1]);
  mockDb.update = jest.fn().mockResolvedValue(1);
  mockDb.fn = { now: () => 'mock-timestamp' };
  
  return mockDb;
});

jest.mock('xlsx', () => {
  return {
    read: jest.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        'Sheet1': {}
      }
    }),
    utils: {
      sheet_to_json: jest.fn()
    }
  };
});

describe('ImportacaoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Perfis', () => {
    it('deve cadastrar um novo perfil de importação com sucesso', async () => {
      const mapeamento = {
        corretor_identificador: 'Corretor',
        valor_venda: 'Total',
        valor_pago: 'Pago',
        empreendimento: 'Empreendimento'
      };

      const result = await ImportacaoService.criarPerfil('empresa-123', {
        nome_perfil: 'Perfil Teste',
        mapeamento_json: mapeamento,
        separador_multiplo: '|',
        linha_cabecalho: 3
      });

      expect(result).toHaveProperty('id');
      expect(result.nome_perfil).toBe('Perfil Teste');
      expect(db).toHaveBeenCalledWith('GamConfigImportacao');
      expect(db.insert).toHaveBeenCalled();
    });

    it('deve atualizar um perfil existente com sucesso', async () => {
      const mapeamentoAtualizado = { corretor_identificador: 'Corretor Modificado' };
      db.update.mockResolvedValueOnce(1); // Simula 1 linha atualizada

      const result = await ImportacaoService.atualizarPerfil('empresa-123', 'perfil-123', {
        nome_perfil: 'Perfil Modificado',
        mapeamento_json: mapeamentoAtualizado,
        separador_multiplo: ';',
        linha_cabecalho: 4
      });

      expect(result.nome_perfil).toBe('Perfil Modificado');
      expect(result.id).toBe('perfil-123');
      expect(db).toHaveBeenCalledWith('GamConfigImportacao');
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('Preview & Parsing', () => {
    it('deve realizar o preview da importacao de uma planilha mapeando colunas, dividindo baloes e buscando corretores', async () => {
      const mockPerfil = {
        id: 'perfil-123',
        empresa_id: 'empresa-123',
        nome_perfil: 'Mapeamento Haja',
        mapeamento_json: JSON.stringify({
          corretor_identificador: 'Corretor Responsável',
          corretor_creci: 'CRECI',
          valor_venda: 'Valor Venda',
          valor_pago: 'Valor Pago',
          empreendimento: 'Empreendimento',
          unidade: 'Unidade',
          cliente_nome: 'Cliente',
          balao_valor: 'Balão Valor',
          balao_datas: 'Balão Datas',
          balao_qtd: 'Balão Qtd'
        }),
        separador_multiplo: '|',
        linha_cabecalho: 3
      };

      const mockSheetData = [
        ['Título da Planilha'],
        ['Subtítulo'],
        [
          'Corretor Responsável',
          'CRECI',
          'Valor Venda',
          'Valor Pago',
          'Empreendimento',
          'Unidade',
          'Cliente',
          'Balão Valor',
          'Balão Datas',
          'Balão Qtd'
        ],
        [
          'João Silva',
          'CRECI-01',
          '100.000,00',
          '20.000,00',
          'Park View',
          'Apto 101',
          'Ana Maria',
          '30.000,00',
          '10/02/2027 | 10/02/2029',
          '2'
        ]
      ];

      const mockCorretor = {
        id: 'corretor-123',
        nome: 'João Silva',
        email: 'joao@silva.com',
        empresa_id: 'empresa-123',
        perfil: 'CORRETOR'
      };

      // Mock DB calls for:
      // 1. Obter perfil
      // 2. Buscar corretor
      db.mockImplementation((table) => {
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          whereRaw: jest.fn().mockReturnThis(),
          orWhereRaw: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhereRaw: jest.fn().mockReturnThis(),
          first: jest.fn()
        };

        if (table === 'GamConfigImportacao') {
          queryBuilder.first.mockResolvedValue(mockPerfil);
          return queryBuilder;
        }
        if (table === 'GamUsuario') {
          queryBuilder.first.mockResolvedValue(mockCorretor);
          return queryBuilder;
        }
        return db;
      });

      // Mock XLSX utilities
      xlsx.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      xlsx.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const preview = await ImportacaoService.previewImportacao('empresa-123', 'fake-base64', 'perfil-123');

      expect(preview.total_linhas).toBe(1);
      expect(preview.inconsistencias).toBe(0);
      
      const linha = preview.linhas[0];
      expect(linha.corretor_encontrado).toBe(true);
      expect(linha.corretor_id).toBe('corretor-123');
      expect(linha.valores.valor_venda_rs).toBe(100000.00);
      expect(linha.valores.valor_pago_rs).toBe(20000.00); // 20.000,00 -> parsed exactly as 20000.00
      expect(linha.valores.total_talentos).toBe(1000); // 100k * 0.01 = 1000
      expect(linha.valores.talentos_disponiveis).toBe(200); // 20k * 0.01 = 200
      
      // Balões
      expect(linha.baloes.length).toBe(2);
      expect(linha.baloes[0].valor_talentos).toBe(150); // 30k total / 2 = 15k cada -> 15k * 0.01 = 150 talentos
      expect(linha.baloes[0].data_vencimento).toBeInstanceOf(Date);
    });
  });

  describe('Confirmar Importação', () => {
    it('deve persistir as transacoes de importacao definitiva no banco e atualizar os saldos', async () => {
      const mockPerfil = {
        id: 'perfil-123',
        empresa_id: 'empresa-123',
        nome_perfil: 'Mapeamento Haja',
        mapeamento_json: JSON.stringify({
          corretor_identificador: 'Corretor Responsável',
          corretor_creci: 'CRECI',
          valor_venda: 'Valor Venda',
          valor_pago: 'Valor Pago',
          empreendimento: 'Empreendimento',
          unidade: 'Unidade',
          cliente_nome: 'Cliente',
          balao_valor: 'Balão Valor',
          balao_datas: 'Balão Datas',
          balao_qtd: 'Balão Qtd'
        }),
        separador_multiplo: '|',
        linha_cabecalho: 3
      };

      const mockSheetData = [
        ['Título da Planilha'],
        ['Subtítulo'],
        [
          'Corretor Responsável',
          'CRECI',
          'Valor Venda',
          'Valor Pago',
          'Empreendimento',
          'Unidade',
          'Cliente',
          'Balão Valor',
          'Balão Datas',
          'Balão Qtd'
        ],
        [
          'João Silva',
          'CRECI-01',
          '100000',
          '20000',
          'Park View',
          'Apto 101',
          'Ana Maria',
          '30000',
          '10/02/2027 | 10/02/2029',
          '2'
        ]
      ];

      const mockCorretor = {
        id: 'corretor-123',
        nome: 'João Silva',
        email: 'joao@silva.com',
        empresa_id: 'empresa-123',
        perfil: 'CORRETOR',
        saldo_disponivel: 0,
        saldo_a_receber: 0
      };

      const mockTransacoesCalculadas = [
        { id: 't1', status: 'COMPENSADO', tipo: 'CREDITO', valor: 200 }, // 200 talentos disponiveis
        { id: 't2', status: 'PENDENTE', tipo: 'CREDITO', valor: 150 }, // Balao 1
        { id: 't3', status: 'PENDENTE', tipo: 'CREDITO', valor: 150 }, // Balao 2
        { id: 't4', status: 'PENDENTE', tipo: 'CREDITO', valor: 500 } // Remanescente: 1000 total - 200 - 300 = 500
      ];

      // Mock DB calls
      db.mockImplementation((table) => {
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          whereRaw: jest.fn().mockReturnThis(),
          orWhereRaw: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhereRaw: jest.fn().mockReturnThis(),
          first: jest.fn(),
          insert: jest.fn().mockResolvedValue([1]),
          update: jest.fn().mockResolvedValue(1)
        };

        if (table === 'GamConfigImportacao') {
          queryBuilder.first.mockResolvedValue(mockPerfil);
          return queryBuilder;
        }
        if (table === 'GamUsuario') {
          queryBuilder.first.mockResolvedValue(mockCorretor);
          return queryBuilder;
        }
        if (table === 'GamTransacao') {
          const qb = Promise.resolve(mockTransacoesCalculadas);
          qb.where = jest.fn().mockReturnThis();
          qb.insert = jest.fn().mockResolvedValue([1]);
          return qb;
        }
        return db;
      });

      // Mock XLSX utilities
      xlsx.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      xlsx.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const confirm = await ImportacaoService.confirmarImportacao('empresa-123', 'admin-456', 'fake-base64', 'perfil-123');

      expect(confirm.sucesso).toBe(true);
      expect(confirm.total_vendas_processadas).toBe(1);
      expect(confirm.transacoes_criadas).toBe(4); // 1 compensada + 2 baloes + 1 remanescente
      expect(confirm.corretores_atualizados).toBe(1);
      expect(db.transaction).toHaveBeenCalled();
    });
  });
});
