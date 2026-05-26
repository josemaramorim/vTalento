const express = require('express');
const router = express.Router();
const SuperAdminController = require('../controllers/SuperAdminController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');
const superAdminMiddleware = require('../../infra/middlewares/superAdminMiddleware');

// Protege todas as rotas de super-admin com autenticação básica e checagem de perfil
router.use(tenantMiddleware);
router.use(superAdminMiddleware);

// --- CONFIGURAÇÕES SAAS ---
router.get('/configs', SuperAdminController.getConfigs);
router.post('/configs', SuperAdminController.updateConfigs);

// --- EMPRESAS / TENANTS ---
router.get('/empresas', SuperAdminController.listEmpresas);
router.post('/empresas', SuperAdminController.createEmpresa);
router.put('/empresas/:id', SuperAdminController.updateEmpresa);
router.get('/empresas/:id/financeiro', SuperAdminController.getEmpresaSaudeFinanceira);
router.post('/empresas/:id/emergencia', SuperAdminController.liberarAcessoEmergencia);

// --- FATURAS ---
router.post('/faturas/:id/baixa', SuperAdminController.baixarFaturaManual);

// --- USUÁRIOS ISOLADOS POR TENANT ---
router.get('/empresas/:empresaId/usuarios', SuperAdminController.listUsuariosByEmpresa);
router.post('/empresas/:empresaId/usuarios', SuperAdminController.createUsuarioForEmpresa);
router.put('/empresas/:empresaId/usuarios/:usuarioId', SuperAdminController.updateUsuarioForEmpresa);
router.delete('/empresas/:empresaId/usuarios/:usuarioId', SuperAdminController.deleteUsuarioForEmpresa);

module.exports = router;
