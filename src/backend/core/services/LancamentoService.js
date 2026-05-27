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
        db.raw("COALESCE(Admin.nome, 'Sistema') as admin_nome")
      )
      .orderBy('GamTransacao.created_at', 'desc')
      .limit(20);
  }

  async listarMovimentacoesEquipe({ empresa_id, page = 1, limit = 10, tipo, origem, usuario_id, data_inicio, data_fim }) {
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
    if (usuario_id) {
      query = query.where('GamTransacao.usuario_id', usuario_id);
    }
    if (data_inicio) {
      query = query.where('GamTransacao.created_at', '>=', `${data_inicio} 00:00:00`);
    }
    if (data_fim) {
      query = query.where('GamTransacao.created_at', '<=', `${data_fim} 23:59:59`);
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
        'Corretor.nome as corretor_nome',
        'Corretor.email as corretor_email',
        db.raw("COALESCE(Admin.nome, 'Sistema') as admin_nome")
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
      totalCreditosQuery = totalCreditosQuery.where('created_at', '>=', `${data_inicio} 00:00:00`);
      totalDebitosQuery = totalDebitosQuery.where('created_at', '>=', `${data_inicio} 00:00:00`);
    }
    if (data_fim) {
      totalCreditosQuery = totalCreditosQuery.where('created_at', '<=', `${data_fim} 23:59:59`);
      totalDebitosQuery = totalDebitosQuery.where('created_at', '<=', `${data_fim} 23:59:59`);
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
}

module.exports = new LancamentoService();
