const { Router } = require('express');
const LancamentoController = require('../controllers/LancamentoController');
const ImportacaoController = require('../controllers/ImportacaoController');
const PremioController = require('../controllers/PremioController');
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

// Endpoint de métricas consolidada do Dashboard Admin
routes.get('/dashboard-indicadores', LancamentoController.obterIndicadoresAdmin);

// Endpoints de perfis de importação
routes.get('/importacao/perfis', ImportacaoController.obterPerfis);
routes.get('/importacao/perfis/:id', ImportacaoController.obterPerfilUnico);
routes.post('/importacao/perfis', ImportacaoController.criarPerfil);
routes.put('/importacao/perfis/:id', ImportacaoController.atualizarPerfil);
routes.delete('/importacao/perfis/:id', ImportacaoController.deletarPerfil);

// Endpoints do motor de importação
routes.post('/importacao/preview', ImportacaoController.previewImportacao);
routes.post('/importacao/confirm', ImportacaoController.confirmarImportacao);

// Endpoints da Vitrine de Prêmios (CRUD Admin)
routes.get('/premios', PremioController.listAdmin);
routes.post('/premios', PremioController.create);
routes.put('/premios/:id', PremioController.update);
routes.delete('/premios/:id', PremioController.delete);

// Tarefa 11.4 — FASE 4.9 — Painel Admin de Resgates (specs/09-VITRINE-DE-PREMIOS.md Seção 6)
routes.get('/resgates', PremioController.listAllResgatesAdmin);

module.exports = routes;
