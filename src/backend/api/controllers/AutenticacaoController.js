const AutenticacaoService = require('../../core/services/AutenticacaoService');

class AutenticacaoController {
  async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const result = await AutenticacaoService.login(email, senha);
      
      return res.json(result);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }
  }

  async me(req, res) {
    // Rota protegida pelo middleware
    return res.json({
      usuario_id: req.usuario_id,
      empresa_id: req.empresa_id,
      perfil: req.usuario_perfil
    });
  }
}

module.exports = new AutenticacaoController();
