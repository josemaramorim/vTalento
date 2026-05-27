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
}

module.exports = new LancamentoService();
