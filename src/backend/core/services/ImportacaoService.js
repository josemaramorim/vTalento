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

    if (perfil && typeof perfil.mapeamento_json === 'string') {
      perfil.mapeamento_json = JSON.parse(perfil.mapeamento_json);
    }
    return perfil;
  }

  async criarPerfil(empresa_id, { nome_perfil, mapeamento_json, separador_multiplo = '|', linha_cabecalho = 3 }) {
    if (!nome_perfil || !mapeamento_json) {
      throw new Error('Nome do perfil e mapeamento são obrigatórios');
    }

    const id = crypto.randomUUID();
    const mapeamentoStr = typeof mapeamento_json === 'string' ? mapeamento_json : JSON.stringify(mapeamento_json);

    await db('GamConfigImportacao').insert({
      id,
      empresa_id,
      nome_perfil,
      mapeamento_json: mapeamentoStr,
      separador_multiplo,
      linha_cabecalho,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return { id, nome_perfil };
  }

  async atualizarPerfil(empresa_id, id, { nome_perfil, mapeamento_json, separador_multiplo = '|', linha_cabecalho = 3 }) {
    if (!nome_perfil || !mapeamento_json) {
      throw new Error('Nome do perfil e mapeamento são obrigatórios');
    }

    const mapeamentoStr = typeof mapeamento_json === 'string' ? mapeamento_json : JSON.stringify(mapeamento_json);

    const updated = await db('GamConfigImportacao')
      .where({ id, empresa_id })
      .update({
        nome_perfil,
        mapeamento_json: mapeamentoStr,
        separador_multiplo,
        linha_cabecalho,
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

  // Função auxiliar para limpar CPF para busca
  _limparCPF(cpf) {
    if (!cpf) return '';
    return String(cpf).replace(/\D/g, '');
  }

  // Faz lookup do corretor por Nome ou CPF
  async _buscarCorretor(empresa_id, nome, creci) {
    // 1. Tentar buscar por CRECI se estiver presente
    if (creci) {
      const c = String(creci).trim().toUpperCase();
      const corretor = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .where(function() {
          this.whereRaw('UPPER(cpf) = ?', [c])
              .orWhereRaw('UPPER(nome) = ?', [c]);
        })
        .first();
      if (corretor) return corretor;
    }

    // 2. Tentar por CPF (se o identificador se parecer com CPF)
    const cpfLimpo = this._limparCPF(nome);
    if (cpfLimpo.length === 11) {
      const corretor = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .andWhere(db.raw("REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?", [cpfLimpo]))
        .first();
      if (corretor) return corretor;
    }

    // 3. Tentar por Nome (Case-Insensitive)
    if (nome) {
      const nomeBusca = String(nome).trim().toUpperCase();
      const corretor = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .andWhereRaw('UPPER(nome) = ?', [nomeBusca])
        .first();
      if (corretor) return corretor;
    }

    return null;
  }

  // Parser de valores numéricos
  _parseMoeda(valor) {
    if (valor === undefined || valor === null) return 0;
    if (typeof valor === 'number') return valor;
    
    // Se for string, limpa pontuação de moeda brasileira/americana
    let str = String(valor).trim();
    if (!str) return 0;
    
    // Remove "R$", espaços, etc.
    str = str.replace(/R\$\s*/g, '');
    
    // Se contiver vírgula e ponto, ex: 1.000,50 -> 1000.50
    if (str.includes('.') && str.includes(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      // Se contiver apenas vírgula, ex: 1000,50 -> 1000.50
      str = str.replace(',', '.');
    }
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  // Processa as datas e valores de balões futuros
  _parseBaloes(rowValores, separador) {
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
    const valorUnitarioTalentos = Math.floor(valorUnitarioRs * 0.01); // Regra padrão: R$ 1000 = 10 Talentos -> R$ 1 = 0.01 Talentos
    
    return datas.map(dataStr => {
      // Tentar converter dataStr ("10/02/2027") em formato Date
      let dataVencimento = null;
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        // dia/mes/ano -> Date(ano, mes-1, dia)
        dataVencimento = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
      } else {
        // Fallback para conversão direta
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
    
    // Mapeia chaves para facilitar a extração
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

      const corretor = await this._buscarCorretor(empresa_id, rawCorretor, rawCreci);

      const valorVendaRs = this._parseMoeda(rawValorVenda);
      const valorPagoRs = this._parseMoeda(rawValorPago);
      
      const totalTalentos = Math.floor(valorVendaRs * 0.01);
      const talentosDisponiveis = Math.floor(valorPagoRs * 0.01);
      const talentosAReceber = totalTalentos - talentosDisponiveis;

      // Balões
      const baloesValores = {
        balao_datas_raw: getVal('balao_datas'),
        balao_valor_raw: getVal('balao_valor'),
        balao_qtd_raw: getVal('balao_qtd')
      };
      const baloesCalculados = this._parseBaloes(baloesValores, perfil.separador_multiplo);
      const somaBaloesTalentos = baloesCalculados.reduce((acc, curr) => acc + curr.valor_talentos, 0);

      resultadoRows.push({
        linha: cabecalho0Based + 2 + i, // 1-based no arquivo original
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
        corretor_encontrado: !!corretor,
        corretor_id: corretor ? corretor.id : null,
        corretor_nome_sistema: corretor ? corretor.nome : null,
        corretor_email_sistema: corretor ? corretor.email : null
      });
    }

    return {
      total_linhas: resultadoRows.length,
      colunas_detectadas: Object.keys(headerIndices),
      linhas: resultadoRows,
      inconsistencias: resultadoRows.filter(r => !r.corretor_encontrado).length
    };
  }

  async confirmarImportacao(empresa_id, admin_id, fileBase64, perfil_id) {
    const preview = await this.previewImportacao(empresa_id, fileBase64, perfil_id);
    
    if (preview.inconsistencias > 0) {
      throw new Error(`Existem ${preview.inconsistencias} corretores não localizados no sistema. Cadastre-os antes de efetuar a importação definitiva.`);
    }

    const resultadoProcessado = await db.transaction(async (trx) => {
      let transacoesCriadas = 0;
      const corretoresAfetados = new Set();

      for (const row of preview.linhas) {
        const corretorId = row.corretor_id;
        corretoresAfetados.add(corretorId);

        const transacaoId = crypto.randomUUID();
        const justificativaBase = `Importação - ${row.empreendimento} ${row.unidade} - Cliente: ${row.cliente_nome}`;

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
            data_compensacao: null,
            created_at: trx.fn.now()
          });
          transacoesCriadas++;
        }
      }

      // 4. Recalcular e atualizar saldos de todos os corretores afetados no banco de dados
      for (const corretorId of corretoresAfetados) {
        // Soma todas as transações COMPENSADAS de crédito, subtrai débitos manuais
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
