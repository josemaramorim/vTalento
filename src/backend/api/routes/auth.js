const { Router } = require('express');
const AutenticacaoController = require('../controllers/AutenticacaoController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');

const routes = Router();

routes.post('/login', AutenticacaoController.login);

// Rota de teste protegida
routes.get('/me', tenantMiddleware, AutenticacaoController.me);
routes.put('/theme', tenantMiddleware, AutenticacaoController.updateTheme);

// Endpoint de extrato individual do corretor (com filtros)
routes.get('/meu-extrato', tenantMiddleware, async (req, res) => {
  try {
    const db = require('../../infra/db');
    const usuario_id = req.usuario_id;
    const { tipo, origem, status, data_inicio, data_fim, page = 1, limit = 20 } = req.query;

    const limitSanitizado = [20, 50, 100].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 20;
    const paginaSanitizada = Math.max(1, parseInt(page, 10) || 1);
    const offset = (paginaSanitizada - 1) * limitSanitizado;

    let queryBase = db('GamTransacao')
      .where({ 'GamTransacao.usuario_id': usuario_id })
      .leftJoin('GamUsuario as Admin', 'GamTransacao.admin_id', 'Admin.id');

    if (tipo) queryBase = queryBase.where('GamTransacao.tipo', tipo);
    if (origem) queryBase = queryBase.where('GamTransacao.origem', origem);
    if (status) queryBase = queryBase.where('GamTransacao.status', status);
    if (data_inicio) queryBase = queryBase.where('GamTransacao.created_at', '>=', data_inicio);
    if (data_fim) queryBase = queryBase.where('GamTransacao.created_at', '<=', data_fim + ' 23:59:59');

    const [{ total }] = await queryBase.clone().count('GamTransacao.id as total');
    const totalRegistros = parseInt(total, 10);

    const transacoes = await queryBase
      .select(
        'GamTransacao.id',
        'GamTransacao.tipo',
        'GamTransacao.valor',
        'GamTransacao.origem',
        'GamTransacao.status',
        'GamTransacao.justificativa',
        'GamTransacao.empreendimento',
        'GamTransacao.unidade',
        'GamTransacao.data_vencimento',
        'GamTransacao.data_compensacao',
        'GamTransacao.created_at',
        db.raw("COALESCE(\"Admin\".\"nome\", 'Sistema') as admin_nome")
      )
      .orderBy('GamTransacao.created_at', 'desc')
      .limit(limitSanitizado)
      .offset(offset);

    // Totalizadores
    const todasTrans = await db('GamTransacao').where({ usuario_id });
    let totalCredito = 0, totalDebito = 0, totalPendente = 0;
    todasTrans.forEach(t => {
      const v = Math.abs(parseFloat(t.valor));
      if (t.tipo === 'CREDITO' && t.status === 'COMPENSADO') totalCredito += v;
      else if (t.tipo === 'DEBITO' && t.status === 'COMPENSADO') totalDebito += v;
      else if (t.status === 'PENDENTE') totalPendente += parseFloat(t.valor);
    });

    // Saldo atual do usuário
    const usuario = await db('GamUsuario').where({ id: usuario_id }).select('saldo_disponivel', 'saldo_a_receber').first();

    return res.json({
      success: true,
      data: transacoes,
      meta: {
        total: totalRegistros,
        page: paginaSanitizada,
        totalPages: Math.ceil(totalRegistros / limitSanitizado),
        limit: limitSanitizado
      },
      resumo: {
        saldo_disponivel: parseFloat(usuario?.saldo_disponivel || 0),
        saldo_a_receber: parseFloat(usuario?.saldo_a_receber || 0),
        total_creditos: totalCredito,
        total_debitos: totalDebito,
        total_pendente: totalPendente
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = routes;
