const vm = require('vm');

class MotorImportacaoProgramavelService {
  constructor(configJson, options = {}) {
    this.config = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
    this.fatorConversao = parseFloat(options?.fatorConversao || (this.config?.configuracoes_gerais?.fator_conversao)) || 100;
    this.globalStore = {}; // Estado persistido de linha para linha
  }

  /**
   * Processa uma lista de linhas extraídas da planilha Excel/CSV
   * @param {Array<Object>} rows - Exemplo: [{ A: "Parceiro X", B: "123.456.789-00", C: "R$ 150.000,00" }]
   */
  async processar(rows) {
    const resultados = [];
    const logs = [];

    // 1. Executa o Script de Inicialização Global (se houver)
    if (this.config.contexto_global?.script_inicializacao) {
      this.executarScriptGlobal(this.config.contexto_global.script_inicializacao, logs);
    }

    // 2. Loop principal por cada linha da planilha
    for (let index = 0; index < rows.length; index++) {
      const rawRow = rows[index];
      const numeroLinha = index + 1;

      try {
        // Pula linhas vazias se configurado
        if (this.config.configuracoes_gerais?.pular_linhas_vazias) {
          const valores = Object.values(rawRow);
          if (valores.length === 0 || valores.every(v => v === null || v === undefined || String(v).trim() === '')) {
            continue;
          }
        }

        // 3. Processa e resolve todos os campos da linha
        const linhaProcessada = this.processarLinha(rawRow, numeroLinha, logs);

        // 4. Executa os hooks de validação ("antes_salvar_linha")
        if (this.config.hooks?.antes_salvar_linha) {
          const aprovada = this.executarHookLinha(this.config.hooks.antes_salvar_linha, linhaProcessada, logs, numeroLinha);
          if (!aprovada) {
            logs.push(`[Linha ${numeroLinha}] Pulada pelo hook antes_salvar_linha.`);
            continue;
          }
        }

        resultados.push({
          linha: numeroLinha,
          dados: linhaProcessada
        });

      } catch (error) {
        logs.push(`[Linha ${numeroLinha}] ERRO CRÍTICO DE PARSING: ${error.message}`);
      }
    }

    return { resultados, logs };
  }

  /**
   * Processa campos de uma única linha resolvendo scripts e mapeamentos de células
   */
  processarLinha(rawRow, numeroLinha, logs) {
    const linhaResult = {};
    const camposMapeados = this.config.mapeamento_campos || {};

    // Criamos os helpers utilitários que serão injetados na Sandbox
    const helpers = {
      parseMoeda: (val) => {
        if (val === null || val === undefined || val === '') return 0;
        let str = String(val).trim();
        // Remove símbolos de moeda e espaços
        str = str.replace(/[R$\s]/g, '');
        
        // Se contiver ponto e vírgula (ex: 1.500,00 ou 1,500.00)
        if (str.includes('.') && str.includes(',')) {
          if (str.indexOf('.') < str.indexOf(',')) {
            // Formato brasileiro
            str = str.replace(/\./g, '').replace(',', '.');
          } else {
            // Formato americano
            str = str.replace(/,/g, '');
          }
        } else if (str.includes(',')) {
          // Apenas vírgula: se terminar com vírgula e 2 dígitos, assume decimal
          if (str.match(/^-?[\d]+,[\d]{2}$/)) {
            str = str.replace(',', '.');
          } else {
            // Ex: "1,500" -> 1500
            str = str.replace(/,/g, '');
          }
        } else if (str.includes('.')) {
          // Apenas ponto: se terminar com ponto e 2 dígitos, assume decimal
          if (str.match(/^-?[\d]+\.[\d]{2}$/)) {
            // decimal americano mantido
          } else {
            // Ex: "1.500" -> 1500
            str = str.replace(/\./g, '');
          }
        }
        
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
      },
      cleanCPF: (val) => {
        if (!val) return '';
        return String(val).replace(/[^0-9]/g, '');
      },
      somarMeses: (dataStr, meses) => {
        if (!dataStr) return '';
        let dt;
        if (typeof dataStr === 'string' && dataStr.includes('/')) {
          const partes = dataStr.split('/');
          if (partes.length === 3) {
            dt = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
          }
        }
        if (!dt || isNaN(dt.getTime())) {
          dt = new Date(dataStr);
        }
        if (isNaN(dt.getTime())) return '';
        dt.setMonth(dt.getMonth() + parseInt(meses, 10));
        return dt.toISOString().split('T')[0];
      }
    };

    const chavesCampos = Object.keys(camposMapeados);

    // DUAL PASS RESOLUTION:
    // Passo 1: Resolve mapeamentos estáticos simples (sem script)
    // Isso garante que os campos estáticos estejam imediatamente disponíveis no linhaResult
    // para que qualquer script de campo dinâmico possa referenciá-los.
    for (const campo of chavesCampos) {
      const meta = camposMapeados[campo];
      if (!meta.script) {
        const rawValue = meta.celula ? rawRow[meta.celula] : undefined;
        linhaResult[campo] = this.normalizarValorEstatico(rawValue);
      }
    }

    // Passo 2: Executa os scripts dinâmicos de campos
    for (const campo of chavesCampos) {
      const meta = camposMapeados[campo];
      if (meta.script) {
        const rawValue = meta.celula ? rawRow[meta.celula] : undefined;
        linhaResult[campo] = this.executarScriptCampo(campo, meta.script, rawValue, rawRow, helpers, linhaResult, logs, numeroLinha);
      }
    }

    return linhaResult;
  }

