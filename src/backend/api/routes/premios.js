const { Router } = require('express');
const PremioController = require('../controllers/PremioController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');
const adminMiddleware = require('../../infra/middlewares/AdminMiddleware');

const routes = Router();

// Public
routes.get('/premios', PremioController.listPublic);
routes.post('/premios/:id/resgates', tenantMiddleware, PremioController.requestResgate);

// Admin (protected)
routes.use(tenantMiddleware, adminMiddleware);
routes.post('/admin/premios', PremioController.create);

module.exports = routes;
