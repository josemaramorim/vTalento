// Origem: specs/09-VITRINE-DE-PREMIOS.md (Seção 5 e 7)
// Governança: specs/06-IA-GOVERNANCE.md — Domínio de Negócio em Português
const db = require('../../infra/db');

class PremioService {
  async list(empresa_id) {
    return db('Premio').where({ empresa_id, ativo: true }).select('*');
  }

  async listAdmin(empresa_id) {
    return db('Premio').where({ empresa_id }).select('*').orderBy('id', 'desc');
  }

  async create({ empresa_id, titulo, descricao, quantidade_disponivel, custo_pontos, ativo = true }) {
    const [id] = await db('Premio').insert({
      empresa_id,
      titulo,
      descricao,
      quantidade_disponivel,
      custo_pontos,
      ativo,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return { id };
  }

  async update(id, empresa_id, data) {
    const payload = {
      ...data,
      updated_at: db.fn.now()
    };
    await db('Premio').where({ id, empresa_id }).update(payload);
    return { id };
  }

  async remove(id, empresa_id) {
    await db('Premio').where({ id, empresa_id }).update({ ativo: false, updated_at: db.fn.now() });
    return { id };
  }

  async listResgatesByUser(usuario_id) {
    return db('Resgate')
      .where({ 'Resgate.usuario_id': usuario_id })
      .join('Premio', 'Resgate.premio_id', 'Premio.id')
      .select('Resgate.*', 'Premio.titulo as premio_titulo')
      .orderBy('Resgate.created_at', 'desc');
  }

  async requestResgate({ usuario_id, premio_id, quantidade }) {
    if (!usuario_id || !premio_id || !quantidade || quantidade < 1) {
      return { success: false, code: 'QUANTIDADE_INVALIDA', message: 'Quantidade deve ser >= 1' };
    }

    const premio = await db('Premio').where({ id: premio_id }).first();
    if (!premio || !premio.ativo) {
      return { success: false, code: 'PREMIO_INDISPONIVEL', message: 'Prêmio indisponível' };
    }

    const usuario = await db('GamUsuario').where({ id: usuario_id }).first();
    if (!usuario) {
      return { success: false, code: 'USUARIO_NAO_ENCONTRADO', message: 'Usuário não encontrado' };
    }

    if (premio.empresa_id !== usuario.empresa_id) {
      return { success: false, code: 'ACESSO_NEGADO', message: 'Acesso negado a este prêmio' };
    }

    if (premio.quantidade_disponivel < quantidade) {
      return { success: false, code: 'PREMIO_INDISPONIVEL', message: 'Quantidade insuficiente do prêmio' };
    }

    const custo_total = premio.custo_pontos * quantidade;

    if (parseFloat(usuario.saldo_disponivel) < custo_total) {
      return { success: false, code: 'SALDO_INSUFICIENTE', message: 'Saldo insuficiente para resgate' };
    }

    try {
      const result = await db.transaction(async (trx) => {
        const [resgateId] = await trx('Resgate').insert({
          usuario_id,
          premio_id,
          quantidade,
          custo_total,
          status: 'pendente',
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });

        const transacaoId = require('crypto').randomUUID();
        await trx('GamTransacao').insert({
          id: transacaoId,
          empresa_id: usuario.empresa_id,
          usuario_id,
          admin_id: null,
          valor: -custo_total,
          tipo: 'DEBITO',
          origem: 'PREMIO',
          justificativa: `Resgate premio ${premio_id}`,
          created_at: db.fn.now()
        });

        const novoSaldo = parseFloat(usuario.saldo_disponivel) - custo_total;
        await trx('GamUsuario').where({ id: usuario_id }).update({ saldo_disponivel: novoSaldo, updated_at: db.fn.now() });
        await trx('Premio').where({ id: premio_id }).update({ quantidade_disponivel: premio.quantidade_disponivel - quantidade, updated_at: db.fn.now() });
        await trx('Resgate').where({ id: resgateId }).update({ status: 'confirmado', updated_at: db.fn.now() });

        return { resgateId, transacaoId, novoSaldo };
      });

      return { success: true, data: result };
    } catch (err) {
      return { success: false, code: 'PROCESSAMENTO_FALHOU', message: err.message };
    }
  }

  // Origem: specs/09-VITRINE-DE-PREMIOS.md (Seção 6 — GET /admin/resgates)
  // Tarefa 11.2 — FASE 4.9
  async listAllResgatesAdmin({ empresa_id, page = 1, limit = 10, status, corretor_id, premio_id, data_inicio, data_fim }) {
    // Valida e sanitiza o limit — apenas 10, 50 ou 100 são permitidos
    const limitsPermitidos = [10, 50, 100];
    const limitSanitizado = limitsPermitidos.includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
    const paginaSanitizada = Math.max(1, parseInt(page, 10) || 1);
    const offset = (paginaSanitizada - 1) * limitSanitizado;

    // Query base com joins para obter nome do corretor e título do prêmio
    let query = db('Resgate')
      .join('GamUsuario', 'Resgate.usuario_id', 'GamUsuario.id')
      .join('Premio', 'Resgate.premio_id', 'Premio.id')
      .where('GamUsuario.empresa_id', empresa_id);  // Isolamento multi-tenant obrigatório

    // Filtros opcionais
    if (status) {
      query = query.where('Resgate.status', status);
    }
    if (corretor_id) {
      query = query.where('Resgate.usuario_id', corretor_id);
    }
    if (premio_id) {
      query = query.where('Resgate.premio_id', premio_id);
    }
    if (data_inicio) {
      query = query.where('Resgate.created_at', '>=', `${data_inicio} 00:00:00`);
    }
    if (data_fim) {
      query = query.where('Resgate.created_at', '<=', `${data_fim} 23:59:59`);
    }

    // Conta o total antes de paginar (clone da query)
    const [{ total }] = await query.clone().count('Resgate.id as total');
    const totalRegistros = parseInt(total, 10);
    const totalPages = Math.ceil(totalRegistros / limitSanitizado);

    // Busca os dados paginados
    const data = await query
      .select(
        'Resgate.id',
        'Resgate.usuario_id',
        'Resgate.premio_id',
        'Resgate.quantidade',
        'Resgate.custo_total',
        'Resgate.status',
        'Resgate.created_at',
        'GamUsuario.nome as corretor_nome',
        'Premio.titulo as premio_titulo'
      )
      .orderBy('Resgate.created_at', 'desc')
      .limit(limitSanitizado)
      .offset(offset);

    return {
      data,
      meta: {
        total: totalRegistros,
        page: paginaSanitizada,
        totalPages,
        limit: limitSanitizado
      }
    };
  }
}

module.exports = new PremioService();
