const LancamentoService = require('../../core/services/LancamentoService');

class LancamentoController {
  async realizarLancamento(req, res) {
    try {
      const { usuario_id, valor, tipo, justificativa } = req.body;
      const empresa_id = req.empresa_id;
      const admin_id = req.usuario_id; // Injetado pelo TenantMiddleware

      const result = await LancamentoService.realizarLancamentoManual({
        empresa_id,
        admin_id,
        usuario_id,
        valor,
        tipo,
        justificativa
      });

      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async obterCorretores(req, res) {
    try {
      const corretores = await LancamentoService.listarCorretores(req.empresa_id);
      return res.json(corretores);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async obterHistoricoRecente(req, res) {
    try {
      const historico = await LancamentoService.listarLancamentosManuaisRecentes(req.empresa_id);
      return res.json(historico);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async obterIndicadoresAdmin(req, res) {
    try {
      const db = require('../../infra/db');
      const empresa_id = req.empresa_id;

      // 1. Total corretores cadastrados
      const corretoresCount = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .count({ count: '*' })
        .first();

      // 2. Total de Talentos distribuídos (CRÉDITOS e AJUSTES positivos)
      const totalCreditos = await db('GamTransacao')
        .where({ empresa_id })
        .whereIn('tipo', ['CREDITO', 'ESTORNO'])
        .andWhere('valor', '>', 0)
        .sum({ total: 'valor' })
        .first();

      // 3. Total de Talentos a receber (pendentes na empresa)
      const totalAReceber = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR' })
        .sum({ total: 'saldo_a_receber' })
        .first();

      // 4. Total de Prêmios Ativos
      const premiosAtivosCount = await db('Premio')
        .where({ empresa_id, ativo: true })
        .count({ count: '*' })
        .first();

      // 5. Total de Resgates Confirmados
      // Buscamos resgates vinculados aos corretores desta empresa
      const totalResgates = await db('Resgate')
        .join('GamUsuario', 'Resgate.usuario_id', 'GamUsuario.id')
        .where('GamUsuario.empresa_id', empresa_id)
        .where('Resgate.status', 'confirmado')
        .count({ count: '*' })
        .first();

      // 6. Histórico geral recente de transações (últimas 5)
      const transacoesRecentes = await db('GamTransacao')
        .where('GamTransacao.empresa_id', empresa_id)
        .join('GamUsuario as Corretor', 'GamTransacao.usuario_id', 'Corretor.id')
        .select(
          'GamTransacao.id',
          'GamTransacao.valor',
          'GamTransacao.tipo',
          'GamTransacao.origem',
          'GamTransacao.justificativa',
          'GamTransacao.created_at',
          'Corretor.nome as corretor_nome'
        )
        .orderBy('GamTransacao.created_at', 'desc')
        .limit(5);

      return res.json({
        total_corretores: parseInt(corretoresCount.count || 0, 10),
        talentos_distribuidos: parseFloat(totalCreditos.total || 0),
        talentos_a_receber: parseFloat(totalAReceber.total || 0),
        premios_ativos: parseInt(premiosAtivosCount.count || 0, 10),
        resgates_confirmados: parseInt(totalResgates.count || 0, 10),
        transacoes_recentes: transacoesRecentes
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new LancamentoController();
