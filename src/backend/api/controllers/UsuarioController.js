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
      const { nome, email, cpf, senha, ativo } = req.body;

      const usuarioAtualizado = await UsuarioService.updateUsuarioAdmin({
        empresa_id,
        id,
        nome,
        email,
        cpf,
        senha,
        ativo
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

  // DELETE /api/admin/usuarios/:id
  async delete(req, res) {
    try {
      const { empresa_id } = req;
      const { id } = req.params;

      await UsuarioService.deleteUsuarioAdmin({
        empresa_id,
        id
      });

      return res.status(200).json({
        success: true,
        message: 'Corretor excluído com sucesso.'
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
  // GET /api/admin/usuarios/:id/extrato
  async getExtrato(req, res) {
    try {
      const { empresa_id } = req;
      const { id } = req.params;
      const db = require('../../infra/db');

      // Validar que o corretor pertence à empresa
      const usuario = await db('GamUsuario').where({ id, empresa_id }).first();
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Corretor não encontrado.' });
      }

      const transacoes = await db('GamTransacao')
        .where({ 'GamTransacao.usuario_id': id })
        .leftJoin('GamUsuario as Admin', 'GamTransacao.admin_id', 'Admin.id')
        .select(
          'GamTransacao.id',
          'GamTransacao.tipo',
          'GamTransacao.valor',
          'GamTransacao.origem',
          'GamTransacao.status',
          'GamTransacao.justificativa',
          'GamTransacao.empreendimento',
          'GamTransacao.unidade',
          'GamTransacao.data_vencimento',
          'GamTransacao.created_at',
          db.raw("COALESCE(Admin.nome, 'Sistema') as admin_nome")
        )
        .orderBy('GamTransacao.created_at', 'desc')
        .limit(50);

      return res.json({
        success: true,
        corretor: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          saldo_disponivel: usuario.saldo_disponivel,
          saldo_a_receber: usuario.saldo_a_receber
        },
        transacoes
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/admin/usuarios/:id/recalcular-saldo
  async recalcularSaldo(req, res) {
    try {
      const { empresa_id } = req;
      const { id } = req.params;
      const db = require('../../infra/db');

      const usuario = await db('GamUsuario').where({ id, empresa_id }).first();
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Corretor não encontrado.' });
      }

      const transacoes = await db('GamTransacao').where({ usuario_id: id });

      let novoDisponivel = 0;
      let novoAReceber = 0;

      transacoes.forEach(t => {
        const v = parseFloat(t.valor);
        if (t.status === 'COMPENSADO') {
          novoDisponivel += v; // valor já vem negativo para DEBITO
        } else if (t.status === 'PENDENTE') {
          if (t.tipo === 'CREDITO') novoAReceber += v;
        }
      });

      const saldoDisponivel = Math.max(0, novoDisponivel);
      const saldoAReceber = Math.max(0, novoAReceber);

      await db('GamUsuario').where({ id }).update({
        saldo_disponivel: saldoDisponivel,
        saldo_a_receber: saldoAReceber,
        updated_at: db.fn.now()
      });

      return res.json({
        success: true,
        message: 'Saldo recalculado com base nas transações registradas.',
        saldo_disponivel: saldoDisponivel,
        saldo_a_receber: saldoAReceber,
        transacoes_processadas: transacoes.length
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new UsuarioController();
