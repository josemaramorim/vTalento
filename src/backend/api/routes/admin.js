const { Router } = require('express');
const LancamentoController = require('../controllers/LancamentoController');
const ImportacaoController = require('../controllers/ImportacaoController');
const PremioController = require('../controllers/PremioController');
const UsuarioController = require('../controllers/UsuarioController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');
const adminMiddleware = require('../../infra/middlewares/AdminMiddleware');

const routes = Router();

// Todas as rotas administrativas precisam de Tenant + Admin Middleware
routes.use(tenantMiddleware, adminMiddleware);

// Tarefa 12.1, 12.2, 12.3 — FASE 5 — Gestão de Usuários
routes.get('/usuarios', UsuarioController.listAdmin);
routes.post('/usuarios', UsuarioController.create);
routes.put('/usuarios/:id', UsuarioController.update);
routes.delete('/usuarios/:id', UsuarioController.delete);
routes.get('/usuarios/:id/extrato', UsuarioController.getExtrato);
routes.post('/usuarios/:id/recalcular-saldo', UsuarioController.recalcularSaldo);

// Endpoint de lançamento manual
routes.post('/lancamento-manual', LancamentoController.realizarLancamento);

// Endpoint de listagem de corretores da empresa (para autocomplete)
routes.get('/corretores', LancamentoController.obterCorretores);

// Endpoint de histórico recente de lançamentos
routes.get('/historico-recente', LancamentoController.obterHistoricoRecente);

// Endpoint de métricas consolidada do Dashboard Admin
routes.get('/dashboard-indicadores', LancamentoController.obterIndicadoresAdmin);

// Endpoint de dados analíticos para gráficos
routes.get('/dashboard-graficos', LancamentoController.obterDadosGraficos);

// Endpoint de extrato/movimentações de toda a equipe
routes.get('/movimentacoes', LancamentoController.obterMovimentacoesEquipe);

// Endpoint de baixa/compensação em lote de movimentações pendentes
routes.post('/movimentacoes/lote', LancamentoController.baixarEmLote);

// Endpoints de perfis de importação
routes.get('/importacao/perfis', ImportacaoController.obterPerfis);
routes.get('/importacao/perfis/:id', ImportacaoController.obterPerfilUnico);
routes.post('/importacao/perfis', ImportacaoController.criarPerfil);
routes.put('/importacao/perfis/:id', ImportacaoController.atualizarPerfil);
routes.delete('/importacao/perfis/:id', ImportacaoController.deletarPerfil);

// Endpoints do motor de importação
routes.post('/importacao/preview', ImportacaoController.previewImportacao);
routes.post('/importacao/sugerir-mapeamento', ImportacaoController.sugerirMapeamento);
routes.post('/importacao/confirm', ImportacaoController.confirmarImportacao);

// Endpoints da Vitrine de Prêmios (CRUD Admin)
routes.get('/premios', PremioController.listAdmin);
routes.post('/premios', PremioController.create);
routes.put('/premios/:id', PremioController.update);
routes.delete('/premios/:id', PremioController.delete);

// Tarefa 11.4 — FASE 4.9 — Painel Admin de Resgates (specs/09-VITRINE-DE-PREMIOS.md Seção 6)
routes.get('/resgates', PremioController.listAllResgatesAdmin);

// Faturamento SaaS para Inquilino (FASE 8 / Tarefa 15.8)
const BillingController = require('../controllers/BillingController');
routes.get('/billing/status', BillingController.getStatus);
routes.get('/billing/faturas', BillingController.getFaturas);
routes.post('/billing/pagar', BillingController.pagarFatura);
routes.put('/billing/provedor', BillingController.alterarMetodo);
routes.put('/empresa', BillingController.updateEmpresaBranding);
routes.post('/billing/faturas', BillingController.criarFaturaAdicional);
routes.delete('/billing/faturas/:id', BillingController.cancelarFatura);

module.exports = routes;

