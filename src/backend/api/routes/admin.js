const { Router } = require('express');
const LancamentoController = require('../controllers/LancamentoController');
const ImportacaoController = require('../controllers/ImportacaoController');
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

// Endpoints de perfis de importação
routes.get('/importacao/perfis', ImportacaoController.obterPerfis);
routes.get('/importacao/perfis/:id', ImportacaoController.obterPerfilUnico);
routes.post('/importacao/perfis', ImportacaoController.criarPerfil);
routes.put('/importacao/perfis/:id', ImportacaoController.atualizarPerfil);
routes.delete('/importacao/perfis/:id', ImportacaoController.deletarPerfil);

// Endpoints do motor de importação
routes.post('/importacao/preview', ImportacaoController.previewImportacao);
routes.post('/importacao/confirm', ImportacaoController.confirmarImportacao);

module.exports = routes;
