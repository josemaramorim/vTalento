const db = require('../../infra/db');

class PremioService {
  async list(empresa_id) {
    // Lista prêmios ativos (pode ser filtrado por empresa futuramente)
    return db('Premio').where({ ativo: true }).select('*');
  }

  async create({ titulo, descricao, quantidade_disponivel, custo_pontos }) {
    const [id] = await db('Premio').insert({
      titulo,
      descricao,
      quantidade_disponivel,
      custo_pontos,
      ativo: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
    return { id };
  }

  async requestResgate({ usuario_id, premio_id, quantidade }) {
    if (!usuario_id || !premio_id || !quantidade || quantidade < 1) {
      return { success: false, code: 'QUANTIDADE_INVALIDA', message: 'Quantidade deve ser >= 1' };
    }

    // Carrega premio e usuario
    const premio = await db('Premio').where({ id: premio_id }).first();
    if (!premio || !premio.ativo) {
      return { success: false, code: 'PREMIO_INDISPONIVEL', message: 'Prêmio indisponível' };
    }

    if (premio.quantidade_disponivel < quantidade) {
      return { success: false, code: 'PREMIO_INDISPONIVEL', message: 'Quantidade insuficiente do prêmio' };
    }

    const custo_total = premio.custo_pontos * quantidade;

    // Verificar saldo do usuário
    const usuario = await db('GamUsuario').where({ id: usuario_id }).first();
    if (!usuario) {
      return { success: false, code: 'USUARIO_NAO_ENCONTRADO', message: 'Usuário não encontrado' };
    }

    if (parseFloat(usuario.saldo_disponivel) < custo_total) {
      return { success: false, code: 'SALDO_INSUFICIENTE', message: 'Saldo insuficiente para resgate' };
    }

    // Executa em transação
    try {
      const result = await db.transaction(async (trx) => {
        // Cria resgate pendente
        const [resgateId] = await trx('Resgate').insert({
          usuario_id,
          premio_id,
          quantidade,
          custo_total,
          status: 'pendente',
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });

        // Atualiza saldo do usuario (insere transacao de débito em GamTransacao)
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

        // Atualiza saldo do usuario
        const novoSaldo = parseFloat(usuario.saldo_disponivel) - custo_total;
        await trx('GamUsuario').where({ id: usuario_id }).update({ saldo_disponivel: novoSaldo, updated_at: db.fn.now() });

        // Decrementa quantidade disponivel
        await trx('Premio').where({ id: premio_id }).update({ quantidade_disponivel: premio.quantidade_disponivel - quantidade, updated_at: db.fn.now() });

        // Marca resgate como confirmado (negócio simples; em impl real poderia haver verificação)
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
