const LancamentoService = require('../../core/services/LancamentoService');

class LancamentoController {
  async realizarLancamento(req, res) {
    try {
      const { usuario_id, valor, tipo, justificativa } = req.body;
      const empresa_id = req.empresa_id;
      const admin_id = req.usuario_id; // Injetado pelo TenantMiddleware

      const result = await LancamentoService.realizarLancamentoManual({
        empresa_id,
        admin_id,
        usuario_id,
        valor,
        tipo,
        justificativa
      });

      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async obterCorretores(req, res) {
    try {
      const corretores = await LancamentoService.listarCorretores(req.empresa_id);
      return res.json(corretores);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async obterHistoricoRecente(req, res) {
    try {
      const historico = await LancamentoService.listarLancamentosManuaisRecentes(req.empresa_id);
      return res.json(historico);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new LancamentoController();
