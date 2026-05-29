const db = require('../../infra/db');
const crypto = require('crypto');

class LancamentoService {
  async realizarLancamentoManual({ empresa_id, admin_id, usuario_id, valor, tipo, justificativa }) {
    // 1. Validações básicas de negócio
    if (!usuario_id || !valor || !tipo || !justificativa) {
      throw new Error('Todos os campos obrigatórios devem ser preenchidos');
    }

    if (valor <= 0) {
      throw new Error('O valor do lançamento deve ser maior que zero');
    }

    const tiposPermitidos = ['CREDITO', 'DEBITO', 'ESTORNO'];
    if (!tiposPermitidos.includes(tipo)) {
      throw new Error('Tipo de lançamento inválido');
    }

    // 2. Busca o corretor beneficiário e valida multi-tenant isolation
    const corretor = await db('GamUsuario')
      .where({ id: usuario_id })
      .first();

    if (!corretor) {
      throw new Error('Corretor não encontrado');
    }

    if (corretor.empresa_id !== empresa_id) {
      throw new Error('Acesso não autorizado: Corretor pertence a outra empresa');
    }

    // Para débito ou estorno, o corretor deve ter saldo suficiente
    if (tipo !== 'CREDITO' && parseFloat(corretor.saldo_disponivel) < parseFloat(valor)) {
      throw new Error('Saldo insuficiente para realizar este débito');
    }

    const valorLancamento = tipo === 'CREDITO' ? parseFloat(valor) : -parseFloat(valor);
    const transacaoId = crypto.randomUUID();

    // 3. Execução em transação no banco
    const novoSaldo = await db.transaction(async (trx) => {
      // Cria a transação de auditoria
      await trx('GamTransacao').insert({
        id: transacaoId,
        empresa_id,
        usuario_id,
        admin_id,
        valor: valorLancamento,
        tipo,
        origem: 'MANUAL',
        justificativa,
        created_at: db.fn.now()
      });

      // Atualiza o saldo do corretor
      const saldoAtualizado = parseFloat(corretor.saldo_disponivel) + valorLancamento;

      await trx('GamUsuario')
        .where({ id: usuario_id })
        .update({
          saldo_disponivel: saldoAtualizado,
          updated_at: db.fn.now()
        });

      return saldoAtualizado;
    });

    return {
      transacao_id: transacaoId,
      corretor: {
        id: corretor.id,
        nome: corretor.nome,
        email: corretor.email,
        saldo_disponivel: novoSaldo
      }
    };
  }

  async listarCorretores(empresa_id) {
    return db('GamUsuario')
      .where({ empresa_id, perfil: 'CORRETOR' })
      .select('id', 'nome', 'email', 'cpf', 'saldo_disponivel');
  }

  async listarLancamentosManuaisRecentes(empresa_id) {
    return db('GamTransacao')
      .where({ 'GamTransacao.empresa_id': empresa_id, 'GamTransacao.origem': 'MANUAL' })
      .join('GamUsuario as Corretor', 'GamTransacao.usuario_id', 'Corretor.id')
      .leftJoin('GamUsuario as Admin', 'GamTransacao.admin_id', 'Admin.id')
      .select(
        'GamTransacao.id',
        'GamTransacao.valor',
        'GamTransacao.tipo',
        'GamTransacao.origem',
        'GamTransacao.status',
        'GamTransacao.justificativa',
        'GamTransacao.created_at',
        'Corretor.nome as corretor_nome',
        db.raw("COALESCE(\"Admin\".\"nome\", 'Sistema') as admin_nome")
      )
      .orderBy('GamTransacao.created_at', 'desc')
      .limit(20);
  }

