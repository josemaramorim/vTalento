const db = require('../../infra/db');
const crypto = require('crypto');
const xlsx = require('xlsx');

class ImportacaoService {
  async listarPerfis(empresa_id) {
    return db('GamConfigImportacao')
      .where({ empresa_id })
      .orderBy('created_at', 'desc');
  }

  async obterPerfil(empresa_id, id) {
    const perfil = await db('GamConfigImportacao')
      .where({ id, empresa_id })
      .first();

    if (perfil) {
      if (typeof perfil.mapeamento_json === 'string') {
        perfil.mapeamento_json = JSON.parse(perfil.mapeamento_json);
      }
      if (typeof perfil.campos_extras === 'string') {
        perfil.campos_extras = JSON.parse(perfil.campos_extras);
      }
    }
    return perfil;
  }

  async criarPerfil(empresa_id, { nome_perfil, mapeamento_json, separador_multiplo = '|', linha_cabecalho = 3, identificador_extra_coluna = null, campos_extras = null, fator_conversao = 100, formato_data_balao = 'DD/MM/YYYY' }) {
    if (!nome_perfil || !mapeamento_json) {
      throw new Error('Nome do perfil e mapeamento são obrigatórios');
    }

    const id = crypto.randomUUID();
    const mapeamentoStr = typeof mapeamento_json === 'string' ? mapeamento_json : JSON.stringify(mapeamento_json);
    const camposExtrasStr = campos_extras ? (typeof campos_extras === 'string' ? campos_extras : JSON.stringify(campos_extras)) : null;

    await db('GamConfigImportacao').insert({
      id,
      empresa_id,
      nome_perfil,
      mapeamento_json: mapeamentoStr,
      separador_multiplo,
      linha_cabecalho,
      identificador_extra_coluna,
      campos_extras: camposExtrasStr,
      fator_conversao,
      formato_data_balao,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return { id, nome_perfil };
  }

  async atualizarPerfil(empresa_id, id, { nome_perfil, mapeamento_json, separador_multiplo = '|', linha_cabecalho = 3, identificador_extra_coluna = null, campos_extras = null, fator_conversao = 100, formato_data_balao = 'DD/MM/YYYY' }) {
    if (!nome_perfil || !mapeamento_json) {
      throw new Error('Nome do perfil e mapeamento são obrigatórios');
    }

    const mapeamentoStr = typeof mapeamento_json === 'string' ? mapeamento_json : JSON.stringify(mapeamento_json);
    const camposExtrasStr = campos_extras ? (typeof campos_extras === 'string' ? campos_extras : JSON.stringify(campos_extras)) : null;

    const updated = await db('GamConfigImportacao')
      .where({ id, empresa_id })
      .update({
        nome_perfil,
        mapeamento_json: mapeamentoStr,
        separador_multiplo,
        linha_cabecalho,
        identificador_extra_coluna,
        campos_extras: camposExtrasStr,
        fator_conversao,
        formato_data_balao,
        updated_at: db.fn.now()
      });

    if (!updated) {
      throw new Error('Perfil não encontrado para atualização');
    }

    return { id, nome_perfil };
  }

  async deletarPerfil(empresa_id, id) {
    const deleted = await db('GamConfigImportacao')
      .where({ id, empresa_id })
      .del();

    if (!deleted) {
      throw new Error('Perfil nÃ£o encontrado para exclusÃ£o');
    }
    return { success: true };
  }

  // Analisa uma string base64 de planilha e retorna as linhas brutas
  _lerPlanilhaBase64(fileBase64) {
    try {
      // Remove header data URI se presente (ex: data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,...)
      const base64Clean = fileBase64.replace(/^data:.*?;base64,/, "");
      const workbook = xlsx.read(base64Clean, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    } catch (err) {
      throw new Error('Falha ao processar arquivo Excel/CSV: ' + err.message);
    }
  }

  _normalizeText(value) {
    if (value === undefined || value === null) return '';
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .toLowerCase();
  }

  _limparCPF(valor) {
    if (valor === undefined || valor === null) return '';
    return String(valor).replace(/[.\-\/\s]/g, '').trim();
  }

  _matchHeader(headers, patterns) {
    for (const pattern of patterns) {
      const normalizedPattern = this._normalizeText(pattern);
      for (const header of headers) {
        const normalizedHeader = this._normalizeText(header);
        if (normalizedHeader === normalizedPattern || normalizedHeader.includes(normalizedPattern)) {
          return header;
        }
      }
    }
    return '';
  }

  _guessMapeamento(headers) {
    const patterns = {
      corretor_identificador: ['corretor', 'nome corretor', 'cpf', 'corretor responsavel', 'corretor identificador', 'corretor responsÃ¡vel'],
      corretor_creci: ['creci', 'registro profissional', 'creci corretor'],
      valor_venda: ['valor venda', 'valor total', 'total venda', 'venda r$', 'valor da venda'],
      valor_pago: ['valor pago', 'pago atual', 'valor pago atual', 'valor recebido', 'valor recebido r$'],
      empreendimento: ['empreendimento', 'empreendimento unidade', 'empreendimento / unidade'],
      unidade: ['unidade', 'imovel', 'imÃ³vel'],
      cliente_nome: ['cliente', 'nome cliente', 'nome do cliente', 'comprador'],
      balao_valor: ['balao valor', 'balÃ£o valor', 'valor balao', 'valor balÃ£o', 'valor reforco', 'valor reforÃ§o'],
      balao_datas: ['balao datas', 'balÃ£o datas', 'datas balao', 'datas balÃ£o', 'datas reforco', 'datas reforÃ§o'],
      balao_qtd: ['balao qtd', 'balÃ£o qtd', 'qtde balao', 'qtde balÃ£o', 'quantidade baloes', 'quantidade balÃµes', 'qtd reforco', 'qtd reforÃ§o']
    };

    const sugestoes = {};
    const availableHeaders = headers.map(h => (h === null || h === undefined ? '' : String(h).trim()));

    for (const key of Object.keys(patterns)) {
      sugestoes[key] = this._matchHeader(availableHeaders, patterns[key]);
    }

    return sugestoes;
  }

  async sugerirMapeamento(empresa_id, fileBase64, { linha_cabecalho = 1, usa_ia = false } = {}) {
    if (!fileBase64) {
      throw new Error('O campo fileBase64 Ã© obrigatÃ³rio');
    }

    const rawRows = this._lerPlanilhaBase64(fileBase64);
    const cabecalho0Based = Math.max(0, parseInt(linha_cabecalho, 10) - 1 || 0);

    if (rawRows.length <= cabecalho0Based) {
      throw new Error('A planilha estÃ¡ vazia ou a linha do cabeÃ§alho estÃ¡ fora dos limites');
    }

    const headers = rawRows[cabecalho0Based];
    if (!headers || !Array.isArray(headers)) {
      throw new Error('CabeÃ§alho da planilha nÃ£o localizado na linha configurada');
    }

    const colunasDetectadas = headers.map(h => (h === null || h === undefined ? '' : String(h).trim()));
    const sugestoesMapeamento = this._guessMapeamento(colunasDetectadas);

    return {
      colunas_detectadas: colunasDetectadas,
      sugestoes_mapeamento: sugestoesMapeamento,
      linha_cabecalho: cabecalho0Based + 1,
      usa_ia: !!usa_ia,
      metodo: 'heuristica'
    };
  }

  // Faz lookup do corretor por Nome ou campo Identificador Extra (prioridade)
  async _buscarCorretor(empresa_id, nome, creci, identificadorExtraColunaVal = null) {
    // 1. Se identificador extra estiver mapeado e tiver valor na linha, priorizar busca exata (Nome + Identificador)
    if (identificadorExtraColunaVal) {
      const idVal = String(identificadorExtraColunaVal).trim().toUpperCase();
      const idValLimpo = this._limparCPF(idVal);

      const candidatos = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .where(function() {
          // Busca exata pelo identificador no CPF, Email, Nome ou no campo Identificador Extra
          this.whereRaw('UPPER(cpf) = ?', [idVal])
              .orWhereRaw('UPPER(email) = ?', [idVal])
              .orWhereRaw('UPPER(nome) = ?', [idVal])
              .orWhereRaw('UPPER(identificador_extra) = ?', [idVal]);

          if (idValLimpo && idValLimpo.length === 11) {
            this.orWhere(db.raw("REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?", [idValLimpo]));
          }
        });

      if (candidatos.length > 0) {
        // Se houver múltiplos candidatos com o identificador correspondente, filtra pelo nome se coincidir
        if (nome) {
          const nomeBusca = String(nome).trim().toUpperCase();
          const matchExato = candidatos.find(c => String(c.nome).trim().toUpperCase() === nomeBusca);
          if (matchExato) return matchExato;
        }
        return candidatos[0]; // Retorna o primeiro encontrado
      }
    }

    // 2. Tentar buscar por CRECI se estiver presente (fallback legado de creci)
    if (creci) {
      const c = String(creci).trim().toUpperCase();
      const corretor = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .where(function() {
          this.whereRaw('UPPER(cpf) = ?', [c])
              .orWhereRaw('UPPER(nome) = ?', [c])
              .orWhereRaw('UPPER(identificador_extra) = ?', [c]);
        })
        .first();
      if (corretor) return corretor;
    }

    // 3. Tentar por CPF (se o identificador se parecer com CPF)
    const cpfLimpo = this._limparCPF(nome);
    if (cpfLimpo.length === 11) {
      const corretor = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .andWhere(db.raw("REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?", [cpfLimpo]))
        .first();
      if (corretor) return corretor;
    }

    // 4. Tentar por Nome (Case-Insensitive)
    if (nome) {
      const nomeBusca = String(nome).trim().toUpperCase();
      
      // Detecção de ambiguidade: verifica se há múltiplos corretores com o mesmo nome na mesma empresa
      const corretoresComNome = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .andWhereRaw('UPPER(nome) = ?', [nomeBusca]);

      if (corretoresComNome.length === 1) {
        return corretoresComNome[0];
      } else if (corretoresComNome.length > 1) {
        // Ambiguidade! Retornamos uma marcação especial informando que há candidatos
        return {
          ambiguous: true,
          candidatos: corretoresComNome.map(c => ({ id: c.id, nome: c.nome, email: c.email, cpf: c.cpf }))
        };
      }
    }

    return null;
  }

  // Parser de valores numÃ©ricos
  _parseMoeda(valor) {
    if (valor === undefined || valor === null) return 0;
    if (typeof valor === 'number') return valor;
    
    // Se for string, limpa pontuaÃ§Ã£o de moeda brasileira/americana
    let str = String(valor).trim();
    if (!str) return 0;
    
    // Remove "R$", espaÃ§os, etc.
    str = str.replace(/R\$\s*/g, '');
    
    // Se contiver vÃ­rgula e ponto, ex: 1.000,50 -> 1000.50
    if (str.includes('.') && str.includes(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      // Se contiver apenas vÃ­rgula, ex: 1000,50 -> 1000.50
      str = str.replace(',', '.');
    }
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  // Processa as datas e valores de balÃµes futuros
  _parseBaloes(rowValores, separador, fatorConversao = 100, formatoData = 'DD/MM/YYYY') {
    const { balao_datas_raw, balao_valor_raw, balao_qtd_raw } = rowValores;
    
    if (!balao_datas_raw) return [];
    
    const datas = String(balao_datas_raw)
      .split(separador || '|')
      .map(d => d.trim())
      .filter(d => d);
      
    if (datas.length === 0) return [];
    
    const valorTotalBalao = this._parseMoeda(balao_valor_raw);
    const qtdBaloes = parseInt(balao_qtd_raw, 10) || datas.length;
    
    const valorUnitarioRs = valorTotalBalao / qtdBaloes;
    const valorUnitarioTalentos = Math.floor(valorUnitarioRs / fatorConversao);
    
    return datas.map(dataStr => {
      let dataVencimento = null;
      
      if (formatoData === 'DD/MM/YYYY' || formatoData === 'MM/DD/YYYY') {
        const partes = dataStr.split(/[\/\-\.]/); // suporta /, -, .
        if (partes.length === 3) {
          if (formatoData === 'DD/MM/YYYY') {
            dataVencimento = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
          } else {
            dataVencimento = new Date(parseInt(partes[2], 10), parseInt(partes[0], 10) - 1, parseInt(partes[1], 10));
          }
        } else {
           const parsed = Date.parse(dataStr);
           if (!isNaN(parsed)) dataVencimento = new Date(parsed);
        }
      } else {
        const parsed = Date.parse(dataStr);
        if (!isNaN(parsed)) dataVencimento = new Date(parsed);
      }
      
      return {
        data_vencimento: dataVencimento,
        valor_rs: valorUnitarioRs,
        valor_talentos: valorUnitarioTalentos
      };
    });
  }

  async previewImportacao(empresa_id, fileBase64, perfil_id) {
    const perfil = await this.obterPerfil(empresa_id, perfil_id);
    if (!perfil) {
      throw new Error('Perfil de importaÃ§Ã£o nÃ£o encontrado');
    }

    const rawRows = this._lerPlanilhaBase64(fileBase64);
    const cabecalho0Based = Math.max(0, perfil.linha_cabecalho - 1);
    
    if (rawRows.length <= cabecalho0Based) {
      throw new Error('A planilha estÃ¡ vazia ou a linha do cabeÃ§alho estÃ¡ fora dos limites');
    }

    const headers = rawRows[cabecalho0Based];
    if (!headers || !Array.isArray(headers)) {
      throw new Error('CabeÃ§alho da planilha nÃ£o localizado na linha configurada');
    }

    const headerIndices = {};
    headers.forEach((h, idx) => {
      if (h) headerIndices[String(h).trim().toUpperCase()] = idx;
    });

    const mapeamento = perfil.mapeamento_json;
    
    // Mapeia chaves para facilitar a extraÃ§Ã£o
    const fieldsToExtract = {
      corretor_identificador: String(mapeamento.corretor_identificador || '').trim().toUpperCase(),
      corretor_creci: String(mapeamento.corretor_creci || '').trim().toUpperCase(),
      valor_venda: String(mapeamento.valor_venda || '').trim().toUpperCase(),
      valor_pago: String(mapeamento.valor_pago || '').trim().toUpperCase(),
      empreendimento: String(mapeamento.empreendimento || '').trim().toUpperCase(),
      unidade: String(mapeamento.unidade || '').trim().toUpperCase(),
      cliente_nome: String(mapeamento.cliente_nome || '').trim().toUpperCase(),
      balao_valor: String(mapeamento.balao_valor || '').trim().toUpperCase(),
      balao_datas: String(mapeamento.balao_datas || '').trim().toUpperCase(),
      balao_qtd: String(mapeamento.balao_qtd || '').trim().toUpperCase()
    };

    // Valida se as colunas essenciais mapeadas existem no arquivo
    const colunasObrigatorias = ['corretor_identificador', 'valor_venda', 'valor_pago', 'empreendimento'];
    colunasObrigatorias.forEach(col => {
      const colNameInFile = mapeamento[col];
      if (!colNameInFile) {
        throw new Error(`Coluna obrigatÃ³ria de mapeamento '${col}' nÃ£o foi configurada no perfil.`);
      }
      if (headerIndices[colNameInFile.trim().toUpperCase()] === undefined) {
        throw new Error(`A coluna configurada '${colNameInFile}' nÃ£o existe no cabeÃ§alho da planilha.`);
      }
    });

    const dataRows = rawRows.slice(cabecalho0Based + 1);
    const resultadoRows = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      // Pula linhas vazias
      if (!row || row.length === 0 || row.every(val => val === null || val === '')) {
        continue;
      }

      const getVal = (mappedField) => {
        const colIdx = headerIndices[fieldsToExtract[mappedField]];
        return colIdx !== undefined ? row[colIdx] : null;
      };

      const rawCorretor = getVal('corretor_identificador');
      const rawCreci = getVal('corretor_creci');
      const rawValorVenda = getVal('valor_venda');
      const rawValorPago = getVal('valor_pago');
      const rawEmpreendimento = getVal('empreendimento');
      const rawUnidade = getVal('unidade');
      const rawCliente = getVal('cliente_nome');

      // Pula linhas de Totais, Legendas ou sem corretor
      if (!rawCorretor || String(rawCorretor).trim() === '' || String(rawCorretor).trim().toUpperCase() === 'TOTAIS' || (rawCliente && String(rawCliente).trim().toUpperCase() === 'TOTAIS')) {
        continue;
      }

      const idCol = perfil.identificador_extra_coluna ? String(perfil.identificador_extra_coluna).trim().toUpperCase() : null;
      const rawIdentificadorExtra = idCol && headerIndices[idCol] !== undefined ? row[headerIndices[idCol]] : null;

      const corretor = await this._buscarCorretor(empresa_id, rawCorretor, rawCreci, rawIdentificadorExtra);
      const isAmbiguous = corretor && corretor.ambiguous;

      const valorVendaRs = this._parseMoeda(rawValorVenda);
      const valorPagoRs = this._parseMoeda(rawValorPago);
      
      const fatorConversao = parseFloat(perfil.fator_conversao) || 100;
      
      const totalTalentos = Math.floor(valorVendaRs / fatorConversao);
      const talentosDisponiveis = Math.floor(valorPagoRs / fatorConversao);
      const talentosAReceber = totalTalentos - talentosDisponiveis;

      // Balões
      const baloesValores = {
        balao_datas_raw: getVal('balao_datas'),
        balao_valor_raw: getVal('balao_valor'),
        balao_qtd_raw: getVal('balao_qtd')
      };
      const baloesCalculados = this._parseBaloes(baloesValores, perfil.separador_multiplo, fatorConversao, perfil.formato_data_balao);
      const somaBaloesTalentos = baloesCalculados.reduce((acc, curr) => acc + curr.valor_talentos, 0);

      // Extração de campos extras configurados no perfil
      const dadosExtras = {
        fator_conversao_utilizado: fatorConversao
      };
      if (perfil.campos_extras && Array.isArray(perfil.campos_extras)) {
        perfil.campos_extras.forEach(extra => {
          if (extra && extra.coluna) {
            const extColName = String(extra.coluna).trim().toUpperCase();
            if (headerIndices[extColName] !== undefined) {
              const val = row[headerIndices[extColName]];
              dadosExtras[extra.label || extra.coluna] = val !== undefined ? val : null;
            }
          }
        });
      }

      resultadoRows.push({
        linha: cabecalho0Based + 2 + i, // 1-based no arquivo original
        corretor_nome_planilha: rawCorretor,
        corretor_creci_planilha: rawCreci,
        identificador_extra_planilha: rawIdentificadorExtra,
        empreendimento: rawEmpreendimento || 'Desconhecido',
        unidade: rawUnidade || 'Geral',
        cliente_nome: rawCliente || 'Não Informado',
        valores: {
          valor_venda_rs: valorVendaRs,
          valor_pago_rs: valorPagoRs,
          total_talentos: totalTalentos,
          talentos_disponiveis: talentosDisponiveis,
          talentos_a_receber: Math.max(0, talentosAReceber)
        },
        baloes: baloesCalculados,
        corretor_encontrado: !!corretor && !isAmbiguous,
        corretor_id: (corretor && !isAmbiguous) ? corretor.id : null,
        corretor_nome_sistema: (corretor && !isAmbiguous) ? corretor.nome : null,
        corretor_email_sistema: (corretor && !isAmbiguous) ? corretor.email : null,
        ambiguous: !!isAmbiguous,
        candidatos: isAmbiguous ? corretor.candidatos : [],
        dados_extras: Object.keys(dadosExtras).length > 0 ? dadosExtras : null
      });
    }

    return {
      total_linhas: resultadoRows.length,
      colunas_detectadas: Object.keys(headerIndices),
      linhas: resultadoRows,
      inconsistencias: resultadoRows.filter(r => !r.corretor_encontrado).length
    };
  }

  async confirmarImportacao(empresa_id, admin_id, fileBase64, perfil_id, resolucoes = {}) {
    const preview = await this.previewImportacao(empresa_id, fileBase64, perfil_id);

    // Aplicar resolucões manuais de ambiguidade (admin escolheu o corretor correto)
    for (const row of preview.linhas) {
      const resolucaoId = resolucoes[row.linha];
      if (resolucaoId && (!row.corretor_encontrado || row.ambiguous)) {
        // Verifica se o corretor existe no tenant
        const corretor = await db('GamUsuario')
          .where({ id: resolucaoId, empresa_id, perfil: 'CORRETOR' })
          .first();
        if (corretor) {
          row.corretor_encontrado = true;
          row.ambiguous = false;
          row.corretor_id = corretor.id;
          row.corretor_nome_sistema = corretor.nome;
          row.corretor_email_sistema = corretor.email;
          row.candidatos = [];
        }
      }
    }

    // Recalcular inconsistências após resolucões
    const inconsistenciasRestantes = preview.linhas.filter(r => !r.corretor_encontrado).length;
    if (inconsistenciasRestantes > 0) {
      throw new Error(`Existem ${inconsistenciasRestantes} corretores não localizados ou com nomes ambíguos no sistema. Cadastre-os ou resolva-os antes de efetuar a importação definitiva.`);
    }

    const resultadoProcessado = await db.transaction(async (trx) => {
      let transacoesCriadas = 0;
      const corretoresAfetados = new Set();

      for (const row of preview.linhas) {
        const corretorId = row.corretor_id;
        corretoresAfetados.add(corretorId);

        const transacaoId = crypto.randomUUID();
        const justificativaBase = `Importação - ${row.empreendimento} ${row.unidade} - Cliente: ${row.cliente_nome}`;
        const dadosExtrasStr = row.dados_extras ? JSON.stringify(row.dados_extras) : null;

        // 1. Criar transação COMPENSADA para os Talentos já pagos (disponíveis)
        if (row.valores.talentos_disponiveis > 0) {
          await trx('GamTransacao').insert({
            id: transacaoId,
            empresa_id,
            usuario_id: corretorId,
            admin_id: admin_id || null,
            valor: row.valores.talentos_disponiveis,
            tipo: 'CREDITO',
            origem: 'IMPORTACAO',
            justificativa: `${justificativaBase} (Compensado/Entrada)`,
            valor_original_rs: row.valores.valor_pago_rs,
            status: 'COMPENSADO',
            data_vencimento: null,
            empreendimento: row.empreendimento,
            unidade: row.unidade,
            contato_cliente: row.cliente_nome,
            origem_id: `row-${row.linha}-compensado`,
            dados_extras: dadosExtrasStr,
            data_compensacao: trx.fn.now(),
            created_at: trx.fn.now()
          });
          transacoesCriadas++;
        }

        // 2. Criar transações PENDENTES para os Balões Futuros
        let totalBaloesTalentos = 0;
        for (let idxB = 0; idxB < row.baloes.length; idxB++) {
          const bal = row.baloes[idxB];
          totalBaloesTalentos += bal.valor_talentos;

          const balTransacaoId = crypto.randomUUID();
          await trx('GamTransacao').insert({
            id: balTransacaoId,
            empresa_id,
            usuario_id: corretorId,
            admin_id: admin_id || null,
            valor: bal.valor_talentos,
            tipo: 'CREDITO',
            origem: 'IMPORTACAO',
            justificativa: `${justificativaBase} (Balão ${idxB + 1}/${row.baloes.length})`,
            valor_original_rs: bal.valor_rs,
            status: 'PENDENTE',
            data_vencimento: bal.data_vencimento ? bal.data_vencimento.toISOString() : null,
            empreendimento: row.empreendimento,
            unidade: row.unidade,
            contato_cliente: row.cliente_nome,
            origem_id: `row-${row.linha}-balao-${idxB + 1}`,
            dados_extras: dadosExtrasStr,
            data_compensacao: null,
            created_at: trx.fn.now()
          });
          transacoesCriadas++;
        }

        // 3. Criar transação PENDENTE genérica para o saldo remanescente a receber (ex: parcelas mensais futuras)
        const saldoRemanescenteAReceber = row.valores.talentos_a_receber - totalBaloesTalentos;
        if (saldoRemanescenteAReceber > 0) {
          const remTransacaoId = crypto.randomUUID();
          await trx('GamTransacao').insert({
            id: remTransacaoId,
            empresa_id,
            usuario_id: corretorId,
            admin_id: admin_id || null,
            valor: saldoRemanescenteAReceber,
            tipo: 'CREDITO',
            origem: 'IMPORTACAO',
            justificativa: `${justificativaBase} (Remanescente a Receber)`,
            valor_original_rs: (row.valores.valor_venda_rs - row.valores.valor_pago_rs) - (row.baloes.reduce((acc, c) => acc + c.valor_rs, 0)),
            status: 'PENDENTE',
            data_vencimento: null, // Sem vencimento fixo (mensais pulverizadas)
            empreendimento: row.empreendimento,
            unidade: row.unidade,
            contato_cliente: row.cliente_nome,
            origem_id: `row-${row.linha}-remanescente`,
            dados_extras: dadosExtrasStr,
            data_compensacao: null,
            created_at: trx.fn.now()
          });
          transacoesCriadas++;
        }
      }

      // 4. Recalcular e atualizar saldos de todos os corretores afetados no banco de dados
      for (const corretorId of corretoresAfetados) {
        // Soma todas as transaÃ§Ãµes COMPENSADAS de crÃ©dito, subtrai dÃ©bitos manuais
        const transacoesDoCorretor = await trx('GamTransacao')
          .where({ usuario_id: corretorId });

        let novoDisponivel = 0;
        let novoAReceber = 0;

        transacoesDoCorretor.forEach(t => {
          const valorNum = parseFloat(t.valor);
          if (t.status === 'COMPENSADO') {
            if (t.tipo === 'CREDITO') novoDisponivel += valorNum;
            else if (t.tipo === 'DEBITO') novoDisponivel -= valorNum;
            else if (t.tipo === 'ESTORNO') novoDisponivel += valorNum; // Estorno adiciona/subtrai direto baseado no sinal
          } else if (t.status === 'PENDENTE') {
            if (t.tipo === 'CREDITO') novoAReceber += valorNum;
            else if (t.tipo === 'DEBITO') novoAReceber -= valorNum;
          }
        });

        await trx('GamUsuario')
          .where({ id: corretorId })
          .update({
            saldo_disponivel: Math.max(0, novoDisponivel),
            saldo_a_receber: Math.max(0, novoAReceber),
            updated_at: trx.fn.now()
          });
      }

      return {
        sucesso: true,
        total_vendas_processadas: preview.total_linhas,
        transacoes_criadas: transacoesCriadas,
        corretores_atualizados: corretoresAfetados.size
      };
    });

    return resultadoProcessado;
  }
}

module.exports = new ImportacaoService();

