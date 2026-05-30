const fs = require('fs');
const path = require('path');
const MotorImportacaoProgramavelService = require('../core/services/MotorImportacaoProgramavelService');

describe('Manual Doc Examples Validator (Doc-as-Code)', () => {
  const manualPath = path.join(__dirname, '../../../docs/motor-importacao-manual.md');

  test('deve carregar o manual, extrair todos os blocos de JSON e garantir que todos rodam com sucesso', async () => {
    expect(fs.existsSync(manualPath)).toBe(true);
    const content = fs.readFileSync(manualPath, 'utf8');

    // Expressão regular para encontrar todos os blocos de código JSON
    const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;
    const configs = [];

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const code = match[1].trim();
      try {
        const parsed = JSON.parse(code);
        if (parsed.versao_motor === '2.0' && parsed.mapeamento_campos) {
          configs.push(parsed);
        }
      } catch (err) {
        // Ignora blocos de código JSON informais que não representam configs completas
      }
    }

    // Garante que encontramos pelo menos os 3 exemplos descritos no manual
    expect(configs.length).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const service = new MotorImportacaoProgramavelService(config);

      // Constrói uma linha rica e inteligente que atenda a todos os mapeamentos
      const mockRow = {};
      const mapeamento = config.mapeamento_campos || {};

      for (const campo of Object.keys(mapeamento)) {
        const meta = mapeamento[campo];
        if (meta.celula) {
          const lowerCampo = campo.toLowerCase();
          if (lowerCampo.includes('valor') || lowerCampo.includes('vgv')) {
            mockRow[meta.celula] = 'R$ 1.500,50';
          } else if (lowerCampo.includes('documento') || lowerCampo.includes('cpf')) {
            mockRow[meta.celula] = '123.456.789-00';
          } else {
            mockRow[meta.celula] = ' Carlos Alberto ';
          }
        }
      }

      // Processa a linha na sandbox
      const result = await service.processar([mockRow]);

      // Assertiva 1: A sandbox não deve disparar exceção crítica que resulte em resultados nulos/erros genéricos
      expect(result).toBeDefined();
      expect(result.resultados).toBeDefined();

      // Assertiva 2: Os logs de erro críticos não devem constar no processamento
      const hasCriticalError = result.logs.some(log => log.includes('ERRO CRÍTICO'));
      if (hasCriticalError) {
        console.error(`Erro no exemplo ${i + 1}:`, result.logs);
      }
      expect(hasCriticalError).toBe(false);
    }
  });
});
