const db = require('../../infra/db');
const crypto = require('crypto');
const xlsx = require('xlsx');
const MotorImportacaoProgramavelService = require('./MotorImportacaoProgramavelService');

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

  async criarPerfil(empresa_id, { nome_perfil, mapeamento_json, separador_multiplo = '|', linha_cabecalho = 3, identificador_extra_coluna = null, campos_extras = null, fator_conversao = 100, formato_data_balao = 'DD/MM/YYYY', parcela_valor = null, parcela_qtd = null, parcela_data_inicio = null }) {
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
      parcela_valor,
      parcela_qtd,
      parcela_data_inicio,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return { id, nome_perfil };
  }

  async atualizarPerfil(empresa_id, id, { nome_perfil, mapeamento_json, separador_multiplo = '|', linha_cabecalho = 3, identificador_extra_coluna = null, campos_extras = null, fator_conversao = 100, formato_data_balao = 'DD/MM/YYYY', parcela_valor = null, parcela_qtd = null, parcela_data_inicio = null }) {
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
        parcela_valor,
        parcela_qtd,
        parcela_data_inicio,
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
      throw new Error('Perfil não encontrado para exclusão');
    }
    return { success: true };
  }

  // Analisa uma string base64 de planilha e retorna as linhas brutas
  _lerPlanilhaBase64(fileBase64) {
    try {
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
      corretor_identificador: ['corretor', 'nome corretor', 'cpf', 'corretor responsavel', 'corretor identificador', 'corretor responsável'],
      corretor_creci: ['creci', 'registro profissional', 'creci corretor'],
      valor_venda: ['valor venda', 'valor total', 'total venda', 'venda r$', 'valor da venda'],
      valor_pago: ['valor pago', 'pago atual', 'valor pago atual', 'valor recebido', 'valor recebido r$'],
      empreendimento: ['empreendimento', 'empreendimento unidade', 'empreendimento / unidade'],
      unidade: ['unidade', 'imovel', 'imóvel'],
      cliente_nome: ['cliente', 'nome cliente', 'nome do cliente', 'comprador'],
      balao_valor: ['balao valor', 'balão valor', 'valor balao', 'valor balão', 'valor reforco', 'valor reforço'],
      balao_datas: ['balao datas', 'balão datas', 'datas balao', 'datas balão', 'datas reforco', 'datas reforço'],
      balao_qtd: ['balao qtd', 'balão qtd', 'qtde balao', 'qtde balão', 'quantidade baloes', 'quantidade balões', 'qtd reforco', 'qtd reforço']
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
      throw new Error('O campo fileBase64 é obrigatório');
    }

    const rawRows = this._lerPlanilhaBase64(fileBase64);
    const cabecalho0Based = Math.max(0, parseInt(linha_cabecalho, 10) - 1 || 0);

    if (rawRows.length <= cabecalho0Based) {
      throw new Error('A planilha está vazia ou a linha do cabeçalho está fora dos limites');
    }

    const headers = rawRows[cabecalho0Based];
    if (!headers || !Array.isArray(headers)) {
      throw new Error('Cabeçalho da planilha não localizado na linha configurada');
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

  async _buscarCorretor(empresa_id, nome, creci) {
    if (creci) {
      const idVal = String(creci).trim().toUpperCase();
      const idValLimpo = this._limparCPF(idVal);

      const candidatos = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .where(function() {
          this.whereRaw('UPPER(cpf) = ?', [idVal])
              .orWhereRaw('UPPER(email) = ?', [idVal])
              .orWhereRaw('UPPER(identificador_extra) = ?', [idVal]);

          if (idValLimpo && idValLimpo.length === 11) {
            this.orWhere(db.raw("REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?", [idValLimpo]));
          }
        });

      if (candidatos.length > 0) {
        if (nome) {
          const nomeBusca = String(nome).trim().toUpperCase();
          const matchExato = candidatos.find(c => String(c.nome).trim().toUpperCase() === nomeBusca);
          if (matchExato) return matchExato;
        }
        return candidatos[0];
      }
    }

    const cpfLimpo = this._limparCPF(nome);
    if (cpfLimpo.length === 11) {
      const corretor = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .andWhere(db.raw("REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?", [cpfLimpo]))
        .first();
      if (corretor) return corretor;
    }

    if (nome) {
      const nomeBusca = String(nome).trim().toUpperCase();
      const corretoresComNome = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .andWhereRaw('UPPER(nome) = ?', [nomeBusca]);

      if (corretoresComNome.length === 1) {
        return corretoresComNome[0];
      } else if (corretoresComNome.length > 1) {
        return {
          ambiguous: true,
          candidatos: corretoresComNome.map(c => ({ id: c.id, nome: c.nome, email: c.email, cpf: c.cpf }))
        };
      }
    }

    return null;
  }

  _parseMoeda(valor) {
    if (valor === undefined || valor === null) return 0;
    if (typeof valor === 'number') return valor;
    
    let str = String(valor).trim();
    if (!str) return 0;
    
    str = str.replace(/R\$\s*/g, '');
    
    if (str.includes('.') && str.includes(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  _parseBaloes(rowValores, separador, fatorConversao = 100, formatoData = 'DD/MM/YYYY') {
    const { balao_datas_raw, balao_valor_raw, balao_qtd_raw } = rowValores;
    
    if (!balao_datas_raw) return [];
    
    const datas = String(balao_datas_raw)
      .split(separador || '|')
      .map(d => d.trim())
      .filter(d => d);
      
    if (datas.length === 0) return [];
    
    const valorUnitarioRs = this._parseMoeda(balao_valor_raw);
    const valorUnitarioTalentos = Math.floor(valorUnitarioRs / fatorConversao);
    
    return datas.map(dataStr => {
      let dataVencimento = null;
      
      if (formatoData === 'DD/MM/YYYY' || formatoData === 'MM/DD/YYYY') {
        const partes = dataStr.split(/[\/\-\.]/);
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

  _parseParcelas(rawQtd, rawValorRs, rawDataInicio, formatoData, fatorConversao = 100) {
    const qtd = parseInt(rawQtd, 10);
    if (isNaN(qtd) || qtd <= 0) return [];
    
    const valorUnitarioRs = this._parseMoeda(rawValorRs);
    if (valorUnitarioRs <= 0) return [];

    let dataInicio = null;
    const dataStr = String(rawDataInicio || '').trim();
    if (dataStr) {
      if (formatoData === 'DD/MM/YYYY' || formatoData === 'MM/DD/YYYY') {
        const partes = dataStr.split(/[\/\-\.]/);
        if (partes.length === 3) {
          if (formatoData === 'DD/MM/YYYY') {
            dataInicio = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
          } else {
            dataInicio = new Date(parseInt(partes[2], 10), parseInt(partes[0], 10) - 1, parseInt(partes[1], 10));
          }
        } else {
          const parsed = Date.parse(dataStr);
          if (!isNaN(parsed)) dataInicio = new Date(parsed);
        }
      } else {
        const parsed = Date.parse(dataStr);
        if (!isNaN(parsed)) dataInicio = new Date(parsed);
      }
    }

    if (!dataInicio || isNaN(dataInicio.getTime())) {
      dataInicio = new Date();
    }

    const valorUnitarioTalentos = Math.floor(valorUnitarioRs / fatorConversao);
    const parcelas = [];

    for (let i = 0; i < qtd; i++) {
      const dataVencimento = new Date(dataInicio.getTime());
      dataVencimento.setMonth(dataVencimento.getMonth() + i);

      parcelas.push({
        data_vencimento: dataVencimento,
        valor_rs: valorUnitarioRs,
        valor_talentos: valorUnitarioTalentos
      });
    }

    return parcelas;
  }

  async previewImportacao(empresa_id, fileBase64, perfil_id, modo = 'CONTRATOS') {
    const perfil = await this.obterPerfil(empresa_id, perfil_id);
    if (!perfil) {
      throw new Error('Perfil de importação não encontrado');
    }

    const rawRows = this._lerPlanilhaBase64(fileBase64);
    const cabecalho0Based = Math.max(0, perfil.linha_cabecalho - 1);
    
    if (rawRows.length <= cabecalho0Based) {
      throw new Error('A planilha está vazia ou a linha do cabeçalho está fora dos limites');
    }

    const headers = rawRows[cabecalho0Based];
    if (!headers || !Array.isArray(headers)) {
      throw new Error('Cabeçalho da planilha não localizado na linha configurada');
    }

    const headerIndices = {};
    headers.forEach((h, idx) => {
      if (h) headerIndices[String(h).trim().toUpperCase()] = idx;
    });

    const mapeamento = perfil.mapeamento_json;
    
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

    let colunasObrigatorias = ['corretor_identificador', 'valor_pago'];
    if (modo !== 'BAIXAS') {
      colunasObrigatorias.push('valor_venda', 'empreendimento');
    }
    
    colunasObrigatorias.forEach(col => {
      const colNameInFile = mapeamento[col];
      if (!colNameInFile) {
        throw new Error(`Coluna obrigatória de mapeamento '${col}' não foi configurada no perfil.`);
      }
      if (headerIndices[colNameInFile.trim().toUpperCase()] === undefined) {
        throw new Error(`A coluna configurada '${colNameInFile}' não existe no cabeçalho da planilha.`);
      }
    });

    const dataRows = rawRows.slice(cabecalho0Based + 1);
    const resultadoRows = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
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

      if (!rawCorretor || String(rawCorretor).trim() === '' || String(rawCorretor).trim().toUpperCase() === 'TOTAIS' || (rawCliente && String(rawCliente).trim().toUpperCase() === 'TOTAIS')) {
        continue;
      }

      const corretor = await this._buscarCorretor(empresa_id, rawCorretor, rawCreci);
      const isAmbiguous = corretor && corretor.ambiguous;

      const valorVendaRs = this._parseMoeda(rawValorVenda);
      const valorPagoRs = this._parseMoeda(rawValorPago);
      
      const fatorConversao = parseFloat(perfil.fator_conversao) || 100;
      
      const totalTalentos = Math.floor(valorVendaRs / fatorConversao);
      const talentosDisponiveis = Math.floor(valorPagoRs / fatorConversao);
      const talentosAReceber = totalTalentos - talentosDisponiveis;

      let baloesCalculados = [];
      let parcelasCalculadas = [];

      const getValByName = (colNameInFile) => {
        if (!colNameInFile) return null;
        const colIdx = headerIndices[String(colNameInFile).trim().toUpperCase()];
        return colIdx !== undefined ? row[colIdx] : null;
      };
      
      if (modo !== 'BAIXAS') {
        const baloesValores = {
          balao_datas_raw: getVal('balao_datas'),
          balao_valor_raw: getVal('balao_valor'),
          balao_qtd_raw: getVal('balao_qtd')
        };
        baloesCalculados = this._parseBaloes(baloesValores, perfil.separador_multiplo, fatorConversao, perfil.formato_data_balao);
        
        const rawParcelaQtd = getValByName(perfil.parcela_qtd);
        const rawParcelaValor = getValByName(perfil.parcela_valor);
        const rawParcelaData = getValByName(perfil.parcela_data_inicio);
        parcelasCalculadas = this._parseParcelas(rawParcelaQtd, rawParcelaValor, rawParcelaData, perfil.formato_data_balao, fatorConversao);
      }

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
        linha: cabecalho0Based + 2 + i,
        corretor_nome_planilha: rawCorretor,
        corretor_creci_planilha: rawCreci,
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
        parcelas: parcelasCalculadas,
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

  async confirmarImportacao(empresa_id, admin_id, fileBase64, perfil_id, resolucoes = {}, modo = 'CONTRATOS') {
    const preview = await this.previewImportacao(empresa_id, fileBase64, perfil_id, modo);

    for (const row of preview.linhas) {
      const resolucaoId = resolucoes[row.linha];
      if (resolucaoId && (!row.corretor_encontrado || row.ambiguous)) {
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

        if (modo === 'BAIXAS') {
          let saldoPagarTalentos = row.valores.talentos_disponiveis;
          if (saldoPagarTalentos <= 0) continue;

          const pendentes = await trx('GamTransacao')
            .where({ empresa_id, usuario_id: corretorId, status: 'PENDENTE' })
            .orderByRaw('data_vencimento IS NULL ASC, data_vencimento ASC, created_at ASC');
          
          for (const pend of pendentes) {
            if (saldoPagarTalentos <= 0) break;

            if (saldoPagarTalentos >= pend.valor) {
              await trx('GamTransacao')
                .where({ id: pend.id })
                .update({
                  status: 'COMPENSADO',
                  data_compensacao: trx.fn.now(),
                  justificativa: `${pend.justificativa} (Liquidado via Planilha)`
                });
              saldoPagarTalentos -= pend.valor;
              transacoesCriadas++;
            } else {
              await trx('GamTransacao')
                .where({ id: pend.id })
                .update({
                  valor: pend.valor - saldoPagarTalentos,
                  valor_original_rs: pend.valor_original_rs ? (pend.valor_original_rs * ((pend.valor - saldoPagarTalentos) / pend.valor)) : null
                });
              
              const parTransacaoId = crypto.randomUUID();
              await trx('GamTransacao').insert({
                id: parTransacaoId,
                empresa_id: pend.empresa_id,
                usuario_id: pend.usuario_id,
                admin_id: admin_id || null,
                valor: saldoPagarTalentos,
                tipo: 'CREDITO',
                origem: 'IMPORTACAO',
                justificativa: `${pend.justificativa} (Baixa Parcial)`,
                valor_original_rs: pend.valor_original_rs ? (pend.valor_original_rs * (saldoPagarTalentos / pend.valor)) : null,
                status: 'COMPENSADO',
                data_vencimento: pend.data_vencimento,
                empreendimento: pend.empreendimento,
                unidade: pend.unidade,
                contato_cliente: pend.contato_cliente,
                origem_id: `row-${row.linha}-baixa-parcial`,
                dados_extras: pend.dados_extras,
                data_compensacao: trx.fn.now(),
                created_at: trx.fn.now()
              });
              
              saldoPagarTalentos = 0;
              transacoesCriadas++;
            }
          }
          
          if (saldoPagarTalentos > 0) {
            const extraTransacaoId = crypto.randomUUID();
            await trx('GamTransacao').insert({
              id: extraTransacaoId,
              empresa_id,
              usuario_id: corretorId,
              admin_id: admin_id || null,
              valor: saldoPagarTalentos,
              tipo: 'CREDITO',
              origem: 'IMPORTACAO',
              justificativa: `Baixa via Planilha - Recebimento Avulso`,
              valor_original_rs: row.valores.valor_pago_rs,
              status: 'COMPENSADO',
              data_vencimento: null,
              empreendimento: row.empreendimento,
              unidade: row.unidade,
              contato_cliente: row.cliente_nome,
              origem_id: `row-${row.linha}-baixa-avulsa`,
              dados_extras: dadosExtrasStr,
              data_compensacao: trx.fn.now(),
              created_at: trx.fn.now()
            });
            transacoesCriadas++;
          }
        } else {
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

          let totalParcelasTalentos = 0;
          let totalParcelasRs = 0;
          if (row.parcelas && Array.isArray(row.parcelas)) {
            for (let idxP = 0; idxP < row.parcelas.length; idxP++) {
              const par = row.parcelas[idxP];
              totalParcelasTalentos += par.valor_talentos;
              totalParcelasRs += par.valor_rs;

              const parTransacaoId = crypto.randomUUID();
              await trx('GamTransacao').insert({
                id: parTransacaoId,
                empresa_id,
                usuario_id: corretorId,
                admin_id: admin_id || null,
                valor: par.valor_talentos,
                tipo: 'CREDITO',
                origem: 'IMPORTACAO',
                justificativa: `${justificativaBase} (Parcela ${idxP + 1}/${row.parcelas.length})`,
                valor_original_rs: par.valor_rs,
                status: 'PENDENTE',
                data_vencimento: par.data_vencimento ? par.data_vencimento.toISOString() : null,
                empreendimento: row.empreendimento,
                unidade: row.unidade,
                contato_cliente: row.cliente_nome,
                origem_id: `row-${row.linha}-parcela-${idxP + 1}`,
                dados_extras: dadosExtrasStr,
                data_compensacao: null,
                created_at: trx.fn.now()
              });
              transacoesCriadas++;
            }
          }

          const saldoRemanescenteAReceber = row.valores.talentos_a_receber - totalBaloesTalentos - totalParcelasTalentos;
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
              valor_original_rs: (row.valores.valor_venda_rs - row.valores.valor_pago_rs) - (row.baloes.reduce((acc, c) => acc + c.valor_rs, 0)) - totalParcelasRs,
              status: 'PENDENTE',
              data_vencimento: null,
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
      }

      for (const corretorId of corretoresAfetados) {
        const transacoesDoCorretor = await trx('GamTransacao')
          .where({ usuario_id: corretorId });

        let novoDisponivel = 0;
        let novoAReceber = 0;

        transacoesDoCorretor.forEach(t => {
          const valorNum = parseFloat(t.valor);
          if (t.status === 'COMPENSADO') {
            if (t.tipo === 'CREDITO') novoDisponivel += valorNum;
            else if (t.tipo === 'DEBITO') novoDisponivel -= valorNum;
            else if (t.tipo === 'ESTORNO') novoDisponivel += valorNum;
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

  async previewImportacaoProgramavel(empresa_id, fileBase64, perfil_id) {
    const perfil = await this.obterPerfil(empresa_id, perfil_id);
    if (!perfil) {
      throw new Error('Perfil de importação não encontrado');
    }

    const rawRows = this._lerPlanilhaBase64(fileBase64);
    const cabecalho0Based = Math.max(0, perfil.linha_cabecalho - 1);
    
    if (rawRows.length <= cabecalho0Based) {
      throw new Error('A planilha está vazia ou a linha do cabeçalho está fora dos limites');
    }

    const headers = rawRows[cabecalho0Based];
    if (!headers || !Array.isArray(headers)) {
      throw new Error('Cabeçalho da planilha não localizado na linha configurada');
    }

    const mappedRows = [];
    const dataRows = rawRows.slice(cabecalho0Based + 1);
    
    for (const row of dataRows) {
      if (!row || row.length === 0 || row.every(val => val === null || val === '')) {
        continue;
      }
      
      const mappedRow = {};
      row.forEach((cellVal, idx) => {
        const letter = String.fromCharCode(65 + idx);
        mappedRow[letter] = cellVal;
      });
      mappedRows.push(mappedRow);
    }

    const motor = new MotorImportacaoProgramavelService(perfil.mapeamento_json);
    const { resultados, logs } = await motor.processar(mappedRows);

    const resultadoRows = [];
    for (const res of resultados) {
      const linhaResult = res.dados;
      const numeroLinha = cabecalho0Based + 2 + (res.linha - 1);

      let resolvedNome = '';
      let resolvedCreci = '';

      const nomeKeys = ['parceiro', 'consultor', 'nome', 'corretor', 'nome_consultor', 'nome_parceiro', 'colaborador'];
      for (const key of Object.keys(linhaResult)) {
        if (nomeKeys.includes(key.toLowerCase().trim())) {
          resolvedNome = String(linhaResult[key] || '');
          break;
        }
      }

      const creciKeys = ['creci', 'idprofissional', 'id_profissional', 'cpf', 'matricula', 'email', 'identificadorextra', 'identificador_extra', 'documento'];
      for (const key of Object.keys(linhaResult)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (creciKeys.includes(normalizedKey)) {
          resolvedCreci = String(linhaResult[key] || '');
          break;
        }
      }

      const corretor = await this._buscarCorretor(empresa_id, resolvedNome, resolvedCreci);
      const isAmbiguous = corretor && corretor.ambiguous;

      resultadoRows.push({
        linha: numeroLinha,
        dados: linhaResult,
        corretor_encontrado: !!corretor && !isAmbiguous,
        corretor_id: (corretor && !isAmbiguous) ? corretor.id : null,
        corretor_nome_sistema: (corretor && !isAmbiguous) ? corretor.nome : null,
        corretor_email_sistema: (corretor && !isAmbiguous) ? corretor.email : null,
        ambiguous: !!isAmbiguous,
        candidatos: isAmbiguous ? corretor.candidatos : []
      });
    }

    const colunasDetectadas = headers.map(h => (h === null || h === undefined ? '' : String(h).trim()));

    return {
      total_linhas: resultadoRows.length,
      colunas_detectadas: colunasDetectadas,
      linhas: resultadoRows,
      logs,
      inconsistencias: resultadoRows.filter(r => !r.corretor_encontrado).length
    };
  }

  async confirmarImportacaoProgramavel(empresa_id, admin_id, fileBase64, perfil_id, resolucoes = {}) {
    const preview = await this.previewImportacaoProgramavel(empresa_id, fileBase64, perfil_id);

    for (const row of preview.linhas) {
      const resolucaoId = resolucoes[row.linha];
      if (resolucaoId && (!row.corretor_encontrado || row.ambiguous)) {
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

    const inconsistenciasRestantes = preview.linhas.filter(r => !r.corretor_encontrado).length;
    if (inconsistenciasRestantes > 0) {
      throw new Error(`Existem ${inconsistenciasRestantes} parceiros não localizados ou com nomes ambíguos no sistema. Cadastre-os ou resolva-os antes de efetuar a importação definitiva.`);
    }

    const resultadoProcessado = await db.transaction(async (trx) => {
      let transacoesCriadas = 0;
      const corretoresAfetados = new Set();

      for (const row of preview.linhas) {
        const corretorId = row.corretor_id;
        corretoresAfetados.add(corretorId);

        const linhaResult = row.dados;
        const justificativaBase = `Importação Programável - Linha ${row.linha}`;
        const dadosExtrasStr = JSON.stringify(linhaResult);

        let transacoes = [];
        const transacoesKeys = ['transacoes', 'transacoes_geradas', 'transacoesgeradas', 'movimentacoes'];
        
        for (const key of Object.keys(linhaResult)) {
          if (transacoesKeys.includes(key.toLowerCase().trim())) {
            const val = linhaResult[key];
            if (Array.isArray(val)) {
              transacoes = val;
            } else if (typeof val === 'object' && val !== null) {
              transacoes = [val];
            }
            break;
          }
        }

        if (transacoes.length === 0) {
          let valor = 0;
          const valorKeys = ['valor', 'valortalentos', 'valor_talentos', 'valorpontos', 'valor_pontos'];
          for (const key of Object.keys(linhaResult)) {
            const norm = key.toLowerCase().replace(/[^a-z]/g, '');
            if (valorKeys.includes(norm)) {
              valor = parseFloat(linhaResult[key] || 0);
              break;
            }
          }

          if (valor === 0) {
            for (const key of Object.keys(linhaResult)) {
              const val = linhaResult[key];
              if (typeof val === 'number') {
                valor = val;
                break;
              }
            }
          }

          let tipo = 'CREDITO';
          if (linhaResult.tipo) tipo = String(linhaResult.tipo).toUpperCase();

          let status = 'COMPENSADO';
          if (linhaResult.status) status = String(linhaResult.status).toUpperCase();

          let data_vencimento = null;
          const vencKeys = ['datavencimento', 'data_vencimento', 'vencimento', 'data'];
          for (const key of Object.keys(linhaResult)) {
            const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (vencKeys.includes(norm)) {
              data_vencimento = linhaResult[key] ? String(linhaResult[key]) : null;
              break;
            }
          }

          let valor_original_rs = null;
          const origKeys = ['valororiginal', 'valor_original', 'valor_original_rs', 'valorvenda', 'valor_venda'];
          for (const key of Object.keys(linhaResult)) {
            const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (origKeys.includes(norm)) {
              valor_original_rs = parseFloat(linhaResult[key] || 0);
              break;
            }
          }

          const empreendimento = linhaResult.empreendimento || linhaResult.produto || linhaResult.servico || 'Geral';
          const unidade = linhaResult.unidade || linhaResult.contrato || linhaResult.ref_contrato || 'Geral';
          const contato_cliente = linhaResult.cliente || linhaResult.cliente_nome || linhaResult.contato_cliente || 'Não Informado';

          transacoes.push({
            valor,
            tipo,
            status,
            data_vencimento,
            valor_original_rs,
            empreendimento,
            unidade,
            contato_cliente,
            justificativa: linhaResult.justificativa || linhaResult.descricao || justificativaBase
          });
        }

        for (const t of transacoes) {
          const transacaoId = crypto.randomUUID();
          const tStatus = String(t.status || 'PENDENTE').toUpperCase();
          const tTipo = String(t.tipo || 'CREDITO').toUpperCase();
          
          let dtVenc = null;
          if (t.data_vencimento || t.vencimento) {
            const rawDt = t.data_vencimento || t.vencimento;
            if (rawDt instanceof Date) {
              dtVenc = rawDt.toISOString();
            } else if (typeof rawDt === 'string' && rawDt.trim() !== '') {
              if (rawDt.includes('/')) {
                const partes = rawDt.split('/');
                if (partes.length === 3) {
                  const d = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
                  if (!isNaN(d.getTime())) dtVenc = d.toISOString();
                }
              }
              if (!dtVenc) {
                const d = new Date(rawDt);
                if (!isNaN(d.getTime())) dtVenc = d.toISOString();
              }
            }
          }

          await trx('GamTransacao').insert({
            id: transacaoId,
            empresa_id,
            usuario_id: corretorId,
            admin_id: admin_id || null,
            valor: parseFloat(t.valor || t.valor_talentos || 0),
            tipo: tTipo,
            origem: 'IMPORTACAO',
            justificativa: t.justificativa || t.descricao || justificativaBase,
            valor_original_rs: t.valor_original_rs ? parseFloat(t.valor_original_rs) : null,
            status: tStatus,
            data_vencimento: dtVenc,
            empreendimento: t.empreendimento || 'Geral',
            unidade: t.unidade || 'Geral',
            contato_cliente: t.contato_cliente || 'Não Informado',
            origem_id: `row-${row.linha}-prog`,
            dados_extras: dadosExtrasStr,
            data_compensacao: tStatus === 'COMPENSADO' ? trx.fn.now() : null,
            created_at: trx.fn.now()
          });
          transacoesCriadas++;
        }
      }

      for (const corretorId of corretoresAfetados) {
        const transacoesDoCorretor = await trx('GamTransacao')
          .where({ usuario_id: corretorId });

        let novoDisponivel = 0;
        let novoAReceber = 0;

        transacoesDoCorretor.forEach(t => {
          const valorNum = parseFloat(t.valor);
          if (t.status === 'COMPENSADO') {
            if (t.tipo === 'CREDITO') novoDisponivel += valorNum;
            else if (t.tipo === 'DEBITO') novoDisponivel -= valorNum;
            else if (t.tipo === 'ESTORNO') novoDisponivel += valorNum;
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
