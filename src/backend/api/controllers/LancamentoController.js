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

  async baixarEmLote(req, res) {
    try {
      const { transacao_ids, data_compensacao } = req.body;
      const empresa_id = req.empresa_id;
      const admin_id = req.usuario_id;

      const result = await LancamentoService.compensarEmLote(empresa_id, admin_id, transacao_ids, data_compensacao);
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

  async obterMovimentacoesEquipe(req, res) {
    try {
      const empresa_id = req.empresa_id;
      const { page, limit, tipo, origem, status, usuario_id, data_inicio, data_fim } = req.query;

      const result = await LancamentoService.listarMovimentacoesEquipe({
        empresa_id,
        page,
        limit,
        tipo,
        origem,
        status,
        usuario_id,
        data_inicio,
        data_fim
      });

      return res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        resumo: result.resumo
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async obterDadosGraficos(req, res) {
    try {
      const db = require('../../infra/db');
      const empresa_id = req.empresa_id;

      // 1. Evolução Mensal (últimos 6 meses)
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

      const transacoes = await db('GamTransacao')
        .where({ empresa_id })
        .andWhere('created_at', '>=', seisMesesAtras.toISOString())
        .select('valor', 'tipo', 'created_at')
        .orderBy('created_at', 'asc');

      const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const ultimosSeisMeses = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        ultimosSeisMeses.push({
          anoMes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          mes: nomesMeses[d.getMonth()],
          creditos: 0,
          debitos: 0
        });
      }

      for (const t of transacoes) {
        if (!t.created_at) continue;
        const dataTransacao = new Date(t.created_at);
        const anoMesTransacao = `${dataTransacao.getFullYear()}-${String(dataTransacao.getMonth() + 1).padStart(2, '0')}`;
        const bucket = ultimosSeisMeses.find(b => b.anoMes === anoMesTransacao);
        if (bucket) {
          const valorAbs = Math.abs(parseFloat(t.valor || 0));
          if (t.tipo === 'CREDITO' || (t.tipo === 'ESTORNO' && t.valor > 0)) {
            bucket.creditos += valorAbs;
          } else {
            bucket.debitos += valorAbs;
          }
        }
      }

      const evolucaoMensal = ultimosSeisMeses.map(b => ({
        mes: b.mes,
        creditos: Math.round(b.creditos * 100) / 100,
        debitos: Math.round(b.debitos * 100) / 100
      }));

      // 2. Top 5 Corretores com maior saldo disponível
      const topCorretoresRaw = await db('GamUsuario')
        .where({ empresa_id, perfil: 'CORRETOR', ativo: true })
        .select('nome', 'saldo_disponivel as saldo')
        .orderBy('saldo_disponivel', 'desc')
        .limit(5);

      const topCorretores = topCorretoresRaw.map(u => ({
        nome: u.nome,
        saldo: parseFloat(u.saldo || 0)
      }));

      // 3. Distribuição de prêmios resgatados (confirmados)
      const distribuicaoPremiosRaw = await db('Resgate')
        .join('Premio', 'Resgate.premio_id', 'Premio.id')
        .join('GamUsuario', 'Resgate.usuario_id', 'GamUsuario.id')
        .where('GamUsuario.empresa_id', empresa_id)
        .where('Resgate.status', 'confirmado')
        .select('Premio.titulo')
        .count('Resgate.id as total_resgatado')
        .groupBy('Premio.titulo')
        .orderBy('total_resgatado', 'desc')
        .limit(5);

      const distribuicaoPremios = distribuicaoPremiosRaw.map(p => ({
        titulo: p.titulo,
        total_resgatado: parseInt(p.total_resgatado || 0, 10)
      }));

      return res.json({
        success: true,
        evolucaoMensal,
        topCorretores,
        distribuicaoPremios
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new LancamentoController();
