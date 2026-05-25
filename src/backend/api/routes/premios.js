const { Router } = require('express');
const PremioController = require('../controllers/PremioController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');

const routes = Router();

// Public / Client
routes.get('/premios', tenantMiddleware, PremioController.listPublic);
routes.post('/premios/:id/resgates', tenantMiddleware, PremioController.requestResgate);
routes.get('/users/:userId/resgates', tenantMiddleware, PremioController.listResgatesByUser);

module.exports = routes;
