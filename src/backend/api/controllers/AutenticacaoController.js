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
    try {
      const db = require('../../infra/db');
      const usuario = await db('GamUsuario')
        .where({ id: req.usuario_id })
        .first();
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const empresa = await db('GamEmpresa')
        .where({ id: usuario.empresa_id })
        .first();

      return res.json({
        usuario_id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        saldo_disponivel: usuario.saldo_disponivel,
        saldo_a_receber: usuario.saldo_a_receber || 0,
        empresa_id: usuario.empresa_id,
        empresa_nome: empresa ? empresa.nome : '',
        empresa_status: empresa ? empresa.status : 'ATIVO',
        data_expiracao: empresa ? empresa.data_expiracao : null,
        liberacao_emergencia: empresa ? !!empresa.liberacao_emergencia : false,
        emergencia_expiracao: empresa ? empresa.emergencia_expiracao : null,
        perfil: usuario.perfil,
        tema_preferido: usuario.tema_preferido || 'dark'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async updateTheme(req, res) {
    try {
      const { tema } = req.body;
      if (tema !== 'light' && tema !== 'dark') {
        return res.status(400).json({ error: 'Tema inválido' });
      }

      const db = require('../../infra/db');
      await db('GamUsuario')
        .where({ id: req.usuario_id })
        .update({ tema_preferido: tema, updated_at: db.fn.now() });

      return res.json({ success: true, tema });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new AutenticacaoController();
