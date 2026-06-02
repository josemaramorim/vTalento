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
          // creci lookup returns array (high-priority path)
          const arrayQb = Promise.resolve([mockCorretor]);
          arrayQb.where = jest.fn().mockReturnThis();
          arrayQb.whereRaw = jest.fn().mockReturnThis();
          arrayQb.orWhereRaw = jest.fn().mockReturnThis();
          arrayQb.andWhereRaw = jest.fn().mockReturnThis();
          arrayQb.first = jest.fn().mockResolvedValue(mockCorretor);
          arrayQb.update = jest.fn().mockResolvedValue(1);
          return arrayQb;
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
      expect(linha.baloes[0].valor_talentos).toBe(300); // Valor é por balão: 30k * 0.01 = 300 talentos
      expect(linha.baloes[0].data_vencimento).toBeInstanceOf(Date);
    });

    it('deve sugerir o mapeamento de colunas a partir do cabeçalho da planilha', async () => {
      const mockSheetData = [
        ['Corretor', 'CRECI', 'Valor Venda', 'Valor Pago', 'Empreendimento', 'Unidade', 'Cliente', 'Balão Valor', 'Balão Datas', 'Balão Qtd']
      ];

      xlsx.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      xlsx.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const suggestion = await ImportacaoService.sugerirMapeamento('empresa-123', 'fake-base64', { linha_cabecalho: 1, usa_ia: false });

      expect(suggestion.colunas_detectadas).toEqual(mockSheetData[0]);
      expect(suggestion.sugestoes_mapeamento.corretor_identificador).toBe('Corretor');
      expect(suggestion.sugestoes_mapeamento.corretor_creci).toBe('CRECI');
      expect(suggestion.sugestoes_mapeamento.valor_venda).toBe('Valor Venda');
      expect(suggestion.sugestoes_mapeamento.valor_pago).toBe('Valor Pago');
      expect(suggestion.sugestoes_mapeamento.empreendimento).toBe('Empreendimento');
      expect(suggestion.usa_ia).toBe(false);
      expect(suggestion.metodo).toBe('heuristica');
    });

    it('deve sugerir mapeamento usando a Inteligência Artificial (NLP Semântico + Telemetria) quando usa_ia for true', async () => {
      const mockSheetData = [
        ['Vendedor de Elite', 'Registro Prof.', 'Aporte de Entrada', 'Produto Vendido'],
        ['Carlos Souza', 'CRECI-987', 'R$ 15.000,00', 'Park View Residencial']
      ];

      xlsx.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      xlsx.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const suggestion = await ImportacaoService.sugerirMapeamento('empresa-123', 'fake-base64', {
        linha_cabecalho: 1,
        usa_ia: true
      });

      expect(suggestion.usa_ia).toBe(true);
      expect(suggestion.metodo).toBe('IA (NLP Semântico + Telemetria)');
      expect(suggestion.sugestoes_mapeamento.corretor_identificador).toBe('Vendedor de Elite'); // Semelhança semântica com 'corretor'
      expect(suggestion.sugestoes_mapeamento.corretor_creci).toBe('Registro Prof.'); // Semelhança semântica com 'creci'
      expect(suggestion.sugestoes_mapeamento.valor_pago).toBe('Aporte de Entrada'); // Semelhança com 'pago' / 'entrada'
      expect(suggestion.sugestoes_mapeamento.empreendimento).toBe('Produto Vendido'); // Semelhança com 'produto' / 'empreendimento'
      expect(suggestion.insights_ia).toBeDefined();
      expect(suggestion.insights_ia.length).toBeGreaterThan(0);
    });
  });

  describe('Motor de Recebíveis (Agnóstico)', () => {
    it('deve gerar um array de N parcelas fixas mensais quando os campos de parcelamento estiverem mapeados (Passo 1)', async () => {
      const mockPerfil = {
        id: 'perfil-parcelas', empresa_id: 'empresa-123', nome_perfil: 'Venda Parcelada',
        mapeamento_json: JSON.stringify({ corretor_identificador: 'Corretor', corretor_creci: 'ID', valor_venda: 'Total', valor_pago: 'Entrada', empreendimento: 'Obra' }),
        parcela_valor: 'Mensal', parcela_qtd: 'Qtd', parcela_data_inicio: 'Vencimento',
        fator_conversao: 100, separador_multiplo: '|', linha_cabecalho: 1, formato_data_balao: 'DD/MM/YYYY'
      };

      const mockSheetData = [
        ['Corretor', 'ID', 'Total', 'Entrada', 'Obra', 'Mensal', 'Qtd', 'Vencimento'],
        ['João Silva', '123', '50000', '5000', 'Park View', '1000', '5', '10/01/2026'] // 5 parcelas de R$ 1000
      ];

      const mockCorretor = { id: 'corretor-123', nome: 'João Silva', empresa_id: 'empresa-123', perfil: 'CORRETOR' };

      db.mockImplementation((table) => {
        const queryBuilder = { where: jest.fn().mockReturnThis(), andWhereRaw: jest.fn().mockReturnThis(), first: jest.fn() };
        if (table === 'GamConfigImportacao') { queryBuilder.first.mockResolvedValue(mockPerfil); return queryBuilder; }
        if (table === 'GamUsuario') { queryBuilder.first.mockResolvedValue(mockCorretor); return queryBuilder; }
        return db;
      });

      xlsx.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      xlsx.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const preview = await ImportacaoService.previewImportacao('empresa-123', 'fake-base64', 'perfil-parcelas', 'CONTRATOS');

      expect(preview.linhas[0].parcelas).toBeDefined();
      expect(preview.linhas[0].parcelas.length).toBe(5); // 5 meses
      expect(preview.linhas[0].parcelas[0].valor_rs).toBe(1000);
      expect(preview.linhas[0].parcelas[0].valor_talentos).toBe(10); // 1000 / 100 = 10 talentos
      
      expect(preview.linhas[0].parcelas[0].data_vencimento.getMonth()).toBe(0); // Janeiro (0-indexed)
      expect(preview.linhas[0].parcelas[4].data_vencimento.getMonth()).toBe(4); // Maio
      expect(preview.linhas[0].parcelas[4].data_vencimento.getFullYear()).toBe(2026);
    });

    it('deve realizar a conciliação FIFO (Passo 2) e liquidar parcelas pendentes total ou parcialmente usando os pagamentos', async () => {
      const mockPerfil = {
        id: 'perfil-baixa', empresa_id: 'empresa-123', nome_perfil: 'Baixa Extrato',
        mapeamento_json: JSON.stringify({ corretor_identificador: 'Corretor', corretor_creci: 'ID', valor_pago: 'Valor Baixa' }),
        fator_conversao: 100, linha_cabecalho: 1
      };

      const mockSheetData = [
        ['Corretor', 'ID', 'Valor Baixa'],
        ['Maria Souza', '123', '450'] // Maria recebe baixa de 450 R$ (4,5 talentos)
      ];

      const mockCorretor = { id: 'corretor-456', nome: 'Maria Souza', empresa_id: 'empresa-123', perfil: 'CORRETOR', saldo_disponivel: 0 };

      const mockTransacoesPendentes = [
        { id: 't1', usuario_id: 'corretor-456', valor: 2, status: 'PENDENTE', data_criacao: new Date('2026-01-01') }, // (2 talentos)
        { id: 't2', usuario_id: 'corretor-456', valor: 3, status: 'PENDENTE', data_criacao: new Date('2026-02-01') }, // (3 talentos)
        { id: 't3', usuario_id: 'corretor-456', valor: 5, status: 'PENDENTE', data_criacao: new Date('2026-03-01') }  // (5 talentos)
      ];

      db.mockImplementation((table) => {
        const qb = { where: jest.fn().mockReturnThis(), andWhereRaw: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), orderByRaw: jest.fn().mockReturnThis(), first: jest.fn(), insert: jest.fn().mockResolvedValue([1]), update: jest.fn().mockResolvedValue(1) };
        if (table === 'GamConfigImportacao') { qb.first.mockResolvedValue(mockPerfil); return qb; }
        if (table === 'GamUsuario') {
          const arrayQb = Promise.resolve([mockCorretor]);
          arrayQb.where = jest.fn().mockReturnThis();
          arrayQb.whereRaw = jest.fn().mockReturnThis();
          arrayQb.orWhereRaw = jest.fn().mockReturnThis();
          arrayQb.andWhereRaw = jest.fn().mockReturnThis();
          arrayQb.first = jest.fn().mockResolvedValue(mockCorretor);
          arrayQb.update = jest.fn().mockResolvedValue(1);
          return arrayQb;
        }
        if (table === 'GamTransacao') {
          const promiseQb = Promise.resolve(mockTransacoesPendentes);
          promiseQb.where = jest.fn().mockReturnThis();
          promiseQb.orderBy = jest.fn().mockReturnThis();
          promiseQb.orderByRaw = jest.fn().mockReturnThis();
          promiseQb.insert = jest.fn().mockResolvedValue([1]);
          promiseQb.update = jest.fn().mockResolvedValue(1);
          return promiseQb;
        }
        return db;
      });

      xlsx.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { 'Sheet1': {} } });
      xlsx.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const confirm = await ImportacaoService.confirmarImportacao('empresa-123', 'admin-789', 'fake-base64', 'perfil-baixa', {}, 'BAIXAS');

      expect(confirm.sucesso).toBe(true);
      expect(confirm.total_vendas_processadas).toBe(1);
      expect(confirm.transacoes_criadas).toBe(2); // 1 t1 fully paid (updated) + 1 partial compensada generated for t2
      expect(confirm.corretores_atualizados).toBe(1); 
    });
  });

  describe('Validação Defensiva de Perfis/Motores', () => {
    it('deve barrar perfil programável sendo executado no motor clássico', async () => {
      const mockPerfilProg = {
        id: 'perfil-prog',
        empresa_id: 'empresa-123',
        nome_perfil: 'Perfil Programável 2.0',
        mapeamento_json: JSON.stringify({
          versao_motor: '2.0',
          mapeamento_campos: {}
        }),
        linha_cabecalho: 1
      };

      db.mockImplementation((table) => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockPerfilProg)
        };
        return qb;
      });

      await expect(
        ImportacaoService.previewImportacao('empresa-123', 'fake-base64', 'perfil-prog')
      ).rejects.toThrow('Este perfil foi criado para o Motor Programável e não pode ser executado no Motor de Importação clássico');
    });

    it('deve barrar perfil clássico sendo executado no motor programável', async () => {
      const mockPerfilClassico = {
        id: 'perfil-classico',
        empresa_id: 'empresa-123',
        nome_perfil: 'Perfil Clássico Antigo',
        mapeamento_json: JSON.stringify({
          corretor_identificador: 'Corretor'
        }),
        linha_cabecalho: 1
      };

      db.mockImplementation((table) => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockPerfilClassico)
        };
        return qb;
      });

      await expect(
        ImportacaoService.previewImportacaoProgramavel('empresa-123', 'fake-base64', 'perfil-classico')
      ).rejects.toThrow('Este perfil foi criado para o Motor de Importação clássico e não possui regras programáveis compatíveis com o Motor Programável');
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
          const arrayQb = Promise.resolve([mockCorretor]);
          arrayQb.where = jest.fn().mockReturnThis();
          arrayQb.whereRaw = jest.fn().mockReturnThis();
          arrayQb.orWhereRaw = jest.fn().mockReturnThis();
          arrayQb.andWhereRaw = jest.fn().mockReturnThis();
          arrayQb.first = jest.fn().mockResolvedValue(mockCorretor);
          arrayQb.update = jest.fn().mockResolvedValue(1);
          return arrayQb;
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
