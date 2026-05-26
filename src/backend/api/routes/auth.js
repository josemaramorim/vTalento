const { Router } = require('express');
const AutenticacaoController = require('../controllers/AutenticacaoController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');

const routes = Router();

routes.post('/login', AutenticacaoController.login);

// Rota de teste protegida
routes.get('/me', tenantMiddleware, AutenticacaoController.me);
routes.put('/theme', tenantMiddleware, AutenticacaoController.updateTheme);

module.exports = routes;
