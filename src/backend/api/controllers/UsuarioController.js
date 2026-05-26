const UsuarioService = require('../../core/services/UsuarioService');

class UsuarioController {
  // GET /api/admin/usuarios
  async listAdmin(req, res) {
    try {
      const { empresa_id } = req;
      const { page, limit, busca } = req.query;

      const result = await UsuarioService.listAllUsuariosAdmin({
        empresa_id,
        page,
        limit,
        busca
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  // POST /api/admin/usuarios
  async create(req, res) {
    try {
      const { empresa_id } = req;
      const { nome, email, senha, cpf } = req.body;

      const novoUsuario = await UsuarioService.createUsuarioAdmin({
        empresa_id,
        nome,
        email,
        senha,
        cpf
      });

      return res.status(201).json({
        success: true,
        data: novoUsuario
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  // PUT /api/admin/usuarios/:id
  async update(req, res) {
    try {
      const { empresa_id } = req;
      const { id } = req.params;
      const { nome, email, cpf } = req.body;

      const usuarioAtualizado = await UsuarioService.updateUsuarioAdmin({
        empresa_id,
        id,
        nome,
        email,
        cpf
      });

      return res.status(200).json({
        success: true,
        data: usuarioAtualizado
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  // PUT /api/users/me
  async updateMe(req, res) {
    try {
      const { usuario_id } = req;
      const { nome, email, cpf, senha_atual, nova_senha } = req.body;

      const profileAtualizado = await UsuarioService.updateOwnProfile({
        usuario_id,
        nome,
        email,
        cpf,
        senha_atual,
        nova_senha
      });

      return res.status(200).json({
        success: true,
        data: profileAtualizado
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }
}

module.exports = new UsuarioController();
