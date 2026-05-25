// Origem: specs/09-VITRINE-DE-PREMIOS.md (Seção 5 e 7)
// Governança: specs/06-IA-GOVERNANCE.md — Domínio de Negócio em Português
const db = require('../../infra/db');

class PremioService {
  async list() {
    return db('Premio').where({ ativo: true }).select('*');
  }

  async listAdmin() {
    return db('Premio').select('*').orderBy('id', 'desc');
  }

  async create({ titulo, descricao, quantidade_disponivel, custo_pontos, ativo = true }) {
    const [id] = await db('Premio').insert({
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

  async update(id, data) {
    const payload = {
      ...data,
      updated_at: db.fn.now()
    };
    await db('Premio').where({ id }).update(payload);
    return { id };
  }

  async remove(id) {
    await db('Premio').where({ id }).update({ ativo: false, updated_at: db.fn.now() });
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

    if (premio.quantidade_disponivel < quantidade) {
      return { success: false, code: 'PREMIO_INDISPONIVEL', message: 'Quantidade insuficiente do prêmio' };
    }

    const custo_total = premio.custo_pontos * quantidade;
    const usuario = await db('GamUsuario').where({ id: usuario_id }).first();
    if (!usuario) {
      return { success: false, code: 'USUARIO_NAO_ENCONTRADO', message: 'Usuário não encontrado' };
    }

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
}

module.exports = new PremioService();
