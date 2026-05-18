const { Router } = require('express');
const LancamentoController = require('../controllers/LancamentoController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');
const adminMiddleware = require('../../infra/middlewares/AdminMiddleware');

const routes = Router();

// Todas as rotas administrativas precisam de Tenant + Admin Middleware
routes.use(tenantMiddleware, adminMiddleware);

// Endpoint de lançamento manual
routes.post('/lancamento-manual', LancamentoController.realizarLancamento);

// Endpoint de listagem de corretores da empresa (para autocomplete)
routes.get('/corretores', LancamentoController.obterCorretores);

// Endpoint de histórico recente de lançamentos
routes.get('/historico-recente', LancamentoController.obterHistoricoRecente);

module.exports = routes;
