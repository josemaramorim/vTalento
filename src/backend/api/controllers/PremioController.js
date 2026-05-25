// Origem: specs/09-VITRINE-DE-PREMIOS.md (Seção 6)
// Governança: specs/06-IA-GOVERNANCE.md — Domínio de Negócio em Português
const PremioService = require('../../core/services/PremioService');

class PremioController {
  async listPublic(req, res) {
    const premios = await PremioService.list();
    return res.json({ success: true, data: premios });
  }

  async listAdmin(req, res) {
    const premios = await PremioService.listAdmin();
    return res.json({ success: true, data: premios });
  }

  async create(req, res) {
    try {
      const { titulo, descricao, quantidade_disponivel, custo_pontos, ativo } = req.body;
      const result = await PremioService.create({ titulo, descricao, quantidade_disponivel, custo_pontos, ativo });
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async update(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { titulo, descricao, quantidade_disponivel, custo_pontos, ativo } = req.body;
      const result = await PremioService.update(id, { titulo, descricao, quantidade_disponivel, custo_pontos, ativo });
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await PremioService.remove(id);
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

  async listResgatesByUser(req, res) {
    const usuario_id = req.params.userId;
    const resgates = await PremioService.listResgatesByUser(usuario_id);
    return res.json({ success: true, data: resgates });
  }
}

module.exports = new PremioController();
