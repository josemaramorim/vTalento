const PremioService = require('../../core/services/PremioService');

class PremioController {
  async listPublic(req, res) {
    const premios = await PremioService.list(req.user ? req.user.empresa_id : null);
    return res.json({ success: true, data: premios });
  }

  async create(req, res) {
    try {
      const { titulo, descricao, quantidade_disponivel, custo_pontos } = req.body;
      const result = await PremioService.create({ titulo, descricao, quantidade_disponivel, custo_pontos });
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async requestResgate(req, res) {
    const usuario_id = req.user && req.user.id;
    const premio_id = parseInt(req.params.id, 10);
    const { quantidade } = req.body;

    const result = await PremioService.requestResgate({ usuario_id, premio_id, quantidade });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message, code: result.code });
    }
    return res.json({ success: true, data: result.data });
  }
}

module.exports = new PremioController();
