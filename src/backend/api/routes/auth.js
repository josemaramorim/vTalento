const { Router } = require('express');
const AutenticacaoController = require('../controllers/AutenticacaoController');
const tenantMiddleware = require('../../infra/middlewares/TenantMiddleware');

const routes = Router();

routes.post('/login', AutenticacaoController.login);

// Rota de teste protegida
routes.get('/me', tenantMiddleware, AutenticacaoController.me);
routes.put('/theme', tenantMiddleware, AutenticacaoController.updateTheme);

// Endpoint de extrato individual do corretor
routes.get('/users/:userId/transacoes', tenantMiddleware, async (req, res) => {
  try {
    const db = require('../../infra/db');
    const transacoes = await db('GamTransacao')
      .where({ usuario_id: req.params.userId, empresa_id: req.empresa_id })
      .orderBy('created_at', 'desc')
      .limit(10);
    return res.json({ success: true, data: transacoes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = routes;
