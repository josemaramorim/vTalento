const { Router } = require('express');
const PremioController = require('../controllers/PremioController');
const UsuarioController = require('../controllers/UsuarioController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');

const routes = Router();

// Public / Client
routes.get('/premios', tenantMiddleware, PremioController.listPublic);
routes.post('/premios/:id/resgates', tenantMiddleware, PremioController.requestResgate);
routes.get('/users/:userId/resgates', tenantMiddleware, PremioController.listResgatesByUser);

// Tarefa 12.4 — FASE 5 — Atualização de Perfil Próprio (Corretor/Admin)
routes.put('/users/me', tenantMiddleware, UsuarioController.updateMe);

module.exports = routes;