  async listarMovimentacoesEquipe({ empresa_id, page = 1, limit = 10, tipo, origem, status, usuario_id, data_inicio, data_fim }) {
    const limitSanitizado = [10, 50, 100].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
    const paginaSanitizada = Math.max(1, parseInt(page, 10) || 1);
    const offset = (paginaSanitizada - 1) * limitSanitizado;

    let query = db('GamTransacao')
      .where('GamTransacao.empresa_id', empresa_id)
      .join('GamUsuario as Corretor', 'GamTransacao.usuario_id', 'Corretor.id')
      .leftJoin('GamUsuario as Admin', 'GamTransacao.admin_id', 'Admin.id');

    if (tipo) {
      query = query.where('GamTransacao.tipo', tipo);
    }
    if (origem) {
      query = query.where('GamTransacao.origem', origem);
    }
    if (status) {
      query = query.where('GamTransacao.status', status);
    }
    if (usuario_id) {
      query = query.where('GamTransacao.usuario_id', usuario_id);
    }
    if (data_inicio) {
      query = query.where('GamTransacao.data_vencimento', '>=', data_inicio);
    }
    if (data_fim) {
      query = query.where('GamTransacao.data_vencimento', '<=', data_fim);
    }

    // Conta total de registros para paginação
    const [{ total }] = await query.clone().count('GamTransacao.id as total');
    const totalRegistros = parseInt(total, 10) || 0;
    const totalPages = Math.ceil(totalRegistros / limitSanitizado);

    // Busca registros
    const data = await query
      .select(
        'GamTransacao.id',
        'GamTransacao.valor',
        'GamTransacao.tipo',
        'GamTransacao.origem',
        'GamTransacao.status',
        'GamTransacao.justificativa',
        'GamTransacao.empreendimento',
        'GamTransacao.unidade',
        'GamTransacao.created_at',
        'GamTransacao.data_vencimento',
        'GamTransacao.data_compensacao',
        'Corretor.nome as corretor_nome',
        'Corretor.email as corretor_email',
        db.raw("COALESCE(\"Admin\".\"nome\", 'Sistema') as admin_nome")
      )
      .orderBy('GamTransacao.created_at', 'desc')
      .limit(limitSanitizado)
      .offset(offset);

    // Métricas consolidadas
    const [usuariosSaldos] = await db('GamUsuario')
      .where({ empresa_id, perfil: 'CORRETOR' })
      .sum({ disp_total: 'saldo_disponivel', rec_total: 'saldo_a_receber' });

    // Soma de créditos e débitos da empresa (filtrados se aplicável)
    let totalCreditosQuery = db('GamTransacao')
      .where({ empresa_id, tipo: 'CREDITO' });
    let totalDebitosQuery = db('GamTransacao')
      .where({ empresa_id, tipo: 'DEBITO' });

    if (usuario_id) {
      totalCreditosQuery = totalCreditosQuery.where('usuario_id', usuario_id);
      totalDebitosQuery = totalDebitosQuery.where('usuario_id', usuario_id);
    }
    if (data_inicio) {
      totalCreditosQuery = totalCreditosQuery.where('data_vencimento', '>=', data_inicio);
      totalDebitosQuery = totalDebitosQuery.where('data_vencimento', '>=', data_inicio);
    }
    if (data_fim) {
      totalCreditosQuery = totalCreditosQuery.where('data_vencimento', '<=', data_fim);
      totalDebitosQuery = totalDebitosQuery.where('data_vencimento', '<=', data_fim);
    }

    const [{ total_cred }] = await totalCreditosQuery.sum('valor as total_cred');
    const [{ total_deb }] = await totalDebitosQuery.sum('valor as total_deb');

    return {
      data,
      meta: {
        total: totalRegistros,
        page: paginaSanitizada,
        totalPages,
        limit: limitSanitizado
      },
      resumo: {
        saldo_disponivel_total: parseFloat(usuariosSaldos.disp_total || 0),
        saldo_a_receber_total: parseFloat(usuariosSaldos.rec_total || 0),
        creditos_total: parseFloat(total_cred || 0),
        debitos_total: Math.abs(parseFloat(total_deb || 0))
      }
    };
  }

  async compensarEmLote(empresa_id, admin_id, transacao_ids, data_compensacao) {
    if (!transacao_ids || !Array.isArray(transacao_ids) || transacao_ids.length === 0) {
      throw new Error('Nenhuma transação selecionada para baixa.');
    }

    return await db.transaction(async (trx) => {
      // 1. Buscar as transacoes selecionadas (e garantir que sao da empresa e estao PENDENTES)
      const transacoes = await trx('GamTransacao')
        .whereIn('id', transacao_ids)
        .andWhere({ empresa_id, status: 'PENDENTE' });

      if (transacoes.length === 0) {
        throw new Error('Nenhuma transação PENDENTE válida foi encontrada para compensação.');
      }

      // Agrupar os valores por corretor (para atualizar saldo)
      const valoresPorCorretor = {};
      for (const t of transacoes) {
        if (!valoresPorCorretor[t.usuario_id]) {
          valoresPorCorretor[t.usuario_id] = 0;
        }
        valoresPorCorretor[t.usuario_id] += parseFloat(t.valor);
      }

      // 2. Atualizar transacoes para COMPENSADO
      const idsCompensados = transacoes.map(t => t.id);
      await trx('GamTransacao')
        .whereIn('id', idsCompensados)
        .update({
          status: 'COMPENSADO',
          admin_id: admin_id,
          data_compensacao: data_compensacao || trx.fn.now()
        });

      // 3. Atualizar saldos dos corretores
      for (const [usuario_id, valorTotal] of Object.entries(valoresPorCorretor)) {
        await trx('GamUsuario')
          .where({ id: usuario_id })
          .decrement('saldo_a_receber', valorTotal)
          .increment('saldo_disponivel', valorTotal);
      }

      return { success: true, atualizados: transacoes.length };
    });
  }
}

module.exports = new LancamentoService();
