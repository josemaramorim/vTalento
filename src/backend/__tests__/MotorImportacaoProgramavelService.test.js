const MotorImportacaoProgramavelService = require('../core/services/MotorImportacaoProgramavelService');

describe('MotorImportacaoProgramavelService', () => {
  test('deve processar mapeamento estatico simples e normalizar numeros', async () => {
    const config = {
      configuracoes_gerais: { pular_linhas_vazias: true },
      mapeamento_campos: {
        Nome: { celula: 'A' },
        Valor: { celula: 'B' }
      }
    };

    const rows = [
      { A: 'Parceiro A', B: '150.50' },
      { A: 'Parceiro B', B: '200' }
    ];

    const service = new MotorImportacaoProgramavelService(config);
    const result = await service.processar(rows);

    expect(result.resultados).toHaveLength(2);
    expect(result.resultados[0].dados).toEqual({
      Nome: 'Parceiro A',
      Valor: 150.50
    });
    expect(result.resultados[1].dados).toEqual({
      Nome: 'Parceiro B',
      Valor: 200
    });
  });

  test('deve rodar scripts na sandbox isolada e usar helpers', async () => {
    const config = {
      mapeamento_campos: {
        Nome: {
          celula: 'A',
          script: `
            return value.trim().toUpperCase();
          `
        },
        CPF: {
          celula: 'B',
          script: `
            return helpers.cleanCPF(value);
          `
        },
        ValorOriginal: {
          celula: 'C',
          script: `
            return helpers.parseMoeda(value);
          `
        },
        ValorComissao: {
          script: `
            // Pega a celula C diretamente e calcula comissão
            let venda = helpers.parseMoeda(row.C);
            return venda * 0.10;
          `
        }
      }
    };

    const rows = [
      { A: ' joao silva ', B: '123.456.789-00', C: 'R$ 1.500,00' }
    ];

    const service = new MotorImportacaoProgramavelService(config);
    const result = await service.processar(rows);

    expect(result.resultados).toHaveLength(1);
    expect(result.resultados[0].dados).toEqual({
      Nome: 'JOAO SILVA',
      CPF: '12345678900',
      ValorOriginal: 1500,
      ValorComissao: 150
    });
  });

  test('deve suportar script global de inicializacao e acumular no globalStore', async () => {
    const config = {
      contexto_global: {
        script_inicializacao: `
          globalStore.taxaConversao = 5.50;
          globalStore.totalMoeda = 0;
        `
      },
      mapeamento_campos: {
        ValorDolar: { celula: 'A' },
        ValorReais: {
          script: `
            let valor = parseFloat(row.A);
            let resultVal = valor * globalStore.taxaConversao;
            globalStore.totalMoeda += resultVal;
            return resultVal;
          `
        }
      }
    };

    const rows = [
      { A: '100' },
      { A: '200' }
    ];

    const service = new MotorImportacaoProgramavelService(config);
    const result = await service.processar(rows);

    expect(result.resultados).toHaveLength(2);
    expect(result.resultados[0].dados.ValorReais).toBe(550);
    expect(result.resultados[1].dados.ValorReais).toBe(1100);
    expect(service.globalStore.totalMoeda).toBe(1650);
  });

  test('deve testar parseMoeda de forma ultra-robusta', async () => {
    const config = {
      mapeamento_campos: {
        Original: { celula: 'A' },
        BR_PontoVirgula: {
          script: `return helpers.parseMoeda(row.A);`
        },
        US_VirgulaPonto: {
          script: `return helpers.parseMoeda(row.B);`
        },
        BR_SemPonto: {
          script: `return helpers.parseMoeda(row.C);`
        },
        US_SemVirgula: {
          script: `return helpers.parseMoeda(row.D);`
        },
        PontoSemDecimal: {
          script: `return helpers.parseMoeda(row.E);`
        },
        VirgulaSemDecimal: {
          script: `return helpers.parseMoeda(row.F);`
        }
      }
    };

    const rows = [
      {
        A: 'R$ 1.500,50',
        B: '1,500.50',
        C: '1500,50',
        D: '1500.50',
        E: '1.500',
        F: '1,500'
      }
    ];

    const service = new MotorImportacaoProgramavelService(config);
    const result = await service.processar(rows);

    expect(result.resultados[0].dados).toEqual({
      Original: 'R$ 1.500,50',
      BR_PontoVirgula: 1500.50,
      US_VirgulaPonto: 1500.50,
      BR_SemPonto: 1500.50,
      US_SemVirgula: 1500.50,
      PontoSemDecimal: 1500,
      VirgulaSemDecimal: 1500
    });
  });

  test('deve disparar timeout e capturar erro em caso de loop infinito na sandbox', async () => {
    const config = {
      mapeamento_campos: {
        Loop: {
          script: `
            while (true) {}
          `
        }
      }
    };

    const rows = [{ A: 'qualquer' }];
    const service = new MotorImportacaoProgramavelService(config);
    const result = await service.processar(rows);

    expect(result.resultados).toHaveLength(0);
    expect(result.logs.some(l => l.includes('ERRO CRÍTICO DE PARSING') && (l.toLowerCase().includes('timeout') || l.toLowerCase().includes('timed out')))).toBe(true);
  });

  test('deve resolver macros de referencia cruzada {{NomeCampo}} corretamente', async () => {
    const config = {
      mapeamento_campos: {
        Nome: { celula: 'A' },
        ValorVenda: {
          celula: 'B',
          script: `
            return helpers.parseMoeda(value);
          `
        },
        ValorComissao: {
          script: `
            let venda = helpers.parseMoeda('{{ValorVenda}}');
            return venda * 0.10;
          `
        },
        LogFrase: {
          script: `
            return 'Consultor {{Nome}} recebeu ' + '{{ValorComissao}}';
          `
        }
      }
    };

    const rows = [
      { A: 'Carlos', B: 'R$ 10.000,00' }
    ];

    const service = new MotorImportacaoProgramavelService(config);
    const result = await service.processar(rows);

    expect(result.resultados).toHaveLength(1);
    expect(result.resultados[0].dados).toEqual({
      Nome: 'Carlos',
      ValorVenda: 10000,
      ValorComissao: 1000,
      LogFrase: 'Consultor Carlos recebeu 1000'
    });
  });

  test('deve rodar hook antes_salvar_linha e filtrar linhas se retornar false', async () => {
    const config = {
      mapeamento_campos: {
        Nome: { celula: 'A' },
        Vgv: { celula: 'B' }
      },
      hooks: {
        antes_salvar_linha: `
          if (linhaResult.Vgv < 1000) {
            log.warning('Ignorando ' + linhaResult.Nome + ' por baixo valor');
            return false;
          }
          log.info('Aprovado ' + linhaResult.Nome);
          return true;
        `
      }
    };

    const rows = [
      { A: 'Consultor Gold', B: '5000' },
      { A: 'Consultor Bronze', B: '500' }
    ];

    const service = new MotorImportacaoProgramavelService(config);
    const result = await service.processar(rows);

    expect(result.resultados).toHaveLength(1);
    expect(result.resultados[0].dados.Nome).toBe('Consultor Gold');
    expect(result.logs.some(l => l.includes('Ignorando Consultor Bronze por baixo valor'))).toBe(true);
    expect(result.logs.some(l => l.includes('Aprovado Consultor Gold'))).toBe(true);
    expect(result.logs.some(l => l.includes('Pulada pelo hook antes_salvar_linha'))).toBe(true);
  });
});