  /**
   * Roda um script de campo dentro de um contexto isolado na VM do Node
   */
  executarScriptCampo(campo, scriptCode, value, row, helpers, linhaResult, logs, numeroLinha) {
    // Resolve macros do tipo {{NomeCampo}} substituindo pelo valor já resolvido.
    let codigoTratado = scriptCode;
    for (const campoResolvido of Object.keys(linhaResult)) {
      // Escapa o nome para uso seguro em regex
      const nomeEscapado = campoResolvido.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{${nomeEscapado}\\}\\}`, 'g');
      
      const val = linhaResult[campoResolvido];
      const replacement = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val);
      codigoTratado = codigoTratado.replace(regex, () => replacement);
    }

    // Define o escopo da sandbox (limites rígidos de contexto)
    const sandbox = {
      value, // Valor bruto da célula mapeada
      row,   // Linha inteira do Excel (ex: row.A, row.B)
      globalStore: this.globalStore, // Estado compartilhado persistente
      helpers, // Funções auxiliares
      result: null, // Receptor do retorno
      fatorConversao: this.fatorConversao,
      fator_conversao: this.fatorConversao,
      log: {
        info: (msg) => logs.push(`[Linha ${numeroLinha}] [Campo ${campo}] [Info] ${msg}`),
        warning: (msg) => logs.push(`[Linha ${numeroLinha}] [Campo ${campo}] [Warning] ${msg}`),
        error: (msg) => logs.push(`[Linha ${numeroLinha}] [Campo ${campo}] [Error] ${msg}`)
      }
    };

    const context = vm.createContext(sandbox);
    
    // Encapsula o script do usuário para capturar o retorno de forma limpa
    const scriptEnvelopado = new vm.Script(`
      (function() {
        ${codigoTratado}
      })()
    `);

    const timeoutLimit = this.config.configuracoes_gerais?.timeout_sandbox || (process.env.NODE_ENV === 'test' ? 1000 : 50);

    // Executa com limite máximo de tempo de 50ms para evitar laços infinitos (travamentos de CPU)
    const retorno = scriptEnvelopado.runInContext(context, { timeout: timeoutLimit });

    return retorno !== undefined ? retorno : context.result;
  }

  executarScriptGlobal(scriptCode, logs) {
    const sandbox = {
      globalStore: this.globalStore,
      fatorConversao: this.fatorConversao,
      fator_conversao: this.fatorConversao,
      log: {
        info: (msg) => logs.push(`[Global] [Info] ${msg}`),
        warning: (msg) => logs.push(`[Global] [Warning] ${msg}`)
      }
    };
    const context = vm.createContext(sandbox);
    try {
      const script = new vm.Script(scriptCode);
      const timeoutLimit = this.config.configuracoes_gerais?.timeout_sandbox ? (this.config.configuracoes_gerais.timeout_sandbox * 2) : (process.env.NODE_ENV === 'test' ? 2000 : 100);
      script.runInContext(context, { timeout: timeoutLimit });
    } catch (e) {
      logs.push(`[Script Global] Erro na inicialização: ${e.message}`);
    }
  }

  executarHookLinha(hookCode, linhaResult, logs, numeroLinha) {
    const sandbox = {
      linhaResult,
      globalStore: this.globalStore,
      fatorConversao: this.fatorConversao,
      fator_conversao: this.fatorConversao,
      log: {
        warning: (msg) => logs.push(`[Linha ${numeroLinha}] [Hook Warning] ${msg}`),
        info: (msg) => logs.push(`[Linha ${numeroLinha}] [Hook Info] ${msg}`)
      }
    };
    const context = vm.createContext(sandbox);
    const script = new vm.Script(`
      (function() {
        ${hookCode}
      })()
    `);
    const timeoutLimit = this.config.configuracoes_gerais?.timeout_sandbox || (process.env.NODE_ENV === 'test' ? 1000 : 50);
    const result = script.runInContext(context, { timeout: timeoutLimit });
    return result !== false;
  }

  normalizarValorEstatico(value) {
    if (value === undefined || value === null) return null;
    // Se parecer um número puro, converte para float
    if (typeof value === 'string' && !isNaN(value.trim()) && value.trim() !== '') {
      return parseFloat(value);
    }
    return value;
  }
}

module.exports = MotorImportacaoProgramavelService;
